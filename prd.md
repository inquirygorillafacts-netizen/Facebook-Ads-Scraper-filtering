# LeadSync Pro — Complete Product Requirements Document
**Version:** 1.0  
**Prepared for:** RD Models / Internal SaaS  
**Purpose:** Meta Ads Library CSV → Lead Extraction → Firebase Storage → MSG91 Export  
**Stack:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Firebase Firestore (Spark Plan)

---

## 1. PRODUCT OVERVIEW

LeadSync Pro ek no-login internal SaaS tool hai jo employee dwara Meta Ads Library se download ki gayi CSV file ko process karta hai. Tool automatically useful prospect data (naam, number, email, social links) extract karta hai, Firebase mein store karta hai aur MSG91 bulk SMS ke liye ready CSV generate karta hai.

### Core User Flow
```
Employee CSV download karo (Meta Ads Library se)
         ↓
Import Tool mein file upload karo
         ↓
Tool file process kare: extract → clean → deduplicate
         ↓
Campaign naam confirm/edit karo
         ↓
Process complete → 2 buttons mile:
  [Download MSG91 CSV] [Save to Firebase Database]
         ↓
Database page: filter, view, export, track WhatsApp status
```

### Design Language
- **Mode:** Light only (no dark mode)
- **Style:** Premium, modern, minimal — "Notion meets Linear" feel
- **Font family:** Inter (primary) + Geist Mono (for stats/numbers)
- **Color palette:**
  - Background: `#FAFAFA`
  - Surface/Card: `#FFFFFF`
  - Border: `#E5E7EB`
  - Primary accent: `#6366F1` (indigo)
  - Primary hover: `#4F46E5`
  - Success: `#10B981`
  - Warning: `#F59E0B`
  - Danger: `#EF4444`
  - Text primary: `#111827`
  - Text secondary: `#6B7280`
  - Text muted: `#9CA3AF`
- **Radius:** `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons/inputs
- **Shadow:** Subtle — `shadow-sm` on cards, `shadow-md` on modals
- **Animations:** Framer Motion — fade-in on page load, slide-up on modals, spring on buttons
- **Icons:** Lucide React (stroke-based, consistent 20px)

---

## 2. TECH STACK (Exact Versions)

```json
{
  "framework": "Next.js 14.2+ (App Router, no Pages Router)",
  "language": "TypeScript 5+",
  "styling": "Tailwind CSS 3.4+",
  "ui_components": "shadcn/ui",
  "animations": "Framer Motion 11+",
  "icons": "lucide-react",
  "database": "Firebase Firestore (firebase ^10.x)",
  "file_processing": "papaparse (CSV parse)",
  "date": "date-fns",
  "export": "xlsx (SheetJS) + native CSV string",
  "notifications": "sonner (toast)",
  "state": "Zustand (global) + React useState (local)"
}
```

**File structure:**
```
/src
  /app
    layout.tsx          ← Root layout (fonts, providers)
    page.tsx            ← Redirects to /dashboard
    /dashboard
      page.tsx
    /import
      page.tsx
    /database
      page.tsx
    /coming-soon
      page.tsx
  /components
    /ui                 ← shadcn/ui components
    /layout
      Sidebar.tsx       ← Left nav sidebar
      Header.tsx        ← Top bar
    /import
      FileDropzone.tsx
      ProcessingModal.tsx
      ResultModal.tsx
    /database
      LeadTable.tsx
      FilterBar.tsx
      ExportModal.tsx
      SyncStatus.tsx
    /dashboard
      StatsCard.tsx
      CampaignList.tsx
  /lib
    firebase.ts         ← Firebase init
    firestore.ts        ← All DB operations
    csvParser.ts        ← Meta Ads CSV parser
    phoneExtractor.ts   ← Phone cleaning + Body Text extraction
    exportHelpers.ts    ← CSV/Excel export logic
    localCache.ts       ← localStorage cache helpers
    deduplicator.ts     ← Lead deduplication logic
  /types
    index.ts            ← All TypeScript interfaces
  /store
    useAppStore.ts      ← Zustand global store
  /constants
    index.ts            ← Column mappings, regex patterns
```

---

## 3. INPUT FILE ANALYSIS (Meta Ads Library CSV)

### 3.1 All 31 Columns in the CSV
```
Ad Archive ID       ← Unique ID per ad (NOT unique per company)
Page Profile URI    ← Facebook page URL (= Facebook column usually)
Website URL         ← Company website (e.g., "parkville.hiranandaniparks.com")
Facebook            ← Facebook page URL
Instagram           ← Instagram URL (OFTEN EMPTY in this data)
TikTok              ← TikTok URL (ALWAYS EMPTY in this data)
YouTube             ← YouTube (ALWAYS EMPTY)
Email               ← Company email (present for ~53% rows)
Phone               ← Company phone (present for ~53% rows, may have multiple)
Twitter             ← Twitter URL (ALWAYS EMPTY)
LinkedIn            ← LinkedIn (ALWAYS EMPTY)
Pinterest           ← Pinterest (ALWAYS EMPTY)
Page ID             ← UNIQUE IDENTIFIER PER COMPANY ← USE FOR DEDUPLICATION
Link URL            ← Ad landing page URL (their campaign page)
Page Name           ← Company/brand name ← PRIMARY NAME FIELD
Facebook AD URL     ← https://facebook.com/ads/library/?id=XXX ← TO VIEW THE AD
Body Text           ← Full ad copy text (sometimes contains phone numbers)
Page Like Count     ← Number of FB page followers
CTA Text            ← "Learn more", "Book Now" etc.
Content (Caption)   ← Ad caption (very long, often duplicate of Body Text)
Publisher Platform  ← "FACEBOOK; INSTAGRAM; AUDIENCE_NETWORK" etc.
Start Date          ← Ad campaign start date
End Date            ← Ad campaign end date
Videos              ← Video URLs (GARBAGE for our purpose, ignore)
Images              ← Image CDN URLs (GARBAGE, ignore)
Cards Body          ← Carousel ad text (GARBAGE, ignore)
Cards Link URL      ← Carousel URLs (GARBAGE, ignore)
Cards Caption       ← Carousel captions (GARBAGE, ignore)
Cards CTA Text      ← Carousel CTAs (GARBAGE, ignore)
Cards Images        ← Carousel image URLs (GARBAGE, ignore)
Cards Videos        ← Carousel video URLs (GARBAGE, ignore)
```

### 3.2 USEFUL COLUMNS (extract these only)
| Our Field | Source Column | Notes |
|-----------|--------------|-------|
| `name` | `Page Name` | Always present |
| `phone` | `Phone` | Needs cleaning. May have multiple. Take first valid. Also fallback to Body Text regex. |
| `email` | `Email` | Take first if multiple |
| `facebook` | `Facebook` or `Page Profile URI` | Always present |
| `instagram` | `Instagram` | Often empty |
| `website` | `Website URL` | Usually present |
| `adsLink` | `Facebook AD URL` | Always present — to view their actual ad |
| `landingPage` | `Link URL` | Their campaign landing page |
| `pageId` | `Page ID` | Used for deduplication |

### 3.3 IGNORED COLUMNS (pure garbage for our use case)
- Videos, Images, Cards Body, Cards Link URL, Cards Caption, Cards CTA Text, Cards Images, Cards Videos
- Body Text, Content (Caption), CTA Text (only Body Text is checked for phone extraction fallback)
- Ad Archive ID (individual ad ID, not company ID)
- Page Like Count, Publisher Platform, Start Date, End Date, TikTok, YouTube, Twitter, LinkedIn, Pinterest

---

## 4. DATA EXTRACTION LOGIC

### 4.1 Phone Cleaning (`/lib/phoneExtractor.ts`)
```typescript
/**
 * Clean a phone string to a valid 10-digit Indian mobile number.
 * Returns null if no valid number found.
 * 
 * Handles formats like:
 *   "+91 44 4627 2999" → "4446272999" (landline, valid 10 digits)
 *   "+91 76058 08080" → "7605808080"
 *   "08065910310, 1260002502648, +91 20 2951 7267" → take first valid Indian mobile
 *   "8110862626" → "8110862626" (already clean)
 */
