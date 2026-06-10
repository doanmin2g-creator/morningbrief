const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  console.log('Starting mobile screenshot script...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Emulate iPhone X/12 Pro
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    console.log('Current URL:', page.url());

    // Take screenshot of home page
    const screenshotHomePath = path.join(
      'C:', 'Users', 'doand', '.gemini', 'antigravity', 'brain', 
      'd20e4dee-6635-4c93-af25-8fd32b5084b4', 'mobile_home.png'
    );
    await page.screenshot({ path: screenshotHomePath });
    console.log('Home screenshot saved to:', screenshotHomePath);

    // Find the AUDIO tab and click it
    console.log('Finding and clicking AUDIO tab...');
    // The tab contains the text AUDIO
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
      console.log('Clicked AUDIO tab. Waiting for layout updates...');
      await new Promise(r => setTimeout(r, 1000));

      const screenshotAudioPath = path.join(
        'C:', 'Users', 'doand', '.gemini', 'antigravity', 'brain', 
        'd20e4dee-6635-4c93-af25-8fd32b5084b4', 'mobile_audio.png'
      );
      await page.screenshot({ path: screenshotAudioPath });
      console.log('Audio tab screenshot saved to:', screenshotAudioPath);
    } else {
      console.log('ERROR: Could not find AUDIO tab button!');
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
