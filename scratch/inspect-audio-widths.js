const puppeteer = require('puppeteer-core');

(async () => {
  console.log('Launching browser to inspect audio elements...');
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

    // Find and click AUDIO tab
    const tabs = await page.$$('.mobile-tab-item');
    let audioTab = null;
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text.includes('AUDIO')) {
        audioTab = tab;
        break;
      }
    }

    if (audioTab) {
      await audioTab.click();
      console.log('Clicked AUDIO tab. Waiting 1s...');
      await new Promise(r => setTimeout(r, 1000));

      // Inspect widths of podcast elements
      const podcastWidths = await page.evaluate(() => {
        const selectors = [
          '.sidebar-section',
          '.podcast-player-card',
          '.podcast-header',
          '.podcast-player-body',
          '.podcast-cover-section',
          '.podcast-cover-wrap',
          '.podcast-track-details',
          '.podcast-track-title-container',
          '.podcast-track-title',
          '.podcast-track-artist',
          '.podcast-track-desc',
          '.podcast-timeline-section',
          '.podcast-timeline-slider',
          '.podcast-controls-section'
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
            scrollWidth: el.scrollWidth,
            display: window.getComputedStyle(el).display,
            flex: window.getComputedStyle(el).flex,
            padding: window.getComputedStyle(el).padding,
            margin: window.getComputedStyle(el).margin
          };
        });
      });

      console.log('\nWidths of podcast components on AUDIO tab:');
      podcastWidths.forEach(w => {
        if (!w.found) {
          console.log(`- ${w.selector}: NOT FOUND`);
        } else {
          console.log(`- ${w.selector}:`);
          console.log(`  offsetWidth: ${w.offsetWidth}px, rectWidth: ${w.rectWidth}px, scrollWidth: ${w.scrollWidth}px`);
          console.log(`  Left: ${w.left}px, Right: ${w.right}px, Display: ${w.display}, Flex: ${w.flex}`);
          if (w.right > 390) {
            console.log(`  ⚠️  OVERFLOWS VIEWPORT (Right is ${w.right}px > 390px)`);
          }
          if (w.scrollWidth > w.clientWidth) {
            console.log(`  ⚠️  HAS HORIZONTAL SCROLL CONTENT (scrollWidth ${w.scrollWidth}px > clientWidth ${w.clientWidth}px)`);
          }
        }
      });

    } else {
      console.log('ERROR: Could not find AUDIO tab');
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