export function cleanPhone(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  
  // Split by comma to handle multiple phones in one cell
  const candidates = String(rawPhone).split(/[,;]/);
  
  for (const candidate of candidates) {
    // Remove all non-digits
    let digits = candidate.replace(/\D/g, '');
    
    // Remove leading 91 (country code) or 0 (trunk prefix)
    if (digits.startsWith('91') && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    
    // Must be exactly 10 digits
    if (digits.length !== 10) continue;
    
    // Indian mobile must start with 6,7,8,9
    // Landlines also okay (starts with 044, 022 etc — after stripping country code they start with 4,2,3 etc)
    // Accept all 10-digit numbers
    return digits;
  }
  
  return null;
}

/**
 * Extract phone number from ad Body Text using regex.
 * Used as fallback when Phone column is empty.
 */
export function extractPhoneFromBodyText(bodyText: string | null | undefined): string | null {
  if (!bodyText) return null;
  
  // Pattern: 10-digit numbers starting with 6,7,8,9 (mobile)
  const mobilePattern = /[6-9]\d{9}/g;
  const matches = String(bodyText).match(mobilePattern);
  
  if (matches && matches.length > 0) {
    return matches[0]; // Return first match
  }
  
  return null;
}

/**
 * Main function: get best phone for a lead.
 * First tries Phone column, then Body Text.
 */
export function getBestPhone(
  phoneColumn: string | null,
  bodyText: string | null
): { phone: string | null; source: 'direct' | 'bodyText' | null } {
  const direct = cleanPhone(phoneColumn);
  if (direct) return { phone: direct, source: 'direct' };
  
  const fromBody = extractPhoneFromBodyText(bodyText);
  if (fromBody) return { phone: fromBody, source: 'bodyText' };
  
  return { phone: null, source: null };
}
```

### 4.2 Main CSV Parser (`/lib/csvParser.ts`)
```typescript
import Papa from 'papaparse';
import { getBestPhone } from './phoneExtractor';
import type { RawLead, ParsedFile } from '../types';

/**
 * Main parsing function. Takes a File object and returns processed leads.
 * 
 * Steps:
 * 1. Parse CSV with PapaParse
 * 2. Group rows by Page ID (deduplicate: same company can have many ads)
 * 3. For each unique Page ID, merge info (take first non-null value for each field)
 * 4. Extract phone (direct column first, then Body Text)
 * 5. Filter: only keep leads that have PHONE or EMAIL
 * 6. Return { leads, stats }
 */
export async function parseMetaAdsCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const totalRawRows = rows.length;
        
        // Group by Page ID
        const byPageId = new Map<string, Record<string, string>[]>();
        for (const row of rows) {
          const pageId = row['Page ID']?.trim();
          if (!pageId) continue;
          if (!byPageId.has(pageId)) byPageId.set(pageId, []);
          byPageId.get(pageId)!.push(row);
        }
        
        const leads: RawLead[] = [];
        let duplicatesSkipped = 0;
        let noContactSkipped = 0;
        
        for (const [pageId, pageRows] of byPageId) {
          // Merge: take first non-empty value for each field across all rows for this company
          const merged = mergeRows(pageRows);
          
          // Extract phone
          const { phone, source: phoneSource } = getBestPhone(
            merged['Phone'] || null,
            merged['Body Text'] || null
          );
          
          // Extract email (take first if multiple)
          const rawEmail = merged['Email']?.trim() || null;
          const email = rawEmail ? rawEmail.split(/[,;]/)[0].trim() : null;
          
          // RULE: Must have phone OR email. Otherwise skip.
          if (!phone && !email) {
            noContactSkipped++;
            continue;
          }
          
          // Build clean lead
          const lead: RawLead = {
            id: pageId,
            name: merged['Page Name']?.trim() || null,
            phone: phone,
            phoneSource: phoneSource,
            email: email,
            facebook: merged['Facebook']?.trim() || merged['Page Profile URI']?.trim() || null,
            instagram: merged['Instagram']?.trim() || null,
            website: normalizeUrl(merged['Website URL']?.trim() || null),
            adsLink: merged['Facebook AD URL']?.trim() || null,
            landingPage: merged['Link URL']?.trim() || null,
            whatsappSent: false,
            addedAt: new Date().toISOString(),
          };
          
          leads.push(lead);
          duplicatesSkipped += pageRows.length - 1; // e.g., 11 rows → 1 lead + 10 skipped
        }
        
        resolve({
          leads,
          stats: {
            totalRawRows,
            uniqueCompanies: byPageId.size,
            validLeads: leads.length,
            duplicatesSkipped,
            noContactSkipped,
          }
        });
      },
      error: (error) => reject(error),
    });
  });
}

