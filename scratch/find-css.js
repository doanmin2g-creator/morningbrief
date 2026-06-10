const fs = require('fs');
const css = fs.readFileSync('d:/AI/Project test/src/app/globals.css', 'utf8');

const regex = /\.see-more-btn[^{]*\{[^}]*\}/g;
let match;
while ((match = regex.exec(css))) {
    console.log("Found class rule:", match[0]);
}

console.log("All indexes of 'see-more-btn' in globals.css:");
let idx = css.indexOf('see-more-btn');
while (idx !== -1) {
    console.log("Index:", idx, "Around:", css.substring(idx - 20, idx + 40));
    idx = css.indexOf('see-more-btn', idx + 1);
}
