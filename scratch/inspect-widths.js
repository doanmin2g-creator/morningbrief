const puppeteer = require('puppeteer-core');

(async () => {
  console.log('Launching browser to inspect element widths...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // Inspect widths of major containers
    const widths = await page.evaluate(() => {
      const selectors = [
        'html', 'body', '.app-container', '.masthead', '.masthead-top', 
        '.logo', '.user-profile', '.lang-switcher', '.ticker-wrap', 
        '.main-content', '.broadsheet-grid', '.news-section', 
        '.sidebar-section', '.podcast-player-card', '.podcast-player-body',
        '.podcast-cover-section', '.podcast-timeline-section', 
        '.podcast-controls-section', '.mobile-tab-bar'
      ];
      
      return selectors.map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { selector: sel, found: false };
        const rect = el.getBoundingClientRect();
        return {
          selector: sel,
          found: true,
          offsetWidth: el.offsetWidth,
          clientWidth: el.clientWidth,
          rectWidth: rect.width,
          left: rect.left,
          right: rect.right,
          display: window.getComputedStyle(el).display
        };
      });
    });

    console.log('\nWidths of containers:');
    widths.forEach(w => {
      if (!w.found) {
        console.log(`- ${w.selector}: NOT FOUND`);
      } else {
        console.log(`- ${w.selector}:`);
        console.log(`  offsetWidth: ${w.offsetWidth}px, clientWidth: ${w.clientWidth}px, rectWidth: ${w.rectWidth}px`);
        console.log(`  BoundingRect Left: ${w.left}px, Right: ${w.right}px, Display: ${w.display}`);
        if (w.right > 390) {
          console.log(`  ⚠️  OVERFLOWS VIEWPORT (Right is ${w.right}px > 390px)`);
        }
      }
    });

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
