/**
 * Meta Ads Library CSV parser.
 * Groups rows by Page ID, extracts multiple unique phone numbers per row, merges duplicates.
 */
import Papa from 'papaparse';
import { extractAllIndianPhones } from './phoneExtractor';
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
            // Extract all unique valid Indian phones from ALL columns of this row
            const allPhonesInRow = new Set<string>();
            for (const val of Object.values(row)) {
              if (val && val.trim()) {
                const phones = extractAllIndianPhones(val);
                phones.forEach(p => allPhonesInRow.add(p));
              }
            }
            const phonesArray = Array.from(allPhonesInRow);

            // Extract email (take first if multiple)
            const rawEmail = row[CSV_COLUMNS.EMAIL]?.trim() || null;
            let email = rawEmail ? rawEmail.split(/[,;]/)[0].trim().toLowerCase() : null;

            // Must have at least one phone OR an email
            if (phonesArray.length === 0 && !email) {
              noContactSkipped++;
              continue;
            }

            // Create a lead for EACH phone found. If no phone, create 1 lead for the email.
            const numLeadsToCreate = phonesArray.length > 0 ? phonesArray.length : 1;

            for (let i = 0; i < numLeadsToCreate; i++) {
              let currentPhone = phonesArray.length > 0 ? phonesArray[i] : null;
              
              // Only attach email to the FIRST phone variant so we don't unnecessarily strip duplicates 
              // for the same contact that has 10 phones and 1 email. 
              let currentEmail = i === 0 ? email : null;

              // Asset-based stripping (Local Deduplication within this file)
              let mergeTarget: RawLead | undefined;

              if (currentPhone && phoneMap.has(currentPhone)) {
                mergeTarget = phoneMap.get(currentPhone);
                currentPhone = null; // Strip the duplicate phone
              }

              if (currentEmail && emailMap.has(currentEmail)) {
                if (!mergeTarget) mergeTarget = emailMap.get(currentEmail);
                currentEmail = null; // Strip the duplicate email
              }

              // If BOTH were stripped (or if the only thing it had was stripped)
              if (!currentPhone && !currentEmail) {
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
              if (currentPhone) phoneCount++;
              if (currentEmail) emailCount++;
              if (currentPhone && currentEmail) bothCount++;

              // Use a random UUID for the lead ID since one row can spawn multiple leads
              const leadId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

              const lead: RawLead = {
                id: leadId,
                name: row[CSV_COLUMNS.PAGE_NAME]?.trim() || null,
                phone: currentPhone,
                phoneSource: currentPhone ? 'direct' : null, // Not tracking BodyText specifically anymore as we scan all
                email: currentEmail,
                facebook: row[CSV_COLUMNS.FACEBOOK]?.trim() || row[CSV_COLUMNS.PAGE_PROFILE_URI]?.trim() || null,
                instagram: row[CSV_COLUMNS.INSTAGRAM]?.trim() || null,
                website: normalizeUrl(row[CSV_COLUMNS.WEBSITE_URL]?.trim() || null),
                adsLink: row[CSV_COLUMNS.FACEBOOK_AD_URL]?.trim() || null,
                landingPage: row[CSV_COLUMNS.LINK_URL]?.trim() || null,
                whatsappSent: false,
                addedAt: new Date().toISOString(),
              };

              leads.push(lead);
              if (currentPhone) phoneMap.set(currentPhone, lead);
              if (currentEmail) emailMap.set(currentEmail, lead);
            }
          }

          resolve({
            leads,
            stats: {
              totalRawRows,
              uniqueCompanies: leads.length, // Total extracted valid records
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