function mergeRows(rows: Record<string, string>[]): Record<string, string> {
  const merged: Record<string, string> = {};
  // For each field, take first non-empty value across all rows
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!merged[key] && value?.trim()) {
        merged[key] = value.trim();
      }
    }
  }
  return merged;
}

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  if (url === 'fb.me') return null; // ignore placeholder URLs
  if (!url.startsWith('http')) return `https://${url}`;
  return url;
}
```

### 4.3 TypeScript Types (`/types/index.ts`)
```typescript
export interface RawLead {
  id: string;           // Page ID — unique per company
  name: string | null;
  phone: string | null;
  phoneSource: 'direct' | 'bodyText' | null;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  website: string | null;
  adsLink: string | null;
  landingPage: string | null;
  whatsappSent: boolean;
  addedAt: string;     // ISO timestamp string
}

export interface ParsedFile {
  leads: RawLead[];
  stats: FileStats;
}

export interface FileStats {
  totalRawRows: number;
  uniqueCompanies: number;
  validLeads: number;
  duplicatesSkipped: number;
  noContactSkipped: number;
}

export interface Campaign {
  id: string;           // Firestore doc ID
  name: string;         // User-given campaign name (e.g., "Integrated Township")
  keyword: string;      // Original filename-based keyword
  originalFileName: string;
  totalRawRows: number;
  totalLeads: number;
  duplicatesSkipped: number;
  noContactSkipped: number;
  chunkCount: number;
  createdAt: string;    // ISO string
  processedAt: string;  // ISO string
}

export interface LeadChunk {
  chunkIndex: number;
  count: number;
  leads: RawLead[];
}

export interface LocalCache {
  campaigns: Campaign[];
  leads: RawLead[];         // All leads flattened
  syncedAt: string;         // ISO timestamp
  version: number;          // Cache version, increment when schema changes
}

export type ExportType = 'msg91' | 'full';
export type ExportFormat = 'csv' | 'excel';
export type FilterType = 'all' | 'phone_only' | 'email_only' | 'both' | 'whatsapp_sent' | 'whatsapp_pending';
```

---

## 5. FIREBASE DATABASE ARCHITECTURE (SPARK PLAN OPTIMIZED)

### 5.1 Why Chunked Storage?

**Problem:** Spark plan = 50K reads/day, 20K writes/day  
**If 1 lead = 1 document:** 100K leads = 100K reads (depletes daily quota instantly)  
**Solution:** 100 leads per chunk document = 100K leads = 1000 reads (100x savings)

| Operation | Without Chunks | With Chunks (100/chunk) |
|-----------|---------------|------------------------|
| Read all 100K leads | 100,000 reads | 1,000 reads |
| Write 100 new leads | 100 writes | 1 write |
| Delete a campaign (1000 leads) | 1000 deletes | 10 deletes |
| Update whatsappSent | 1 read + 1 write | 1 read + 1 write (chunk level) |

**With local cache:** After first load, ZERO reads per session.

### 5.2 Firestore Collection Structure

```
/campaigns/{campaignId}                          ← 1 doc per upload
  name: string
  keyword: string
  originalFileName: string
  totalRawRows: number
  totalLeads: number
  duplicatesSkipped: number
  noContactSkipped: number
  chunkCount: number
  createdAt: Timestamp
  processedAt: Timestamp

/campaigns/{campaignId}/chunks/{chunkIndex}      ← Subcollection
  chunkIndex: number                               e.g., "0", "1", "2"...
  count: number                                   (max 100 per chunk)
  leads: RawLead[]                                (array of 100 lead objects)

/system/stats                                    ← Single global doc
  totalLeads: number
  totalCampaigns: number
  lastUpdated: Timestamp
```

**campaignId format:** Auto-generated Firestore ID (do NOT use user input as ID to avoid injection)

**chunkIndex format:** Zero-padded string — `"000"`, `"001"`, `"002"` etc.  
Reason: Firestore orders subcollection docs lexicographically. Padding ensures correct order.

### 5.3 Firebase Operations (`/lib/firestore.ts`)

```typescript
import {
  collection, doc, getDoc, getDocs, setDoc, writeBatch,
  addDoc, serverTimestamp, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Campaign, RawLead, LeadChunk } from '../types';

const CHUNK_SIZE = 100; // leads per chunk document
const CACHE_KEY = 'leadsync_cache_v1';

// ─── WRITE: Save a processed campaign + all its leads ───────────────────────

export async function saveCampaign(
  campaignData: Omit<Campaign, 'id'>,
  leads: RawLead[]
): Promise<string> {
  // Step 1: Create campaign document
  const campaignRef = doc(collection(db, 'campaigns'));
  const campaignId = campaignRef.id;
  
  // Step 2: Split leads into chunks of 100
  const chunks: RawLead[][] = [];
  for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
    chunks.push(leads.slice(i, i + CHUNK_SIZE));
  }
  
  // Step 3: Batch write (Firestore batch max = 500 ops)
  // Campaign doc + chunk docs. If >498 chunks, use multiple batches.
  // For 100K leads: 1000 chunks → need 3 batches (334 + 333 + 333 ops each)
  
  const allOps: (() => Promise<void>)[] = [];
  
  // Campaign doc write
  allOps.push(async () => {
    await setDoc(campaignRef, {
      ...campaignData,
      id: campaignId,
      chunkCount: chunks.length,
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp(),
    });
  });
  
  // For small files: use Firestore batch for efficiency
  // For large files (>450 chunks): use sequential batch groups
  if (chunks.length <= 450) {
    const batch = writeBatch(db);
    batch.set(campaignRef, {
      ...campaignData,
      id: campaignId,
      chunkCount: chunks.length,
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp(),
    });
    
    chunks.forEach((chunkLeads, index) => {
      const chunkRef = doc(
        collection(db, 'campaigns', campaignId, 'chunks'),
        String(index).padStart(4, '0')
      );
      batch.set(chunkRef, {
        chunkIndex: index,
        count: chunkLeads.length,
        leads: chunkLeads,
      });
    });
    
    await batch.commit();
  } else {
    // Large dataset: multiple batches of 499 ops each
    await setDoc(campaignRef, {
      ...campaignData,
      id: campaignId,
      chunkCount: chunks.length,
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp(),
    });
    
    for (let b = 0; b < chunks.length; b += 499) {
      const batch = writeBatch(db);
      const batchChunks = chunks.slice(b, b + 499);
      batchChunks.forEach((chunkLeads, batchIdx) => {
        const globalIdx = b + batchIdx;
        const chunkRef = doc(
          collection(db, 'campaigns', campaignId, 'chunks'),
          String(globalIdx).padStart(4, '0')
        );
        batch.set(chunkRef, {
          chunkIndex: globalIdx,
          count: chunkLeads.length,
          leads: chunkLeads,
        });
      });
      await batch.commit();
    }
  }
  
  // Step 4: Update global stats
  const statsRef = doc(db, 'system', 'stats');
  const statsSnap = await getDoc(statsRef);
  const current = statsSnap.exists() ? statsSnap.data() : { totalLeads: 0, totalCampaigns: 0 };
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
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Campaign));
}

