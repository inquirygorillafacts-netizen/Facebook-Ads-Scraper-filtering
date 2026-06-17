import fs from 'fs';
import Papa from 'papaparse';

// Simple phone extractor mirroring the logic in phoneExtractor.ts
function cleanPhone(raw: string): string {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  return cleaned;
}

function getBestPhone(phoneCol: string | null, bodyCol: string | null): string | null {
  const phonePattern = /(?:(?:\+|0{0,2})91(\s*[\ -]\s*)?|[0]?)?[6789]\d{9}/g;
  
  if (phoneCol) {
    const match = phoneCol.match(phonePattern);
    if (match) return cleanPhone(match[0]);
  }
  
  if (bodyCol) {
    const match = bodyCol.match(phonePattern);
    if (match) return cleanPhone(match[0]);
  }
  
  return null;
}

function extractLeads(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = Papa.parse(content, { header: true, skipEmptyLines: true });
  const rows = results.data as any[];

  // Same logic as updated csvParser
  const leads = [];
  const phoneMap = new Map<string, any>();
  const emailMap = new Map<string, any>();

  for (const row of rows) {
    const pCol = row['Phone'] || null;
    const bCol = row['Body Text'] || row['Content (Caption)'] || null;
    const phone = getBestPhone(pCol, bCol);
    
    let email = row['Email']?.trim() || null;
    if (email) email = email.split(/[,;]/)[0].trim().toLowerCase();

    if (!phone && !email) continue;

    let existingLead;
    if (phone && phoneMap.has(phone)) existingLead = phoneMap.get(phone);
    else if (email && emailMap.has(email)) existingLead = emailMap.get(email);

    if (existingLead) {
       // local duplicate, skip adding
       if (phone && !phoneMap.has(phone)) phoneMap.set(phone, existingLead);
       if (email && !emailMap.has(email)) emailMap.set(email, existingLead);
       continue;
    }

    const lead = { phone, email };
    leads.push(lead);
    if (phone) phoneMap.set(phone, lead);
    if (email) emailMap.set(email, lead);
  }

  return { leads, phoneMap, emailMap };
}

const township = extractLeads('C:\\Users\\RD Models\\Desktop\\yogi\\meta ads screper\\leadsync-pro\\Township.csv');
const integrated = extractLeads('C:\\Users\\RD Models\\Desktop\\yogi\\meta ads screper\\leadsync-pro\\Integrated Township.csv');

// Mock existing DB with Township's extracted leads
const dbPhoneMap = new Map();
const dbEmailMap = new Map();
for (const lead of township.leads) {
  if (lead.phone) dbPhoneMap.set(lead.phone, lead);
  if (lead.email) dbEmailMap.set(lead.email, lead);
}

let duplicatesSkipped = 0;

for (const lead of integrated.leads) {
  const phoneExists = lead.phone && dbPhoneMap.has(lead.phone);
  const emailExists = lead.email && dbEmailMap.has(lead.email);

  if (phoneExists || emailExists) {
    duplicatesSkipped++;
  }
}

console.log(`\nExact Global Duplicates Skipped: ${duplicatesSkipped}\n`);
