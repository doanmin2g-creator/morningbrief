const fs = require('fs');
const contentPath = 'C:/Users/doand/.gemini/antigravity/brain/d20e4dee-6635-4c93-af25-8fd32b5084b4/.system_generated/steps/3032/content.md';
const content = fs.readFileSync(contentPath, 'utf8');

const regex = /<div[^>]*class="[^"]*topstock[^"]*"[\s\S]*?<\/div>/gi;
let match;
let count = 0;
while ((match = regex.exec(content)) && count < 10) {
    count++;
    console.log(`Match ${count}:`);
    console.log(match[0].substring(0, 500));
    console.log('---------------------------------');
}