// ─── READ: Fetch all leads for a campaign (via chunks) ─────────────────────

export async function fetchLeadsForCampaign(campaignId: string): Promise<RawLead[]> {
  const chunksSnap = await getDocs(
    query(
      collection(db, 'campaigns', campaignId, 'chunks'),
      orderBy('chunkIndex', 'asc')
    )
  );
  
  const allLeads: RawLead[] = [];
  chunksSnap.docs.forEach(chunkDoc => {
    const data = chunkDoc.data() as LeadChunk;
    allLeads.push(...data.leads);
  });
  
  return allLeads;
}

// ─── READ: Fetch ALL leads across all campaigns ──────────────────────────────

export async function fetchAllLeads(): Promise<{ leads: RawLead[]; campaigns: Campaign[] }> {
  const campaigns = await fetchAllCampaigns();
  const allLeads: RawLead[] = [];
  
  for (const campaign of campaigns) {
    const leads = await fetchLeadsForCampaign(campaign.id);
    // Tag each lead with its campaign name for display
    leads.forEach(l => (l as any)._campaignName = campaign.name);
    allLeads.push(...leads);
  }
  
  return { leads: allLeads, campaigns };
}

// ─── UPDATE: Mark leads as WhatsApp sent ────────────────────────────────────

export async function markWhatsappSent(campaignId: string, phoneNumbers: string[]): Promise<void> {
  const phoneSet = new Set(phoneNumbers);
  const chunksSnap = await getDocs(collection(db, 'campaigns', campaignId, 'chunks'));
  
  const batch = writeBatch(db);
  let hasChanges = false;
  
  chunksSnap.docs.forEach(chunkDoc => {
    const data = chunkDoc.data() as LeadChunk;
    let changed = false;
    
    const updatedLeads = data.leads.map(lead => {
      if (lead.phone && phoneSet.has(lead.phone) && !lead.whatsappSent) {
        changed = true;
        return { ...lead, whatsappSent: true };
      }
      return lead;
    });
    
    if (changed) {
      batch.update(chunkDoc.ref, { leads: updatedLeads });
      hasChanges = true;
    }
  });
  
  if (hasChanges) await batch.commit();
}

// ─── LOCAL CACHE ─────────────────────────────────────────────────────────────

export function saveToLocalCache(leads: RawLead[], campaigns: Campaign[]): void {
  try {
    const cache = {
      leads,
      campaigns,
      syncedAt: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Cache save failed (possibly quota exceeded):', e);
  }
}

export function loadFromLocalCache(): { leads: RawLead[]; campaigns: Campaign[]; syncedAt: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (cache.version !== 1) return null; // Schema changed, invalidate
    return cache;
  } catch {
    return null;
  }
}

export function clearLocalCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
```

---

## 6. PAGES

### 6.1 LAYOUT (Shared Shell)

**Left sidebar (fixed, 240px wide):**
```
┌─────────────────────────┐
│  ⚡ LeadSync Pro         │  ← Logo + brand name (top-left)
│  ─────────────────────  │
│  [📊] Dashboard         │  ← nav item (active state: indigo bg)
│  [📥] Import            │
│  [🗄️] Database          │
│  [🚀] Coming Soon       │
│  ─────────────────────  │
│  (bottom)               │
│  v1.0 · Spark Plan      │  ← version + plan badge
└─────────────────────────┘
```

**Top header bar (full width, 60px height):**
- Left: Page title (dynamic — "Dashboard", "Import Tool" etc.)
- Right: Global stats badge — "Total Leads: 3,241" (read from Zustand store)
- Subtle shadow-sm border-bottom

**Main content area:** `ml-[240px]` padding, `p-8`, max-width layout

---

### 6.2 PAGE 1: DASHBOARD (`/dashboard`)

**Purpose:** Quick overview of all activity, recent campaigns, key stats.

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                    │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐ │
│  │ 3,241      │  │ 55         │  │ 2,187      │  │ 64%    │ │
│  │ Total Leads│  │ Campaigns  │  │ With Phone │  │Phone % │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────┘ │
│                                                              │
│  RECENT CAMPAIGNS                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ # │ Campaign Name       │ Leads │ Date       │ Actions  │ │
│  │ 1 │ Integrated Township │ 55    │ Jun 16     │ [View]   │ │
│  │ 2 │ 3BHK Mumbai         │ 120   │ Jun 14     │ [View]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  QUICK ACTIONS                                               │
│  [+ Import New File]    [View All Leads]                     │
└──────────────────────────────────────────────────────────────┘
```

**Stats Cards (4 cards in a row):**
- Card 1: **Total Leads** — count of all valid leads across all campaigns
- Card 2: **Total Campaigns** — number of files uploaded
- Card 3: **With Phone** — leads that have a phone number
- Card 4: **Coverage %** — % of leads with phone

Each card:
- White background, subtle border
- Large number in Geist Mono font (bold, 32px)
- Label below in gray-500 (14px)
- Small trend icon (Lucide `TrendingUp`)
- Hover: slight shadow-md transition

