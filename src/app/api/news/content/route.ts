import { NextRequest, NextResponse } from "next/server";

// Helper to filter out boilerplate paragraphs (ads, links, captions, etc.)
function isCleanParagraph(pText: string): boolean {
  if (pText.length < 30) return false;
  
  const badPatterns = [
    /ảnh:/i,
    /video:/i,
    /báo lỗi/i,
    /xem thêm:/i,
    /đọc thêm:/i,
    /nguồn:/i,
    /theo cafef/i,
    /theo vnexpress/i,
    /chụp màn hình/i,
    /nhấp vào đây/i,
    /tải ứng dụng/i,
    /liên kết nguồn/i,
    /bản quyền thuộc về/i
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(pText)) {
      return false;
    }
  }
  
  return true;
}

// Heuristic-based summarization (Lead + Context + Conclusion)
function generateHeuristicSummary(paragraphs: string[]): string[] {
  if (paragraphs.length <= 3) {
    return paragraphs;
  }
  
  const lead = paragraphs[0];
  
  // Find a context paragraph in the middle
  let contextIdx = Math.floor(paragraphs.length / 2);
  let context = paragraphs[contextIdx];
  
  // Try to find a cleaner context paragraph if the middle one isn't great
  if (context.length < 50 && paragraphs[contextIdx - 1]) {
    context = paragraphs[contextIdx - 1];
  } else if (context.length < 50 && paragraphs[contextIdx + 1]) {
    context = paragraphs[contextIdx + 1];
  }
  
  // Find a concluding paragraph at the end
  let conclusionIdx = paragraphs.length - 1;
  let conclusion = paragraphs[conclusionIdx];
  
  // Make sure conclusion isn't too short or a footer
  if (conclusion.length < 50 && paragraphs[conclusionIdx - 1]) {
    conclusion = paragraphs[conclusionIdx - 1];
  }
  
  // Assemble unique paragraphs
  const summary = [lead];
  if (context !== lead) {
    summary.push(context);
  }
  if (conclusion !== lead && conclusion !== context) {
    summary.push(conclusion);
  }
  
  return summary;
}

// Call Gemini API to get a professional summary
async function getGeminiSummary(fullText: string, apiKey: string): Promise<string[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `Hãy viết một bản tóm tắt hoàn chỉnh và xuất sắc cho bài báo sau bằng tiếng Việt. 
Bản tóm tắt chỉ được bao gồm đúng 3 đoạn văn ngắn gọn, mạch lạc, đi thẳng vào các ý chính quan trọng, loại bỏ hoàn toàn các chi tiết rác và quảng cáo. 
Đầu ra chỉ chứa 3 đoạn văn, ngăn cách nhau bằng ký tự xuống dòng mới (line break), không dùng ký hiệu đánh dấu đầu dòng (bullet points) hay định dạng markdown đặc biệt.
Bài báo:\n\n${fullText}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      console.warn("Gemini API call failed:", response.status, await response.text());
      return null;
    }

    const json = await response.json();
    const generatedText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      // Split by newlines and filter out empty paragraphs
      const paragraphs = generatedText
        .split(/\n+/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 20);
        
      if (paragraphs.length > 0) {
        return paragraphs;
      }
    }
    return null;
  } catch (err) {
    console.error("Error calling Gemini API:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    // 1. Fetch the original article HTML
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      next: { revalidate: 1800 } // Cache scraped article for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: HTTP ${response.status}`);
    }

    const html = await response.text();

    // 2. Locate the main article container
    // We match classes used by CafeF, VnExpress, or typical news sites
    const contentMatch = html.match(/class=["'](?:detail-content|contentdetail|fck_detail|singlenews-content|sidebar-1)["'][\s\S]*?>([\s\S]*?)(?:<div class=["']link-source-wrapper["']|<\/div>\s*<div class=|<\/article>)/i);
    
    let bodyHtml = html;
    if (contentMatch) {
      bodyHtml = contentMatch[1];
    } else {
      // Fallback to body tag content if class is not matched
      const bodyTag = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
      if (bodyTag) {
        bodyHtml = bodyTag[1];
      }
    }

    // 3. Extract and clean paragraph tags
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    
    while ((pMatch = pRegex.exec(bodyHtml)) !== null) {
      const pText = pMatch[1]
        .replace(/<[^>]*>/g, "") // Strip HTML tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
        
      if (isCleanParagraph(pText)) {
        paragraphs.push(pText);
      }
    }

    if (paragraphs.length === 0) {
      return NextResponse.json({ 
        source: "fallback",
        paragraphs: ["Không thể tự động trích xuất nội dung bài viết. Bạn vui lòng nhấp vào liên kết nguồn để xem trực tiếp."] 
      });
    }

    // 4. Summarize (AI vs Heuristic)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const fullText = paragraphs.join("\n\n");
      const aiSummary = await getGeminiSummary(fullText, geminiApiKey);
      if (aiSummary) {
        return NextResponse.json({
          source: "gemini-ai",
          paragraphs: aiSummary
        });
      }
    }

    // Heuristic fallback
    const heuristicSummary = generateHeuristicSummary(paragraphs);
    return NextResponse.json({
      source: "heuristic-extractor",
      paragraphs: heuristicSummary
    });

  } catch (error: any) {
    console.error("Error scraping news article:", error);
    return NextResponse.json(
      { error: "Failed to scrape article", details: error.message }, 
      { status: 500 }
    );
  }
}
