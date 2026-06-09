import { NextResponse } from "next/server";

// Yahoo Finance quote API for individual stock lookup
// Supports Vietnamese stocks with .VN suffix

interface SearchResult {
  symbol: string;
  displayName: string;
  price: string;
  change: string;
  isPositive: boolean;
  sector: string;
  exchange: string;
  prevClose: string;
  dayHigh: string;
  dayLow: string;
  volume: string;
  marketCap: string;
}

// Simple in-memory cache per symbol (30 seconds)
const searchCache = new Map<string, { data: SearchResult; timestamp: number }>();
const CACHE_TTL = 30 * 1000;

// Common Vietnamese stock company names for text search
const VN_STOCK_DIRECTORY: { symbol: string; names: string[]; exchange: string }[] = [
  { symbol: "VCB", names: ["vietcombank", "ngoại thương", "vcb"], exchange: "HOSE" },
  { symbol: "BID", names: ["bidv", "đầu tư phát triển", "bid"], exchange: "HOSE" },
  { symbol: "CTG", names: ["vietinbank", "công thương", "ctg"], exchange: "HOSE" },
  { symbol: "TCB", names: ["techcombank", "kỹ thương", "tcb"], exchange: "HOSE" },
  { symbol: "MBB", names: ["mbbank", "quân đội", "mbb", "mb"], exchange: "HOSE" },
  { symbol: "VPB", names: ["vpbank", "việt nam thịnh vượng", "vpb"], exchange: "HOSE" },
  { symbol: "ACB", names: ["acb", "á châu", "acbbank"], exchange: "HOSE" },
  { symbol: "VIC", names: ["vingroup", "vic", "tập đoàn vin"], exchange: "HOSE" },
  { symbol: "VHM", names: ["vinhomes", "vhm"], exchange: "HOSE" },
  { symbol: "VRE", names: ["vincom retail", "vre"], exchange: "HOSE" },
  { symbol: "HPG", names: ["hòa phát", "hpg", "hoa phat"], exchange: "HOSE" },
  { symbol: "GAS", names: ["pv gas", "gas", "khí việt nam"], exchange: "HOSE" },
  { symbol: "PLX", names: ["petrolimex", "plx", "xăng dầu"], exchange: "HOSE" },
  { symbol: "FPT", names: ["fpt", "fpt corp"], exchange: "HOSE" },
  { symbol: "MWG", names: ["thế giới di động", "mwg", "mobile world"], exchange: "HOSE" },
  { symbol: "VNM", names: ["vinamilk", "vnm", "sữa việt nam"], exchange: "HOSE" },
  { symbol: "MSN", names: ["masan", "msn", "masan group"], exchange: "HOSE" },
  { symbol: "SAB", names: ["sabeco", "sab", "bia sài gòn"], exchange: "HOSE" },
  { symbol: "PNJ", names: ["pnj", "phú nhuận", "vàng bạc đá quý"], exchange: "HOSE" },
  { symbol: "VJC", names: ["vietjet", "vjc", "vietjet air"], exchange: "HOSE" },
  { symbol: "GMD", names: ["gemadept", "gmd"], exchange: "HOSE" },
  { symbol: "SSI", names: ["ssi", "ssi securities", "chứng khoán ssi"], exchange: "HOSE" },
  { symbol: "VNI", names: ["vnindex", "vn-index", "vn index"], exchange: "INDEX" },
  { symbol: "SHS", names: ["shs", "chứng khoán sài gòn hà nội"], exchange: "HNX" },
  { symbol: "CEO", names: ["ceo", "tập đoàn ceo", "c.e.o group"], exchange: "HNX" },
  { symbol: "PVS", names: ["pvs", "dịch vụ dầu khí", "pv dịch vụ"], exchange: "HNX" },
  { symbol: "BSR", names: ["bsr", "lọc dầu bình sơn", "lọc hóa dầu"], exchange: "UPCoM" },
  { symbol: "ACV", names: ["acv", "cảng hàng không", "airports"], exchange: "UPCoM" },
  { symbol: "VEA", names: ["vea", "veam", "máy động lực"], exchange: "UPCoM" },
  { symbol: "DIG", names: ["dig", "đầu tư phát triển xây dựng", "dic"], exchange: "HOSE" },
  { symbol: "PDR", names: ["pdr", "phát đạt", "phat dat"], exchange: "HOSE" },
  { symbol: "STB", names: ["stb", "sacombank", "sài gòn thương tín"], exchange: "HOSE" },
  { symbol: "TPB", names: ["tpb", "tpbank", "tiên phong"], exchange: "HOSE" },
  { symbol: "HDB", names: ["hdb", "hdbank", "phát triển tp hcm"], exchange: "HOSE" },
  { symbol: "EIB", names: ["eib", "eximbank", "xuất nhập khẩu"], exchange: "HOSE" },
  { symbol: "LPB", names: ["lpb", "lienvietpostbank", "bưu điện liên việt"], exchange: "HOSE" },
  { symbol: "SHB", names: ["shb", "sài gòn hà nội", "shbank"], exchange: "HOSE" },
  { symbol: "KDH", names: ["kdh", "khang điền", "nhà khang điền"], exchange: "HOSE" },
  { symbol: "NVL", names: ["nvl", "novaland", "nova"], exchange: "HOSE" },
  { symbol: "DXG", names: ["dxg", "đất xanh", "dat xanh"], exchange: "HOSE" },
  { symbol: "HDG", names: ["hdg", "hà đô", "ha do group"], exchange: "HOSE" },
  { symbol: "KBC", names: ["kbc", "kinh bắc", "kinh bac city"], exchange: "HOSE" },
  { symbol: "REE", names: ["ree", "cơ điện lạnh"], exchange: "HOSE" },
  { symbol: "GVR", names: ["gvr", "cao su việt nam", "rubber"], exchange: "HOSE" },
  { symbol: "POW", names: ["pow", "điện lực dầu khí", "pv power"], exchange: "HOSE" },
  { symbol: "BCM", names: ["bcm", "becamex", "bình dương"], exchange: "HOSE" },
  { symbol: "VGC", names: ["vgc", "viglacera"], exchange: "HOSE" },
  { symbol: "DCM", names: ["dcm", "đạm cà mau", "phân bón"], exchange: "HOSE" },
  { symbol: "DPM", names: ["dpm", "đạm phú mỹ", "petrovietnam"], exchange: "HOSE" },
  { symbol: "PVD", names: ["pvd", "khoan dầu khí", "pv drilling"], exchange: "HOSE" },
  { symbol: "HCM", names: ["hcm", "chứng khoán hcm", "hsc"], exchange: "HOSE" },
  { symbol: "VND", names: ["vnd", "vndirect", "chứng khoán vndirect"], exchange: "HOSE" },
  { symbol: "HAG", names: ["hag", "hoàng anh gia lai", "hagl"], exchange: "HOSE" },
  { symbol: "DGC", names: ["dgc", "hóa chất đức giang", "duc giang"], exchange: "HOSE" },
  { symbol: "NT2", names: ["nt2", "nhiệt điện nhơn trạch 2"], exchange: "HOSE" },
  { symbol: "PHR", names: ["phr", "cao su phước hòa"], exchange: "HOSE" },
  { symbol: "PC1", names: ["pc1", "xây lắp điện 1"], exchange: "HOSE" },
  { symbol: "HSG", names: ["hsg", "tôn hoa sen", "hoa sen"], exchange: "HOSE" },
  { symbol: "NKG", names: ["nkg", "thép nam kim", "nam kim"], exchange: "HOSE" },
  { symbol: "VCG", names: ["vcg", "vinaconex", "xây dựng"], exchange: "HOSE" },
];