**Recent Campaigns table:**
- Show last 10 campaigns
- Columns: #, Name, Total Leads, Phone Count, Email Count, Upload Date, Actions
- Each row: [👁 View in Database] button → navigates to /database?campaign=id

**Quick Actions:**
- [+ Import New File] → /import
- [🗄️ View All Leads] → /database

---

### 6.3 PAGE 2: IMPORT TOOL (`/import`)

This is the main tool page. Most complex page.

**Step 1: File Drop Zone (initial state)**
```
┌──────────────────────────────────────────────────────────────────┐
│  IMPORT META ADS LIBRARY FILE                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │              📁                                          │   │
│  │     Drag & drop your CSV file here                       │   │
│  │     or click to browse                                   │   │
│  │                                                          │   │
│  │     Supports: .csv files from Meta Ads Library           │   │
│  │     No file size limit                                   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  You can select multiple files at once.                          │
│  Each file will be processed as a separate campaign.            │
└──────────────────────────────────────────────────────────────────┘
```

**FileDropzone component behavior:**
- Dashed border, `border-2 border-dashed border-gray-300`
- On hover: border changes to indigo, background subtle indigo tint
- On drag-over: animated border pulse + "Drop it!" text
- On drag-drop or click-select: accept ONLY `.csv` files
- Multiple files allowed (`<input multiple accept=".csv" />`)
- If wrong file type: show error toast "Only CSV files are supported"

When file(s) selected, show below dropzone:
```
Selected files (2):
  📄 Integrated_Township_Lead.csv  [420 KB]  [✕ Remove]
  📄 3BHK_Mumbai.csv               [180 KB]  [✕ Remove]
```

**Step 2: Process Button**
After file selection:
```
[🔄 Process Files]
```
Big, full-width indigo button. On click → show ProcessingModal.

**Step 3: Processing Modal**
Full-screen overlay with centered card:
```
┌──────────────────────────────────────────────────────┐
│  Processing: Integrated_Township_Lead.csv            │
│                                                      │
│  ████████████████████░░░░  78%                       │
│                                                      │
│  ✅ Parsed 121 rows                                   │
│  ✅ Found 55 unique companies                         │
│  ✅ Extracted 55 valid leads                          │
│  ⏳ Cleaning phone numbers...                         │
│                                                      │
│                              (spinner)               │
└──────────────────────────────────────────────────────┘
```

Processing steps (animated live updates):
1. "Reading file..." → parsed
2. "Grouping by company (Page ID)..." → dedup done
3. "Extracting phone numbers..." → phones cleaned
4. "Filtering leads..." → valid leads counted
5. "Done! ✅"

**Step 4: Campaign Name Modal**
After processing, BEFORE showing results:
```
┌──────────────────────────────────────────────────────────┐
│  Name this campaign                                      │
│                                                          │
│  We detected the keyword from your filename:            │
│                                                          │
│  Campaign name:                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Integrated Township                               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  (Edit above or leave as-is)                             │
│                                                          │
│  [Skip → Use filename]     [✅ Confirm Name]             │
└──────────────────────────────────────────────────────────┘
```

**Campaign name detection logic:**
- Take filename: `Integrated_Township_Lead.csv`
- Remove common suffixes: `_Lead`, `_Leads`, `_Data`, `_ads`, `_output`, `.csv`
- Replace underscores with spaces
- Title case: `Integrated Township`
- Pre-fill input with this detected name
- User can edit freely
- "Skip" → use filename without extension as name

**Step 5: Results Modal (MAIN)**
After confirming campaign name:
```
┌──────────────────────────────────────────────────────────────────┐
│  ✅ Processing Complete — "Integrated Township"                   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ 121      │  │ 55       │  │ 55       │  │ 66               │ │
│  │ Raw Rows │  │ Companies│  │ Valid    │  │ Ads Skipped      │ │
│  │ in CSV   │  │ found    │  │ Leads   │  │ (same company)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│                                                                  │
│  Lead breakdown:                                                 │
│  ● 42 leads have phone number                                    │
│  ● 38 leads have email address                                   │
│  ● 25 leads have both                                            │
│  ● 13 leads skipped (no phone, no email)                        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  PENDING — Choose action:                                        │
│                                                                  │
│  [📥 Download MSG91 CSV]     [🗄️ Save to Database]              │
│                                                                  │
│  Tip: You can do BOTH — download first, then save.               │
└──────────────────────────────────────────────────────────────────┘
```

**"Download MSG91 CSV" Button Logic:**
1. Show mini popup:
```
┌───────────────────────────────┐
│  Export type?                 │
│                               │
│  ◉ MSG91 only                 │
│    (2 columns: Mobile, Name)  │
│                               │
│  ○ Full details               │
│    (all available fields)     │
│                               │
│  [Download]                   │
└───────────────────────────────┘
```

2. If **MSG91 only**:
```csv
Mobile,Name
9876543210,Hiranandani Parks
9765432109,Doshi Housing
9654321098,
```
- Only leads with phone number included
- If name is null/empty → leave Name column blank
- Mobile = 10-digit cleaned number (no +91, no spaces)

3. If **Full details**:
```csv
Name,Mobile,Email,Facebook,Instagram,Website,Ads Link
Hiranandani Parks,9876543210,hparks@example.com,https://facebook.com/...,,,https://...
```
- All leads (phone OR email)
- All available non-null fields
- Missing fields = empty cell

**"Save to Database" Button Logic:**
1. Show loading state: "Saving to Firebase..."
2. Call `saveCampaign()` from firestore.ts
3. Show progress: "Saving chunk 1/2... Saving chunk 2/2..."
4. On success:
```
✅ Saved! 55 leads added to "Integrated Township" campaign.

[View in Database →]  [Import Another File]
```
5. On error: show error with retry button

**BOTH buttons are independent.** User can click Download first, then Save. Both stay active until modal is closed.

---

### 6.4 PAGE 3: DATABASE (`/database`)

The main data management page.

#### 6.4.1 Local Cache Architecture

```typescript
// On page mount:
const cache = loadFromLocalCache();
if (cache) {
  // Show data IMMEDIATELY from cache (zero reads from Firestore)
  setLeads(cache.leads);
  setCampaigns(cache.campaigns);
  setSyncedAt(cache.syncedAt);
  setIsFromCache(true);
} else {
  // No cache: fetch from Firestore
  await syncFromFirestore();
}
```

