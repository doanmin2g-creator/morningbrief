const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Click audio tab
    const tabs = await page.$$('.mobile-tab-item');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text.includes('AUDIO')) {
        await tab.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    // Find style sources
    const matchingRules = await page.evaluate(() => {
      const card = document.querySelector('.podcast-player-card');
      if (!card) return 'No card found';
      
      const debug = [];
      debug.push('Inline style: ' + card.getAttribute('style'));
      
      // Get all stylesheets
      const sheets = Array.from(document.styleSheets);
      sheets.forEach((sheet, sIdx) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules);
          rules.forEach((rule, rIdx) => {
            if (rule.selectorText && (rule.selectorText.includes('podcast-player-card') || rule.selectorText.includes('sidebar-section'))) {
              debug.push(`Sheet ${sIdx} Rule ${rIdx} [${rule.selectorText}]: ${rule.cssText}`);
            } else if (rule.media) {
              // Media query rule
              const mediaRules = Array.from(rule.cssRules || rule.rules || []);
              mediaRules.forEach((mRule, mrIdx) => {
                if (mRule.selectorText && (mRule.selectorText.includes('podcast-player-card') || mRule.selectorText.includes('sidebar-section'))) {
                  debug.push(`Sheet ${sIdx} Media [${rule.media.mediaText}] Rule [${mRule.selectorText}]: ${mRule.cssText}`);
                }
              });
            }
          });
        } catch (e) {
          debug.push(`Sheet ${sIdx} is inaccessible: ${e.message}`);
        }
      });
      
      return debug;
    });

    console.log('\nMatching CSS Rules for podcast player card:');
    matchingRules.forEach(r => console.log('-', r));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
