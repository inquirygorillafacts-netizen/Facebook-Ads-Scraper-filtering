import type { RawLead } from '../types';

export interface DeduplicationResult {
  leadsToInsert: RawLead[];
  leadsToUpdate: RawLead[];
  stats: {
    saved: number;
    skipped: number;
    updated: number;
  };
}

export function deduplicateAndMergeLeads(
  newLeads: RawLead[],
  existingLeads: RawLead[]
): DeduplicationResult {
  const phoneMap = new Map<string, RawLead>();
  const emailMap = new Map<string, RawLead>();

  // Build lookup maps from existing leads
  for (const lead of existingLeads) {
    if (lead.phone) phoneMap.set(lead.phone, lead);
    if (lead.email) emailMap.set(lead.email.toLowerCase(), lead);
  }

  const leadsToInsert: RawLead[] = [];
  const leadsToUpdateMap = new Map<string, RawLead>(); // map by campaign+chunk+index
  let skipped = 0;
  let updated = 0;

  for (const newLead of newLeads) {
    // 1. Check for duplicates
    let existingLead: RawLead | undefined;

    if (newLead.phone && phoneMap.has(newLead.phone)) {
      existingLead = phoneMap.get(newLead.phone);
    } else if (newLead.email && emailMap.has(newLead.email.toLowerCase())) {
      existingLead = emailMap.get(newLead.email.toLowerCase());
    }

    if (existingLead) {
      // 2. Duplicate found -> Skip insertion
      skipped++;

      // 3. Smart Merging: Check if existing lead has missing fields that new lead has
      let isModified = false;

      // Fields to potentially enrich
      const enrichableFields: (keyof RawLead)[] = [
        'name',
        'email',
        'facebook',
        'instagram',
        'website',
        'adsLink',
        'landingPage',
      ];

      for (const field of enrichableFields) {
        if (!existingLead[field] && newLead[field]) {
          // Type casting since we know the keys match and types are string | null
          (existingLead as any)[field] = newLead[field];
          isModified = true;
        }
      }

      // If missing data was filled, track it for Firestore updates
      if (isModified && existingLead._campaignId && existingLead._chunkId !== undefined && existingLead._chunkIndex !== undefined) {
        const updateKey = `${existingLead._campaignId}_${existingLead._chunkId}_${existingLead._chunkIndex}`;
        
        if (!leadsToUpdateMap.has(updateKey)) {
          updated++;
        }
        leadsToUpdateMap.set(updateKey, existingLead);
      }
    } else {
      // 4. No duplicate found -> Mark for insertion
      leadsToInsert.push(newLead);
      
      // Add to our maps so subsequent newLeads in the same file don't duplicate each other
      if (newLead.phone) phoneMap.set(newLead.phone, newLead);
      if (newLead.email) emailMap.set(newLead.email.toLowerCase(), newLead);
    }
  }

  return {
    leadsToInsert,
    leadsToUpdate: Array.from(leadsToUpdateMap.values()),
    stats: {
      saved: leadsToInsert.length,
      skipped,
      updated,
    },
  };
}