#### 6.4.2 Page Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE                                                        │
│  ─────────────────────────────────────────────────────────────  │
│  FILTER BAR:                                                     │
│  Campaign: [All Campaigns ▼]  Contact: [All ▼]  Search: [    ] │
│                                                                  │
│  SYNC STATUS:  ● Showing cached data · Last synced: 3 min ago  │
│                [🔄 Sync Now]                                     │
│                                                                  │
│  RESULTS: 55 leads found  [Export ▼]                            │
│  ─────────────────────────────────────────────────────────────  │
│  TABLE:                                                          │
│  ┌────┬──────────────────┬────────────┬───────────┬──────────┐  │
│  │ #  │ Name             │ Phone      │ Email     │ Links    │  │
│  │ 1  │ Hiranandani Parks│ 9876543210 │ h@mail.com│ [F][W][A]│  │
│  │ 2  │ Doshi Housing    │ 8110862626 │ d@mail.com│ [F][A]   │  │
│  │ 3  │ Arvind SmartSpc  │ —          │ a@mail.com│ [F][W]   │  │
│  └────┴──────────────────┴────────────┴───────────┴──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.4.3 Filter Bar Components

**Campaign Dropdown:**
- Options: "All Campaigns" + list of all campaign names
- On select: filter table to show only that campaign's leads
- Selected campaign name shown in dropdown

**Contact Type Filter:**
- "All Leads" → show everything
- "Phone Only" → show leads with phone (no email required)
- "Email Only" → show leads with email (no phone required)
- "Has Both" → phone AND email both present
- "WhatsApp Sent" → whatsappSent = true
- "Pending WhatsApp" → whatsappSent = false

**Search Box:**
- Searches across: Name, Phone, Email (real-time, no API call, client-side filter)
- Debounced 300ms

#### 6.4.4 Sync Status Bar

```
● Showing cached data · Last synced: 3 minutes ago  [🔄 Sync Now]
```

**Time display logic (relative time using date-fns):**
- < 60 seconds: "Just now"
- 1-59 minutes: "X minutes ago"
- 1-23 hours: "X hours ago"
- 1+ days: "X days ago"

**Sync Now button:**
1. Clear localStorage cache
2. Fetch fresh from Firestore (all campaigns + all chunks)
3. Save back to localStorage
4. Update table display
5. Show success toast: "Synced! 55 leads loaded."
6. Update "Last synced" to "Just now"

#### 6.4.5 Lead Table

**Columns:**
| Column | Content |
|--------|---------|
| # | Row number |
| Name | Page Name (bold, truncate at 25 chars) |
| Phone | Cleaned phone number. Copy button [📋]. If null: show "—" in gray |
| Email | Email address. Copy button [📋]. If null: show "—" in gray |
| Links | Icon buttons (see below) |
| WA Sent | Checkbox. If checked: green tick. If unchecked: gray circle |

**Links column — show only buttons that have data:**
- [F] Facebook — opens facebook page in new tab (`target="_blank"`)
- [I] Instagram — shows only if instagram URL exists  
- [W] Website — shows only if website URL exists
- [A] Ads Link — "View their Facebook Ad" → opens fb.com/ads/library link in new tab
- Icons from Lucide: `Globe` (website), `ExternalLink` (ads), use colored square icon for FB/IG

**Copy button behavior:**
- Small clipboard icon next to phone and email
- On click: copies value to clipboard
- Brief "Copied!" tooltip for 1 second
- Copies phone WITHOUT any country code (just 10 digits)
- Copies email as-is

**WA Sent checkbox:**
- On check: calls `markWhatsappSent(campaignId, [phone])` in background
- Optimistic update: checkbox becomes green immediately
- Also updates localStorage cache

**Table pagination:**
- Show 50 leads per page
- Previous/Next buttons + page indicator: "Page 2 of 4"
- Or: "Load more" button (infinite scroll option)

#### 6.4.6 Export Button

```
[📤 Export ▼]  ← dropdown button
  ├─ Export as CSV
  └─ Export as Excel (.xlsx)
```

On click → show ExportModal:
```
┌──────────────────────────────────────────────────────┐
│  Export Leads                                        │
│                                                      │
│  Which leads?                                        │
│  ◉ Current filter (55 leads)                         │
│  ○ All leads (3,241 leads)                           │
│                                                      │
│  Export format:                                      │
│  ◉ MSG91 format (Mobile + Name only)                 │
│  ○ Full details (all fields)                         │
│                                                      │
│  File type:                                          │
│  [CSV]  [Excel]                                      │
│                                                      │
│  [Cancel]          [Download]                        │
└──────────────────────────────────────────────────────┘
```

**MSG91 format output:**
```csv
Mobile,Name
9876543210,Hiranandani Parks
8110862626,Doshi Housing
9765432109,
```
Rules:
- Only leads with phone number
- If no name: leave Name blank (empty string in CSV, NOT "null" or "N/A")
- Mobile = 10-digit, no country code, no spaces

**Full details format output:**
```csv
Name,Mobile,Email,Facebook,Instagram,Website,Ads Link
Hiranandani Parks,9876543210,hparks@example.com,https://facebook.com/HiranandaniParks,,https://hiranandaniparks.com,https://facebook.com/ads/library/?id=1480...
```
Rules:
- All leads with phone OR email
- Missing fields = empty cell (not "null")
- URLs kept as-is (full URL)

---

### 6.5 PAGE 4: COMING SOON (`/coming-soon`)

A well-designed page showing upcoming features — not a placeholder, but a real roadmap page.

**Visual style:** Indigo gradient hero banner, feature cards below with "Coming Soon" badges.

