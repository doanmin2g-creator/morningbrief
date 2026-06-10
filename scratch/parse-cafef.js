const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\doand\\.gemini\\antigravity\\brain\\d20e4dee-6635-4c93-af25-8fd32b5084b4\\.system_generated\\steps\\3032\\content.md';
const content = fs.readFileSync(contentPath, 'utf8');

// Find all HTML tables or major divs
console.log("Searching for tables...");
const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
let match;
let count = 0;
while ((match = tableRegex.exec(content)) && count < 20) {
    count++;
    const tableHeader = match[0].substring(0, 100);
    console.log(`Table ${count}: ${tableHeader}... Length: ${match[0].length}`);
    if (match[0].includes("tăng") || match[0].includes("giảm") || match[0].includes("Khối lượng") || match[0].includes("GD")) {
        console.log("  -> Contains match keywords!");
    }
}

console.log("\nSearching for divs with matching classes/ids...");
const divRegex = /<div\s+[^>]*class="[^"]*(?:gain|lose|active|volume|giao-dich|solieu|tab)[^"]*"[^>]*>/gi;
count = 0;
while ((match = divRegex.exec(content)) && count < 30) {
    count++;
    console.log(`Div ${count}: ${match[0]}`);
}
