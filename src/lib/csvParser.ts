/**
 * Meta Ads Library CSV parser.
 * Groups rows by Page ID, merges duplicates, extracts clean lead data.
 */
import Papa from 'papaparse';
import { getBestPhone } from './phoneExtractor';
import { CSV_COLUMNS } from '../constants';
import type { RawLead, ParsedFile } from '../types';

// URLs to filter out as "not a real website"
const JUNK_URLS = [
  'fb.me', 'facebook.com', 'www.facebook.com',
  'api.whatsapp.com', 'wa.me',
  'play.google.com', 'apps.apple.com',
  'l.facebook.com', 'lm.facebook.com',
  'm.facebook.com',
  'bit.ly', 'tinyurl.com',
];

/**
 * Parse a Meta Ads Library CSV file and return deduplicated, cleaned leads.
 */
export async function parseMetaAdsCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const totalRawRows = rows.length;

          const leads: RawLead[] = [];
          let duplicatesSkipped = 0;
          let noContactSkipped = 0;
          let phoneCount = 0;
          let emailCount = 0;
          let bothCount = 0;

          const phoneMap = new Map<string, RawLead>();
          const emailMap = new Map<string, RawLead>();

          for (const row of rows) {
            // Extract phone
            let { phone, source: phoneSource } = getBestPhone(
              row[CSV_COLUMNS.PHONE] || null,
              row[CSV_COLUMNS.BODY_TEXT] || null
            );

            // Extract email (take first if multiple)
            const rawEmail = row[CSV_COLUMNS.EMAIL]?.trim() || null;
            let email = rawEmail ? rawEmail.split(/[,;]/)[0].trim().toLowerCase() : null;

            // Must have phone OR email
            if (!phone && !email) {
              noContactSkipped++;
              continue;
            }

            // Asset-based stripping (Local Deduplication)
            let mergeTarget: RawLead | undefined;

            if (phone && phoneMap.has(phone)) {
              mergeTarget = phoneMap.get(phone);
              phone = null; // Strip the duplicate phone
              phoneSource = null;
            }

            if (email && emailMap.has(email)) {
              if (!mergeTarget) mergeTarget = emailMap.get(email);
              email = null; // Strip the duplicate email
            }

            // If BOTH were stripped (or if the only thing it had was stripped)
            if (!phone && !email) {
              duplicatesSkipped++;
              
              // Smart merge missing fields into the merge target
              if (mergeTarget) {
                if (!mergeTarget.name && row[CSV_COLUMNS.PAGE_NAME]) mergeTarget.name = row[CSV_COLUMNS.PAGE_NAME].trim();
                if (!mergeTarget.facebook && row[CSV_COLUMNS.FACEBOOK]) mergeTarget.facebook = row[CSV_COLUMNS.FACEBOOK].trim();
                if (!mergeTarget.instagram && row[CSV_COLUMNS.INSTAGRAM]) mergeTarget.instagram = row[CSV_COLUMNS.INSTAGRAM].trim();
                const url = normalizeUrl(row[CSV_COLUMNS.WEBSITE_URL]?.trim() || null);
                if (!mergeTarget.website && url) mergeTarget.website = url;
                if (!mergeTarget.adsLink && row[CSV_COLUMNS.FACEBOOK_AD_URL]) mergeTarget.adsLink = row[CSV_COLUMNS.FACEBOOK_AD_URL].trim();
                if (!mergeTarget.landingPage && row[CSV_COLUMNS.LINK_URL]) mergeTarget.landingPage = row[CSV_COLUMNS.LINK_URL].trim();
              }
              continue;
            }

            // Track counts based on what SURVIVED the stripping
            if (phone) phoneCount++;
            if (email) emailCount++;
            if (phone && email) bothCount++;

            // Use a random UUID for the lead ID since one page can have multiple leads
            const leadId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

            const lead: RawLead = {
              id: leadId,
              name: row[CSV_COLUMNS.PAGE_NAME]?.trim() || null,
              phone,
              phoneSource,
              email,
              facebook: row[CSV_COLUMNS.FACEBOOK]?.trim() ||
                row[CSV_COLUMNS.PAGE_PROFILE_URI]?.trim() || null,
              instagram: row[CSV_COLUMNS.INSTAGRAM]?.trim() || null,
              website: normalizeUrl(row[CSV_COLUMNS.WEBSITE_URL]?.trim() || null),
              adsLink: row[CSV_COLUMNS.FACEBOOK_AD_URL]?.trim() || null,
              landingPage: row[CSV_COLUMNS.LINK_URL]?.trim() || null,
              whatsappSent: false,
              addedAt: new Date().toISOString(),
            };

            leads.push(lead);
            if (phone) phoneMap.set(phone, lead);
            if (email) emailMap.set(email, lead);
          }

          resolve({
            leads,
            stats: {
              totalRawRows,
              uniqueCompanies: leads.length, // Renaming logical meaning to "Unique Contacts"
              validLeads: leads.length,
              duplicatesSkipped,
              noContactSkipped,
              phoneCount,
              emailCount,
              bothCount,
            },
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => reject(error),
    });
  });
}

/** Merge multiple rows for the same Page ID — take first non-empty value per field. */
function mergeRows(rows: Record<string, string>[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!merged[key] && value?.trim()) {
        merged[key] = value.trim();
      }
    }
  }
  return merged;
}

/** Normalize URL: add https:// prefix, filter out junk/placeholder URLs. */
function normalizeUrl(url: string | null): string | null {
  if (!url) return null;

  // Check against junk URL list
  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  for (const junk of JUNK_URLS) {
    if (cleanUrl === junk || cleanUrl.startsWith(junk + '/')) {
      return null;
    }
  }

  if (!url.startsWith('http')) return `https://${url}`;
  return url;
}

/** Extract campaign name from filename. */
export function extractCampaignName(filename: string): string {
  let name = filename;

  // Remove extension
  name = name.replace(/\.csv$/i, '');

  // Remove common suffixes
  const suffixes = [
    '_Lead', '_Leads', '_Data', '_data', '_ads', '_Ads',
    '_output', '_Output', '_export', '_Export', '_results', '_Results',
    '_list', '_List', '_contacts', '_Contacts',
  ];
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
    }
  }

  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ');

  // Title case
  name = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return name || filename.replace(/\.csv$/i, '');
}