**Page copy and feature list:**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🚀 What's Coming to LeadSync Pro                               │
│                                                                  │
│  We're actively building the next set of features.              │
│  These are already planned and in development.                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BATCH OUTREACH TRACKER                    [COMING SOON]        │
│  Track which batch of leads received which MSG91 template.      │
│  See open rates, delivery status, and link clicks.              │
│                                                                  │
│  DUPLICATE DETECTION ACROSS CAMPAIGNS     [COMING SOON]        │
│  Automatically find and highlight phone numbers that appear     │
│  in multiple campaigns. Avoid messaging the same prospect       │
│  twice from different keyword uploads.                          │
│                                                                  │
│  LEAD NOTES & STATUS TRACKING             [COMING SOON]        │
│  Add personal notes to any lead. Set statuses like             │
│  "Interested", "Not Interested", "Follow Up", "Converted".      │
│  Filter database by status.                                     │
│                                                                  │
│  BULK WHATSAPP STATUS UPDATE              [COMING SOON]        │
│  After sending MSG91 blast, upload the delivery report CSV      │
│  and auto-mark all successfully delivered leads as WA Sent.     │
│                                                                  │
│  MSG91 DIRECT INTEGRATION                 [COMING SOON]        │
│  Send WhatsApp/SMS messages directly from LeadSync Pro          │
│  without downloading and re-uploading to MSG91.                 │
│  Connect your MSG91 API key and blast from here.                │
│                                                                  │
│  LEAD SCORING                             [COMING SOON]        │
│  Automatically score each prospect based on:                    │
│  · Number of active ads running                                 │
│  · Facebook page follower count                                 │
│  · Website presence quality                                     │
│  · Whether they have Instagram + Facebook both active           │
│  Higher score = more likely to be a serious advertiser.         │
│                                                                  │
│  CAMPAIGN COMPARISON                      [COMING SOON]        │
│  Side-by-side comparison of two keyword campaigns.              │
│  See overlap between "3BHK Mumbai" and "Luxury Apartments"      │
│  to understand audience differences.                            │
│                                                                  │
│  TEAM MODE                                [COMING SOON]        │
│  Add simple PIN-based access for multiple team members.         │
│  Each member sees their own outreach log.                       │
│  Admin sees everyone's activity.                                │
│                                                                  │
│  GOOGLE DRIVE BACKUP                      [COMING SOON]        │
│  One-click backup of your entire lead database to Google Drive  │
│  as Excel. Auto-backup weekly. Never lose your data.            │
│                                                                  │
│  SMART DEDUPLICATION                      [COMING SOON]        │
│  Detect same company even when phone/email differs:             │
│  Same website URL = same company.                               │
│  Similar Page Name = possible duplicate. Alert shown.           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Each feature card:
- White card, subtle border
- Feature title (bold, 16px)
- 1-2 line description (gray-600, 14px)
- "Coming Soon" badge (amber/yellow, pill shape, top-right corner)
- Lucide icon in indigo (top-left)

---

## 7. EXPORT LOGIC (`/lib/exportHelpers.ts`)

```typescript
import * as XLSX from 'xlsx';
import type { RawLead, ExportType, ExportFormat } from '../types';

export function exportLeads(
  leads: RawLead[],
  type: ExportType,
  format: ExportFormat,
  filename: string
): void {
  
  let rows: Record<string, string>[];
  
  if (type === 'msg91') {
    // Only leads with phone. 2 columns only.
    rows = leads
      .filter(l => l.phone !== null)
      .map(l => ({
        'Mobile': l.phone!,
        'Name': l.name || '',  // Empty string if no name (NOT "null")
      }));
  } else {
    // Full details. All leads with phone OR email.
    rows = leads
      .filter(l => l.phone || l.email)
      .map(l => ({
        'Name': l.name || '',
        'Mobile': l.phone || '',
        'Email': l.email || '',
        'Facebook': l.facebook || '',
        'Instagram': l.instagram || '',
        'Website': l.website || '',
        'Ads Link': l.adsLink || '',
      }));
  }
  
  if (format === 'csv') {
    // Build CSV string manually
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h] || '';
          // Quote fields containing comma or newline
          return val.includes(',') || val.includes('\n') ? `"${val}"` : val;
        }).join(',')
      )
    ];
    
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
    
  } else {
    // Excel via SheetJS
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 8. ZUSTAND GLOBAL STORE (`/store/useAppStore.ts`)

```typescript
import { create } from 'zustand';
import type { Campaign, RawLead } from '../types';

interface AppStore {
  // Data
  campaigns: Campaign[];
  leads: RawLead[];
  syncedAt: string | null;
  isFromCache: boolean;
  
  // Stats (derived)
  totalLeads: number;
  totalWithPhone: number;
  totalWithEmail: number;
  
  // Actions
  setCampaigns: (campaigns: Campaign[]) => void;
  setLeads: (leads: RawLead[]) => void;
  setSyncedAt: (time: string) => void;
  setIsFromCache: (val: boolean) => void;
  updateLeadWhatsapp: (phone: string, sent: boolean) => void;
  
  // Import state
  importedLeads: RawLead[];
  setImportedLeads: (leads: RawLead[]) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  campaigns: [],
  leads: [],
  syncedAt: null,
  isFromCache: false,
  totalLeads: 0,
  totalWithPhone: 0,
  totalWithEmail: 0,
  importedLeads: [],
  
  setCampaigns: (campaigns) => set({ campaigns }),
  
  setLeads: (leads) => set({
    leads,
    totalLeads: leads.length,
    totalWithPhone: leads.filter(l => l.phone).length,
    totalWithEmail: leads.filter(l => l.email).length,
  }),
  
  setSyncedAt: (time) => set({ syncedAt: time }),
  setIsFromCache: (val) => set({ isFromCache: val }),
  
  updateLeadWhatsapp: (phone, sent) => set(state => ({
    leads: state.leads.map(l =>
      l.phone === phone ? { ...l, whatsappSent: sent } : l
    )
  })),
  
  setImportedLeads: (leads) => set({ importedLeads: leads }),
}));
```

---

## 9. FIREBASE SETUP

### 9.1 `firebase.ts`
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
```

