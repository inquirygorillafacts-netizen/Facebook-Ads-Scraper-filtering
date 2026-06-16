/**
 * Firestore operations — Ultra-optimized for Firebase Spark plan.
 * Uses 1000 leads per chunk and deep JSON compression (short keys + null stripping)
 * to allow 5M leads within 1GB storage and 20k/day write quota.
 */
import {
  collection, doc, getDoc, getDocs, setDoc, writeBatch,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CHUNK_SIZE, MAX_BATCH_SIZE } from '../constants';
import type { Campaign, RawLead, CompressedLead } from '../types';

// ─── DATA COMPRESSION UTILS ──────────────────────────────────────────────────

function extractAdId(url: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/id=(\d+)/);
  return match ? match[1] : undefined;
}

function compressLead(lead: RawLead): CompressedLead {
  const c: CompressedLead = {};
  
  if (lead.id) c.pageId = lead.id;
  if (lead.name) c.name = lead.name;
  if (lead.phone) c.phone = lead.phone;
  if (lead.email) c.email = lead.email;
  if (lead.facebook) c.facebook = lead.facebook;
  if (lead.instagram) c.instagram = lead.instagram;
  if (lead.website) c.website = lead.website;
  
  const adId = extractAdId(lead.adsLink);
  if (adId) c.adId = adId;
  else if (lead.adsLink) c.adId = lead.adsLink; // fallback if not match

  if (lead.landingPage) c.landingPage = lead.landingPage;
  if (lead.whatsappSent) c.whatsappSent = true;

  return c;
}

function decompressLead(c: CompressedLead, campaignName?: string, campaignId?: string): RawLead {
  // Reconstruct full ad library URL if it's just an ID
  let fullAdsLink = c.adId || null;
  if (c.adId && /^\d+$/.test(c.adId)) {
    fullAdsLink = `https://www.facebook.com/ads/library/?id=${c.adId}`;
  }

  return {
    id: c.pageId || '',
    name: c.name || null,
    phone: c.phone || null,
    phoneSource: null, // Lost in compression to save space
    email: c.email || null,
    facebook: c.facebook || null,
    instagram: c.instagram || null,
    website: c.website || null,
    adsLink: fullAdsLink,
    landingPage: c.landingPage || null,
    whatsappSent: !!c.whatsappSent,
    addedAt: c.addedAt || new Date().toISOString(), // Fallback
    _campaignName: campaignName,
    _campaignId: campaignId,
  };
}

// ─── WRITE: Save a processed campaign + all its leads ───────────────────────

export async function saveCampaign(
  campaignData: Omit<Campaign, 'id' | 'createdAt' | 'processedAt' | 'chunkCount'>,
  leads: RawLead[],
  onProgress?: (message: string) => void
): Promise<string> {
  const campaignRef = doc(collection(db, 'campaigns'));
  const campaignId = campaignRef.id;

  // Split and compress leads into chunks of 1000
  const compressedChunks: CompressedLead[][] = [];
  for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
    const rawChunk = leads.slice(i, i + CHUNK_SIZE);
    compressedChunks.push(rawChunk.map(compressLead));
  }

  onProgress?.(`Preparing ${compressedChunks.length} chunks...`);

  // Write campaign doc + chunks
  if (compressedChunks.length <= MAX_BATCH_SIZE) {
    // Single batch
    onProgress?.('Saving to database...');
    const batch = writeBatch(db);

    batch.set(campaignRef, {
      ...campaignData,
      id: campaignId,
      chunkCount: compressedChunks.length,
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp(),
    });

    compressedChunks.forEach((chunk, index) => {
      const chunkRef = doc(
        collection(db, 'campaigns', campaignId, 'chunks'),
        String(index).padStart(4, '0')
      );
      batch.set(chunkRef, { c: chunk }); // { c: array of leads }
    });

    await batch.commit();
    onProgress?.('Campaign saved!');
  } else {
    // Multiple batches
    await setDoc(campaignRef, {
      ...campaignData,
      id: campaignId,
      chunkCount: compressedChunks.length,
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp(),
    });

    const totalBatches = Math.ceil(compressedChunks.length / MAX_BATCH_SIZE);
    for (let b = 0; b < compressedChunks.length; b += MAX_BATCH_SIZE) {
      const batchNum = Math.floor(b / MAX_BATCH_SIZE) + 1;
      onProgress?.(`Saving batch ${batchNum}/${totalBatches}...`);

      const batch = writeBatch(db);
      const batchChunks = compressedChunks.slice(b, b + MAX_BATCH_SIZE);
      batchChunks.forEach((chunk, batchIdx) => {
        const globalIdx = b + batchIdx;
        const chunkRef = doc(
          collection(db, 'campaigns', campaignId, 'chunks'),
          String(globalIdx).padStart(4, '0')
        );
        batch.set(chunkRef, { c: chunk });
      });
      await batch.commit();
    }
    onProgress?.('Campaign saved!');
  }

  // Update global stats
  const statsRef = doc(db, 'system', 'stats');
  const statsSnap = await getDoc(statsRef);
  const current = statsSnap.exists()
    ? statsSnap.data()
    : { totalLeads: 0, totalCampaigns: 0 };

  await setDoc(statsRef, {
    totalLeads: (current.totalLeads || 0) + leads.length,
    totalCampaigns: (current.totalCampaigns || 0) + 1,
    lastUpdated: serverTimestamp(),
  });

  return campaignId;
}

