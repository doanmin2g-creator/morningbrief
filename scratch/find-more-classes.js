const fs = require('fs');
const css = fs.readFileSync('d:/AI/Project test/src/app/globals.css', 'utf8');

const regex = /\.[a-zA-Z0-9_-]*(?:see|more|load)[a-zA-Z0-9_-]*/gi;
const matches = css.match(regex) || [];
console.log("Matches:", Array.from(new Set(matches)));
