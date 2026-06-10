import { NextRequest, NextResponse } from "next/server";

// Helper to filter out boilerplate paragraphs (ads, links, captions, footer metadata, etc.)
function isCleanParagraph(pText: string): boolean {
  const clean = pText.trim();
  if (clean.length < 25 || clean.length > 800) return false;
  
  const lower = clean.toLowerCase();
  
  // Boilerplate prefixes
  const badPrefixes = [
    "xem thêm",
    "đọc thêm",
    "ảnh:",
    "hình:",
    "video:",
    "nguồn:",
    "chụp màn hình",
    "liên hệ quảng cáo",
    "bản quyền thuộc về",
    "tác giả:",
    "tác giả bài viết",
    "phóng viên:",
    "liên hệ tòa soạn",
    "hộp thư:",
    "mọi ý kiến đóng góp",
    "hotline:",
    "số điện thoại:",
    "chia sẻ qua:",
    "theo dòng sự kiện",
    "tin liên quan:",
    "đăng ký nhận bản tin",
    "tải ứng dụng",
    "theo dõi chúng tôi",
    "bình luận:",
    "chịu trách nhiệm nội dung",
    "giấy phép thiết lập trang",
    "sở thông tin và truyền thông",
    "tổng biên tập",
    "copyright"
  ];
  
  for (const prefix of badPrefixes) {
    if (lower.startsWith(prefix)) {
      return false;
    }
  }

  // Exact boilerplate matches
  const badExacts = [
    "chia sẻ",
    "báo lỗi",
    "đăng ký",
    "gửi bình luận",
    "phóng viên",
    "tòa soạn",
    "liên hệ",
    "quảng cáo",
    "vccorp"
  ];
  
  if (badExacts.includes(lower)) {
    return false;
  }
  
  return true;
}

// Tăng điểm cho đoạn văn chỉ định rõ lỗi/hành vi cụ thể, giảm điểm từ tham chiếu lửng lơ
function adjustForBehaviorDefinition(text: string, score: number): number {
  let adjusted = score;
  
  // Định danh lỗi hoặc hành vi cụ thể
  const definingKeywords = /\b(?:không đăng ký|chậm sang tên|giấy viết tay|chuyển nhượng|mua bán đất|tẩy xóa|sửa chữa|sổ đỏ giả|giấy chứng nhận giả|chậm kê khai|không thực hiện|trốn thuế|nhận hối lộ|khởi tố|tạm giam|lừa đảo|trục lợi)\b/gi;
  if (definingKeywords.test(text)) {
    adjusted += 4;
  }
  
  // Từ tham chiếu lửng lơ (vi phạm này, lỗi này, hành vi này)
  const pronounReferences = /\b(?:hành vi này|lỗi này|vi phạm này|hậu quả này|phạt này)\b/gi;
  if (pronounReferences.test(text)) {
    // Chỉ trừ điểm nếu câu không chứa từ định danh cụ thể để giải thích
    if (!definingKeywords.test(text)) {
      adjusted -= 3;
    }
  }
  
  return adjusted;
}

// Chấm điểm đoạn văn dựa trên mật độ số liệu tài chính
function getMetricsScore(text: string): number {
  if (text.length < 40 || text.length > 300) return -5;
  
  let score = 0;
  
  // Ký hiệu phần trăm (%)
  if (/%|phần trăm/gi.test(text)) score += 4;
  
  // Đơn vị quy mô, tiền tệ tài chính
  if (/\b(?:tỷ|triệu|nghìn tỷ|tỷ đồng|triệu USD|đồng\/cp|cổ phiếu|cổ phần|usd|vnd)\b/gi.test(text)) score += 4;
  
  // Các mốc thời gian đặc thù
  if (/\b(?:năm 202\d|quý \d|tháng \d+|lộ trình|kế hoạch)\b/gi.test(text)) score += 2;
  
  // Mật độ chữ số trong câu
  const digitsCount = (text.match(/\d+/g) || []).length;
  score += Math.min(digitsCount * 0.5, 3);
  
  return adjustForBehaviorDefinition(text, score);
}

