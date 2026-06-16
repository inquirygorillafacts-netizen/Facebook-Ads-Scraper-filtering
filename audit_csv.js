/**
 * AUDIT SCRIPT: Manual verification of Township.csv parsing
 * 
 * This script:
 * 1. Parses the real CSV file using our parser
 * 2. Manually checks edge cases
 * 3. Reports every potential issue
 * 4. Validates phone cleaning on real data
 */

const fs = require('fs');
const Papa = require('papaparse');

// ─── Phone Cleaning (copied from our lib for standalone test) ────────────
function cleanPhone(rawPhone) {
  if (!rawPhone) return null;
  const candidates = String(rawPhone).split(/[,;]/);
  for (const candidate of candidates) {
    let digits = candidate.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    if (digits.length !== 10) continue;
    return digits;
  }
  return null;
}

function extractPhoneFromBodyText(bodyText) {
  if (!bodyText) return null;
  const mobilePattern = /[6-9]\d{9}/g;
  const matches = String(bodyText).match(mobilePattern);
  if (matches && matches.length > 0) return matches[0];
  return null;
}

function getBestPhone(phoneColumn, bodyText) {
  const direct = cleanPhone(phoneColumn);
  if (direct) return { phone: direct, source: 'direct' };
  const fromBody = extractPhoneFromBodyText(bodyText);
  if (fromBody) return { phone: fromBody, source: 'bodyText' };
  return { phone: null, source: null };
}

function normalizeUrl(url) {
  if (!url) return null;
  if (['fb.me', 'facebook.com', 'www.facebook.com'].includes(url)) return null;
  if (!url.startsWith('http')) return `https://${url}`;
  return url;
}

// ─── Parse the CSV ────────────────────────────────────────────────────────
const csvPath = 'c:\\Users\\RD Models\\Desktop\\yogi\\meta ads screper\\leadsync-pro\\Township.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log('=== LEADSYNC PRO — REAL CSV AUDIT ===\n');
console.log(`File: Township.csv`);
console.log(`File size: ${(Buffer.byteLength(csvContent) / 1024 / 1024).toFixed(2)} MB`);

const results = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
});

const rows = results.data;
console.log(`Total parsed rows: ${rows.length}`);

// ─── Check header names ───────────────────────────────────────────────────
const expectedHeaders = [
  'Ad Archive ID', 'Page Profile URI', 'Website URL', 'Facebook', 'Instagram',
  'TikTok', 'YouTube', 'Email', 'Phone', 'Twitter', 'LinkedIn', 'Pinterest',
  'Page ID', 'Link URL', 'Page Name', 'Facebook AD URL', 'Body Text',
  'Page Like Count', 'CTA Text', 'Content (Caption)', 'Publisher Platform',
  'Start Date', 'End Date', 'Videos', 'Images', 'Cards Body', 'Cards Link URL',
  'Cards Caption', 'Cards CTA Text', 'Cards Images', 'Cards Videos'
];

const actualHeaders = results.meta.fields || [];
console.log(`\nActual column count: ${actualHeaders.length}`);

const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
const extraHeaders = actualHeaders.filter(h => !expectedHeaders.includes(h));

if (missingHeaders.length > 0) {
  console.log(`\n⚠️ MISSING COLUMNS: ${JSON.stringify(missingHeaders)}`);
} else {
  console.log(`\n✅ All 31 expected columns present`);
}
if (extraHeaders.length > 0) {
  console.log(`⚠️ EXTRA COLUMNS: ${JSON.stringify(extraHeaders)}`);
}

// ─── Analyze column emptiness ─────────────────────────────────────────────
console.log('\n=== COLUMN FILL RATES ===');
const usefulColumns = ['Page ID', 'Page Name', 'Phone', 'Email', 'Facebook', 'Instagram', 
  'Website URL', 'Facebook AD URL', 'Link URL', 'Page Profile URI', 'Body Text'];

for (const col of usefulColumns) {
  const filled = rows.filter(r => r[col] && r[col].trim()).length;
  const pct = ((filled / rows.length) * 100).toFixed(1);
  console.log(`  ${col}: ${filled}/${rows.length} (${pct}%)`);
}

