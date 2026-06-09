const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the widget-header with inline styles
const oldHeader = `<div className="widget-header" style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>`;
const newHeader = `<div className="widget-header podcast-header">`;

const oldH3 = `<h3 style={{ margin: 0, fontSize: "0.85rem", letterSpacing: "1.5px" }}>`;
const newH3 = `<h3 className="podcast-header-title">`;

const oldSpan = `<span style={{ marginRight: "6px" }}>`;
const newSpan = `<span className="podcast-header-icon">`;

const oldStatusDiv = `<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>`;
const newStatusDiv = `<div className="podcast-header-status">`;

let count = 0;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  count++;
  console.log('Replaced widget-header inline style');
}

if (content.includes(oldH3)) {
  content = content.replace(oldH3, newH3);
  count++;
  console.log('Replaced h3 inline style');
}

if (content.includes(oldSpan)) {
  content = content.replace(oldSpan, newSpan);
  count++;
  console.log('Replaced span inline style');
}

if (content.includes(oldStatusDiv)) {
  content = content.replace(oldStatusDiv, newStatusDiv);
  count++;
  console.log('Replaced status div inline style');
}

if (count > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\nDone! ${count} replacements made.`);
} else {
  console.log('No matches found. Checking for variations...');
  
  // Search for the patterns with different whitespace
  const headerIdx = content.indexOf('marginBottom: "0.75rem"');
  console.log('marginBottom found at index:', headerIdx);
  if (headerIdx > 0) {
    console.log('Context around match:');
    console.log(JSON.stringify(content.substring(headerIdx - 80, headerIdx + 80)));
  }
}
