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

  const phones = new Set<string>();
  const emails = new Set<string>();

  for (const row of rows) {
    const pCol = row['Phone'] || null;
    const bCol = row['Body Text'] || row['Content (Caption)'] || null;
    const phone = getBestPhone(pCol, bCol);
    
    let email = row['Email']?.trim() || null;
    if (email) email = email.split(/[,;]/)[0].trim().toLowerCase();

    if (phone) phones.add(phone);
    if (email) emails.add(email);
  }

  return { phones, emails };
}

const township = extractLeads('C:\\Users\\RD Models\\Desktop\\yogi\\meta ads screper\\leadsync-pro\\Township.csv');
const integrated = extractLeads('C:\\Users\\RD Models\\Desktop\\yogi\\meta ads screper\\leadsync-pro\\Integrated Township.csv');

let duplicates = 0;
const duplicatePhones = [];
const duplicateEmails = [];

for (const phone of integrated.phones) {
  if (township.phones.has(phone)) {
    duplicates++;
    duplicatePhones.push(phone);
  }
}

for (const email of integrated.emails) {
  if (township.emails.has(email)) {
    duplicates++;
    duplicateEmails.push(email);
  }
}

console.log(`Duplicate Phones: ${duplicatePhones.length}`);
console.log(`Duplicate Emails: ${duplicateEmails.length}`);
// Note: If a lead has BOTH a duplicate phone and email, it's considered 1 duplicate in the app
// So the real duplicates count is a bit more complex (union), but this gives us raw intersection
console.log('Sample Duplicate Phones:', duplicatePhones.slice(0, 5));