// Chấm điểm đoạn văn dựa trên từ khóa mục tiêu & tác động
function getImpactScore(text: string): number {
  if (text.length < 40 || text.length > 350) return -5;
  
  let score = 0;
  
  // Từ khóa mục tiêu, tác động, kỳ vọng
  const targetKeywords = /\b(?:nhằm|để|giúp|mục tiêu|kỳ vọng|dự kiến|tác động|ảnh hưởng|quyết định|hệ quả|thúc đẩy|tăng trưởng|phát triển|hoàn thành)\b/gi;
  const matchCount = (text.match(targetKeywords) || []).length;
  score += matchCount * 2.5;
  
  return adjustForBehaviorDefinition(text, score);
}

// Thuật toán Tóm tắt Lai cải tiến (Hybrid Paragraph Summarizer)
function generateBestHybridSummary(paragraphs: string[], description?: string): string[] {
  if (paragraphs.length <= 3) {
    return paragraphs;
  }

  // 1. Đoạn 1 (Thông tin cốt lõi): Ưu tiên Sapô (description) hoặc đoạn đầu tiên
  const lead = (description && description.length > 30) ? description : paragraphs[0];

  // Loại trừ đoạn đầu ra khỏi tập xét duyệt tiếp theo để tránh trùng lặp
  const pool = paragraphs.filter(p => p.trim() !== lead.trim());
  if (pool.length === 0) {
    return [lead];
  }

  // Chia đôi bài viết để phân vùng vị trí (Đầu/Giữa cho số liệu, Cuối cho kết luận)
  const midPoint = Math.floor(pool.length / 2);
  const firstHalf = pool.slice(0, midPoint + 1);
  const secondHalf = pool.slice(midPoint);

  // 2. Đoạn 2: Quét phân vùng giữa đầu bài, chọn đoạn có điểm số liệu cao nhất
  let bestMetricsPara = firstHalf[0] || pool[0];
  let maxMetricsScore = getMetricsScore(bestMetricsPara);

  for (let i = 1; i < firstHalf.length; i++) {
    const p = firstHalf[i];
    const score = getMetricsScore(p);
    if (score > maxMetricsScore) {
      maxMetricsScore = score;
      bestMetricsPara = p;
    }
  }

  // 3. Đoạn 3: Quét phân vùng cuối bài, chọn đoạn có điểm tác động/mục tiêu cao nhất
  const secondHalfFiltered = secondHalf.filter(p => p !== bestMetricsPara);
  let bestImpactPara = secondHalfFiltered[secondHalfFiltered.length - 1] || pool[pool.length - 1];
  
  if (secondHalfFiltered.length > 0) {
    let maxImpactScore = getImpactScore(bestImpactPara);
    for (let i = 0; i < secondHalfFiltered.length; i++) {
      const p = secondHalfFiltered[i];
      const score = getImpactScore(p);
      // Ưu tiên đoạn có điểm số cao và càng gần cuối bài càng tốt (position bias)
      const positionBias = i / secondHalfFiltered.length; 
      const finalScore = score + positionBias;
      if (finalScore > maxImpactScore) {
        maxImpactScore = finalScore;
        bestImpactPara = p;
      }
    }
  }

  // Lắp ghép bản tóm tắt
  const summary: string[] = [lead];
  if (bestMetricsPara && bestMetricsPara !== lead) {
    summary.push(bestMetricsPara);
  }
  if (bestImpactPara && bestImpactPara !== lead && bestImpactPara !== bestMetricsPara) {
    summary.push(bestImpactPara);
  }

  // Đảm bảo đủ tối thiểu 3 đoạn văn nếu pool còn bài viết
  while (summary.length < 3 && pool.length > 0) {
    const fallback = pool.find(p => !summary.includes(p));
    if (fallback) {
      summary.push(fallback);
    } else {
      break;
    }
  }

  return summary;
}

