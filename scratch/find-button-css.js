const fs = require('fs');
const css = fs.readFileSync('d:/AI/Project test/src/app/globals.css', 'utf8');

const regex = /(?:^|\}|\s)button[^{]*\{([^}]*)\}/gi;
let match;
while ((match = regex.exec(css))) {
    console.log("Found button selector rule:", match[0].trim());
}