### 9.2 Environment Variables (`.env.local`)
```
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### 9.3 Firestore Security Rules
Since no login, use open rules (for internal tool only — NOT for public deployment):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
**WARNING:** Add IP restriction via Firebase console or migrate to auth-protected rules before any public access.

### 9.4 Firestore Indexes Required
Create composite index for:
- Collection: `campaigns`
- Fields: `createdAt DESC`

This auto-prompts when first query runs — click the link in Firebase console error message.

---

## 10. COMPLETE COLUMN MAPPING

### 10.1 Input → Output Mapping (Important for developer)

| Output Field | Primary Source Column | Fallback | Notes |
|-------------|----------------------|----------|-------|
| `name` | `Page Name` | — | Always present |
| `phone` | `Phone` | `Body Text` (regex) | Clean to 10 digits. Take first valid. |
| `email` | `Email` | — | Take first if multiple (split by comma) |
| `facebook` | `Facebook` | `Page Profile URI` | Keep full URL |
| `instagram` | `Instagram` | — | Often null |
| `website` | `Website URL` | — | Skip if "fb.me" (placeholder). Add https:// if missing. |
| `adsLink` | `Facebook AD URL` | — | Direct link to see their FB ad |
| `landingPage` | `Link URL` | — | Their campaign landing page |
| `pageId` | `Page ID` | — | Used for dedup only (not shown in UI) |

### 10.2 Deduplication Rule
```
Group by: Page ID
Strategy: When same Page ID appears in multiple rows (because multiple ads),
          merge fields by taking first non-empty value for each field.
          Result: 1 lead per unique company.
```

### 10.3 Lead Validity Rule
```
A lead is VALID if:
  (phone is not null) OR (email is not null)
  
A lead is INVALID if:
  (phone is null) AND (email is null)
  → Skip entirely, count in noContactSkipped
```

---

## 11. UI COMPONENT SPECIFICATIONS

### 11.1 Animations (Framer Motion)

```tsx
// Page transition wrapper (use on every page)
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// Card hover animation
const cardVariants = {
  rest: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  hover: { scale: 1.01, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', transition: { duration: 0.15 } },
};

// Stagger for multiple cards appearing
const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } }
};
```

### 11.2 Stats Card Component
```tsx
interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: number; // percentage change
}

// Renders: white card, icon top-left in colored circle,
// big number in Geist Mono, label in gray-500 below,
// optional small green/red trend badge bottom-right
```

### 11.3 Table Row Hover State
- Background changes to `bg-indigo-50/50` on hover (very subtle)
- Transition: `transition-colors duration-100`
- Action buttons become visible on hover (use `opacity-0 group-hover:opacity-100` pattern)

### 11.4 Empty States
- When no campaigns: full-width card with icon + "No campaigns yet. Import your first file →" with arrow link
- When filter returns 0 results: "No leads match your current filters. Try adjusting the filters above."
- When database is empty: "Your database is empty. Import a file to get started."

### 11.5 Loading States
- Skeleton loaders for table rows (not a spinner) — 8 skeleton rows when loading
- Shimmer animation: `animate-pulse` on gray placeholder divs

---

## 12. IMPORTANT EDGE CASES TO HANDLE

1. **Phone has multiple numbers in one cell:**
   - e.g., `"08065910310, 1260002502648, +91 20 2951 7267"`
   - Split by comma, try each, return first valid 10-digit number

2. **Same company, multiple campaigns:**
   - User uploads "3BHK Mumbai" → then "Integrated Township" 
   - Same company might appear in both
   - For NOW: do NOT cross-campaign dedup (Coming Soon feature)
   - Each campaign is independent

3. **Website URL is "fb.me":**
   - This is a placeholder/redirect URL
   - Treat as null (don't show Website button for these leads)

4. **Very long Page Names:**
   - Truncate at 25 chars in table with `...` tooltip showing full name

5. **Phone numbers starting with 1260..:**
   - These are NOT Indian numbers (US format)
   - After stripping country code, if not 10 digits → invalid → skip

6. **File upload encoding:**
   - PapaParse: use `encoding: 'utf-8'` option
   - Some files from Meta might have BOM (Byte Order Mark) → PapaParse handles this with `skipBOM: true`

7. **Empty CSV / wrong format:**
   - Check if `Page ID` column exists after parsing
   - If not: show error "This file doesn't look like a Meta Ads Library export. Please check the file."

8. **localStorage quota exceeded:**
   - Catch quota exceeded error in `saveToLocalCache`
   - If fails: show warning toast but don't break the app
   - App still works, just re-fetches from Firestore on next load

9. **Firestore offline:**
   - If Firestore unreachable: show error toast "Couldn't connect to database. Showing cached data."
   - Always show cached data as fallback

---

## 13. PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "firebase": "^10.12.0",
    "papaparse": "^5.4.1",
    "xlsx": "^0.18.5",
    "framer-motion": "^11.2.0",
    "lucide-react": "^0.395.0",
    "zustand": "^4.5.0",
    "date-fns": "^3.6.0",
    "sonner": "^1.5.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 14. NEXT.JS CONFIGURATION

```typescript
// next.config.ts
const nextConfig = {
  reactStrictMode: true,
  // No backend needed — pure client-side Firebase SDK
  // No API routes needed for this version
};
export default nextConfig;
```

**App Router structure:**
```
/src/app/
  layout.tsx           ← SidebarLayout wrapper here
  page.tsx             ← redirect('/dashboard')
  /dashboard/page.tsx
  /import/page.tsx
  /database/page.tsx
  /coming-soon/page.tsx
```

All pages use `'use client'` since everything is client-side (Firebase, local state, file processing).

---

## 15. TAILWIND CONFIG

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
};
```

---

## 16. SUMMARY: WHAT TO BUILD

### Pages (4 total):
1. `/dashboard` — Stats overview + campaign list
2. `/import` — File upload → process → export/save
3. `/database` — View all leads, filter, export, sync
4. `/coming-soon` — Feature roadmap page

### Key Features:
- Meta Ads CSV parsing with smart phone/email extraction
- Phone extracted from BOTH the Phone column AND Body Text (fallback)
- Deduplication by Page ID (same company = many ads → 1 lead)
- Firebase chunked storage (100 leads/doc = 100x fewer reads)
- Local cache with sync timestamp + manual Sync button
- Export: MSG91 CSV or Full details CSV/Excel
- Database with campaign filter + contact type filter + search
- WhatsApp sent tracking per lead
- All external links open in new tab

### What NOT to build:
- No login/auth system
- No backend (pure client-side Next.js + Firebase)
- No dark mode
- No mobile app (desktop web only)
- No API routes needed

---

*PRD Version 1.0 — LeadSync Pro — June 2026*
*Built for RD Models Pvt. Ltd. internal use*