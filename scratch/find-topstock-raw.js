const fs = require('fs');
const contentPath = 'C:/Users/doand/.gemini/antigravity/brain/d20e4dee-6635-4c93-af25-8fd32b5084b4/.system_generated/steps/3032/content.md';
const content = fs.readFileSync(contentPath, 'utf8');

const index = content.indexOf('class="topstock"');
if (index !== -1) {
    console.log(content.substring(index, index + 6000));
} else {
    console.log("Not found");
}
