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

    // Inspect widths of every element inside the podcast player card
    const elements = await page.evaluate(() => {
      const card = document.querySelector('.podcast-player-card');
      if (!card) return [];
      
      const all = Array.from(card.querySelectorAll('*'));
      all.unshift(card); // include the card itself
      
      return all.map(el => {
        let name = el.tagName.toLowerCase();
        if (el.id) name += '#' + el.id;
        if (el.className) name += '.' + Array.from(el.classList).join('.');
        
        const rect = el.getBoundingClientRect();
        return {
          name,
          offsetWidth: el.offsetWidth,
          rectWidth: rect.width,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          display: window.getComputedStyle(el).display,
          width: window.getComputedStyle(el).width,
          minWidth: window.getComputedStyle(el).minWidth,
          maxWidth: window.getComputedStyle(el).maxWidth,
          whiteSpace: window.getComputedStyle(el).whiteSpace
        };
      });
    });

    console.log('\nDescendant widths of podcast player card:');
    elements.forEach((el, index) => {
      if (el.offsetWidth > 358) {
        console.log(`${index + 1}. <${el.name}>:`);
        console.log(`   offsetWidth: ${el.offsetWidth}px, rectWidth: ${el.rectWidth}px, scrollWidth: ${el.scrollWidth}px`);
        console.log(`   display: ${el.display}, width: ${el.width}, minWidth: ${el.minWidth}, maxWidth: ${el.maxWidth}, whiteSpace: ${el.whiteSpace}`);
      }
    });

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
