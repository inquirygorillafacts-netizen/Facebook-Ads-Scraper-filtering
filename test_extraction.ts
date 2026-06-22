import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { extractAllIndianPhones } from './src/lib/phoneExtractor';

const folder = String.raw`c:\Users\RD Models\Desktop\yogi\meta ads screper\Facebook Ads Scraper\Meta Ads Library scrape 1`;

async function testExtraction() {
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.csv'));
  let totalRawRows = 0;
  let totalPhonesExtracted = 0;
  
  // Global dedup set
  const uniquePhones = new Set<string>();
  const phoneToFiles = new Map<string, Set<string>>();

  for (const file of files) {
    const filePath = path.join(folder, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse using Papa in Node
    const results = Papa.parse(content, { header: true, skipEmptyLines: true });
    const rows = results.data as Record<string, string>[];
    
    totalRawRows += rows.length;
    let filePhones = 0;

    for (const row of rows) {
      for (const val of Object.values(row)) {
        if (val && typeof val === 'string' && val.trim()) {
          const phones = extractAllIndianPhones(val);
          for (const p of phones) {
            uniquePhones.add(p);
            filePhones++;
            
            if (!phoneToFiles.has(p)) {
              phoneToFiles.set(p, new Set());
            }
            phoneToFiles.get(p)!.add(file);
          }
        }
      }
    }
    
    console.log(`[${file}] Rows: ${rows.length} | Phones Found (incl duplicates): ${filePhones}`);
    totalPhonesExtracted += filePhones;
  }

  console.log("\n=============================================");
  console.log("             TEST RESULTS                    ");
  console.log("=============================================");
  console.log(`Total Files Processed  : ${files.length}`);
  console.log(`Total Rows Scanned     : ${totalRawRows}`);
  console.log(`Total Phones Extracted : ${totalPhonesExtracted}`);
  console.log(`UNIQUE INDIAN MOBILES  : ${uniquePhones.size}`);
  console.log("=============================================\n");

  // Show a few examples of numbers found in multiple files
  const multiFilePhones = Array.from(phoneToFiles.entries())
    .filter(([_, filesSet]) => filesSet.size > 1)
    .sort((a, b) => b[1].size - a[1].size);

  if (multiFilePhones.length > 0) {
    console.log(`Found ${multiFilePhones.length} phones that appear in multiple different campaigns/files.`);
    console.log("Top 5 cross-campaign numbers:");
    for (const [phone, filesSet] of multiFilePhones.slice(0, 5)) {
      console.log(` - 91${phone} appears in ${filesSet.size} files: ${Array.from(filesSet).join(', ')}`);
    }
  }
}

testExtraction().catch(console.error);
