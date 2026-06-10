const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = path.join(
    'C:', 'Users', 'doand', '.gemini', 'antigravity', 'brain',
    'd20e4dee-6635-4c93-af25-8fd32b5084b4'
  );

  // --- iPhone 14 Pro (390x844) ---
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await page1.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await page1.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page1.waitForTimeout(3000);

  // Click on the podcast tab (🎧) in the mobile tab bar
  const tabs = await page1.$$('.mobile-tab-item');
  console.log(`Found ${tabs.length} mobile tabs`);
  
  // Find the podcast tab
  for (let i = 0; i < tabs.length; i++) {
    const text = await page1.evaluate(el => el.textContent, tabs[i]);
    console.log(`Tab ${i}: "${text.trim()}"`);
    if (text.includes('Audio') || text.includes('🎧') || text.includes('Podcast')) {
      await tabs[i].click();
      console.log(`Clicked podcast tab (index ${i})`);
      break;
    }
  }
  
  await page1.waitForTimeout(1500);

  // Take full page screenshot
  await page1.screenshot({
    path: path.join(artifactDir, 'mobile_podcast_full.png'),
    fullPage: false
  });
  console.log('Saved: mobile_podcast_full.png (iPhone 14 Pro viewport)');

  // Scroll to make the podcast player visible and screenshot
  const podcastCard = await page1.$('.podcast-player-card');
  if (podcastCard) {
    await podcastCard.scrollIntoView();
    await page1.waitForTimeout(500);
    
    // Get bounding box
    const box = await podcastCard.boundingBox();
    console.log(`Podcast card dimensions: ${Math.round(box.width)}x${Math.round(box.height)} at (${Math.round(box.x)}, ${Math.round(box.y)})`);
    
    // Screenshot just the podcast card
    await podcastCard.screenshot({
      path: path.join(artifactDir, 'mobile_podcast_card.png')
    });
    console.log('Saved: mobile_podcast_card.png');
  } else {
    console.log('ERROR: .podcast-player-card not found!');
  }

  // --- iPhone SE (375x667) ---
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });
  await page2.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await page2.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page2.waitForTimeout(3000);

  // Click podcast tab
  const tabs2 = await page2.$$('.mobile-tab-item');
  for (let i = 0; i < tabs2.length; i++) {
    const text = await page2.evaluate(el => el.textContent, tabs2[i]);
    if (text.includes('Audio') || text.includes('🎧') || text.includes('Podcast')) {
      await tabs2[i].click();
      break;
    }
  }
  await page2.waitForTimeout(1500);

  const podcastCard2 = await page2.$('.podcast-player-card');
  if (podcastCard2) {
    await podcastCard2.scrollIntoView();
    await page2.waitForTimeout(500);
    const box2 = await podcastCard2.boundingBox();
    console.log(`iPhone SE card dimensions: ${Math.round(box2.width)}x${Math.round(box2.height)}`);
    
    await podcastCard2.screenshot({
      path: path.join(artifactDir, 'mobile_podcast_iphonese.png')
    });
    console.log('Saved: mobile_podcast_iphonese.png');
  }

  // --- Desktop (for comparison) ---
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page3.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page3.waitForTimeout(3000);

  const podcastCard3 = await page3.$('.podcast-player-card');
  if (podcastCard3) {
    await podcastCard3.scrollIntoView();
    await page3.waitForTimeout(500);
    const box3 = await podcastCard3.boundingBox();
    console.log(`Desktop card dimensions: ${Math.round(box3.width)}x${Math.round(box3.height)}`);
    
    await podcastCard3.screenshot({
      path: path.join(artifactDir, 'desktop_podcast_card.png')
    });
    console.log('Saved: desktop_podcast_card.png');
  }

  await browser.close();
  console.log('\nDone! All screenshots saved.');
})();
