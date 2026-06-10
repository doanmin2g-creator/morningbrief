const puppeteer = require('puppeteer-core');

(async () => {
  console.log('Launching browser to debug overflow...');
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

    // Find overflowing elements
    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.offsetWidth;
      const viewWidth = window.innerWidth;
      
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowing = [];
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth || rect.width > docWidth) {
          // Find path
          let path = el.tagName.toLowerCase();
          if (el.id) path += '#' + el.id;
          if (el.className) path += '.' + Array.from(el.classList).join('.');
          
          overflowing.push({
            path,
            width: rect.width,
            left: rect.left,
            right: rect.right,
            parent: el.parentElement ? el.parentElement.tagName.toLowerCase() : 'none'
          });
        }
      });
      
      return {
        docWidth,
        viewWidth,
        overflowing: overflowing.slice(0, 15) // Top 15 overflowing elements
      };
    });

    console.log('Document Width:', overflowInfo.docWidth);
    console.log('Viewport Width:', overflowInfo.viewWidth);
    console.log('\nOverflowing elements:');
    overflowInfo.overflowing.forEach((item, index) => {
      console.log(`${index + 1}. <${item.path}>`);
      console.log(`   Width: ${item.width}px, Left: ${item.left}px, Right: ${item.right}px, Parent: <${item.parent}>`);
    });

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