// Gọi Gemini API dùng Prompt chất lượng cao của người dùng cung cấp
async function getGeminiSummary(fullText: string, apiKey: string): Promise<string[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `Bạn là một thuật toán tóm tắt văn bản tự động (Text Summarization Algorithm). Hãy xử lý văn bản đầu vào được cung cấp ở cuối theo đúng quy trình tuần tự dưới đây. 

TUYỆT ĐỐI không bỏ qua bất kỳ bước nào.

### BƯỚC 1: QUÉT VÀ TRÍCH XUẤT THỰC THỂ (BƯỚC NHÁP - CHẠY NGẦM)
Hãy tìm và liệt kê ra nháp tất cả các thông tin sau từ bài báo (không được bỏ sót):
- Các con số (Số tiền, tỷ lệ %, số lượng, thông số kỹ thuật).
- Mốc thời gian (Ngày, tháng, năm, quý, lộ trình).
- Chủ thể (Tên cơ quan, tổ chức, cá nhân thực hiện hành động).

### BƯỚC 2: KIỂM TRA ĐỘ CHÍNH XÁC (ANTI-ERROR CHECK)
Đối chiếu danh sách nháp ở Bước 1 với nội dung bài báo:
- Xác định đúng cơ quan ban hành/đề xuất (Ví dụ: Dự án giao thông phải thuộc Bộ GTVT, không nhầm sang Bộ Xây dựng nếu bài báo viết bắc cầu).
- Xác định đầy đủ tính chất của đối tượng (Ví dụ: Tuyến đường sắt chở cả KHÁCH và HÀNG, đề thi tăng lên BAO NHIÊU câu).

### BƯỚC 3: XUẤT KẾT QUẢ ĐẦU RA BẮT BUỘC (OUTPUT)
Sau khi đã chạy xong Bước 1 và 2, hãy xuất kết quả theo cấu trúc sau đây (Bỏ qua phần nháp của Bước 1 và 2, chỉ hiển thị kết quả cuối cùng):

Đoạn 1: [Tóm tắt bối cảnh: Ai? Làm gì? Ở đâu? Khi nào? Trong tối đa 2 câu ngắn gọn].

Đoạn 2: [Các số liệu cốt lõi, dòng tiền, thông số kỹ thuật, mốc thời gian hoặc lộ trình cụ thể].

Đoạn 3: [Mục đích của hành động này là gì? Hệ quả hoặc tác động dự kiến của nó].

### QUY TẮC AN TOÀN (FAIL-SAFE LAWS):
1. KHÔNG SÁNG TẠO: Chỉ dùng thông tin có trong bài. Nếu thiếu số liệu, ghi "Bài báo không nhắc tới", không tự suy đoán.
2. KHÔNG DÙNG TỪ ĐÁNH GIÁ CẢM TÍNH: Thay vì viết "vốn rất lớn", hãy viết "vốn hơn 170.000 tỷ đồng". Thay vì viết "tăng rất nhiều câu hỏi", hãy viết "tăng lên 700 câu hỏi".
3. KHÔNG THÊM LỜI THOẠI: Không chào hỏi, không giải thích "Đây là bản tóm tắt...". Vào thẳng nội dung.
4. QUY TẮC ĐỊNH DANH HÀNH VI: Nếu tiêu đề hoặc nội dung bài báo nhắc đến một hình phạt, một hậu quả hoặc một phần thưởng dành cho một 'hành vi/lỗi/đối tượng' cụ thể, bản tóm tắt BẮT BUỘC phải gọi tên chính xác hành vi/lỗi/đối tượng đó là gì (Ví dụ: Không viết chung chung là 'mắc lỗi', phải viết rõ là 'lỗi không đăng ký biến động đất đai').

---
NỘI DUNG BÀI BÁO CẦN TÓM TẮT:
\n\n${fullText}`;

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

    // 2. Locate the main article container (CSS Selector based)
    const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, "");
    let bodyHtml = cleanHtml;
    
    const startMatch = cleanHtml.match(/<(div|article|section)[^>]*\bclass=["'][^"']*\b(knc-content|detail-content|fck_detail|singlenews-content)\b[^"']*["']/i);
    
    if (startMatch && startMatch.index !== undefined) {
      const startIdx = startMatch.index;
      const tag = startMatch[1];
      let depth = 0;
      const tagRegex = new RegExp(`<${tag}\\b|</${tag}\\s*>`, "gi");
      tagRegex.lastIndex = startIdx;
      
      let tagMatch;
      let foundEnd = false;
      
      while ((tagMatch = tagRegex.exec(cleanHtml)) !== null) {
        const matchedText = tagMatch[0];
        if (matchedText.toLowerCase().startsWith(`<${tag}`)) {
          depth++;
        } else {
          depth--;
          if (depth === 0) {
            const endIdx = tagMatch.index + matchedText.length;
            bodyHtml = cleanHtml.substring(startIdx, endIdx);
            foundEnd = true;
            break;
          }
        }
      }
      
      if (!foundEnd) {
        bodyHtml = cleanHtml.substring(startIdx);
      }
    } else {
      // Try fallback classes
      const fallbackMatch = cleanHtml.match(/<(div|article|section)[^>]*\bclass=["'][^"']*\b(contentdetail|sidebar-1)\b[^"']*["']/i);
      if (fallbackMatch && fallbackMatch.index !== undefined) {
        const startIdx = fallbackMatch.index;
        const tag = fallbackMatch[1];
        let depth = 0;
        const tagRegex = new RegExp(`<${tag}\\b|</${tag}\\s*>`, "gi");
        tagRegex.lastIndex = startIdx;
        
        let tagMatch;
        let foundEnd = false;
        
        while ((tagMatch = tagRegex.exec(cleanHtml)) !== null) {
          const matchedText = tagMatch[0];
          if (matchedText.toLowerCase().startsWith(`<${tag}`)) {
            depth++;
          } else {
            depth--;
            if (depth === 0) {
              const endIdx = tagMatch.index + matchedText.length;
              bodyHtml = cleanHtml.substring(startIdx, endIdx);
              foundEnd = true;
              break;
            }
          }
        }
        
        if (!foundEnd) {
          bodyHtml = cleanHtml.substring(startIdx);
        }
      } else {
        // Final fallback to body
        const bodyTag = cleanHtml.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
        bodyHtml = bodyTag ? bodyTag[1] : cleanHtml;
      }
    }

    // 3. Extract paragraphs, headers, lists and images in chronological order
    const paragraphs: string[] = [];
    const fullContent: Array<{ type: "paragraph" | "header" | "list-item" | "image"; text?: string; url?: string; level?: number }> = [];
    
    // Scan for p, h2, h3, h4, li elements or img tags
    const elementRegex = /<(p|h2|h3|h4|li)[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi;
    let match;
    
    while ((match = elementRegex.exec(bodyHtml)) !== null) {
      const matchedTag = match[0];
      const tagName = match[1]?.toLowerCase();
      
      if (tagName === "p" || tagName === "h2" || tagName === "h3" || tagName === "h4" || tagName === "li") {
        const rawText = match[2];
        const cleanText = rawText
          .replace(/<(?!br\b|\/?strong\b|\/?b\b|\/?i\b|\/?em\b|\/?u\b)[^>]*>/gi, "") // Keep only inline formatting tags
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
          
        if (cleanText.length > 5) {
          const textStripped = cleanText.replace(/<[^>]*>/g, ""); // Strip for checking boilerplate
          if (isCleanParagraph(textStripped)) {
            paragraphs.push(textStripped);
            
            if (tagName === "p") {
              fullContent.push({ type: "paragraph", text: cleanText });
            } else if (tagName === "li") {
              fullContent.push({ type: "list-item", text: cleanText });
            } else {
              const level = parseInt(tagName.substring(1)) || 3;
              fullContent.push({ type: "header", text: cleanText, level });
            }
          }
        }
      } else if (matchedTag.toLowerCase().startsWith("<img")) {
        // Extract image URL from lazy attributes or src
        const srcMatch = matchedTag.match(/(?:data-src|data-original|original-src|src)=["']([^"']+)["']/i);
        if (srcMatch) {
          const url = srcMatch[1];
          // Filter out tiny icons, transparent pixels or spacers
          if (url && !url.includes("base64") && !url.includes("spacer.gif") && !url.includes("icon") && !url.endsWith(".gif")) {
            fullContent.push({ type: "image", url });
          }
        }
      }
    }

    if (paragraphs.length === 0) {
      return NextResponse.json({ 
        source: "fallback",
        paragraphs: ["Không thể tự động trích xuất nội dung bài viết. Bạn vui lòng nhấp vào liên kết nguồn để xem trực tiếp."],
        fullContent: []
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
          paragraphs: aiSummary,
          fullContent
        });
      }
    }

    // Heuristic fallback (Hybrid Paragraph Summarizer)
    const heuristicSummary = generateBestHybridSummary(paragraphs);
    return NextResponse.json({
      source: "heuristic-extractor",
      paragraphs: heuristicSummary,
      fullContent
    });

  } catch (error: any) {
    console.error("Error scraping news article:", error);
    return NextResponse.json(
      { error: "Failed to scrape article", details: error.message }, 
      { status: 500 }
    );
  }
}
