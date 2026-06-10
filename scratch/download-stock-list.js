const fs = require('fs');
const path = require('path');

async function run() {
  const url = 'https://raw.githubusercontent.com/youngsu-park-69/vietnam-stock-data/main/data/vietnam_companies.csv';
  console.log('Downloading stock list from:', url);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download CSV');
  
  const text = await res.text();
  const lines = text.split('\n');
  
  // Parse CSV header
  const header = lines[0].split(',');
  const symbolIdx = header.indexOf('symbol');
  const nameIdx = header.indexOf('name');
  const nameVnIdx = header.indexOf('name_vn');
  const exchangeIdx = header.indexOf('exchange');
  
  const companies = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line handling commas within quotes
    const cols = [];
    let insideQuotes = false;
    let currentCol = '';
    
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cols.push(currentCol);
        currentCol = '';
      } else {
        currentCol += char;
      }
    }
    cols.push(currentCol);
    
    const symbol = cols[symbolIdx]?.trim();
    const name = cols[nameIdx]?.trim().replace(/^"|"$/g, '');
    const name_vn = cols[nameVnIdx]?.trim().replace(/^"|"$/g, '');
    const exchange = cols[exchangeIdx]?.trim();
    
    if (symbol && exchange) {
      companies.push({ symbol, name, name_vn, exchange });
    }
  }
  
  console.log(`Parsed ${companies.length} companies.`);
  
  const targetDir = path.join(__dirname, '..', 'src', 'app', 'api', 'stock-search');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const targetPath = path.join(targetDir, 'companies.json');
  fs.writeFileSync(targetPath, JSON.stringify(companies, null, 2));
  console.log('Wrote to:', targetPath);
}

run().catch(console.error);
