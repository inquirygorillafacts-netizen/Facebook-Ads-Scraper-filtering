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
  _campaignName?: string; // Added at runtime for display
  _campaignId?: string;   // Added at runtime for operations
}

/**
 * Compressed format for Firebase Firestore storage.
 * Minimizes document size to fit 5M leads under 1GB quota.
 * Null values should be entirely omitted.
 */
export interface CompressedLead {
  pageId?: string;       // Page ID
  name?: string;         // Name
  phone?: string;        // Phone
  email?: string;        // Email
  facebook?: string;     // Facebook URL
  instagram?: string;    // Instagram URL
  website?: string;      // Website URL
  adId?: string;         // Ad Archive ID (extracted from adsLink)
  landingPage?: string;  // Landing Page
  whatsappSent?: boolean; // whatsappSent
  addedAt?: string;      // Added at timestamp
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
  phoneCount: number;
  emailCount: number;
  bothCount: number;
}

export interface Campaign {
  id: string;           // Firestore doc ID
  name: string;         // User-given campaign name
  keyword: string;      // Original filename-based keyword
  originalFileName: string;
  totalRawRows: number;
  totalLeads: number;
  duplicatesSkipped: number;
  noContactSkipped: number;
  phoneCount: number;
  emailCount: number;
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
  leads: RawLead[];
  syncedAt: string;
  version: number;
}

export type ExportType = 'msg91' | 'full';
export type ExportFormat = 'csv' | 'excel';
export type FilterType = 'all' | 'phone_only' | 'email_only' | 'both' | 'whatsapp_sent' | 'whatsapp_pending';

export interface ProcessingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export interface SelectedFile {
  file: File;
  name: string;
  size: number;
}