function searchDirectory(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // First try exact symbol match
  const exactMatch = VN_STOCK_DIRECTORY.find(
    (s) => s.symbol.toLowerCase() === q
  );
  if (exactMatch) return [exactMatch.symbol];

  // Then fuzzy search by symbol prefix + company names
  const results = VN_STOCK_DIRECTORY.filter((s) => {
    if (s.symbol.toLowerCase().startsWith(q)) return true;
    return s.names.some((name) => name.includes(q));
  });

  return results.map((r) => r.symbol).slice(0, 8);
}

async function fetchStockQuote(symbol: string): Promise<SearchResult | null> {
  // Check cache
  const cached = searchCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Determine Yahoo Finance ticker
  const yahooSymbol = symbol.startsWith("^") ? symbol : `${symbol}.VN`;

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(yahooSymbol)}&range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.spark?.result?.[0];
    const meta = result?.response?.[0]?.meta;

    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const isIndex = symbol.startsWith("^");

    if (currentPrice === undefined || prevClose === undefined) return null;

    const diff = currentPrice - prevClose;
    const pctChange = (diff / prevClose) * 100;

    const dirEntry = VN_STOCK_DIRECTORY.find(
      (s) => s.symbol === symbol
    );

    const searchResult: SearchResult = {
      symbol: dirEntry?.symbol || symbol,
      displayName: dirEntry
        ? `${dirEntry.symbol} (${dirEntry.names[0]})`
        : symbol,
      price: isIndex
        ? currentPrice.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : (currentPrice / 1000).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      change:
        (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%",
      isPositive: pctChange >= 0,
      sector: dirEntry?.names[0] || "N/A",
      exchange: dirEntry?.exchange || "HOSE",
      prevClose: isIndex
        ? prevClose.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : (prevClose / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 }),
      dayHigh: meta.regularMarketDayHigh
        ? isIndex
          ? meta.regularMarketDayHigh.toLocaleString("en-US", { maximumFractionDigits: 2 })
          : (meta.regularMarketDayHigh / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })
        : "N/A",
      dayLow: meta.regularMarketDayLow
        ? isIndex
          ? meta.regularMarketDayLow.toLocaleString("en-US", { maximumFractionDigits: 2 })
          : (meta.regularMarketDayLow / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })
        : "N/A",
      volume: meta.regularMarketVolume
        ? (meta.regularMarketVolume / 1000).toLocaleString("en-US", {
            maximumFractionDigits: 0,
          }) + "K"
        : "N/A",
      marketCap: meta.marketCap
        ? (meta.marketCap / 1e9).toLocaleString("en-US", {
            maximumFractionDigits: 1,
          }) + " tỷ"
        : "N/A",
    };

    searchCache.set(symbol, { data: searchResult, timestamp: Date.now() });
    return searchResult;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Search directory for matching symbols
  const matchedSymbols = searchDirectory(query);

  if (matchedSymbols.length === 0) {
    // Try direct Yahoo Finance lookup with raw query as symbol
    const directResult = await fetchStockQuote(query.toUpperCase());
    if (directResult) {
      return NextResponse.json([directResult]);
    }
    return NextResponse.json([]);
  }

  // Fetch quotes for all matched symbols concurrently
  const quotes = await Promise.all(
    matchedSymbols.map((sym) => fetchStockQuote(sym))
  );

  const results = quotes.filter(
    (q): q is SearchResult => q !== null
  );

  return NextResponse.json(results);
}
