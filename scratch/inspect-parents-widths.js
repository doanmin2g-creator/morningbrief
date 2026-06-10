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

    // Inspect widths of all ancestors of the podcast player card
    const ancestors = await page.evaluate(() => {
      const card = document.querySelector('.podcast-player-card');
      if (!card) return [];
      
      const list = [];
      let el = card;
      while (el) {
        let name = el.tagName.toLowerCase();
        if (el.id) name += '#' + el.id;
        if (el.className) name += '.' + Array.from(el.classList).join('.');
        
        const rect = el.getBoundingClientRect();
        list.push({
          name,
          offsetWidth: el.offsetWidth,
          clientWidth: el.clientWidth,
          rectWidth: rect.width,
          left: rect.left,
          right: rect.right,
          scrollWidth: el.scrollWidth,
          display: window.getComputedStyle(el).display,
          widthStyle: window.getComputedStyle(el).width,
          maxWidthStyle: window.getComputedStyle(el).maxWidth,
          boxSizing: window.getComputedStyle(el).boxSizing
        });
        el = el.parentElement;
      }
      return list;
    });

    console.log('\nAncestor widths when AUDIO tab is active:');
    ancestors.forEach((el, index) => {
      console.log(`${index + 1}. <${el.name}>:`);
      console.log(`   offsetWidth: ${el.offsetWidth}px, rectWidth: ${el.rectWidth}px, scrollWidth: ${el.scrollWidth}px`);
      console.log(`   Left: ${el.left}px, Right: ${el.right}px, Display: ${el.display}`);
      console.log(`   width (style): ${el.widthStyle}, max-width (style): ${el.maxWidthStyle}, box-sizing: ${el.boxSizing}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
