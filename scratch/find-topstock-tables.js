const fs = require('fs');
const contentPath = 'C:/Users/doand/.gemini/antigravity/brain/d20e4dee-6635-4c93-af25-8fd32b5084b4/.system_generated/steps/3032/content.md';
const content = fs.readFileSync(contentPath, 'utf8');

// Find all HTML tables and print their full content if they are inside topstock
const regex = /<div class="topstock">([\s\S]*?)<\/div>/gi;
const match = regex.exec(content);
if (match) {
    console.log("Found topstock div length:", match[0].length);
    // Find tables inside this match
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let idx = 0;
    while ((tableMatch = tableRegex.exec(match[0]))) {
        idx++;
        console.log(`Table ${idx}:`);
        console.log(tableMatch[0].substring(0, 1000));
        console.log('---------------------------------');
    }
} else {
    console.log("No topstock div found");
}
