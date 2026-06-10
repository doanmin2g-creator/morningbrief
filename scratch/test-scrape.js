const fs = require('fs');

async function testScrapeLive() {
  const rssUrl = 'https://cafef.vn/vi-mo-dau-tu.rss';
  console.log('Fetching RSS feed to get a live link:', rssUrl);
  
  try {
    const rssRes = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const xml = await rssRes.text();
    
    // Extract first item link
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
    if (!itemMatch) {
      console.log('No item found in RSS!');
      return;
    }
    const itemContent = itemMatch[1];
    
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/link>/i);
    const link = (linkMatch ? (linkMatch[1] || linkMatch[2] || '') : '').trim();
    
    if (!link) {
      console.log('No link found in RSS!');
      return;
    }
    
    console.log('Found live article link:', link);
    
    console.log('Fetching live article HTML...');
    const res = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML Length:', html.length);
    
    // Let's search for typical article containers in CafeF
    // CafeF uses: class="detail-content", class="contentdetail", or id="mainContent"
    const hasDetailContent = html.includes('detail-content');
    const hasContentDetail = html.includes('contentdetail');
    console.log('Has detail-content:', hasDetailContent);
    console.log('Has contentdetail:', hasContentDetail);
    
    // Let's try to extract paragraphs from the content container
    // We can use a regex that matches either class
    const contentMatch = html.match(/class=["'](?:detail-content|contentdetail|fck_detail|singlenews-content)["'][\s\S]*?>([\s\S]*?)(?:<div class=["']link-source-wrapper["']|<\/div>\s*<div class=)/i);
    
    if (contentMatch) {
      const bodyHtml = contentMatch[1];
      const paragraphs = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(bodyHtml)) !== null) {
        const pText = pMatch[1]
          .replace(/<[^>]*>/g, '') // Strip HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .trim();
        if (pText.length > 30) {
          paragraphs.push(pText);
        }
      }
      console.log(`Extracted ${paragraphs.length} paragraphs:`);
      paragraphs.slice(0, 5).forEach((p, i) => console.log(`[${i+1}]`, p.substring(0, 150) + '...'));
    } else {
      console.log('Could not find content container via regex. Let us try fallback regex...');
      // Try a simpler regex that matches any text blocks inside div class="detail-content" or contentdetail
      const fallbackMatch = html.match(/class=["'](?:detail-content|contentdetail)["'][\s\S]*?>([\s\S]*?)<\/div>/i);
      if (fallbackMatch) {
        const bodyHtml = fallbackMatch[1];
        const paragraphs = [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pMatch;
        while ((pMatch = pRegex.exec(bodyHtml)) !== null) {
          const pText = pMatch[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .trim();
          if (pText.length > 30) {
            paragraphs.push(pText);
          }
        }
        console.log(`Fallback: Extracted ${paragraphs.length} paragraphs:`);
        paragraphs.slice(0, 5).forEach((p, i) => console.log(`[${i+1}]`, p.substring(0, 150) + '...'));
      } else {
        console.log('Fallback also failed.');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testScrapeLive();