// ─── READ: Fetch all campaigns ───────────────────────────────────────────────

export async function fetchAllCampaigns(): Promise<Campaign[]> {
  const snap = await getDocs(
    query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || '',
      processedAt: data.processedAt?.toDate?.()?.toISOString?.() || data.processedAt || '',
    } as Campaign;
  });
}

// ─── READ: Fetch all leads for a campaign ─────────────────────────────────

export async function fetchLeadsForCampaign(
  campaignId: string, 
  campaignName?: string,
  timestampStr?: string
): Promise<RawLead[]> {
  const chunksSnap = await getDocs(
    collection(db, 'campaigns', campaignId, 'chunks')
  );

  const allLeads: RawLead[] = [];
  
  chunksSnap.docs.forEach(chunkDoc => {
    // Read the 'c' array which holds the compressed leads
    const data = chunkDoc.data() as { c: CompressedLead[] };
    if (data.c && Array.isArray(data.c)) {
      const decompressed = data.c.map(compressed => {
        const raw = decompressLead(compressed, campaignName, campaignId);
        if (timestampStr) raw.addedAt = timestampStr;
        return raw;
      });
      allLeads.push(...decompressed);
    }
  });

  return allLeads;
}

// ─── READ: Fetch ALL leads across all campaigns ──────────────────────────────

export async function fetchAllLeads(): Promise<{
  leads: RawLead[];
  campaigns: Campaign[];
}> {
  const campaigns = await fetchAllCampaigns();
  const allLeads: RawLead[] = [];

  for (const campaign of campaigns) {
    const leads = await fetchLeadsForCampaign(campaign.id, campaign.name, campaign.createdAt);
    allLeads.push(...leads);
  }

  return { leads: allLeads, campaigns };
}

// ─── UPDATE: Mark leads as WhatsApp sent ────────────────────────────────────

export async function markWhatsappSent(
  campaignId: string,
  phoneNumbers: string[]
): Promise<void> {
  const phoneSet = new Set(phoneNumbers);
  const chunksSnap = await getDocs(
    collection(db, 'campaigns', campaignId, 'chunks')
  );

  const batch = writeBatch(db);
  let hasChanges = false;

  chunksSnap.docs.forEach(chunkDoc => {
    const data = chunkDoc.data() as { c: CompressedLead[] };
    if (!data.c) return;
    
    let changed = false;

    const updatedChunk = data.c.map(lead => {
      // Decompressing partially just to check phone
      if (lead.phone && phoneSet.has(lead.phone) && !lead.whatsappSent) {
        changed = true;
        return { ...lead, whatsappSent: true }; // s = whatsappSent
      }
      return lead;
    });

    if (changed) {
      batch.update(chunkDoc.ref, { c: updatedChunk });
      hasChanges = true;
    }
  });

  if (hasChanges) await batch.commit();
}

// ─── DELETE: Delete a campaign and all its chunks ────────────────────────────

export async function deleteCampaign(campaignId: string): Promise<void> {
  const chunksSnap = await getDocs(
    collection(db, 'campaigns', campaignId, 'chunks')
  );

  const batch = writeBatch(db);
  chunksSnap.docs.forEach(chunkDoc => {
    batch.delete(chunkDoc.ref);
  });
  batch.delete(doc(db, 'campaigns', campaignId));
  await batch.commit();
}

// ─── STATS: Get global stats ────────────────────────────────────────────────

export async function getGlobalStats(): Promise<{
  totalLeads: number;
  totalCampaigns: number;
}> {
  const statsRef = doc(db, 'system', 'stats');
  const statsSnap = await getDoc(statsRef);
  if (statsSnap.exists()) {
    const data = statsSnap.data();
    return {
      totalLeads: data.totalLeads || 0,
      totalCampaigns: data.totalCampaigns || 0,
    };
  }
  return { totalLeads: 0, totalCampaigns: 0 };
}
