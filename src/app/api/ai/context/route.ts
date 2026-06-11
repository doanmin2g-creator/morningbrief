import { NextResponse } from "next/server";
import { VietstockConnector } from "@/app/api/stocks/vietstock-connector";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const rawSymbols = searchParams.get("watchlist") || searchParams.get("symbols") || "";
  const symbols = rawSymbols
    .split(",")
    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 15); // limit to 15 symbols
  
  
  const now = new Date();

  try {
    // 1. Fetch Market Overview
    const [vnIndex, hnxIndex, upcomIndex] = await Promise.all([
      VietstockConnector.fetchIndex("VNINDEX", "VN-Index"),
      VietstockConnector.fetchIndex("HNX", "HNX-Index"),
      VietstockConnector.fetchIndex("UPCOM", "UPCoM-Index"),
    ]);

    // 2. Fetch Watchlist data if provided
    let watchlistData: any[] = [];
    if (symbols.length > 0) {
      watchlistData = await Promise.all(
        symbols.map(async (sym) => {
          try {
            const quote = await VietstockConnector.fetchStockQuote(sym);
            if (quote) {
              return {
                symbol: sym,
                price: quote.price,
                change: quote.change,
                isPositive: quote.isPositive,
                volume: quote.volume,
                fetched_at: now.toISOString(),
                source: "CafeF / Entrade",
                data_quality: "Live / Cached",
              };
            }
          } catch (e) {
            // Ignore error for single symbol
          }
          return null;
        })
      ).then(results => results.filter(Boolean));
    }

    // Prepare JSON Context Response
    const response = {
      product: "MorningBrief Vietnam",
      as_of: now.toISOString(),
      timezone: "Asia/Ho_Chi_Minh",
      market_status: "Open", // Simplified for now
      summary: "AI Context for MorningBrief Vietnam",
      market_overview: {
        fetched_at: now.toISOString(),
        source: "Entrade API",
        stale: false,
        indices: [
          vnIndex || { displayName: "VN-Index", status: "unavailable" },
          hnxIndex || { displayName: "HNX-Index", status: "unavailable" },
          upcomIndex || { displayName: "UPCoM-Index", status: "unavailable" },
        ]
      },
      my_watchlist: watchlistData,
      watchlist_ecosystem_news: [], // Placeholder, can be populated if needed
      macro_calendar: [], // Placeholder
      technology_news: [], // Placeholder
      audio_brief: [], // Placeholder
      data_quality: {
        stale: false,
        note: "Data fetched on demand from connector."
      },
      disclaimer: "Nội dung trên MorningBrief chỉ nhằm mục đích cung cấp thông tin và giáo dục, không phải khuyến nghị đầu tư. MorningBrief content is for informational and educational purposes only."
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: "Failed to load AI context.",
      generated_at: now.toISOString(),
      stale: true,
      message: (error as Error).message
    }, { status: 500 });
  }
}