// ─── Group by Page ID ─────────────────────────────────────────────────────
const byPageId = new Map();
let noPageIdCount = 0;
for (const row of rows) {
  const pageId = row['Page ID']?.trim();
  if (!pageId) { noPageIdCount++; continue; }
  if (!byPageId.has(pageId)) byPageId.set(pageId, []);
  byPageId.get(pageId).push(row);
}

console.log(`\n=== DEDUPLICATION ===`);
console.log(`Rows with no Page ID: ${noPageIdCount}`);
console.log(`Unique companies (Page IDs): ${byPageId.size}`);
console.log(`Duplication ratio: ${rows.length} rows → ${byPageId.size} companies`);

// Show top duplicated companies
const dupes = [...byPageId.entries()]
  .map(([id, rows]) => ({ id, name: rows[0]['Page Name'], count: rows.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);
console.log(`\nTop 10 most duplicated companies:`);
dupes.forEach((d, i) => console.log(`  ${i+1}. "${d.name}" (Page ID: ${d.id}) — ${d.count} ads`));

// ─── Process leads like our parser ────────────────────────────────────────
const leads = [];
let noContactSkipped = 0;
let phoneFromDirect = 0;
let phoneFromBody = 0;
let noPhone = 0;
let phoneCleaningIssues = [];

for (const [pageId, pageRows] of byPageId) {
  // Merge rows
  const merged = {};
  for (const row of pageRows) {
    for (const [key, value] of Object.entries(row)) {
      if (!merged[key] && value?.trim()) {
        merged[key] = value.trim();
      }
    }
  }

  // Phone extraction
  const rawPhone = merged['Phone'] || null;
  const bodyText = merged['Body Text'] || null;
  const { phone, source: phoneSource } = getBestPhone(rawPhone, bodyText);

  if (rawPhone && !cleanPhone(rawPhone)) {
    phoneCleaningIssues.push({
      pageId,
      name: merged['Page Name'],
      rawPhone,
      bodyPhone: extractPhoneFromBodyText(bodyText),
    });
  }

  if (phone) {
    if (phoneSource === 'direct') phoneFromDirect++;
    else phoneFromBody++;
  } else {
    noPhone++;
  }

  // Email
  const rawEmail = merged['Email']?.trim() || null;
  const email = rawEmail ? rawEmail.split(/[,;]/)[0].trim() : null;

  if (!phone && !email) {
    noContactSkipped++;
    continue;
  }

  // Website
  const website = normalizeUrl(merged['Website URL']?.trim() || null);

  leads.push({
    id: pageId,
    name: merged['Page Name']?.trim() || null,
    phone,
    phoneSource,
    email,
    facebook: merged['Facebook']?.trim() || merged['Page Profile URI']?.trim() || null,
    instagram: merged['Instagram']?.trim() || null,
    website,
    adsLink: merged['Facebook AD URL']?.trim() || null,
    landingPage: merged['Link URL']?.trim() || null,
  });
}

console.log(`\n=== EXTRACTION RESULTS ===`);
console.log(`Valid leads (phone OR email): ${leads.length}`);
console.log(`Skipped (no contact): ${noContactSkipped}`);
console.log(`\nPhone extraction:`);
console.log(`  From Phone column: ${phoneFromDirect}`);
console.log(`  From Body Text: ${phoneFromBody}`);
console.log(`  No phone found: ${noPhone}`);
console.log(`\nLeads with phone: ${leads.filter(l => l.phone).length}`);
console.log(`Leads with email: ${leads.filter(l => l.email).length}`);
console.log(`Leads with both: ${leads.filter(l => l.phone && l.email).length}`);
console.log(`Leads with website: ${leads.filter(l => l.website).length}`);
console.log(`Leads with instagram: ${leads.filter(l => l.instagram).length}`);

// ─── PHONE CLEANING EDGE CASES ───────────────────────────────────────────
console.log(`\n=== PHONE CLEANING ANALYSIS ===`);
console.log(`Phone column had data but cleaning failed: ${phoneCleaningIssues.length}`);

if (phoneCleaningIssues.length > 0) {
  console.log(`\n--- Failed phone extractions (showing first 20): ---`);
  phoneCleaningIssues.slice(0, 20).forEach((issue, i) => {
    console.log(`  ${i+1}. "${issue.name}" — Raw: "${issue.rawPhone}"`);
    console.log(`     Body fallback: ${issue.bodyPhone || 'NONE'}`);
  });
}

// ─── Unique phone numbers check ───────────────────────────────────────────
const allPhones = leads.filter(l => l.phone).map(l => l.phone);
const uniquePhones = new Set(allPhones);
console.log(`\n=== PHONE UNIQUENESS ===`);
console.log(`Total phone numbers: ${allPhones.length}`);
console.log(`Unique phone numbers: ${uniquePhones.size}`);
console.log(`Duplicate phones across companies: ${allPhones.length - uniquePhones.size}`);

// ─── Sample output (first 15 leads) ──────────────────────────────────────
console.log(`\n=== SAMPLE LEADS (first 15) ===`);
leads.slice(0, 15).forEach((lead, i) => {
  console.log(`\n  ${i+1}. ${lead.name || '(no name)'}`);
  console.log(`     Phone: ${lead.phone || '—'} (source: ${lead.phoneSource || 'none'})`);
  console.log(`     Email: ${lead.email || '—'}`);
  console.log(`     Website: ${lead.website || '—'}`);
  console.log(`     Facebook: ${lead.facebook ? 'YES' : '—'}`);
  console.log(`     Instagram: ${lead.instagram ? 'YES' : '—'}`);
  console.log(`     Ads Link: ${lead.adsLink ? 'YES' : '—'}`);
});

// ─── Specific edge case checks ────────────────────────────────────────────
console.log(`\n=== EDGE CASE CHECKS ===`);

// Check: Multi-line Body Text entries
const multiLineBodyRows = rows.filter(r => r['Body Text']?.includes('\n'));
console.log(`Rows with multi-line Body Text: ${multiLineBodyRows.length}`);

// Check: Phone column with comma-separated numbers
const multiPhoneRows = rows.filter(r => r['Phone'] && r['Phone'].includes(','));
console.log(`Rows with multiple phones (comma-separated): ${multiPhoneRows.length}`);
if (multiPhoneRows.length > 0) {
  console.log(`  Sample multi-phone values:`);
  const uniqueMultiPhones = [...new Set(multiPhoneRows.map(r => r['Phone']))];
  uniqueMultiPhones.slice(0, 10).forEach(p => {
    const cleaned = cleanPhone(p);
    console.log(`    "${p}" → "${cleaned}"`);
  });
}

// Check: Email with multiple addresses
const multiEmailRows = rows.filter(r => r['Email'] && (r['Email'].includes(',') || r['Email'].includes(';')));
console.log(`\nRows with multiple emails: ${multiEmailRows.length}`);

// Check: Website = fb.me (placeholder)
const fbMeRows = rows.filter(r => r['Website URL']?.trim() === 'fb.me');
console.log(`Rows with website = "fb.me": ${fbMeRows.length}`);

// Check: Empty Page Name
const noNameRows = rows.filter(r => !r['Page Name']?.trim());
console.log(`Rows with no Page Name: ${noNameRows.length}`);

// Check: Leads that ONLY have body text phone (no Phone column)
const bodyOnlyLeads = leads.filter(l => l.phoneSource === 'bodyText');
console.log(`\nLeads where phone was extracted from Body Text only: ${bodyOnlyLeads.length}`);
if (bodyOnlyLeads.length > 0) {
  console.log(`  Examples:`);
  bodyOnlyLeads.slice(0, 5).forEach(l => {
    console.log(`    "${l.name}" → Phone: ${l.phone}`);
  });
}

// ─── MSG91 export preview ─────────────────────────────────────────────────
console.log(`\n=== MSG91 EXPORT PREVIEW ===`);
const msg91Leads = leads.filter(l => l.phone);
console.log(`MSG91 ready leads (with phone): ${msg91Leads.length}`);
console.log(`\nFirst 10 MSG91 entries:`);
console.log(`Mobile,Name`);
msg91Leads.slice(0, 10).forEach(l => {
  console.log(`${l.phone},${l.name || ''}`);
});

console.log(`\n=== AUDIT COMPLETE ===`);
