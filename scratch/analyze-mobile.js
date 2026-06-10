/**
 * Mobile Podcast Player Dimension Analyzer
 * Reads the CSS file and calculates expected dimensions for mobile viewports.
 * Also checks for conflicting rules and specificity issues.
 */
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const tsxPath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');

const css = fs.readFileSync(cssPath, 'utf8');
const tsx = fs.readFileSync(tsxPath, 'utf8');

console.log('═══════════════════════════════════════════════════');
console.log('  MOBILE PODCAST PLAYER — DIMENSION ANALYSIS');
console.log('═══════════════════════════════════════════════════\n');

// 1. Check for inline styles remaining in JSX
console.log('1️⃣  INLINE STYLE CHECK (page.tsx)');
console.log('─────────────────────────────────────');
const inlineStyleMatches = tsx.match(/podcast.*style\s*=\s*\{\{[^}]+\}\}/gi);
if (inlineStyleMatches) {
  console.log('⚠️  FOUND inline styles on podcast elements:');
  inlineStyleMatches.forEach(m => console.log('   ', m.substring(0, 100)));
} else {
  console.log('✅  No inline styles found on podcast elements');
}

// Check for the old problematic pattern
if (tsx.includes('marginBottom: "0.75rem"')) {
  console.log('❌  OLD BUG STILL PRESENT: marginBottom inline style on widget-header');
} else {
  console.log('✅  Old marginBottom inline style removed');
}

if (tsx.includes('podcast-header')) {
  console.log('✅  New podcast-header class applied');
} else {
  console.log('❌  podcast-header class NOT found');
}

// 2. Check CSS rules in 768px media query
console.log('\n2️⃣  CSS RULES — @media (max-width: 768px)');
console.log('─────────────────────────────────────');

const media768Match = css.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/);
if (media768Match) {
  const block = media768Match[1];
  
  const checks = [
    { class: '.podcast-player-card', props: ['min-height', 'padding', 'gap', 'justify-content'] },
    { class: '.podcast-player-body', props: ['flex', 'justify-content', 'gap'] },
    { class: '.podcast-cover-section', props: ['height', 'flex'] },
    { class: '.podcast-cover-wrap', props: ['width', 'height'] },
    { class: '.podcast-track-desc', props: ['max-height', 'flex'] },
    { class: '.podcast-timeline-section', props: ['flex', 'height'] },
    { class: '.podcast-controls-section', props: ['flex', 'height'] },
    { class: '.podcast-header', props: ['flex', 'margin-bottom'] },
  ];
  
  checks.forEach(({ class: cls, props }) => {
    const inBlock = block.includes(cls);
    const status = inBlock ? '✅' : '❌';
    
    if (inBlock) {
      // Extract the rule content
      const ruleStart = block.indexOf(cls);
      const braceStart = block.indexOf('{', ruleStart);
      const braceEnd = block.indexOf('}', braceStart);
      const ruleBody = block.substring(braceStart + 1, braceEnd).trim();
      
      const foundProps = props.filter(p => ruleBody.includes(p));
      const missingProps = props.filter(p => !ruleBody.includes(p));
      
      console.log(`${status} ${cls}`);
      if (foundProps.length) console.log(`   Found: ${foundProps.join(', ')}`);
      if (missingProps.length) console.log(`   ⚠️ Missing: ${missingProps.join(', ')}`);
    } else {
      console.log(`${status} ${cls} — NOT FOUND in 768px block`);
    }
  });
  
  // Check for flex: 0 0 auto pattern (critical for preventing stretch)
  const flexAutoCount = (block.match(/flex:\s*0\s+0\s+auto/g) || []).length;
  console.log(`\n   Total 'flex: 0 0 auto' rules: ${flexAutoCount} (should be ≥ 4)`);
  
  // Check for justify-content: flex-start
  if (block.includes('justify-content: flex-start')) {
    console.log('   ✅ justify-content: flex-start found');
  } else {
    console.log('   ❌ justify-content: flex-start NOT FOUND');
  }
  
} else {
  console.log('❌ 768px media query not found!');
}

// 3. Calculate expected card height on mobile
console.log('\n3️⃣  EXPECTED CARD HEIGHT CALCULATION (iPhone 14 Pro)');
console.log('─────────────────────────────────────');

const components = {
  'Card padding (top+bottom)': 14 + 14,
  'Header (~20px text + 6px pb)': 26,
  'Gap after header': 8,
  'Cover section (fixed)': 48,
  'Gap': 8,
  'Description (max 2 lines)': 36,
  'Gap': 8,
  'Timeline section (fixed)': 20,
  'Gap': 8,
  'Controls section (fixed)': 42,
};

let total = 0;
Object.entries(components).forEach(([name, px]) => {
  total += px;
  console.log(`   ${name}: ${px}px`);
});

console.log(`   ────────────────────────`);
console.log(`   TOTAL: ~${total}px`);
console.log(`\n   iPhone 14 Pro viewport: 844px`);
console.log(`   Card takes: ${((total / 844) * 100).toFixed(1)}% of screen`);
console.log(`   ${total < 300 ? '✅ Compact and reasonable' : '⚠️ May be too tall'}`);

// 4. Desktop base rules check
console.log('\n4️⃣  DESKTOP BASE RULES CHECK');
console.log('─────────────────────────────────────');

const desktopChecks = [
  { name: '.podcast-player-body justify-content: space-between', pattern: /\.podcast-player-body\s*\{[^}]*justify-content:\s*space-between/s },
  { name: '.podcast-player-body flex: 1', pattern: /\.podcast-player-body\s*\{[^}]*flex:\s*1/s },
  { name: '.podcast-player-card min-height: 350px', pattern: /\.podcast-player-card\s*\{[^}]*min-height:\s*350px/s },
];

desktopChecks.forEach(({ name, pattern }) => {
  const found = pattern.test(css);
  console.log(`   ${found ? '📋' : '—'} ${name}: ${found ? 'YES (overridden on mobile)' : 'not found'}`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log('  ANALYSIS COMPLETE');
console.log('═══════════════════════════════════════════════════');
