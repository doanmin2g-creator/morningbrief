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

    const debugInfo = await page.evaluate(() => {
      const card = document.querySelector('.podcast-player-card');
      const sidebar = document.querySelector('.sidebar-section');
      const grid = document.querySelector('.broadsheet-grid');
      
      const getStyles = (el) => {
        const s = window.getComputedStyle(el);
        return {
          display: s.display,
          position: s.position,
          width: s.width,
          minWidth: s.minWidth,
          maxWidth: s.maxWidth,
          gridTemplateColumns: s.gridTemplateColumns,
          gridColumnStart: s.gridColumnStart,
          gridColumnEnd: s.gridColumnEnd,
          flexDirection: s.flexDirection,
          flexGrow: s.flexGrow,
          flexShrink: s.flexShrink,
          flexBasis: s.flexBasis,
          boxSizing: s.boxSizing,
          alignSelf: s.alignSelf,
          justifySelf: s.justifySelf
        };
      };
      
      return {
        card: card ? { offsetWidth: card.offsetWidth, clientWidth: card.clientWidth, styles: getStyles(card) } : null,
        sidebar: sidebar ? { offsetWidth: sidebar.offsetWidth, clientWidth: sidebar.clientWidth, styles: getStyles(sidebar) } : null,
        grid: grid ? { offsetWidth: grid.offsetWidth, clientWidth: grid.clientWidth, styles: getStyles(grid) } : null,
        newsSectionDisplay: window.getComputedStyle(document.querySelector('.news-section')).display
      };
    });

    console.log('\nDEBUG INFO:');
    console.log('Grid:', JSON.stringify(debugInfo.grid, null, 2));
    console.log('News Section Display:', debugInfo.newsSectionDisplay);
    console.log('Sidebar:', JSON.stringify(debugInfo.sidebar, null, 2));
    console.log('Card:', JSON.stringify(debugInfo.card, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
