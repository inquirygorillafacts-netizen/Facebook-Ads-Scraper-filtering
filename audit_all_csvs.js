const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

const files = [
  'Township.csv',
  'Mixed Use Development.csv',
  'Integrated Township.csv',
  'Commercial Project.csv'
];

const basePath = 'c:\\Users\\RD Models\\Desktop\\yogi\\meta ads screper\\leadsync-pro';

let allHeaders = new Set();
let fileStats = [];

for (const file of files) {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing file: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = results.meta.fields || [];
  headers.forEach(h => allHeaders.add(h));

  fileStats.push({
    name: file,
    rowCount: results.data.length,
    headerCount: headers.length,
    headers: headers
  });
}

console.log('=== MULTIPLE CSV FORMAT ANALYSIS ===\n');

for (const stat of fileStats) {
  console.log(`📄 File: ${stat.name}`);
  console.log(`   Rows: ${stat.rowCount}`);
  console.log(`   Columns: ${stat.headerCount}`);
}

console.log('\n=== HEADER COMPARISON ===');
const baseHeaders = fileStats[0].headers;
let formatIsConsistent = true;

for (let i = 1; i < fileStats.length; i++) {
  const currentHeaders = fileStats[i].headers;
  
  const missing = baseHeaders.filter(h => !currentHeaders.includes(h));
  const extra = currentHeaders.filter(h => !baseHeaders.includes(h));

  if (missing.length > 0 || extra.length > 0) {
    formatIsConsistent = false;
    console.log(`\n⚠️ Format difference in: ${fileStats[i].name}`);
    if (missing.length > 0) console.log(`   Missing columns:`, missing);
    if (extra.length > 0) console.log(`   Extra columns:`, extra);
  }
}

if (formatIsConsistent) {
  console.log('✅ Sabhi 4 files ka format aur column names bilkul SAME hain!');
}

console.log('\nList of all unique columns across all files:');
console.log(Array.from(allHeaders).join(', '));
