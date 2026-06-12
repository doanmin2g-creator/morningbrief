"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { NewsFeed } from "@/components/NewsFeed";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { MarketHighlights } from "@/components/MarketHighlights";
import { GoldForexPanel } from "@/components/GoldForexPanel";

// Types
interface TickerItem {
  symbol: string;
  ticker: string;
  price: string;
  change: string;
  isPositive: boolean;
  sector: string;
  exchange?: string;
  history?: number[];
  volume?: number;
  volumeStr?: string;
  buyVolume?: string;
  sellVolume?: string;
  lastUpdated?: string;
  prevClose?: string;
  dayHigh?: string;
  dayLow?: string;
}

interface StockSearchResult {
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
  // CafeF enrichment
  pe?: string;
  pb?: string;
  eps?: string;
  marketCapVnd?: string;
  description?: string;
  cafefDataUrl?: string;
  dataSource?: string;
  updatedAt?: string;
  relatedNews?: { title: string; link: string; time: string; image?: string; description?: string; }[];
  history?: number[];
}

interface IndexOverview {
  totalValue: number;
  foreignBuyValue: number;
  foreignSellValue: number;
  foreignNetValue: number;
  advance: number;
  decline: number;
  noChange: number;
}

interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  time: string;
  image?: string;
  body?: string[];
}

interface StocksApiResponse {
  indices?: Array<TickerItem & { overview?: IndexOverview }>;
  watchlistTickers?: TickerItem[];
  highlights?: {
    gainers: TickerItem[];
    losers: TickerItem[];
    volume: TickerItem[];
  };
}

interface MacroData {
  goldSjc: { buy: string; sell: string; change: string };
  goldRing: { buy: string; sell: string; change: string };
  usdRate: { buy: string; sell: string; change: string };
  updatedAt: string;
}

interface WatchlistNewsItem {
  title: string;
  link: string;
  time: string;
  timestamp: number;
  relatedSymbol: string;
  image?: string;
  description?: string;
}

type ReaderContentBlock = { type: "paragraph" | "header" | "list-item" | "image"; text?: string; url?: string; level?: number };

interface StockInlineArticleState {
  key: string;
  article: NewsItem;
  tab: "summary" | "full";
  loading: boolean;
  summary: string[];
  fullContent: ReaderContentBlock[];
  error?: string;
}

// Podcast Playlist Item Type
interface PodcastTrack {
  id: number;
  title: string;
  artist: string;
  sourceName: string;
  audioUrl: string;
  coverUrl: string;
  description: string;
  duration?: string;
  pubDate?: string;
}

const CLIENT_CACHE_PREFIX = "morningbrief_cache_v1";
const CLIENT_CACHE_MAX_AGE = {
  stocks: 15 * 60 * 1000,
  news: 20 * 60 * 1000,
  macro: 5 * 60 * 1000,
  podcasts: 6 * 60 * 60 * 1000,
  watchlistNews: 20 * 60 * 1000,
};

function readClientCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CLIENT_CACHE_PREFIX}:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: T; timestamp?: number };
    if (!parsed || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > maxAgeMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeClientCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CLIENT_CACHE_PREFIX}:${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Storage can be unavailable in private mode or under quota pressure.
  }
}

function hasDisplayImage(image?: string): boolean {
  const normalized = image?.trim().toLowerCase();
  if (!normalized || normalized === "#" || normalized === "about:blank") return false;
  return !normalized.includes("news_image_default") && !normalized.includes("photo-1590283603385");
}

function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
  clearTimeout(id);
  return response;
};

const trans = {
  vi: {
    market: "THỊ TRƯỜNG",
    highlights: "TIÊU ĐIỂM",
    tabFocus: "TIÊU ĐIỂM",
    tabBiz: "KINH DOANH",
    tabTech: "SỐ HÓA",
    audioNews: "BẢN TIN AUDIO",
    expertBrief: "TÓM TẮT BRIEF",
    indexTrends: "XU HƯỚNG",
    economicCalendar: "SỰ KIỆN CALENDAR",
    watchlist: "DANH MỤC WATCHLIST",
    marketHighlights: "ĐIỂM NHẤN MARKET",
    goldForex: "TỶ GIÁ FOREX",
    loadMore: "Xem thêm tin cũ hơn",
    listen: "Nghe Podcast",
    stop: "Dừng nghe",
    watchlistEmpty: "Danh sách theo dõi trống. Hãy thêm các mã.",
    enterSymbol: "Nhập mã...",
    add: "Thêm",
    playlist: "Danh sách phát",
    offline: "Ngoại tuyến",
    prevTrack: "Tập trước",
    nextTrack: "Tập tiếp theo",
    listBtn: "Danh sách tập",
    play: "Phát",
    pause: "Tạm dừng",
    refresh: "LÀM MỚI",
    gainerTab: "TĂNG",
    loserTab: "GIẢM",
    allTab: "TẤT CẢ",
    volumeTab: "GD NHIỀU",
    portfolio: "DANH MỤC",
    outlookTitle: "ĐỒNG THUẬN CHUYÊN GIA",
    advancing: "Tăng",
    declining: "Giảm",
    unchanged: "Không đổi",
    vixChange: "Biến động",
    vixHigh: "Cao nhất",
    vixLow: "Thấp nhất",
    vixVolume: "Khối lượng",
    vixOpen: "Mở cửa",
    vixPrev: "Đóng cửa trước",
    loadingMarket: "Đang tải dữ liệu thị trường...",
    loadingNews: "Đang tải tin tức...",
    economicImpact: "Mức độ tác động",
    economicSource: "Nguồn tin",
    footerText: `© ${new Date().getFullYear()} THE MORNING BRIEF. Nội dung trên MorningBrief chỉ nhằm mục đích cung cấp thông tin và giáo dục, không phải khuyến nghị đầu tư, tư vấn tài chính cá nhân, hoặc lời mời mua/bán chứng khoán. Người dùng cần tự nghiên cứu và/hoặc tham khảo chuyên gia được cấp phép trước khi ra quyết định đầu tư.`,
    vovDesc: "Bản tin Thời sự 12h ngày 09/06/2026 của Đài Tiếng nói Việt Nam VOV. Cập nhật những tin tức nóng hổi trong nước và quốc tế.",
    tuoitreDesc: "Những thông tin hướng dẫn, giải đáp của các cơ quan quản lý và các bệnh viện về chính sách hỗ trợ thẻ bảo hiểm y tế cho người dân.",
    vietceteraDesc: "Trong số Vietnam Innovators Tiếng Việt tuần này, chúng ta sẽ trò chuyện cùng Phương Nam, Co-founder của Saigon Tếu về chủ đề kinh doanh biểu diễn nghệ thuật giải trí tại Việt Nam.",
    bbcDesc: "Donald Trump trả lời phỏng vấn thảo luận về Israel, chính sách đối ngoại của Mỹ và các diễn biến địa chính trị.",
    havesipDesc: "Lắng nghe những chia sẻ sâu sắc từ Podcaster The Tri Way về hành trình tự khám phá bản thân và những bài học cuộc sống ý nghĩa.",
    vovTitle: "Thời sự 12h 9/6/2026: Israel chính thức tuyên bố chấm dứt xung đột với Iran",
    tuoitreTitle: "Các bệnh viện hỗ trợ người chưa có thẻ bảo hiểm y tế ra sao?",
    vietceteraTitle: "Kinh doanh biểu diễn: Phát triển ra sao để tạo đột phá? | Phương Nam, Co-founder Saigon Tếu | EP 115",
    bbcTitle: "Donald Trump tells the BBC Israel did not defy him",
    havesipTitle: "Podcaster The Tri Way: Lúc cảm thấy đã hiểu mình lại là lúc không hiểu gì - Have A Sip #256",
  },
  en: {
    market: "VN MARKET",
    highlights: "HIGHLIGHTS",
    tabFocus: "FOCUS",
    tabBiz: "BIZ",
    tabTech: "TECH",
    audioNews: "AUDIO NEWS",
    expertBrief: "EXPERT BRIEF",
    indexTrends: "INDEX TRENDS",
    economicCalendar: "ECONOMIC CALENDAR",
    watchlist: "MY WATCHLIST",
    marketHighlights: "MARKET HIGHLIGHTS",
    goldForex: "GOLD & FOREX",
    loadMore: "Load more news",
    listen: "Listen Podcast",
    stop: "Stop",
    watchlistEmpty: "Watchlist is empty. Add symbols to monitor.",
    enterSymbol: "Enter symbol...",
    add: "Add",
    playlist: "Playlist",
    offline: "Offline",
    prevTrack: "Previous Track",
    nextTrack: "Next Track",
    listBtn: "Playlist",
    play: "Play",
    pause: "Pause",
    refresh: "REFRESH",
    gainerTab: "GAINERS",
    loserTab: "LOSERS",
    allTab: "ALL",
    volumeTab: "VOLUME",
    portfolio: "PORTFOLIO",
    outlookTitle: "EXPERT CONSENSUS",
    advancing: "Gainers",
    declining: "Losers",
    unchanged: "Unchanged",
    vixChange: "Change",
    vixHigh: "High",
    vixLow: "Low",
    vixVolume: "Volume",
    vixOpen: "Open",
    vixPrev: "Prev Close",
    loadingMarket: "Loading market data...",
    loadingNews: "Loading news...",
    economicImpact: "Impact level",
    economicSource: "Source",
    footerText: `© ${new Date().getFullYear()} THE MORNING BRIEF. MorningBrief content is for informational and educational purposes only. It is not personalized financial advice, investment recommendation, or an offer to buy or sell securities.`,
    vovDesc: "12h News Bulletin on June 9, 2026, from Voice of Vietnam VOV. Latest domestic and international updates.",
    tuoitreDesc: "Guidelines and explanations from regulatory agencies and hospitals on health insurance support policies for citizens.",
    vietceteraDesc: "In this week's Vietnamese edition of Vietnam Innovators, we chat with Phuong Nam, Co-founder of Saigon Teu, about the entertainment and performance business in Vietnam.",
    bbcDesc: "Donald Trump sits down for an interview discussing Israel, US foreign policy and geopolitical developments.",
    havesipDesc: "Listen to insightful sharing from Podcaster The Tri Way on their journey of self-discovery and meaningful life lessons.",
    vovTitle: "12h News June 9, 2026: Israel officially announces termination of conflict with Iran",
    tuoitreTitle: "How do hospitals support individuals without health insurance cards?",
    vietceteraTitle: "Show Business: How to grow and make a breakthrough? | Phuong Nam, Co-founder Saigon Teu | EP 115",
    bbcTitle: "Donald Trump tells the BBC Israel did not defy him",
    havesipTitle: "Podcaster The Tri Way: When you feel you understand yourself is when you understand nothing - Have A Sip #256",
  }
};

const fallbackPlaylist: PodcastTrack[] = [
  {
    id: 1,
    title: "Thời sự 12h 9/6/2026: Israel chính thức tuyên bố chấm dứt xung đột với Iran",
    artist: "VOV Thời sự",
    sourceName: "VOV",
    audioUrl: "https://anchor.fm/s/86ec8d4/podcast/play/121214259/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-5-9%2F66bc9c08-234f-a854-0599-2f603493df78.mp3",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/1314781/1314781-1780991007052-1792e98464ffd.jpg",
    description: "Bản tin Thời sự 12h ngày 09/06/2026 của Đài Tiếng nói Việt Nam VOV. Cập nhật những tin tức nóng hổi trong nước và quốc tế.",
    duration: "30:00",
    pubDate: "Tue, 09 Jun 2026 07:49:21 GMT"
  },
  {
    id: 2,
    title: "Các bệnh viện hỗ trợ người chưa có thẻ bảo hiểm y tế ra sao?",
    artist: "Báo Tuổi Trẻ Podcast",
    sourceName: "Tuổi Trẻ",
    audioUrl: "https://cdn2.tuoitre.vn/471584752817336320/2026/6/9/96benhvienbhytmixdown-17809955886731986407369.mp3",
    coverUrl: "https://cdn2.tuoitre.vn/thumb_w/1400/471584752817336320/2026/6/9/photo1780995663440-1780995663519990219478.png",
    description: "Những thông tin hướng dẫn, giải đáp của các cơ quan quản lý và các bệnh viện về chính sách hỗ trợ thẻ bảo hiểm y tế cho người dân.",
    duration: "08:15",
    pubDate: "Tue, 09 Jun 2026 15:59:00 +0700"
  },
  {
    id: 3,
    title: "Kinh doanh biểu diễn: Phát triển ra sao để tạo đột phá? | Phương Nam, Co-founder Saigon Tếu | EP 115",
    artist: "Vietnam Innovators",
    sourceName: "Vietcetera",
    audioUrl: "https://anchor.fm/s/103279b48/podcast/play/120665485/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-4-28%2F425054464-44100-2-fe1e2aff32a88.m4a",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43378946/43378946-1779971317256-8a228f724a68a.jpg",
    description: "Trong số Vietnam Innovators Tiếng Việt tuần này, chúng ta sẽ trò chuyện cùng Phương Nam, Co-founder của Saigon Tếu về chủ đề kinh doanh biểu diễn nghệ thuật giải trí tại Việt Nam.",
    duration: "45:00",
    pubDate: "Thu, 28 May 2026 13:00:00 GMT"
  },
  {
    id: 4,
    title: "Donald Trump tells the BBC Israel did not defy him",
    artist: "BBC Global News",
    sourceName: "BBC",
    audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0nqw8b9.mp3",
    coverUrl: "http://ichef.bbci.co.uk/images/ic/3000x3000/p0lqf7hf.jpg",
    description: "Donald Trump sits down for an interview discussing Israel, US foreign policy and geopolitical developments.",
    duration: "28:30",
    pubDate: "Tue, 09 Jun 2026 04:34:00 +0000"
  },
  {
    id: 5,
    title: "Podcaster The Tri Way: Lúc cảm thấy đã hiểu mình lại là lúc không hiểu gì - Have A Sip #256",
    artist: "Have A Sip",
    sourceName: "Vietcetera",
    audioUrl: "https://anchor.fm/s/103273a04/podcast/play/120027038/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-4-15%2F424203000-44100-2-16c7d2ed16ba3.m4a",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43378697/43378697-1778846896466-7334cebf0838b.jpg",
    description: "Lắng nghe những chia sẻ sâu sắc từ Podcaster The Tri Way về hành trình tự khám phá bản thân và những bài học cuộc sống ý nghĩa.",
    duration: "58:00",
    pubDate: "Fri, 15 May 2026 13:00:00 GMT"
  }
];


// Dynamic Economic Calendar events generator based on user's system date
function getUpcomingEvents(lang: "vi" | "en") {
  const now = new Date();
  const events = [];

  // 1. PMI (Chỉ số Nhà quản trị Mua hàng)
  // Released on the 1st business day of the next month.
  const getFirstBusinessDayOfNextMonth = (date: Date) => {
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    while (nextMonth.getDay() === 0 || nextMonth.getDay() === 6) { // 0: Sun, 6: Sat
      nextMonth.setDate(nextMonth.getDate() + 1);
    }
    return nextMonth;
  };
  
  const currentMonthPmi = new Date(now.getFullYear(), now.getMonth(), 1);
  while (currentMonthPmi.getDay() === 0 || currentMonthPmi.getDay() === 6) {
    currentMonthPmi.setDate(currentMonthPmi.getDate() + 1);
  }
  
  let displayMonthNameVi = "";
  let displayMonthNameEn = "";
  let pmiReleaseDate = now;

  if (now < currentMonthPmi) {
    pmiReleaseDate = currentMonthPmi;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthNum = prevMonthDate.getMonth() + 1;
    displayMonthNameVi = `Tháng ${monthNum}`;
    displayMonthNameEn = prevMonthDate.toLocaleString("en-US", { month: "long" });
  } else {
    pmiReleaseDate = getFirstBusinessDayOfNextMonth(now);
    const monthNum = now.getMonth() + 1;
    displayMonthNameVi = `Tháng ${monthNum}`;
    displayMonthNameEn = now.toLocaleString("en-US", { month: "long" });
  }

  const pmiFormattedDate = pmiReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const pmiFullDate = pmiReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  events.push({
    date: pmiFormattedDate,
    event: lang === "vi" 
      ? `Báo cáo Tình hình Sản xuất Việt Nam (PMI) ${displayMonthNameVi}`
      : `Vietnam Manufacturing Purchasing Managers' Index (PMI) - ${displayMonthNameEn}`,
    impact: "LỚN",
    class: "positive",
    source: "S&P Global",
    time: pmiFullDate,
    isMacroEvent: true,
    macroType: "PMI",
    description: lang === "vi"
      ? `Chỉ số Nhà quản trị Mua hàng (PMI) ngành sản xuất Việt Nam ${displayMonthNameVi.toLowerCase()} đo lường sức khỏe hoạt động sản xuất vĩ mô.`
      : `Vietnam Manufacturing PMI for ${displayMonthNameEn} measures the health of the macroeconomic manufacturing sector.`,
    summary: lang === "vi"
      ? `Chỉ số Nhà quản trị Mua hàng (PMI) ngành sản xuất Việt Nam phản ánh sức khỏe hoạt động của các doanh nghiệp tư nhân. Sự phục hồi được thúc đẩy bởi sự gia tăng của các đơn đặt hàng mới từ cả thị trường trong nước lẫn xuất khẩu quốc tế.\n\nCác nhà sản xuất đã chủ động điều chỉnh công suất, tuyển dụng nhân sự và quản lý hàng tồn kho nguyên vật liệu thô. Theo S&P Global, sự cải thiện ổn định của PMI là tín hiệu lạc quan củng cố đà tăng trưởng chung.`
      : `The Vietnam Manufacturing PMI reflects the health of private sector operations. The recovery is driven by an increase in new orders from both domestic and export markets.\n\nManufacturers have proactively adjusted capacity, hired staff, and managed raw material inventories. According to S&P Global, steady PMI improvement is a positive signal reinforcing overall growth.`,
    prevValue: "51.3",
    forecastValue: "51.8",
    unit: "Điểm | Points",
    expertOpinion: lang === "vi"
      ? "Khuyến nghị nhà đầu tư chú ý nhóm cổ phiếu Xuất khẩu (Dệt may, Thủy sản) và Cảng biển/Logistics. PMI cải thiện sẽ là động lực tăng giá mạnh cho nhóm sản xuất."
      : "Recommend investors focus on Export (Textiles, Seafood) and Seaports/Logistics sectors. An improving PMI serves as a strong catalyst for manufacturers."
  });

  // 2. GDP (Tổng sản phẩm quốc nội theo Quý)
  // Released in March (Q1), June (Q2), September (Q3), December (Q4) on the 29th/30th
  const getGdpDate = (date: Date) => {
    const month = date.getMonth();
    let quarterMonth = 2; // March
    let year = date.getFullYear();
    if (month > 2 && month <= 5) quarterMonth = 5; // June
    else if (month > 5 && month <= 8) quarterMonth = 8; // September
    else if (month > 8 && month <= 11) quarterMonth = 11; // December
    else if (month > 11) {
      quarterMonth = 2;
      year += 1;
    }

    const gdpDate = new Date(year, quarterMonth, 29);
    if (date > gdpDate) {
      let nextQuarterMonth = (quarterMonth + 3) % 12;
      let nextYear = year + (quarterMonth + 3 >= 12 ? 1 : 0);
      return new Date(nextYear, nextQuarterMonth, 29);
    }
    return gdpDate;
  };

  const gdpReleaseDate = getGdpDate(now);
  const gdpQuarter = Math.floor(gdpReleaseDate.getMonth() / 3) + 1;
  const gdpFormattedDate = gdpReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const gdpFullDate = gdpReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  events.push({
    date: gdpFormattedDate,
    event: lang === "vi"
      ? `Tổng cục Thống kê công bố số liệu GDP Quý ${gdpQuarter}`
      : `General Statistics Office (GSO) publishes Q${gdpQuarter} GDP Growth`,
    impact: "RẤT LỚN",
    class: "negative",
    source: "Tổng cục Thống kê (GSO)",
    time: gdpFullDate,
    isMacroEvent: true,
    macroType: "GDP",
    quarter: gdpQuarter,
    description: lang === "vi"
      ? `Báo cáo tăng trưởng GDP Quý ${gdpQuarter} đánh giá tốc độ phát triển tổng sản phẩm quốc nội và sức khỏe nền kinh tế.`
      : `Report on Q${gdpQuarter} GDP Growth evaluates gross domestic product expansion speed and economic health.`,
    summary: lang === "vi"
      ? `Số liệu GDP Quý ${gdpQuarter} đóng vai trò cốt lõi phản ánh bức tranh kinh tế tổng thể của Việt Nam, bao gồm sản xuất công nghiệp, tiêu dùng nội địa và giải ngân đầu tư công. Con số này là cơ sở để Ngân hàng Nhà nước hoạch định chính sách tiền tệ trong giai đoạn kế tiếp.\n\nTăng trưởng GDP tích cực sẽ thúc đẩy dòng tiền quay lại thị trường chứng khoán, đặc biệt ở các nhóm ngành có tính chu kỳ cao.`
      : `The Q${gdpQuarter} GDP figure acts as a core indicator of Vietnam's overall economic picture, including industrial production, domestic consumption, and public investment disbursement. This figure is the basis for the State Bank's monetary policy decisions in the next period.\n\nPositive GDP growth will drive capital back into the stock market, especially in highly cyclical sectors.`,
    prevValue: "5.66%",
    forecastValue: "6.20%",
    unit: "% YoY",
    expertOpinion: lang === "vi"
      ? "GDP tăng trưởng tốt củng cố xu thế tăng trung hạn của VN-Index. Các nhóm ngành như Ngân hàng, Bất động sản và Chứng khoán sẽ hưởng lợi trực tiếp từ đòn bẩy vĩ mô này."
      : "Solid GDP growth reinforces VN-Index's medium-term uptrend. Sectors like Banking, Real Estate, and Securities will benefit directly from this macro leverage."
  });

  // 3. CPI (Chỉ số Giá tiêu dùng hàng tháng)
  // Released on the 29th of every month.
  const getCpiDate = (date: Date) => {
    const cpiDate = new Date(date.getFullYear(), date.getMonth(), 29);
    if (date > cpiDate) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 29);
    }
    return cpiDate;
  };

  const cpiReleaseDate = getCpiDate(now);
  const cpiMonth = cpiReleaseDate.getMonth() + 1;
  const cpiFormattedDate = cpiReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const cpiFullDate = cpiReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  events.push({
    date: cpiFormattedDate,
    event: lang === "vi"
      ? `Báo cáo Chỉ số Giá tiêu dùng (CPI) Tháng ${cpiMonth}`
      : `Consumer Price Index (CPI) Report for Month ${cpiMonth}`,
    impact: "LỚN",
    class: "negative",
    source: "Tổng cục Thống kê (GSO)",
    time: cpiFullDate,
    isMacroEvent: true,
    macroType: "CPI",
    description: lang === "vi"
      ? `Báo cáo chính thức lạm phát chỉ số CPI tháng ${cpiMonth} và lũy kế phục vụ cân đối chính sách tiền tệ.`
      : `Official report on Month ${cpiMonth} CPI inflation and cumulative stats for balancing monetary policy.`,
    summary: lang === "vi"
      ? `Chỉ số giá tiêu dùng (CPI) tháng ${cpiMonth} phản ánh mức độ biến động giá cả hàng hóa dịch vụ tiêu dùng. Lạm phát được kiểm soát an toàn dưới ngưỡng 4.5% của Quốc hội sẽ tạo điều kiện duy trì lãi suất thấp hỗ trợ doanh nghiệp phục hồi sản xuất kinh doanh.\n\nSự chú ý hướng vào chỉ số lạm phát cơ bản để nhận diện xu thế chính sách trung hạn.`
      : `The Consumer Price Index (CPI) for Month ${cpiMonth} reflects price volatility of consumer goods and services. Inflation controlled safely below the Assembly's 4.5% target allows low interest rates to support corporate recovery.\n\nFocus shifts to core inflation to identify medium-term policy directions.`,
    prevValue: "4.02%",
    forecastValue: "3.85%",
    unit: "% YoY",
    expertOpinion: lang === "vi"
      ? "Lạm phát trong tầm kiểm soát củng cố tâm lý nắm giữ tài sản tài chính. Cân nhắc tích lũy các cổ phiếu thuộc nhóm ngành Điện, Nước, Tiêu dùng thiết yếu có tính phòng thủ."
      : "Controlled inflation stabilizes sentiment for financial assets. Consider accumulating defensive stocks in Power, Water, and Essential Consumer goods."
  });

  // 4. BCTC Bán niên Soát xét (Hạn chót công bố)
  // August 14th/15th of every year. We will use August 14th.
  const getBctcDate = (date: Date) => {
    const bctcDate = new Date(date.getFullYear(), 7, 14);
    if (date > bctcDate) {
      return new Date(date.getFullYear() + 1, 7, 14);
    }
    return bctcDate;
  };

  const bctcReleaseDate = getBctcDate(now);
  const bctcFormattedDate = bctcReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const bctcFullDate = bctcReleaseDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  events.push({
    date: bctcFormattedDate,
    event: lang === "vi"
      ? `Hạn chốt Báo cáo Tài chính Bán niên Soát xét ${bctcReleaseDate.getFullYear()}`
      : `Deadline for ${bctcReleaseDate.getFullYear()} Semi-Annual Audited Financial Statements`,
    impact: "LỚN",
    class: "neutral",
    source: "Ủy ban Chứng khoán Nhà nước (UBCKNN)",
    time: bctcFullDate,
    isMacroEvent: true,
    macroType: "BCTC",
    description: lang === "vi"
      ? `Hạn chót bắt buộc công bố báo cáo tài chính bán niên đã được soát xét độc lập đối với các doanh nghiệp niêm yết.`
      : `Mandatory deadline for listed companies to publish their reviewed semi-annual financial statements.`,
    summary: lang === "vi"
      ? `Thời điểm công bố báo cáo soát xét bán niên là thước đo quan trọng kiểm chứng độ trung thực số liệu lợi nhuận tự lập trước đó của doanh nghiệp. Nhà đầu tư cần đề phòng chênh lệch lợi nhuận âm lớn sau soát xét hoặc các ý kiến lưu ý nghiêm trọng từ kiểm toán viên độc lập.\n\nSự minh bạch và đúng hạn giúp duy trì niềm tin bền vững.`
      : `The release of reviewed semi-annual statements is a key milestone validating previously self-published earnings. Investors must watch for major negative revisions or emphasis of matter paragraphs from independent auditors.\n\nTransparency and timeliness help sustain market trust.`,
    prevValue: "85% Hoàn thành | Completed",
    forecastValue: "92% Hoàn thành | Completed",
    unit: "% Số lượng DN | % of Companies",
    expertOpinion: lang === "vi"
      ? "Đây là mùa thanh lọc chất lượng tài sản doanh nghiệp. Hãy cơ cấu danh mục, loại bỏ các mã có vấn đề về tính trung thực số liệu hoặc liên tục hoãn nộp báo cáo."
      : "This is a purging season for corporate asset quality. Clean up portfolios, eliminating tickers with reporting delay history or numbers discrepancy issues."
  });

  events.sort((a, b) => {
    const dateA = a.time.split("/").reverse().join("-");
    const dateB = b.time.split("/").reverse().join("-");
    return Date.parse(dateA) - Date.parse(dateB);
  });

  return events;
}

// Helper to get Vietnamese date labels for trading days
function getTradingDays(count: number) {
  if (count <= 0) return [];
  const dates: string[] = [];
  const current = new Date();
  
  while (dates.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Skip Saturday and Sunday
      dates.unshift(current.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }));
    }
    current.setDate(current.getDate() - 1);
  }
  return dates;
}

// Helper to generate a realistic mock article body from RSS short items
function generateMockArticleBody(item: NewsItem) {
  if (item.body) return item.body;
  const desc = item.description;
  return [
    `${desc}. Đây là thông tin tài chính quan trọng được ghi nhận trong phiên giao dịch hôm nay, phản ánh diễn biến nhanh của các chuyển động tài chính trong nước cũng như sức khỏe dòng tiền thực tế ở phân khúc liên quan.`,
    `Theo các chuyên gia vĩ mô, xu hướng này phản ánh sự điều chỉnh cục bộ khi dòng tiền có dấu hiệu phân hóa rõ nét. Sự thận trọng tăng cao tại các vùng kháng cự kỹ thuật khiến các nhà đầu tư lớn ưu tiên cơ cấu lại danh mục, trong khi dòng tiền cá nhân vẫn nỗ lực tìm kiếm cơ hội ở các cổ phiếu vừa và nhỏ có thông tin hỗ trợ riêng lẻ.`,
    `Trong các phiên tiếp theo, thị trường dự kiến sẽ tiếp tục kiểm định cung cầu tại các vùng hỗ trợ kỹ thuật trọng yếu. Khuyến nghị chung được các định chế tài chính đưa ra cho các nhà đầu tư là duy trì tỷ trọng tiền mặt hợp lý, ưu tiên tích lũy các cổ phiếu có nền tảng cơ bản vững chắc và kết quả kinh doanh quý tăng trưởng ổn định, đồng thời hạn chế tối đa việc mua đuổi trong các nhịp phục hồi kỹ thuật ngắn hạn.`
  ];
}

const indexAnalyses: Record<string, { expert: string; analysis: string; forecast: string }> = {
  "VN-Index": {
    expert: "Phan Dũng Khánh (Giám đốc Tư vấn Đầu tư Maybank)",
    analysis: "VN-Index đại diện nhóm vốn hóa lớn đang giữ nhịp tích lũy ổn định trước sức ép từ khối ngoại. Dòng vốn nội hấp thụ tốt cung giá thấp ở nhóm ngân hàng vĩ mô giúp giữ vững xu thế trung hạn.",
    forecast: "Chỉ số có xu hướng tiếp tục tích lũy trong biên độ 1.780 - 1.820 điểm để thiết lập nền giá vững chắc trước khi mở rộng nhịp tăng trưởng mới."
  },
  "HNX-Index": {
    expert: "Nguyễn Thế Minh (Giám đốc Phân tích CTCK Yuanta)",
    analysis: "Dòng tiền đầu cơ trên sàn HNX duy trì sự linh hoạt cao ở các nhóm Midcap như chứng khoán, xây dựng. Lực cầu chủ động gia tăng chứng tỏ mức định giá hiện tại vẫn khá hấp dẫn dòng tiền.",
    forecast: "Kỳ vọng chỉ số HNX-Index sẽ sớm hoàn tất nhịp kiểm định kỹ thuật quanh hỗ trợ cứng để bắt đầu nhịp phục hồi theo dòng tiền xoay vòng nhóm ngành."
  },
  "UPCoM-Index": {
    expert: "Trần Hoàng Sơn (Giám đốc Chiến lược Thị trường VPBankS)",
    analysis: "Thị trường UPCoM với biên độ lớn (+/- 15%) đang trải qua giai đoạn phân hóa sâu sắc. Dòng tiền lớn tập trung rõ rệt vào các cổ phiếu năng lượng, dầu khí có lợi nhuận tăng trưởng tốt.",
    forecast: "Chỉ số dự kiến sẽ tiếp tục đi ngang tích lũy biên độ rộng. Khuyến nghị nhà đầu tư tập trung vào câu chuyện nội tại doanh nghiệp thay vì đầu cơ lướt sóng."
  }
};

interface BrokerOutlook {
  name: string;
  stance: "BULLISH" | "BEARISH" | "NEUTRAL";
  targetRange: string;
  quote: string;
  class: string;
}

// Fixed/Dynamic Broker Reports Consensus (Simulating real-time inputs from local securities firms)
const initialBrokerOutlooks: BrokerOutlook[] = [
  {
    name: "SSI Research",
    stance: "BULLISH",
    targetRange: "1,245 - 1,260",
    quote: "Dòng tiền nội hấp thu tốt lực cung. Khuyến nghị giải ngân tỷ trọng cao tại nhóm Ngân hàng và Bán lẻ.",
    class: "positive"
  },
  {
    name: "MBS Securities",
    stance: "NEUTRAL",
    targetRange: "1,230 - 1,250",
    quote: "VN-Index gặp áp lực chốt lời tại vùng kháng cự mạnh. Cần nhịp tích lũy kiểm định cung cầu trước khi bứt phá.",
    class: "neutral"
  },
  {
    name: "HSC Securities",
    stance: "BEARISH",
    targetRange: "1,215 - 1,235",
    quote: "Khối ngoại liên tục bán ròng và thanh khoản sụt giảm cảnh báo rủi ro điều chỉnh kỹ thuật ngắn hạn.",
    class: "negative"
  },
  {
    name: "Vietcap Securities",
    stance: "BULLISH",
    targetRange: "1,250 - 1,270",
    quote: "Xu hướng phục hồi trung hạn được giữ vững, dẫn dắt bởi nhóm cổ phiếu Công nghệ và Bất động sản khu công nghiệp.",
    class: "positive"
  }
];

// Premium SVG icon components for the audio player
const PlayIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5.14a1 1 0 011.5-.86l10 6.86a1 1 0 010 1.72l-10 6.86a1 1 0 01-1.5-.86V5.14z" fill={color} />
  </svg>
);

const PauseIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="5" width="4" height="14" rx="1.5" fill={color} />
    <rect x="14" y="5" width="4" height="14" rx="1.5" fill={color} />
  </svg>
);

const SkipNextIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill={color} />
  </svg>
);

const SkipPreviousIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6v12h2V6H6zM18 6l-8.5 6 8.5 6V6z" fill={color} />
  </svg>
);

const Rewind10Icon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.2 6.4H6.8V2" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.9 6.5A9.4 9.4 0 1 1 4.6 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M10.2 12.1v6.1M9 13.2l1.2-1.1 1.2 1.1M15.2 12.1h1.3c1.1 0 1.9.8 1.9 1.9v2.4c0 1.1-.8 1.9-1.9 1.9h-1.3c-1.1 0-1.9-.8-1.9-1.9V14c0-1.1.8-1.9 1.9-1.9Z" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Forward30Icon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.8 6.4h4.4V2" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21.1 6.5A9.4 9.4 0 1 0 23.4 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9.2 12.1h2.9l-1.7 2.2h.6c1.1 0 1.9.8 1.9 1.9s-.8 2-2 2H9.2M16.2 12.1h1.3c1.1 0 1.9.8 1.9 1.9v2.4c0 1.1-.8 1.9-1.9 1.9h-1.3c-1.1 0-1.9-.8-1.9-1.9V14c0-1.1.8-1.9 1.9-1.9Z" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlaylistIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6h16M4 12h16M4 18h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SpeedIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z" fill={color} />
  </svg>
);

const MaximizeIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VolumeIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill={color} />
  </svg>
);

export default function Home() {
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [dateText, setDateText] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const saved = localStorage.getItem("morningbrief_lang");
    if (saved === "vi" || saved === "en") {
      setLang(saved as "vi" | "en");
    }
  }, []);

  const getTrackTitle = (track?: PodcastTrack | null) => {
    if (!track) return "";
    const fallbackMatch = fallbackPlaylist.find((fallback) => fallback.audioUrl === track.audioUrl);
    if (fallbackMatch?.id === 1) return lang === "vi" ? trans.vi.vovTitle : trans.en.vovTitle;
    if (fallbackMatch?.id === 2) return lang === "vi" ? trans.vi.tuoitreTitle : trans.en.tuoitreTitle;
    if (fallbackMatch?.id === 3) return lang === "vi" ? trans.vi.vietceteraTitle : trans.en.vietceteraTitle;
    if (fallbackMatch?.id === 4) return lang === "vi" ? trans.vi.bbcTitle : trans.en.bbcTitle;
    if (fallbackMatch?.id === 5) return lang === "vi" ? trans.vi.havesipTitle : trans.en.havesipTitle;
    return track.title;
  };

  const getTrackDesc = (track?: PodcastTrack | null) => {
    if (!track) return "";
    const fallbackMatch = fallbackPlaylist.find((fallback) => fallback.audioUrl === track.audioUrl);
    if (fallbackMatch?.id === 1) return lang === "vi" ? trans.vi.vovDesc : trans.en.vovDesc;
    if (fallbackMatch?.id === 2) return lang === "vi" ? trans.vi.tuoitreDesc : trans.en.tuoitreDesc;
    if (fallbackMatch?.id === 3) return lang === "vi" ? trans.vi.vietceteraDesc : trans.en.vietceteraDesc;
    if (fallbackMatch?.id === 4) return lang === "vi" ? trans.vi.bbcDesc : trans.en.bbcDesc;
    if (fallbackMatch?.id === 5) return lang === "vi" ? trans.vi.havesipDesc : trans.en.havesipDesc;
    return track.description;
  };
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [tickerList, setTickerList] = useState<TickerItem[]>([]);
  const hasLoadedStocksRef = useRef(false);
  const [brokerOutlooks, setBrokerOutlooks] = useState<BrokerOutlook[]>(initialBrokerOutlooks);
  const [errorMsg, setErrorMsg] = useState("");
  const [visibleNewsCount, setVisibleNewsCount] = useState(8);
  const [selectedChartIndex, setSelectedChartIndex] = useState("VN-Index");
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; index: number; x: number; y: number } | null>(null);
  const [isChartTransitioning, setIsChartTransitioning] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistNews, setWatchlistNews] = useState<WatchlistNewsItem[]>([]);
  const [loadingWatchlistNews, setLoadingWatchlistNews] = useState(false);
  const [loadingMoreWatchlistNews, setLoadingMoreWatchlistNews] = useState(false);
  const [watchlistNewsPage, setWatchlistNewsPage] = useState(1);
  const [hasMoreWatchlistNews, setHasMoreWatchlistNews] = useState(true);
  const [visibleWatchlistNewsCount, setVisibleWatchlistNewsCount] = useState(8);
  const [activeWatchlistStock, setActiveWatchlistStock] = useState<TickerItem | null>(null);
  const [activeWatchlistDetail, setActiveWatchlistDetail] = useState<StockSearchResult | null>(null);
  const [detailChartTimeframe, setDetailChartTimeframe] = useState<number>(30);
  const [detailChartData, setDetailChartData] = useState<number[]>([]);
  const [loadingDetailChart, setLoadingDetailChart] = useState(false);
  const [loadingWatchlistDetail, setLoadingWatchlistDetail] = useState(false);
  const [isWatchlistDetailClosing, setIsWatchlistDetailClosing] = useState(false);
  const [stockInlineArticle, setStockInlineArticle] = useState<StockInlineArticleState | null>(null);
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [loadingMacro, setLoadingMacro] = useState(true);
  // Index overview stats (liquidity, breadth, foreign trading) from CafeF
  const [indexStats, setIndexStats] = useState<Record<string, IndexOverview>>({});
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [activeMacroEvent, setActiveMacroEvent] = useState<any | null>(null);
  const [isReaderClosing, setIsReaderClosing] = useState(false);
  const [isMacroEventClosing, setIsMacroEventClosing] = useState(false);
  const [scrapedParagraphs, setScrapedParagraphs] = useState<string[]>([]);
  const [fullContent, setFullContent] = useState<ReaderContentBlock[]>([]);
  const [readerTab, setReaderTab] = useState<"summary" | "full">("summary");
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Podcast State Hooks
  const [podcastPlaylist, setPodcastPlaylist] = useState<PodcastTrack[]>(fallbackPlaylist);
  const [loadingPodcast, setLoadingPodcast] = useState(true);
  const [podcastSource, setPodcastSource] = useState<string>("Offline");
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);

  // New Podcast Channel & Option States
  const [selectedChannel, setSelectedChannel] = useState<string>("All");
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>("All");
  const [podcastSearchQuery, setPodcastSearchQuery] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isPodcastExpanded, setIsPodcastExpanded] = useState<boolean>(false);
  const [isPodcastClosing, setIsPodcastClosing] = useState<boolean>(false);
  const [readerSwipeOffset, setReaderSwipeOffset] = useState<number>(0);
  const [isDraggingReader, setIsDraggingReader] = useState<boolean>(false);
  const readerSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isMobilePlaylistOpen, setIsMobilePlaylistOpen] = useState<boolean>(false);
  const [isMobileMiniHidden, setIsMobileMiniHidden] = useState(true);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [isMobilePlayerClosing, setIsMobilePlayerClosing] = useState(false);
  const [isAudioInfoOpen, setIsAudioInfoOpen] = useState(false);
  const [artSwipeMotion, setArtSwipeMotion] = useState<"next" | "prev" | null>(null);

  // Curated Channels List with custom styling details
  const channelsList = useMemo(() => {
    return [
      { id: "All", name: lang === "vi" ? "Tất cả" : "All", logo: "/icon/headphone-icon.png", color: "var(--accent-blue)", desc: lang === "vi" ? "Tất cả các nguồn tin phát thanh tổng hợp sáng nay." : "All curated audio feeds for this morning." },
      { id: "VOV", name: "VOV", logo: "/icon/microphone-icon.png", color: "#A30000", desc: lang === "vi" ? "Đài Tiếng nói Việt Nam VOV - Tin thời sự & kinh tế vĩ mô nóng hổi." : "Voice of Vietnam news and macroeconomic updates." },
      { id: "Tuổi Trẻ", name: "Tuổi Trẻ", logo: "/icon/closed-book-icon.png", color: "#005ea5", desc: lang === "vi" ? "Báo Tuổi Trẻ - Tin tức đời sống & tài chính tiêu dùng." : "Tuoi Tre news, social updates & consumer finance." },
      { id: "Vietcetera", name: "Vietcetera", logo: "/icon/coffee-cup-icon.png", color: "#ff3e00", desc: lang === "vi" ? "Podcast đối thoại kinh doanh, đổi mới & lối sống." : "Vietcetera conversations on business, career & lifestyle." },
      { id: "VietSuccess", name: "VietSuccess", logo: "/icon/chart-icon.png", color: "#0b7a53", desc: lang === "vi" ? "Câu chuyện lãnh đạo, kinh doanh và tư duy tài chính từ VietSuccess." : "Leadership, business and finance conversations from VietSuccess." },
      { id: "Tài Chính & Kinh Doanh", name: "Tài chính & KD", logo: "/icon/piggy-bank-icon.png", color: "#c47a00", desc: lang === "vi" ? "Nội dung tài chính và kinh doanh cho nhà đầu tư cá nhân." : "Finance and business episodes for individual investors." },
      { id: "Tâm Sự Tài Chính", name: "Tâm sự TC", logo: "/icon/newspaper-icon.png", color: "#7a4ce0", desc: lang === "vi" ? "Tâm sự tài chính cùng Trịnh Công Hoà." : "Personal finance conversations with Trinh Cong Hoa." },
      { id: "Hieu.TV", name: "Hieu.TV", logo: "/icon/globes-icon.png", color: "#111827", desc: lang === "vi" ? "Podcast về tài chính cá nhân, đầu tư và cuộc sống." : "Personal finance, investing and life lessons from Hieu.TV." },
      { id: "BBC", name: "BBC", logo: "/icon/globes-icon.png", color: "#b00000", desc: lang === "vi" ? "BBC World Service - Tin tức toàn cầu & Tiếng Anh." : "BBC global perspective and English learning." }
    ];
  }, [lang]);

  const calendarEvents = useMemo(() => getUpcomingEvents(lang), [lang]);

  const channelArtworkBySource = useMemo(() => {
    const artworkBySource: Record<string, string> = {};
    podcastPlaylist.forEach((track) => {
      if (track.sourceName && track.coverUrl && !artworkBySource[track.sourceName]) {
        artworkBySource[track.sourceName] = track.coverUrl;
      }
    });
    return artworkBySource;
  }, [podcastPlaylist]);

  const filteredPlaylist = useMemo(() => {
    let list = podcastPlaylist;
    if (selectedChannel !== "All") {
      list = list.filter(track => track.sourceName === selectedChannel);
    }
    if (selectedSubChannel !== "All") {
      list = list.filter(track => track.artist === selectedSubChannel);
    }
    if (podcastSearchQuery.trim() !== "") {
      const q = podcastSearchQuery.toLowerCase();
      list = list.filter(track => 
        track.title.toLowerCase().includes(q) || 
        (track.description && track.description.toLowerCase().includes(q)) ||
        (track.artist && track.artist.toLowerCase().includes(q))
      );
    }
    return list;
  }, [podcastPlaylist, selectedChannel, selectedSubChannel, podcastSearchQuery]);

  const subChannelsList = useMemo(() => {
    if (selectedChannel === "All") return ["All"];
    const artists = new Set<string>();
    podcastPlaylist.forEach(track => {
      if (track.sourceName === selectedChannel && track.artist) {
        artists.add(track.artist);
      }
    });
    return ["All", ...Array.from(artists)];
  }, [podcastPlaylist, selectedChannel]);

  const currentTrack = useMemo(() => {
    const allTracks = podcastPlaylist.length > 0 ? podcastPlaylist : fallbackPlaylist;
    if (currentTrackId !== null) {
      const match = allTracks.find((track) => track.id === currentTrackId);
      if (match) return match;
    }
    return allTracks[currentTrackIndex] || allTracks[0] || fallbackPlaylist[0];
  }, [currentTrackId, currentTrackIndex, podcastPlaylist]);

  // Safely bound currentTrackIndex when the filtered playlist changes
  useEffect(() => {
    if (currentTrackIndex >= filteredPlaylist.length) {
      setCurrentTrackIndex(0);
    }
  }, [filteredPlaylist, currentTrackIndex]);

  useEffect(() => {
    if (currentTrackId === null && podcastPlaylist.length > 0) {
      setCurrentTrackId(podcastPlaylist[0].id);
    }
  }, [currentTrackId, podcastPlaylist]);

  // Synchronize playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentTrack, currentTrackIndex]);

  // Synchronize volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    // Dock is shown/hidden via swipe gestures and tab switching, no automatic close on pause
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (mobilePlayerCloseTimerRef.current) clearTimeout(mobilePlayerCloseTimerRef.current);
      if (readerCloseTimerRef.current) clearTimeout(readerCloseTimerRef.current);
      if (macroEventCloseTimerRef.current) clearTimeout(macroEventCloseTimerRef.current);
      if (artSwipeTimerRef.current) clearTimeout(artSwipeTimerRef.current);
      if (watchlistDetailCloseTimerRef.current) clearTimeout(watchlistDetailCloseTimerRef.current);
    };
  }, []);
  
  // Stock list highlight filter
  const [stockFilterTab, setStockFilterTab] = useState<"all" | "gainers" | "losers" | "volume">("all");

  const [highlights, setHighlights] = useState<{
    gainers: TickerItem[];
    losers: TickerItem[];
    volume: TickerItem[];
  } | null>(null);

  // Mobile Bottom Tab Navigation
  const [activeMobileTab, setActiveMobileTab] = useState<"home" | "markets" | "portfolio" | "podcast">("home");

  // Stock Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const miniPlayerSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const revealTabSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const artSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const miniPlayerSwipeHandledRef = useRef(false);
  const mobilePlayerCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const readerCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const macroEventCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const artSwipeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchlistDetailCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  function openArticle(article: NewsItem) {
    if (readerCloseTimerRef.current) clearTimeout(readerCloseTimerRef.current);
    setIsReaderClosing(false);
    setActiveArticle(article);
  }

  const openCurrentChannelPlaylist = () => {
    if (currentTrack?.sourceName) {
      setSelectedChannel(currentTrack.sourceName);
      setSelectedSubChannel("All");
      setPodcastSearchQuery("");
      setCurrentTrackIndex(0);
    }
    setShowPlaylist((open) => !open);
  };

  const openStockInlineArticle = async (article: NewsItem, key: string) => {
    if (stockInlineArticle?.key === key) {
      setStockInlineArticle(null);
      return;
    }

    const initialSummary = article.description ? [article.description] : [];
    setStockInlineArticle({
      key,
      article,
      tab: "summary",
      loading: Boolean(article.link && !article.link.startsWith("#")),
      summary: initialSummary,
      fullContent: article.body?.map((text) => ({ type: "paragraph", text })) || [],
    });

    if (!article.link || article.link.startsWith("#")) return;

    try {
      const res = await fetch(`/api/news/content?url=${encodeURIComponent(article.link)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const summary = Array.isArray(data.paragraphs) && data.paragraphs.length > 0
        ? data.paragraphs
        : initialSummary;
      const apiFullContent = Array.isArray(data.fullContent)
        ? data.fullContent.filter((block: ReaderContentBlock) => {
          if (block.type === "image") return Boolean(block.url);
          return Boolean(block.text && block.text.trim().length > 0);
        })
        : [];

      setStockInlineArticle((current) => current?.key === key
        ? { ...current, loading: false, summary, fullContent: apiFullContent }
        : current
      );
    } catch (err) {
      console.error("Error fetching stock related article:", err);
      setStockInlineArticle((current) => current?.key === key
        ? {
          ...current,
          loading: false,
          summary: initialSummary,
          fullContent: [],
          error: lang === "vi" ? "Không thể tải thêm nội dung. Bạn có thể đọc tại nguồn." : "Unable to load more content. You can read at the source.",
        }
        : current
      );
    }
  };

  const setStockInlineArticleTab = (tab: "summary" | "full") => {
    setStockInlineArticle((current) => current ? { ...current, tab } : current);
  };

  function closeArticle() {
    if (!activeArticle || isReaderClosing) return;
    setIsReaderClosing(true);
    if (readerCloseTimerRef.current) clearTimeout(readerCloseTimerRef.current);
    readerCloseTimerRef.current = setTimeout(() => {
      setActiveArticle(null);
      setIsReaderClosing(false);
    }, 360);
  }

  function closeMacroEvent() {
    if (!activeMacroEvent || isMacroEventClosing) return;
    setIsMacroEventClosing(true);
    if (macroEventCloseTimerRef.current) clearTimeout(macroEventCloseTimerRef.current);
    macroEventCloseTimerRef.current = setTimeout(() => {
      setActiveMacroEvent(null);
      setIsMacroEventClosing(false);
    }, 360);
  }

  const getCleanTickerSymbol = (symbol: string) => {
    return symbol.split(" ")[0].replace(".VN", "").replace("^", "").trim().toUpperCase();
  };

  const formatWatchlistVolume = (item?: TickerItem | null) => {
    if (!item) return "N/A";
    if (item.volumeStr) return item.volumeStr;
    if (item.volume && Number.isFinite(item.volume)) return item.volume.toLocaleString("en-US");
    return "N/A";
  };

  const fetchDetailChart = async (symbol: string, days: number) => {
    setLoadingDetailChart(true);
    try {
      const res = await fetch(`/api/stocks/history?symbol=${encodeURIComponent(symbol)}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setDetailChartData(data.history);
        }
      }
    } catch (err) {
      console.error("Error fetching detail chart:", err);
    } finally {
      setLoadingDetailChart(false);
    }
  };

  const openWatchlistStockDetail = async (item: TickerItem) => {
    if (watchlistDetailCloseTimerRef.current) clearTimeout(watchlistDetailCloseTimerRef.current);
    setIsWatchlistDetailClosing(false);
    setActiveWatchlistStock(item);
    setActiveWatchlistDetail(null);
    setStockInlineArticle(null);
    setLoadingWatchlistDetail(true);

    const symbol = getCleanTickerSymbol(item.symbol || item.ticker);
    setDetailChartTimeframe(30);
    setDetailChartData([]);
    fetchDetailChart(symbol, 30);
    
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json() as StockSearchResult[];
        const exactMatch = Array.isArray(data)
          ? data.find((entry) => entry.symbol.toUpperCase() === symbol) || data[0]
          : null;
        setActiveWatchlistDetail(exactMatch || null);
      }
    } catch (err) {
      console.error("Error fetching watchlist stock detail:", err);
    } finally {
      setLoadingWatchlistDetail(false);
    }
  };

  const refreshWatchlistStockDetail = async () => {
    if (!activeWatchlistStock || loadingWatchlistDetail) return;
    const symbol = getCleanTickerSymbol(activeWatchlistStock.symbol || activeWatchlistStock.ticker);
    setLoadingWatchlistDetail(true);
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(symbol)}&fresh=1&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json() as StockSearchResult[];
        const exactMatch = Array.isArray(data)
          ? data.find((entry) => entry.symbol.toUpperCase() === symbol) || data[0]
          : null;
        setActiveWatchlistDetail(exactMatch || null);
      }
    } catch (err) {
      console.error("Error refreshing watchlist stock detail:", err);
    } finally {
      setLoadingWatchlistDetail(false);
    }
  };

  const openSearchStockDetail = (item: StockSearchResult) => {
    const tickerItem: TickerItem = {
      symbol: item.symbol,
      ticker: item.symbol,
      price: item.price,
      change: item.change,
      isPositive: item.isPositive,
      sector: item.displayName || item.sector,
      exchange: item.exchange,
      volumeStr: item.volume
    };
    if (watchlistDetailCloseTimerRef.current) clearTimeout(watchlistDetailCloseTimerRef.current);
    setIsWatchlistDetailClosing(false);
    setActiveWatchlistStock(tickerItem);
    setActiveWatchlistDetail(item);
    setStockInlineArticle(null);
    setLoadingWatchlistDetail(false);
  };

  const closeWatchlistStockDetail = () => {
    if (!activeWatchlistStock || isWatchlistDetailClosing) return;
    setIsWatchlistDetailClosing(true);
    if (watchlistDetailCloseTimerRef.current) clearTimeout(watchlistDetailCloseTimerRef.current);
    watchlistDetailCloseTimerRef.current = setTimeout(() => {
      setActiveWatchlistStock(null);
      setActiveWatchlistDetail(null);
      setStockInlineArticle(null);
      setIsWatchlistDetailClosing(false);
    }, 420);
  };

  function closeMobilePlayer() {
    if (!isMobilePlayerOpen || isMobilePlayerClosing) return;
    setIsMobilePlayerClosing(true);
    setIsAudioInfoOpen(false);

    // If on the dedicated podcast tab, pause the track and hide mini player dock
    if (activeMobileTab === "podcast") {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setIsMobileMiniHidden(true);
    } else {
      // Otherwise keep dock visible
      setIsMobileMiniHidden(false);
    }

    if (mobilePlayerCloseTimerRef.current) clearTimeout(mobilePlayerCloseTimerRef.current);
    mobilePlayerCloseTimerRef.current = setTimeout(() => {
      setIsMobilePlayerOpen(false);
      setIsMobilePlayerClosing(false);
    }, 420);
  }

  const closePodcastExpanded = () => {
    if (isPodcastClosing) return;
    setIsPodcastClosing(true);
    setTimeout(() => {
      setIsPodcastExpanded(false);
      setIsPodcastClosing(false);
    }, 350);
  };

  // Format Date in traditional FT format
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const locale = lang === "vi" ? "vi-VN" : "en-US";
    setDateText(new Date().toLocaleDateString(locale, options));
  }, [lang]);

  // Load full article content dynamically when activeArticle changes
  useEffect(() => {
    // Reset reader states
    setReaderTab("summary");
    setFullContent([]);

    if (!activeArticle) {
      setScrapedParagraphs([]);
      setLoadingContent(false);
      return;
    }

    // Case 1: Article has pre-defined body (e.g. mock articles or calendar events)
    if (activeArticle.body && activeArticle.body.length > 0) {
      setScrapedParagraphs(activeArticle.body);
      setFullContent(activeArticle.body.map(para => ({ type: "paragraph", text: para })));
      setLoadingContent(false);
      return;
    }

    // Case 2: Article has a real external link, fetch content via scraper API
    if (activeArticle.link && !activeArticle.link.startsWith("#")) {
      setLoadingContent(true);
      setScrapedParagraphs([]);

      const fetchContent = async () => {
        try {
          const res = await fetch(`/api/news/content?url=${encodeURIComponent(activeArticle.link)}`);
          if (res.ok) {
            const data = await res.json();
            
            // Set summary paragraphs
            if (data.paragraphs && Array.isArray(data.paragraphs)) {
              setScrapedParagraphs(data.paragraphs);
            } else {
              setScrapedParagraphs([]);
            }

            // Set full content (paragraphs + images)
            if (data.fullContent && Array.isArray(data.fullContent)) {
              setFullContent(data.fullContent);
            } else {
              setFullContent([]);
            }
          } else {
            console.error("Failed to fetch article content:", res.status);
            setScrapedParagraphs([]);
            setFullContent([]);
          }
        } catch (err) {
          console.error("Error fetching article content:", err);
          setScrapedParagraphs([]);
          setFullContent([]);
        } finally {
          setLoadingContent(false);
        }
      };

      fetchContent();
    } else {
      setScrapedParagraphs([]);
      setFullContent([]);
      setLoadingContent(false);
    }
  }, [activeArticle]);

  const getSavedWatchlistSymbols = () => {
    try {
      const saved = localStorage.getItem("morningbrief_watchlist");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  };

  const getStocksCacheKey = (symbols: string[]) => (
    symbols.length > 0 ? `stocks:${symbols.join(",")}` : "stocks:default"
  );

  const applyStockData = (data: StocksApiResponse) => {
    const combined = [...(data.indices || []), ...(data.watchlistTickers || [])];
    setTickerList(combined);
    setHighlights(data.highlights || null);
    hasLoadedStocksRef.current = true;

    const statsMap: Record<string, IndexOverview> = {};
    (data.indices || []).forEach((idx) => {
      if (idx.overview) {
        statsMap[idx.symbol] = idx.overview;
      }
    });
    setIndexStats(statsMap);
  };

  // Fetch Vietnamese Stocks
  const fetchStocks = async () => {
    const savedWatchlist = getSavedWatchlistSymbols();
    const cacheKey = getStocksCacheKey(savedWatchlist);
    const cached = readClientCache<StocksApiResponse>(cacheKey, CLIENT_CACHE_MAX_AGE.stocks);

    if (!hasLoadedStocksRef.current && cached) {
      applyStockData(cached);
      setLoadingStocks(false);
    }

    const shouldShowInitialLoader = !hasLoadedStocksRef.current && tickerList.length === 0;
    if (shouldShowInitialLoader && !cached) {
      setLoadingStocks(true);
    }
    try {
      const watchlistParams = savedWatchlist.length > 0
        ? `?watchlist=${encodeURIComponent(savedWatchlist.join(","))}`
        : "";

      const res = await fetchWithTimeout(`/api/stocks${watchlistParams}`);
      if (!res.ok) throw new Error("Failed to fetch stock data");
      const data = await res.json() as StocksApiResponse & { isFallback?: boolean };
      applyStockData(data);
      writeClientCache(cacheKey, data);
      
      if (data.isFallback) {
        setErrorMsg(lang === "vi"
          ? "Không thể kết nối đến máy chủ dữ liệu. Đang hiển thị dữ liệu lưu đệm gần nhất."
          : "Unable to connect to market data server. Displaying last cached data.");
      } else {
        setErrorMsg("");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(lang === "vi"
        ? "Lỗi kết nối máy chủ dữ liệu thị trường. Vui lòng thử lại sau."
        : "Failed to connect to market data server. Please try again later.");
    } finally {
      if (shouldShowInitialLoader || cached) {
        setLoadingStocks(false);
      }
    }
  };

  // Fetch News Feed based on selected category tab
  const fetchNews = async (category: string) => {
    const cacheKey = `news:${category}`;
    const cached = readClientCache<NewsItem[]>(cacheKey, CLIENT_CACHE_MAX_AGE.news);
    if (cached && cached.length > 0) {
      setNewsList(cached);
      setLoadingNews(false);
    } else {
      setLoadingNews(true);
    }
    try {
      const res = await fetchWithTimeout(`/api/news?category=${category}`);
      if (!res.ok) throw new Error("Failed to fetch news data");
      const data = await res.json() as NewsItem[];
      setNewsList(data);
      writeClientCache(cacheKey, data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNews(false);
    }
  };

  const fetchMacroData = async () => {
    const cached = readClientCache<MacroData>("macro", CLIENT_CACHE_MAX_AGE.macro);
    if (cached) {
      setMacroData(cached);
      setLoadingMacro(false);
    } else {
      setLoadingMacro(true);
    }
    try {
      const res = await fetchWithTimeout("/api/macro");
      if (res.ok) {
        const data = await res.json() as MacroData;
        setMacroData(data);
        writeClientCache("macro", data);
      }
    } catch (e) {
      console.error("Failed to fetch macro data:", e);
    } finally {
      setLoadingMacro(false);
    }
  };

  const toggleWatchlist = (symbol: string) => {
    let updated;
    if (watchlist.includes(symbol)) {
      updated = watchlist.filter(s => s !== symbol);
    } else {
      updated = [...watchlist, symbol];
    }
    setWatchlist(updated);
    localStorage.setItem("morningbrief_watchlist", JSON.stringify(updated));
    setTimeout(() => {
      fetchStocks();
    }, 50);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSearchError("");

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim().length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length === 0) {
            setSearchError(lang === "vi" ? "Không tìm thấy mã chứng khoán phù hợp." : "No matching stock symbol found.");
          }
        } else {
          setSearchError(lang === "vi" ? "Lỗi khi tra cứu." : "Search error.");
        }
      } catch {
        setSearchError(lang === "vi" ? "Không thể kết nối máy chủ." : "Could not connect to server.");
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const renderSearchResultCard = (item: StockSearchResult, idx: number) => {
    const pct = parseFloat(item.change.replace("%", ""));
    let colorClass = item.isPositive ? "positive" : "negative";
    const ex = item.exchange || "HOSE";
    if (ex === "HOSE" && Math.abs(pct) >= 6.85) colorClass = pct > 0 ? "ceiling" : "floor";
    else if (ex === "HNX" && Math.abs(pct) >= 9.85) colorClass = pct > 0 ? "ceiling" : "floor";
    else if (ex === "UPCoM" && Math.abs(pct) >= 14.85) colorClass = pct > 0 ? "ceiling" : "floor";

    const isStarred = watchlist.includes(item.symbol);

    return (
      <div
        key={idx}
        className="stock-search-result-card animate-fade-in-up"
        style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}
        onClick={() => openSearchStockDetail(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openSearchStockDetail(item);
        }}
      >
        <div className="stock-search-result-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              onClick={(event) => {
                event.stopPropagation();
                toggleWatchlist(item.symbol);
              }}
              style={{ color: isStarred ? "var(--accent-red)" : "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}
            >
              {isStarred ? "⭐" : "☆"}
            </span>
            <div>
              <span className="stock-search-symbol">{item.symbol}</span>
              <span className="stock-search-exchange">{item.exchange}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: "700" }}>{item.price}</div>
            <span className={`ticker-change ${colorClass}`} style={{ fontSize: "0.78rem" }}>
              {item.change}
            </span>
          </div>
        </div>
        <div className="stock-search-result-name">{item.displayName}</div>
        <div className="stock-search-details-grid">
          <div className="stock-search-detail">
            <span className="stock-detail-label">{lang === "vi" ? "TC hôm trước" : "Prev Close"}</span>
            <span className="stock-detail-value">{item.prevClose}</span>
          </div>
          <div className="stock-search-detail">
            <span className="stock-detail-label">{lang === "vi" ? "Cao nhất" : "Day High"}</span>
            <span className="stock-detail-value">{item.dayHigh}</span>
          </div>
          <div className="stock-search-detail">
            <span className="stock-detail-label">{lang === "vi" ? "Thấp nhất" : "Day Low"}</span>
            <span className="stock-detail-value">{item.dayLow}</span>
          </div>
          <div className="stock-search-detail">
            <span className="stock-detail-label">{lang === "vi" ? "Khối lượng" : "Volume"}</span>
            <span className="stock-detail-value">{item.volume}</span>
          </div>
        </div>

        {/* CafeF Financial Metrics Grid */}
        {(item.pe || item.pb || item.eps || item.marketCapVnd) && (
          <div className="stock-financial-section">
            <div className="stock-financial-label">📊 {lang === "vi" ? "Chỉ số định giá" : "Valuation Metrics"}</div>
            <div className="stock-financial-grid">
              {item.pe && (
                <div className="stock-financial-item">
                  <span className="stock-fin-label">P/E</span>
                  <span className="stock-fin-value">{item.pe}</span>
                </div>
              )}
              {item.pb && (
                <div className="stock-financial-item">
                  <span className="stock-fin-label">P/B</span>
                  <span className="stock-fin-value">{item.pb}</span>
                </div>
              )}
              {item.eps && (
                <div className="stock-financial-item">
                  <span className="stock-fin-label">EPS</span>
                  <span className="stock-fin-value">{item.eps}</span>
                </div>
              )}
              {item.marketCapVnd && (
                <div className="stock-financial-item">
                  <span className="stock-fin-label">{lang === "vi" ? "Vốn hóa" : "Mkt Cap"}</span>
                  <span className="stock-fin-value">{item.marketCapVnd}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Description */}
        {item.description && (
          <div className="stock-description-block">
            <div className="stock-financial-label">ℹ️ {lang === "vi" ? "Về doanh nghiệp" : "About"}</div>
            <p className="stock-description-text">{item.description}</p>
          </div>
        )}

        {/* Related News */}
        {item.relatedNews && item.relatedNews.length > 0 && (
          <div className="stock-related-news hidden-mobile">
            <div className="stock-financial-label">📰 {lang === "vi" ? "Tin tức mới nhất" : "Latest News"}</div>
            <ul className="stock-news-list">
              {item.relatedNews.map((news, ni) => (
                <li key={ni} className="stock-news-item">
                  <a
                    href={news.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stock-news-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {news.title}
                  </a>
                  {news.time && <span className="stock-news-time">{news.time}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Podcast Helper functions
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTrackEnded = () => {
    handleNextTrack();
  };

  const handleNextTrack = () => {
    const list = filteredPlaylist.length > 0 ? filteredPlaylist : podcastPlaylist;
    if (list.length === 0) return;
    const currentIndex = currentTrack ? list.findIndex((track) => track.id === currentTrack.id) : -1;
    const nextIndex = ((currentIndex >= 0 ? currentIndex : currentTrackIndex) + 1) % list.length;
    setCurrentTrackIndex(nextIndex);
    setCurrentTrackId(list[nextIndex].id);
  };

  const handlePrevTrack = () => {
    const list = filteredPlaylist.length > 0 ? filteredPlaylist : podcastPlaylist;
    if (list.length === 0) return;
    const currentIndex = currentTrack ? list.findIndex((track) => track.id === currentTrack.id) : -1;
    const prevIndex = ((currentIndex >= 0 ? currentIndex : currentTrackIndex) - 1 + list.length) % list.length;
    setCurrentTrackIndex(prevIndex);
    setCurrentTrackId(list[prevIndex].id);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.log("Audio play error:", err));
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const seekAudioBy = (seconds: number) => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime || 0;
    const maxDuration = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : duration;
    const nextTime = Math.min(Math.max(current + seconds, 0), maxDuration || current + seconds);
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const selectTrack = (index: number) => {
    const track = filteredPlaylist[index] || podcastPlaylist[index];
    if (!track) return;
    setCurrentTrackIndex(index);
    setCurrentTrackId(track.id);
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const playerSheetSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const startPlayerSheetSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    playerSheetSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const endPlayerSheetSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const start = playerSheetSwipeStartRef.current;
    const touch = event.changedTouches[0];
    playerSheetSwipeStartRef.current = null;
    if (!start || !touch) return;

    const deltaY = touch.clientY - start.y;
    // Swipe down from upper half of the screen
    if (deltaY > 60 && start.y < window.innerHeight / 2) {
      closeMobilePlayer();
    }
  };

  const startMiniPlayerSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    miniPlayerSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    miniPlayerSwipeHandledRef.current = false;
  };

  const endMiniPlayerSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const start = miniPlayerSwipeStartRef.current;
    const touch = event.changedTouches[0];
    miniPlayerSwipeStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

    if (isHorizontalSwipe && deltaX > 0) {
      miniPlayerSwipeHandledRef.current = true;
      setIsMobileMiniHidden(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setIsMobilePlayerOpen(false);
    }
  };

  const startRevealTabSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    revealTabSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const endRevealTabSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const start = revealTabSwipeStartRef.current;
    const touch = event.changedTouches[0];
    revealTabSwipeStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isLeftSwipe = deltaX < -34 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    if (isLeftSwipe) {
      setIsMobileMiniHidden(false);
    }
  };

  const openMobilePlayer = () => {
    if (miniPlayerSwipeHandledRef.current) {
      miniPlayerSwipeHandledRef.current = false;
      return;
    }
    if (mobilePlayerCloseTimerRef.current) clearTimeout(mobilePlayerCloseTimerRef.current);
    setIsMobilePlayerClosing(false);
    setIsAudioInfoOpen(false);
    setIsMobilePlayerOpen(true);
  };

  const startArtworkSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    artSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const endArtworkSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const start = artSwipeStartRef.current;
    const touch = event.changedTouches[0];
    artSwipeStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    if (!isHorizontalSwipe) return;

    const direction = deltaX > 0 ? "next" : "prev";
    setArtSwipeMotion(direction);
    if (artSwipeTimerRef.current) clearTimeout(artSwipeTimerRef.current);
    artSwipeTimerRef.current = setTimeout(() => setArtSwipeMotion(null), 360);

    if (direction === "next") {
      handleNextTrack();
    } else {
      handlePrevTrack();
    }
  };

  const startReaderSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    readerSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDraggingReader(true);
  };

  const moveReaderSwipe = (event: React.TouchEvent<HTMLElement>) => {
    if (!readerSwipeStartRef.current) return;
    const touch = event.touches[0];
    const deltaY = touch.clientY - readerSwipeStartRef.current.y;
    const deltaX = touch.clientX - readerSwipeStartRef.current.x;
    if (deltaY > 0 && deltaY > Math.abs(deltaX)) {
      setReaderSwipeOffset(deltaY);
    }
  };

  const endReaderSwipe = (event: React.TouchEvent<HTMLElement>) => {
    setIsDraggingReader(false);
    const offset = readerSwipeOffset;
    setReaderSwipeOffset(0);
    readerSwipeStartRef.current = null;
    if (offset > 120) {
      closeArticle();
    }
  };

  // Stock Market Limit Pricing Color Code Helper (Ceiling/Floor)
  const getStockColorClass = (item: TickerItem) => {
    if (item.sector === "Chỉ số") {
      return item.isPositive ? "positive" : "negative";
    }
    try {
      const pct = parseFloat(item.change.replace("%", ""));
      if (isNaN(pct)) return item.isPositive ? "positive" : "negative";
      
      const ex = item.exchange || "HOSE";
      if (ex === "HOSE") {
        if (pct >= 6.85) return "ceiling";
        if (pct <= -6.85) return "floor";
      } else if (ex === "HNX") {
        if (pct >= 9.85) return "ceiling";
        if (pct <= -9.85) return "floor";
      } else if (ex === "UPCoM") {
        if (pct >= 14.85) return "ceiling";
        if (pct <= -14.85) return "floor";
      }
    } catch (e) {
      console.error("Error parsing stock change percentage:", e);
    }
    return item.isPositive ? "positive" : "negative";
  };



  // Click handler for financial calendar event reading
  const handleCalendarClick = (event: any) => {
    setActiveMacroEvent(event);
  };

  // Synchronize track change and playing state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(err => console.log("Audio auto-play failed:", err));
      }
    }
    setIsAudioInfoOpen(false);
    setArtSwipeMotion(null);
  }, [currentTrack]);

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const vnIndex = tickerList.find(t => t.symbol === "VN-Index");
    const vnIndexReport = vnIndex ? `Chỉ số VN-Index hiện đang giao dịch tại mức ${vnIndex.price} điểm, thay đổi ${vnIndex.change}.` : "";
    const topNews = newsList.slice(0, 3).map((n, i) => `Tin số ${i + 1}: ${n.title}`).join(". ");
    const activeAnalysis = indexAnalyses["VN-Index"];
    const expertReport = activeAnalysis ? `Nhận định từ chuyên gia Phan Dũng Khánh cho biết: ${activeAnalysis.analysis}` : "";

    const textToRead = `Chào mừng bạn đến với bản tin âm thanh sáng hôm nay trên tờ The Morning Brief. ${vnIndexReport} ${expertReport} Sau đây là ba tin tức tiêu điểm nóng nhất sáng nay. ${topNews}. Chúc bạn một ngày giao dịch thành công.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes("vi") || v.lang.includes("VI"));
    if (viVoice) {
      utterance.voice = viVoice;
    }
    
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Fetch podcasts from API
  const fetchPodcasts = async () => {
    const cached = readClientCache<PodcastTrack[]>("podcasts", CLIENT_CACHE_MAX_AGE.podcasts);
    if (cached && cached.length > 0) {
      setPodcastPlaylist(cached);
      setPodcastSource(cached[0].sourceName || "Cached");
      setLoadingPodcast(false);
    } else {
      setLoadingPodcast(true);
    }
    try {
      const res = await fetch("/api/podcast");
      if (res.ok) {
        const data = await res.json() as PodcastTrack[];
        if (Array.isArray(data) && data.length > 0) {
          setPodcastPlaylist(data);
          setPodcastSource(data[0].sourceName || "VnExpress");
          writeClientCache("podcasts", data);
        } else {
          setPodcastPlaylist([]);
          setPodcastSource(lang === "vi" ? "Chưa khả dụng" : "Unavailable");
        }
      }
    } catch (e) {
      console.error("Failed to fetch podcasts:", e);
      // Fallback already set as default
    } finally {
      setLoadingPodcast(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchMacroData();
    fetchPodcasts();

    // Load watchlist
    const saved = localStorage.getItem("morningbrief_watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // Auto-refresh stocks every 60 seconds
    const stockInterval = setInterval(() => {
      fetchStocks();
    }, 60000);

    return () => {
      clearInterval(stockInterval);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    setVisibleNewsCount(8);
    fetchNews(activeTab);
  }, [activeTab]);

  // Fetch watchlist ecosystem news
  useEffect(() => {
    if (watchlist.length === 0) {
      setWatchlistNews([]);
      setWatchlistNewsPage(1);
      setHasMoreWatchlistNews(false);
      setLoadingWatchlistNews(false);
      return;
    }

    const fetchWatchlistNews = async () => {
      const symbolsParam = watchlist.join(",");
      const cacheKey = `watchlist-news:${symbolsParam}:page:1`;
      const cached = readClientCache<WatchlistNewsItem[]>(cacheKey, CLIENT_CACHE_MAX_AGE.watchlistNews);
      setWatchlistNewsPage(1);
      setVisibleWatchlistNewsCount(8);
      setHasMoreWatchlistNews(true);
      if (cached) {
        setWatchlistNews(cached);
        setLoadingWatchlistNews(false);
      } else {
        setLoadingWatchlistNews(true);
      }
      try {
        const res = await fetch(`/api/watchlist-news?symbols=${encodeURIComponent(symbolsParam)}&page=1&pageSize=5`);
        if (res.ok) {
          const data = await res.json() as WatchlistNewsItem[];
          setWatchlistNews(Array.isArray(data) ? data : []);
          setHasMoreWatchlistNews(Array.isArray(data) && data.length > 0);
          if (Array.isArray(data)) {
            writeClientCache(cacheKey, data);
          }
        }
      } catch (err) {
        console.error("Error fetching watchlist news:", err);
      } finally {
        setLoadingWatchlistNews(false);
      }
    };

    fetchWatchlistNews();
  }, [watchlist]);

  const loadMoreWatchlistNews = async () => {
    if (watchlist.length === 0 || loadingMoreWatchlistNews) return;

    const nextPage = watchlistNewsPage + 1;
    const symbolsParam = watchlist.join(",");
    const cacheKey = `watchlist-news:${symbolsParam}:page:${nextPage}`;
    setLoadingMoreWatchlistNews(true);

    try {
      const cached = readClientCache<WatchlistNewsItem[]>(cacheKey, CLIENT_CACHE_MAX_AGE.watchlistNews);
      let data = cached;
      if (!data) {
        const res = await fetch(`/api/watchlist-news?symbols=${encodeURIComponent(symbolsParam)}&page=${nextPage}&pageSize=5`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json() as WatchlistNewsItem[];
        if (Array.isArray(data)) writeClientCache(cacheKey, data);
      }

      if (!Array.isArray(data) || data.length === 0) {
        setHasMoreWatchlistNews(false);
        return;
      }

      setWatchlistNews((prev) => {
        const seen = new Set(prev.map((item) => item.link || item.title));
        const fresh = data.filter((item) => {
          const key = item.link || item.title;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (fresh.length === 0) {
          setHasMoreWatchlistNews(false);
          return prev;
        }
        setVisibleWatchlistNewsCount(prev.length + fresh.length);
        return [...prev, ...fresh];
      });
      setWatchlistNewsPage(nextPage);
    } catch (err) {
      console.error("Error loading more watchlist news:", err);
    } finally {
      setLoadingMoreWatchlistNews(false);
    }
  };

  // Extract dynamically what real-time broker articles might be in the news list
  useEffect(() => {
    if (newsList.length > 0) {
      // Scan news articles for mentions of analysts or broker outlooks
      const parsedOutlooks = [...initialBrokerOutlooks];
      let updated = false;

      newsList.forEach(newsItem => {
        const title = newsItem.title;
        // SSI, MBS, HSC, VPS, SHS, VNDIRECT
        const brokerMatch = title.match(/(SSI|MBS|HSC|VPS|SHS|VNDIRECT|Vietcap|Rồng Việt)/i);
        if (brokerMatch) {
          const brokerName = brokerMatch[0].toUpperCase();
          const description = newsItem.description;

          let stance: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
          let cssClass = "neutral";
          
          if (title.match(/(tăng|tích cực|vượt|bứt phá|khả quan|khuyến nghị mua)/i)) {
            stance = "BULLISH";
            cssClass = "positive";
          } else if (title.match(/(giảm|điều chỉnh|thận trọng|rủi ro|cảnh báo)/i)) {
            stance = "BEARISH";
            cssClass = "negative";
          }

          // Check if already exist, update quote
          const idx = parsedOutlooks.findIndex(o => o.name.toUpperCase().includes(brokerName));
          if (idx !== -1) {
            parsedOutlooks[idx].stance = stance;
            parsedOutlooks[idx].quote = title;
            parsedOutlooks[idx].class = cssClass;
            updated = true;
          }
        }
      });

      if (updated) {
        setBrokerOutlooks(parsedOutlooks);
      }
    }
  }, [newsList]);

  // Dynamic Information Analyzer (22 Stocks Breadth)
  const getAnalysis = () => {
    if (loadingNews || loadingStocks || tickerList.length === 0 || newsList.length === 0) {
      return {
        sentiment: "Đang phân tích dữ liệu...",
        sentimentClass: "text-muted",
        theme: "Đang tổng hợp...",
        summary: "Hệ thống đang thu thập thông tin thị trường chứng khoán VN-30 và bài viết mới nhất từ CafeF & VnExpress để đưa ra báo cáo tổng quan hôm nay.",
        advancing: 0,
        declining: 0
      };
    }

    // 1. Calculate stock market sentiment index across equities (excluding indices)
    const equities = tickerList.filter(t => t.sector !== "Chỉ số");
    const advancing = equities.filter(t => t.isPositive).length;
    const declining = equities.length - advancing;
    const greenRatio = equities.length > 0 ? (advancing / equities.length) * 100 : 50;

    let sentiment = "GIẰNG CO (TRUNG LẬP)";
    if (greenRatio >= 60) {
      sentiment = `TÍCH CỰC (TĂNG) — ${advancing}/${equities.length} mã tăng điểm`;
    } else if (greenRatio <= 40) {
      sentiment = `THẬN TRỌNG (GIẢM) — ${declining}/${equities.length} mã giảm điểm`;
    } else {
      sentiment = `GIẰNG CO (TRUNG LẬP) — ${advancing} mã tăng / ${declining} mã giảm`;
    }

    // 2. Extract top keyword themes from news titles/descriptions
    const textCorpus = newsList.map(n => n.title.toLowerCase() + " " + n.description.toLowerCase()).join(" ");
    const keywordDefinitions = [
      { term: "Công nghệ & Chip bán dẫn", keywords: ["công nghệ", "số hóa", "ai", "trí tuệ nhân tạo", "openai", "bán dẫn", "chip"] },
      { term: "Nghị định & Chính sách Vĩ mô", keywords: ["chính phủ", "thủ tướng", "nghị định", "quyết định", "luật", "chính sách"] },
      { term: "Tiền tệ & Lãi suất ngân hàng", keywords: ["lãi suất", "ngân hàng", "tín dụng", "tỷ giá", "usd", "vcb", "bid"] },
      { term: "Xúc tiến Thương mại & FDI", keywords: ["doanh nghiệp", "đầu tư", "fdi", "xuất khẩu", "nhập khẩu", "thương mại"] },
      { term: "Giao dịch Vàng & Bất động sản", keywords: ["vàng", "bất động sản", "nhà đất", "trái phiếu", "cổ phiếu", "ipo"] }
    ];

    const keywordScores = keywordDefinitions.map(def => {
      let score = 0;
      def.keywords.forEach(kw => {
        const regex = new RegExp(kw, "gi");
        const count = (textCorpus.match(regex) || []).length;
        score += count;
      });
      return { term: def.term, score };
    });

    keywordScores.sort((a, b) => b.score - a.score);
    const topTheme = keywordScores[0].score > 0 ? keywordScores[0].term : "Thông tin Tổng hợp";

    // 3. Generate Executive Summary
    const vnIndex = tickerList.find(t => t.symbol === "VN-Index");
    const indexLine = vnIndex 
      ? `Chỉ số VN-Index hôm nay giao dịch quanh mức ${vnIndex.price} (thay đổi ${vnIndex.change}).`
      : "";
    
    const marketDirectionLine = greenRatio >= 60 
      ? `Độ rộng thị trường nghiêng hẳn về phía tăng điểm với ${advancing} mã tăng giá, tạo lực đỡ vững chắc cho chỉ số chung.`
      : greenRatio <= 40
      ? `Áp lực bán chiếm ưu thế khiến ${declining} mã giảm điểm, phản ánh sự thận trọng đáng kể từ phía dòng tiền đầu tư.`
      : `Bảng điện tử ghi nhận sự cân bằng tương đối khi có ${advancing} mã tăng và ${declining} mã giảm, dòng tiền luân chuyển cục bộ phân hóa sâu sắc.`;

    const newsTrendLine = keywordScores[0].score > 0 
      ? `Tin tức vĩ mô hàng đầu phản ánh tiêu điểm về lĩnh vực ${keywordScores[0].term.toLowerCase()}.`
      : "Trang tin tức ghi nhận các biến động chuyển động đa chiều ở nhiều phân khúc kinh tế xã hội.";

    const summary = `${indexLine} ${marketDirectionLine} ${newsTrendLine} Phân tích kỹ thuật khuyên dùng các vị thế phòng thủ chủ động trong giai đoạn này.`;

    return {
      sentiment,
      sentimentClass: greenRatio >= 60 ? "positive-stance" : greenRatio <= 40 ? "negative-stance" : "neutral-stance",
      theme: topTheme,
      summary,
      advancing,
      declining
    };
  };

  const analysis = getAnalysis();

  // Seamless scrolling marquee requires duplicated list
  const duplicatedTickers = [...tickerList, ...tickerList];
  const mobilePlayerProgress = duration > 0 ? `${Math.min(100, (currentTime / duration) * 100)}%` : "0%";
  const shouldShowFloatingMiniPlayer = Boolean(currentTrack && !isMobileMiniHidden && activeMobileTab !== "podcast");
  const shouldShowMiniRevealTab = Boolean(currentTrack && isMobileMiniHidden && activeMobileTab !== "podcast");
  const aiReadableDataJson = useMemo(() => toSafeJsonLd({
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "The Morning Brief - readable news, market and podcast data",
    description: "Structured copy of the news, market, macro and podcast information visible to readers in The Morning Brief.",
    inLanguage: lang === "vi" ? "vi-VN" : "en-US",
    dateModified: macroData?.updatedAt || dateText,
    hasPart: [
      {
        "@type": "ItemList",
        name: "News articles",
        itemListElement: newsList.slice(0, 24).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "NewsArticle",
            headline: item.title,
            description: item.description,
            url: item.link,
            datePublished: item.time,
            publisher: {
              "@type": "Organization",
              name: item.source,
            },
          },
        })),
      },
      {
        "@type": "ItemList",
        name: "Market tickers",
        itemListElement: tickerList.slice(0, 40).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "FinancialProduct",
            name: item.symbol,
            description: `${item.symbol}: ${item.price}, ${item.change}`,
            category: item.sector,
            additionalProperty: [
              { "@type": "PropertyValue", name: "price", value: item.price },
              { "@type": "PropertyValue", name: "change", value: item.change },
              { "@type": "PropertyValue", name: "exchange", value: item.exchange || "" },
            ],
          },
        })),
      },
      {
        "@type": "ItemList",
        name: "Macro indicators",
        itemListElement: macroData ? [
          { "@type": "ListItem", position: 1, item: { "@type": "Thing", name: "SJC gold", description: `Buy ${macroData.goldSjc.buy}, sell ${macroData.goldSjc.sell}, change ${macroData.goldSjc.change}` } },
          { "@type": "ListItem", position: 2, item: { "@type": "Thing", name: "Ring gold", description: `Buy ${macroData.goldRing.buy}, sell ${macroData.goldRing.sell}, change ${macroData.goldRing.change}` } },
          { "@type": "ListItem", position: 3, item: { "@type": "Thing", name: "USD/VND", description: `Buy ${macroData.usdRate.buy}, sell ${macroData.usdRate.sell}, change ${macroData.usdRate.change}` } },
        ] : [],
      },
      {
        "@type": "ItemList",
        name: "Podcast episodes",
        itemListElement: podcastPlaylist.slice(0, 36).map((track, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "PodcastEpisode",
            name: track.title,
            description: track.description,
            datePublished: track.pubDate || "",
            partOfSeries: {
              "@type": "PodcastSeries",
              name: track.sourceName,
            },
            associatedMedia: {
              "@type": "MediaObject",
              contentUrl: track.audioUrl,
              duration: track.duration || "",
            },
          },
        })),
      },
    ],
  }), [dateText, lang, macroData, newsList, podcastPlaylist, tickerList]);

  return (
    <div className="app-container">
      <script
        id="morningbrief-ai-readable-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: aiReadableDataJson }}
      />
      {/* Floating Header/Masthead */}
      <header className="masthead">
        <div className="masthead-top">
          <div className="date-badge">{dateText || (lang === "vi" ? "Đang tải ngày..." : "Loading date...")}</div>
          
          {/* Mobile Only Reload button on the left (absolute position to ensure title centers perfectly) */}
          <div 
            className="reload-btn-container mobile-only" 
            onClick={fetchStocks} 
            title={trans[lang].refresh}
          >
            <img src="/icon/piggy-bank-icon.png" className="reload-icon" alt="Reload" />
          </div>

          <div className="logo">
            <h1>THE MORNING BRIEF</h1>
          </div>
          
          <div className="user-profile" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Apple style Language Switcher Segmented Capsule */}
            <div className="lang-switcher">
              <button
                className={`lang-btn ${lang === "vi" ? "active" : ""}`}
                onClick={() => {
                  setLang("vi");
                  localStorage.setItem("morningbrief_lang", "vi");
                }}
              >
                VI
              </button>
              <button
                className={`lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => {
                  setLang("en");
                  localStorage.setItem("morningbrief_lang", "en");
                }}
              >
                EN
              </button>
            </div>
            {/* Desktop Only Reload button on the right (uses piggy-bank-icon and aligned beautifully) */}
            <div className="avatar hidden-mobile" onClick={fetchStocks} title={trans[lang].refresh}>
              <img src="/icon/piggy-bank-icon.png" alt="Reload" />
            </div>
          </div>
        </div>

        {/* Animated Market Ticker Banner */}
        <div className="ticker-wrap">
          <div className="ticker-label">
            <img src="/icon/chart-icon.png" style={{ width: '13px', height: '13px', marginRight: '4px', verticalAlign: 'middle', display: 'inline-block', objectFit: 'contain' }} alt="" />
            {trans[lang].market}
          </div>
          <div className={`ticker-scroll ${loadingStocks ? "loading" : ""}`}>
            {useMemo(() => (
              loadingStocks ? (
                <div className="ticker-item-placeholder">{trans[lang].loadingMarket}</div>
              ) : (
                duplicatedTickers.map((item, idx) => (
                  <div key={idx} className="ticker-card">
                    <span className="ticker-symbol">{item.symbol}</span>
                    <span className="ticker-price">{item.price}</span>
                    <span className={`ticker-change ${getStockColorClass(item)}`}>
                      {item.change}
                    </span>
                  </div>
                ))
              )
            ), [loadingStocks, duplicatedTickers, lang, trans, getStockColorClass])}
          </div>
        </div>
      </header>

      {errorMsg && (
        <div className="error-alert-banner animate-fade-in" style={{
          background: "rgba(224, 86, 86, 0.08)",
          borderBottom: "1px solid rgba(224, 86, 86, 0.15)",
          color: "var(--accent-red, #A30000)",
          padding: "10px 16px",
          fontSize: "0.82rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-sans)",
          margin: "0 0 10px 0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "bold" }}>⚠️ {lang === "vi" ? "Thông báo:" : "Notice:"}</span>
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => setErrorMsg("")}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-red, #A30000)",
              cursor: "pointer",
              fontSize: "1.15rem",
              lineHeight: 1,
              padding: "0 4px"
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile Top Search Bar */}
      {activeMobileTab !== "podcast" && (
      <div className="mobile-search-bar-top-container mobile-only">
        <div className="stock-search-input-wrap">
          <span className="stock-search-icon">
            <img src="/icon/globes-icon.png" style={{ width: '16px', height: '16px', objectFit: 'contain', verticalAlign: 'middle' }} alt="" />
          </span>
          <input
            type="text"
            className="stock-search-input"
            placeholder={lang === "vi" ? "Nhập mã CK hoặc tên công ty..." : "Search Symbol or Company..."}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="stock-search-clear"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setSearchError("");
              }}
            >
              ✕
            </button>
          )}
        </div>
        {/* Render search results inline on mobile */}
        {searchLoading && (
          <div className="stock-search-status">
            <span className="podcast-live-dot"></span> {lang === "vi" ? "Đang tra cứu..." : "Searching..."}
          </div>
        )}
        {searchError && !searchLoading && (
          <div className="stock-search-status" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            {searchError}
          </div>
        )}
        {!searchLoading && searchResults.length > 0 && (
          <div className="stock-search-results">
            {searchResults.map((item, idx) => renderSearchResultCard(item, idx))}
          </div>
        )}
      </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <div className="broadsheet-grid">
          
          {/* Left Column: Lead Stories (News Feed) */}
          <section className={`news-section ${activeMobileTab === "home" ? "mobile-tab-animate" : "hidden-mobile"}`}>
            <div className="column-header">
              <h2>
                <img src="/icon/calendar-icon.png" className="header-3d-icon" alt="" />
                {trans[lang].highlights}
              </h2>
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "general" ? "active" : ""}`}
                  onClick={() => setActiveTab("general")}
                >
                  {trans[lang].tabFocus}
                </button>
                <button
                  className={`tab ${activeTab === "business" ? "active" : ""}`}
                  onClick={() => setActiveTab("business")}
                >
                  {trans[lang].tabBiz}
                </button>
                <button
                  className={`tab ${activeTab === "tech" ? "active" : ""}`}
                  onClick={() => setActiveTab("tech")}
                >
                  {trans[lang].tabTech}
                </button>
              </div>
            </div>

            <NewsFeed
              loadingNews={loadingNews}
              newsList={newsList}
              visibleNewsCount={visibleNewsCount}
              lang={lang}
              trans={trans}
              openArticle={openArticle}
              setVisibleNewsCount={setVisibleNewsCount}
            />

            <EconomicCalendar
              calendarEvents={calendarEvents}
              lang={lang}
              trans={trans}
              handleCalendarClick={handleCalendarClick}
            />


          </section>

          {/* Right Column: Market Intelligence & Institutional Consensus */}
          <aside className="sidebar-section">
            
            {/* Audio tag for podcast streaming */}
            <audio
              ref={audioRef}
              src={currentTrack?.audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleTrackEnded}
            />

            {/* Podcast Player */}
            <div className="widget-panel podcast-player-card hidden-mobile">
              <div className="widget-header podcast-header" onClick={() => setIsPodcastExpanded(true)} style={{ cursor: "pointer" }}>
                <h3 className="podcast-header-title">
                  <img src="/icon/headphone-icon.png" className="header-3d-icon" alt="" />
                  {trans[lang].audioNews}
                </h3>
                <div className="podcast-header-status" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {loadingPodcast && <span className="podcast-live-dot"></span>}

                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsPodcastExpanded(true); }} 
                    className="podcast-expand-btn"
                    title="Mở rộng | Expand"
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}
                  >
                    <MaximizeIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Channels Selector Outside */}
              <div className="podcast-channels-bar-mini">
                {channelsList.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChannel(ch.id);
                      setSelectedSubChannel("All");
                      setCurrentTrackIndex(0);
                    }}
                    className={`podcast-channel-mini-pill ${selectedChannel === ch.id ? "active" : ""}`}
                    style={{ '--channel-color': ch.color } as React.CSSProperties}
                  >
                    <img src={ch.logo} alt={ch.name} className="channel-mini-logo" />
                    <span>{ch.name}</span>
                  </button>
                ))}
              </div>
              
              <div className="podcast-player-body">

                    <div className="podcast-cover-section" onClick={() => setIsPodcastExpanded(true)} style={{ cursor: "pointer" }}>
                      <div className={`podcast-cover-wrap ${isPlaying ? "spinning" : ""}`}>
                        <img 
                          src={currentTrack?.coverUrl} 
                          alt={getTrackTitle(currentTrack)} 
                          className="podcast-cover-image"
                        />
                        <div className="podcast-cover-center"></div>
                      </div>
                      <div className="podcast-track-details">
                        <div className="podcast-track-title-container">
                          <div className={`podcast-track-title ${isPlaying ? "marquee-text" : ""}`}>
                            {getTrackTitle(currentTrack)}
                          </div>
                        </div>
                        <div className="podcast-track-artist" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{currentTrack?.artist}</span>
                          {isPlaying && (
                            <span className="equalizer-wave">
                              <span className="equalizer-bar"></span>
                              <span className="equalizer-bar"></span>
                              <span className="equalizer-bar"></span>
                              <span className="equalizer-bar"></span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="podcast-track-desc">
                      {getTrackDesc(currentTrack)}
                    </p>

                    {/* Seekbar Slider */}
                    <div className="podcast-timeline-section">
                      <span className="time-label">{formatTime(currentTime)}</span>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeekChange}
                        className="podcast-timeline-slider"
                      />
                      <span className="time-label">{formatTime(duration)}</span>
                    </div>

                    {/* Player Controls */}
                    <div className="podcast-controls-section">
                      <button onClick={handlePrevTrack} className="podcast-control-btn" title={trans[lang].prevTrack}>
                        <SkipPreviousIcon size={20} />
                      </button>
                      <button onClick={() => seekAudioBy(-10)} className="podcast-control-btn seek-btn" title={lang === "vi" ? "Tua lại 10 giây" : "Back 10 seconds"}>
                        <Rewind10Icon size={22} />
                      </button>
                      <button onClick={togglePlayPause} className="podcast-control-btn play-btn" title={isPlaying ? trans[lang].pause : trans[lang].play}>
                        {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
                      </button>
                      <button onClick={() => seekAudioBy(30)} className="podcast-control-btn seek-btn" title={lang === "vi" ? "Tua tới 30 giây" : "Forward 30 seconds"}>
                        <Forward30Icon size={22} />
                      </button>
                      <button onClick={handleNextTrack} className="podcast-control-btn" title={trans[lang].nextTrack}>
                        <SkipNextIcon size={20} />
                      </button>
                      <button 
                        onClick={openCurrentChannelPlaylist}
                        className={`podcast-control-btn list-btn ${showPlaylist ? "active" : ""}`}
                        title={trans[lang].listBtn}
                      >
                        <PlaylistIcon size={20} />
                      </button>
                    </div>

                    {/* Playlist Section (Accordion Slide Down) */}
                    <div className={`podcast-playlist-section ${showPlaylist ? "open" : ""}`}>
                      <div className="playlist-drawer-header">
                        <h4 className="playlist-drawer-title">{trans[lang].playlist}</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPlaylist(false);
                          }}
                          className="playlist-drawer-close"
                          title="Đóng | Close"
                        >
                          <CloseIcon size={16} />
                        </button>
                      </div>
                      <div className="playlist-drawer-items">
                        {filteredPlaylist.map((track, index) => (
                          <div 
                            key={`${track.id}-${track.audioUrl}-${index}`} 
                            onClick={() => selectTrack(index)} 
                            className={`playlist-item ${currentTrack?.id === track.id ? "active" : ""}`}
                          >
                            <div className="playlist-item-index">
                              {currentTrack?.id === track.id && isPlaying ? (
                                <span className="equalizer-wave">
                                  <span className="equalizer-bar"></span>
                                  <span className="equalizer-bar"></span>
                                  <span className="equalizer-bar"></span>
                                </span>
                              ) : index + 1}
                            </div>
                            <div className="playlist-item-details">
                              <div className="playlist-item-title">{getTrackTitle(track)}</div>
                              <div className="playlist-item-meta">{track.sourceName} • {track.artist}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
              </div>
            </div>

            {/* Dynamic AI Analysis Panel (VN Broad Market Perspective) */}
            <div className={`widget-panel ${activeMobileTab === "markets" ? "mobile-tab-animate" : "hidden-mobile"}`} style={{ borderLeft: "4px solid var(--accent-red)", background: "rgba(0,0,0,0.01)" }}>
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3 style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "1.5px", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                  <img src="/icon/notebook-icon.png" className="header-3d-icon" style={{ width: '16px', height: '16px', marginRight: '6px' }} alt="" />
                  {trans[lang].expertBrief}
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                {newsList.length === 0 ? (
                  <p style={{ lineHeight: "1.5", fontSize: "0.85rem", fontStyle: "italic", fontFamily: "var(--font-serif)", color: "var(--text-secondary)", margin: 0 }}>
                    &quot;{analysis.summary}&quot;
                  </p>
                ) : (
                  newsList.slice(0, 4).map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => openArticle(item)}
                      className="brief-item-row"
                      style={{ cursor: "pointer", paddingBottom: "6px", borderBottom: idx < 3 ? "1px dashed var(--border-classic)" : "none" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                        <span style={{ fontSize: "0.62rem", fontWeight: "700", color: "var(--accent-red)", textTransform: "uppercase" }}>{item.source}</span>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{item.time}</span>
                      </div>
                      <h4 className="brief-item-title" style={{ margin: 0, fontSize: "0.78rem", fontWeight: "600", fontFamily: "var(--font-serif)", color: "var(--text-primary)", lineHeight: "1.3" }}>
                        {item.title}
                      </h4>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Market Trend Chart Panel */}
            <div className={`widget-panel ${activeMobileTab === "markets" ? "mobile-tab-animate" : "hidden-mobile"}`}>
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>
                  <img src="/icon/chart-icon.png" className="header-3d-icon" alt="" />
                  {trans[lang].indexTrends}
                </h3>
              </div>
              
              <div className="chart-widget-panel">
                <div className="chart-tabs">
                  {["VN-Index", "HNX-Index", "UPCoM-Index"].map((name) => (
                    <button
                      key={name}
                      className={`chart-tab-btn ${selectedChartIndex === name ? "active" : ""}`}
                      onClick={() => {
                        setIsChartTransitioning(true);
                        setSelectedChartIndex(name);
                        setHoveredPoint(null);
                        setTimeout(() => setIsChartTransitioning(false), 200);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {(() => {
                  const chartTicker = tickerList.find((t) => t.symbol === selectedChartIndex);
                  
                  if (loadingStocks) {
                    return (
                      <div className="chart-svg-container">
                        <div className="skeleton-item" style={{ width: "100%", height: "100px", border: "none" }}></div>
                      </div>
                    );
                  }

                  if (!chartTicker || !chartTicker.history || chartTicker.history.length === 0) {
                    return (
                      <div className="chart-svg-container" style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                        {lang === "vi" ? `Không có dữ liệu xu hướng cho ${selectedChartIndex}` : `No trend data available for ${selectedChartIndex}`}
                      </div>
                    );
                  }

                  const history = chartTicker.history;
                  const isPositive = chartTicker.isPositive;
                  const lineColor = isPositive ? "var(--success-green)" : "var(--danger-red)";
                  const areaGradientId = `chart-area-grad-${selectedChartIndex.replace(/\s+/g, "-")}`;
                  
                  const min = Math.min(...history);
                  const max = Math.max(...history);
                  const range = max - min === 0 ? 1 : max - min;
                  
                  const width = 320;
                  const height = 130;
                  const paddingTop = 12;
                  const paddingBottom = 18;
                  const paddingLeft = 12;
                  const paddingRight = 68;

                  const points = history.map((val, idx) => {
                    const x = paddingLeft + (idx / (history.length - 1)) * (width - paddingLeft - paddingRight);
                    const y = height - paddingBottom - ((val - min) / range) * (height - paddingTop - paddingBottom);
                    return { x, y, val, idx };
                  });

                  const getBezierPath = (pts: typeof points) => {
                    if (pts.length === 0) return "";
                    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const p0 = pts[i];
                      const p1 = pts[i + 1];
                      const cp1x = p0.x + (p1.x - p0.x) / 3;
                      const cp1y = p0.y;
                      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
                      const cp2y = p1.y;
                      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
                    }
                    return path;
                  };

                  const smoothLinePath = getBezierPath(points);
                  const smoothAreaPath = `${smoothLinePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`;

                  const dates = getTradingDays(history.length);
                  
                  const displayPrice = hoveredPoint ? hoveredPoint.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : chartTicker.price;
                  const displayDate = hoveredPoint 
                    ? (lang === "vi" ? `Phiên ${dates[hoveredPoint.index]}` : `Session ${dates[hoveredPoint.index]}`) 
                    : (lang === "vi" ? `Giá hiện tại` : `Current Price`);
                  const changeColorClass = isPositive ? "positive" : "negative";

                  const firstPrice = history[0];
                  const lastPrice = history[history.length - 1];
                  const netDiff = lastPrice - firstPrice;
                  const netPct = (netDiff / firstPrice) * 100;
                  const trendSign = netPct >= 0 ? "+" : "";
                  const trendColorClass = netPct >= 0 ? "positive" : "negative";
                  const rangeValue = max - min;

                  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
                    const svg = e.currentTarget;
                    const rect = svg.getBoundingClientRect();
                    const localX = ((e.clientX - rect.left) / rect.width) * width;
                    
                    let closestPt = points[0];
                    let minDist = Math.abs(points[0].x - localX);
                    
                    for (let i = 1; i < points.length; i++) {
                      const dist = Math.abs(points[i].x - localX);
                      if (dist < minDist) {
                        minDist = dist;
                        closestPt = points[i];
                      }
                    }
                    
                    setHoveredPoint({
                      value: closestPt.val,
                      index: closestPt.idx,
                      x: closestPt.x,
                      y: closestPt.y
                    });
                  };

                  return (
                    <div style={{ opacity: isChartTransitioning ? 0.4 : 1, transition: "opacity 0.20s ease-in-out" }}>
                      <div className="chart-info-header">
                        <div className="chart-info-left">
                          <h4 style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: "700" }}>
                            {selectedChartIndex}
                          </h4>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>
                            {displayDate}
                          </p>
                        </div>
                        <div className="chart-info-right">
                          <div className="chart-info-price" style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                            {displayPrice}
                          </div>
                          {!hoveredPoint && (
                            <span className={`ticker-change ${changeColorClass}`} style={{ fontSize: "0.78rem" }}>
                              {chartTicker.change}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="chart-svg-container" style={{ padding: "10px 4px 4px 4px" }}>
                        <svg
                          viewBox={`0 0 ${width} ${height}`}
                          className="chart-svg"
                          style={{ display: "block", width: "100%", height: "100%" }}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onTouchMove={(e) => {
                            if (e.touches && e.touches[0]) {
                              const touch = e.touches[0];
                              const svg = e.currentTarget;
                              const rect = svg.getBoundingClientRect();
                              const localX = ((touch.clientX - rect.left) / rect.width) * width;
                              
                              let closestPt = points[0];
                              let minDist = Math.abs(points[0].x - localX);
                              
                              for (let i = 1; i < points.length; i++) {
                                const dist = Math.abs(points[i].x - localX);
                                if (dist < minDist) {
                                  minDist = dist;
                                  closestPt = points[i];
                                }
                              }
                              
                              setHoveredPoint({
                                value: closestPt.val,
                                index: closestPt.idx,
                                x: closestPt.x,
                                y: closestPt.y
                              });
                            }
                          }}
                          onTouchEnd={() => setHoveredPoint(null)}
                        >
                          <defs>
                            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={lineColor} stopOpacity="0.16" />
                              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1={0} y1={paddingTop} x2={width} y2={paddingTop} stroke="var(--border-classic)" strokeDasharray="3,3" strokeWidth="0.5" />
                          <line x1={0} y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke="var(--border-classic)" strokeDasharray="3,3" strokeWidth="0.5" />
                          <line x1={0} y1={(paddingTop + height - paddingBottom) / 2} x2={width} y2={(paddingTop + height - paddingBottom) / 2} stroke="var(--border-classic)" strokeDasharray="3,3" strokeWidth="0.4" />

                          {/* Price Axis Text Labels */}
                          <text x={width - 2} y={paddingTop + 3} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="600">
                            {max.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                          </text>
                          <text x={width - 2} y={(paddingTop + height - paddingBottom) / 2 + 3} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="600">
                            {((max + min) / 2).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                          </text>
                          <text x={width - 2} y={height - paddingBottom + 3} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="600">
                            {min.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                          </text>

                          {/* Date Range Labels */}
                          <text x={paddingLeft} y={height - 4} textAnchor="start" fontSize="8.5" fill="var(--text-muted)" fontWeight="500">
                            {dates[0]}
                          </text>
                          <text x={width - paddingRight} y={height - 4} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="500">
                            {dates[dates.length - 1] || "Hôm nay"}
                          </text>

                          {/* Area Shading */}
                          <path d={smoothAreaPath} fill={`url(#${areaGradientId})`} style={{ transition: "d 0.3s ease" }} />

                          {/* Line Stroke */}
                          <path d={smoothLinePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "d 0.3s ease" }} />

                          {/* Hover Guide & Active Marker */}
                          {hoveredPoint && (
                            <>
                              <line
                                x1={hoveredPoint.x}
                                y1={paddingTop}
                                x2={hoveredPoint.x}
                                y2={height - paddingBottom}
                                stroke="var(--text-muted)"
                                strokeDasharray="3,3"
                                strokeWidth="0.75"
                              />
                              <circle
                                cx={hoveredPoint.x}
                                cy={hoveredPoint.y}
                                r="4.5"
                                fill={lineColor}
                                stroke="var(--bg-card)"
                                strokeWidth="2.5"
                                style={{ transition: "cx 0.1s ease, cy 0.1s ease" }}
                              />
                            </>
                          )}
                        </svg>
                      </div>

                      {/* Premium Stats Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--border-classic)", fontSize: "0.78rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>
                            {lang === "vi" ? "Xu hướng 10N" : "10D Trend"}
                          </span>
                          <span className={`ticker-change ${trendColorClass}`} style={{ background: "transparent", padding: 0, fontWeight: "700", fontSize: "0.85rem", marginTop: "2px" }}>
                            {trendSign}{netPct.toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-classic)", paddingLeft: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>
                            {lang === "vi" ? "Đỉnh - Đáy (10N)" : "High - Low (10D)"}
                          </span>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.85rem", marginTop: "2px" }}>
                            {max.toFixed(0)} - {min.toFixed(0)}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-classic)", paddingLeft: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>
                            {lang === "vi" ? "Biến động 10N" : "10D Volatility"}
                          </span>
                          <span style={{ fontWeight: "700", color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
                            {rangeValue.toFixed(1)} {lang === "vi" ? "điểm" : "pts"}
                          </span>
                        </div>
                      </div>

                      {/* CafeF Index Stat Bar: Liquidity, Breadth, Foreign */}
                      {(() => {
                        const stats = indexStats[selectedChartIndex];
                        const exchangeMap: Record<string, string> = {
                          "VN-Index": "HOSE",
                          "HNX-Index": "HNX",
                          "UPCoM-Index": "UPCoM"
                        };
                        const exchangeLabel = exchangeMap[selectedChartIndex] || selectedChartIndex;
                        if (!stats) return null;
                        const netSign = stats.foreignNetValue >= 0 ? "+" : "";
                        const netColor = stats.foreignNetValue >= 0 ? "var(--success-green)" : "var(--danger-red)";
                        const totalVal = stats.totalValue > 0 ? stats.totalValue.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) : "—";
                        const netVal = Math.abs(stats.foreignNetValue) > 0
                          ? `${netSign}${stats.foreignNetValue.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ`
                          : "—";
                        return (
                          <div className="index-stat-bar">
                            <div className="index-stat-item">
                              <span className="index-stat-label">💰 {lang === "vi" ? `Thanh khoản ${exchangeLabel}` : `${exchangeLabel} Liquidity`}</span>
                              <span className="index-stat-value">{totalVal} {stats.totalValue > 0 ? "tỷ" : ""}</span>
                            </div>
                            <div className="index-stat-item">
                              <span className="index-stat-label">📊 {lang === "vi" ? "Độ rộng sàn" : "Market Breadth"}</span>
                              <span className="index-stat-value">
                                <span style={{ color: "var(--success-green)" }}>▲{stats.advance}</span>
                                {" / "}
                                <span style={{ color: "var(--danger-red)" }}>▼{stats.decline}</span>
                                {stats.noChange > 0 && <span style={{ color: "var(--text-muted)" }}>{" / ="}{stats.noChange}</span>}
                              </span>
                            </div>
                            <div className="index-stat-item">
                              <span className="index-stat-label">🌐 {lang === "vi" ? "Khối ngoại" : "Foreign Net"}</span>
                              <span className="index-stat-value" style={{ color: netColor, fontWeight: "700" }}>{netVal}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Expert Analysis & Forecast */}
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--border-classic)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div>
                          <span style={{ color: "var(--accent-red)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "700", display: "block", letterSpacing: "0.5px", marginBottom: "3px" }}>
                            {lang === "vi" ? "Nhận định chuyên gia" : "Expert Stance"} • {indexAnalyses[selectedChartIndex]?.expert}
                          </span>
                          <p style={{ lineHeight: "1.45", color: "var(--text-secondary)", fontStyle: "italic", fontFamily: "var(--font-serif)", fontSize: "0.82rem" }}>
                            &quot;{indexAnalyses[selectedChartIndex]?.analysis}&quot;
                          </p>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "700", display: "block", letterSpacing: "0.5px", marginBottom: "2px" }}>
                            {lang === "vi" ? "Dự đoán tương lai" : "Future Forecast"}
                          </span>
                          <p style={{ lineHeight: "1.45", color: "var(--text-primary)", fontSize: "0.82rem", fontWeight: "500" }}>
                            {indexAnalyses[selectedChartIndex]?.forecast}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>


            {/* Watchlist Panel with integrated Desktop Stock Lookup */}
            <div className={`widget-panel ${activeMobileTab === "portfolio" ? "mobile-tab-animate" : "hidden-mobile"}`}>
              <div className="widget-header">
                <h3>
                  <img src="/icon/wallet-icon.png" className="header-3d-icon" alt="" />
                  {trans[lang].watchlist}
                </h3>
              </div>

              {/* Integrated Stock Search Box (Desktop Only) */}
              <div className="stock-search-box hidden-mobile" style={{ marginTop: "10px", marginBottom: "15px" }}>
                <div className="stock-search-input-wrap">
                  <span className="stock-search-icon">
                    <img src="/icon/globes-icon.png" style={{ width: '16px', height: '16px', objectFit: 'contain', verticalAlign: 'middle' }} alt="" />
                  </span>
                  <input
                    type="text"
                    className="stock-search-input"
                    placeholder={lang === "vi" ? "Nhập mã CK hoặc tên công ty..." : "Search Symbol or Company..."}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="stock-search-clear"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setSearchError("");
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Search Loading */}
                {searchLoading && (
                  <div className="stock-search-status">
                    <span className="podcast-live-dot"></span> {lang === "vi" ? "Đang tra cứu..." : "Searching..."}
                  </div>
                )}

                {/* Search Error */}
                {searchError && !searchLoading && (
                  <div className="stock-search-status" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    {searchError}
                  </div>
                )}

                {/* Search Results */}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="stock-search-results" style={{ marginBottom: "10px" }}>
                    {searchResults.map((item, idx) => renderSearchResultCard(item, idx))}
                  </div>
                )}
              </div>

              <div className="crypto-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {watchlist.length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
                    {lang === "vi" 
                      ? "Nhấp chọn ngôi sao ⭐ bên cạnh các mã để ghim vào đây." 
                      : "Click the star ⭐ next to symbols to pin them here."}
                  </div>
                ) : (
                  tickerList.filter(item => watchlist.includes(getCleanTickerSymbol(item.symbol))).map((item, idx) => {
                    const symbol = getCleanTickerSymbol(item.symbol || item.ticker);
                    const volumeLabel = formatWatchlistVolume(item);
                    return (
                    <div
                      key={`${symbol}-${idx}`}
                      className="crypto-item watchlist-stock-card-redesigned"
                      onClick={() => openWatchlistStockDetail(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") openWatchlistStockDetail(item);
                      }}
                    >
                      {/* Top Row: Star, Symbol, Exchange Badge | Price */}
                      <div className="watchlist-card-top-row">
                        <div className="watchlist-card-symbol-area">
                          <button
                            className="watchlist-card-star-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(symbol);
                            }}
                            aria-label="Toggle Watchlist"
                          >
                            ⭐
                          </button>
                          <span className="watchlist-card-symbol-text">{symbol}</span>
                          {item.exchange && item.exchange !== "INDEX" && (
                            <span className={`watchlist-card-exchange-badge ${item.exchange.toLowerCase()}`}>
                              {item.exchange}
                            </span>
                          )}
                        </div>
                        <div className="watchlist-card-price-area">
                          <span className={`watchlist-card-price-text ${getStockColorClass(item)}`}>{item.price}</span>
                        </div>
                      </div>

                      {/* Second Row: Company full name | Change percentage */}
                      <div className="watchlist-card-second-row">
                        <div className="watchlist-card-company-name" title={item.symbol}>
                          {item.symbol.includes(" - ") ? item.symbol.split(" - ").slice(1).join(" - ") : item.symbol}
                        </div>
                        <div className="watchlist-card-change-area">
                          <span className={`watchlist-card-change-text ${getStockColorClass(item)}`}>
                            {item.change}
                          </span>
                        </div>
                      </div>

                      {/* Dashed Separator */}
                      <hr className="watchlist-card-separator" />

                      {/* Bottom Grid: 4 stats columns */}
                      <div className="watchlist-card-bottom-grid">
                        <div className="watchlist-card-stat-col">
                          <span className="watchlist-card-stat-label">PREV CLOSE</span>
                          <span className="watchlist-card-stat-value">{item.prevClose || "N/A"}</span>
                        </div>
                        <div className="watchlist-card-stat-col">
                          <span className="watchlist-card-stat-label">DAY HIGH</span>
                          <span className="watchlist-card-stat-value">{item.dayHigh || "N/A"}</span>
                        </div>
                        <div className="watchlist-card-stat-col">
                          <span className="watchlist-card-stat-label">DAY LOW</span>
                          <span className="watchlist-card-stat-value">{item.dayLow || "N/A"}</span>
                        </div>
                        <div className="watchlist-card-stat-col">
                          <span className="watchlist-card-stat-label">VOLUME</span>
                          <span className="watchlist-card-stat-value">{volumeLabel || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Watchlist Ecosystem News Panel (Desktop Only) */}
            {watchlist.length > 0 && (
              <div className="widget-panel hidden-mobile" style={{ marginTop: "15px" }}>
                <div className="widget-header">
                  <h3>
                    <img src="/icon/calendar-icon.png" className="header-3d-icon" alt="" />
                    {lang === "vi" ? "TIN TỨC HỆ SINH THÁI WATCHLIST" : "WATCHLIST ECOSYSTEM NEWS"}
                  </h3>
                </div>
                
                {loadingWatchlistNews ? (
                  <div style={{ display: "flex", gap: "15px", overflowX: "hidden", padding: "10px 0" }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="news-skeleton-item" style={{ flex: "0 0 280px", padding: "12px", border: "1px solid var(--border-classic)", borderRadius: "var(--radius-sm)", background: "var(--bg-card)" }}>
                        <div className="skeleton-line" style={{ width: "100%", height: "130px", marginBottom: "8px" }}></div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                          <span className="skeleton-pill" style={{ width: "45px", height: "14px", borderRadius: "3px" }}></span>
                        </div>
                        <div className="skeleton-line" style={{ width: "90%", height: "14px", marginBottom: "4px" }}></div>
                        <div className="skeleton-line" style={{ width: "70%", height: "14px" }}></div>
                      </div>
                    ))}
                  </div>
                ) : watchlistNews.length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "15px" }}>
                    {lang === "vi" 
                      ? "Chưa có tin tức mới cho các mã trong watchlist." 
                      : "No new news for symbols in your watchlist."}
                  </div>
                ) : (
                  <div className="watchlist-news-list desktop-slider">
                    {watchlistNews.map((news, ni) => {
                      const newsItem: NewsItem = {
                        source: news.relatedSymbol ? `${news.relatedSymbol} • CafeF` : "CafeF",
                        title: news.title,
                        description: news.description || "",
                        link: news.link,
                        time: news.time,
                        image: news.image
                      };
                      const hasImage = hasDisplayImage(newsItem.image);
                      return (
                        <div 
                          key={ni} 
                          onClick={() => openArticle(newsItem)} 
                          className={`news-card ${hasImage ? "" : "no-image"}`}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="news-content">
                            <span className="news-source" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <a href={newsItem.link} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Nguồn gốc: {newsItem.source}</a>
                              {news.relatedSymbol && (
                                <span style={{ backgroundColor: "var(--accent-blue)", color: "white", padding: "1px 4px", borderRadius: "3px", fontSize: "0.6rem", fontWeight: "bold" }}>
                                  Liên quan: {news.relatedSymbol}
                                </span>
                              )}
                            </span>
                            <h3 className="news-title">{newsItem.title}</h3>
                            {newsItem.description && (
                              <p className="news-meta news-summary">
                                {newsItem.description}
                              </p>
                            )}
                            <span className="news-meta">Đăng lúc: {newsItem.time}</span>
                          </div>
                          {hasImage && (
                            <div className="news-image-wrap">
                              <img src={newsItem.image} alt={newsItem.title} className="news-image" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Watchlist Ecosystem News Panel (Mobile Only - Pushed to Bottom of Portfolio screen) */}
            {watchlist.length > 0 && activeMobileTab === "portfolio" && (
              <div className="widget-panel mobile-only" style={{ marginTop: "15px" }}>
                <div className="widget-header" style={{ marginBottom: "1rem" }}>
                  <h3>
                    <img src="/icon/calendar-icon.png" className="header-3d-icon" alt="" />
                    {lang === "vi" ? "TIN TỨC HỆ SINH THÁI WATCHLIST" : "WATCHLIST ECOSYSTEM NEWS"}
                  </h3>
                </div>
                
                {loadingWatchlistNews ? (
                  <div className="news-feed" style={{ borderTop: "none", paddingTop: 0 }}>
                    {[1, 2].map(i => (
                      <div key={i} className="skeleton-card" style={{ height: "120px" }}></div>
                    ))}
                  </div>
                ) : watchlistNews.length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "15px" }}>
                    {lang === "vi" 
                      ? "Chưa có tin tức mới cho các mã trong watchlist." 
                      : "No new news for symbols in your watchlist."}
                  </div>
                ) : (
                  <>
                    <div className="news-feed" style={{ borderTop: "none", paddingTop: 0 }}>
                      {watchlistNews.slice(0, visibleWatchlistNewsCount).map((news, ni) => {
                        const newsItem: NewsItem = {
                          source: news.relatedSymbol ? `${news.relatedSymbol} • CafeF` : "CafeF",
                          title: news.title,
                          description: news.description || "",
                          link: news.link,
                          time: news.time,
                          image: news.image
                        };
                        const hasImage = hasDisplayImage(newsItem.image);
                        return (
                          <div 
                            key={ni} 
                            onClick={() => openArticle(newsItem)} 
                            className={`news-card ${hasImage ? "" : "no-image"}`}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="news-content">
                              <span className="news-source" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <a href={newsItem.link} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Nguồn gốc: {newsItem.source}</a>
                                {news.relatedSymbol && (
                                  <span style={{ backgroundColor: "var(--accent-blue)", color: "white", padding: "1px 4px", borderRadius: "3px", fontSize: "0.6rem", fontWeight: "bold" }}>
                                    Liên quan: {news.relatedSymbol}
                                  </span>
                                )}
                              </span>
                              <h3 className="news-title">{newsItem.title}</h3>
                              {newsItem.description && (
                                <p className="news-meta news-summary">
                                  {newsItem.description}
                                </p>
                              )}
                              <span className="news-meta">Đăng lúc: {newsItem.time}</span>
                            </div>
                            {hasImage && (
                              <div className="news-image-wrap">
                                <img src={newsItem.image} alt={newsItem.title} className="news-image" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {hasMoreWatchlistNews && (
                      <button 
                        className="load-more-news-btn"
                        onClick={loadMoreWatchlistNews}
                        disabled={loadingMoreWatchlistNews}
                        style={{ marginTop: "1rem", width: "100%" }}
                      >
                        {loadingMoreWatchlistNews
                          ? (lang === "vi" ? "Đang tải thêm..." : "Loading more...")
                          : (lang === "vi" ? "Xem thêm tin hệ sinh thái" : "Load more ecosystem news")}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Top VN Stocks List (Điểm nhấn Thị trường) */}
            <MarketHighlights
              loadingStocks={loadingStocks}
              stockFilterTab={stockFilterTab}
              tickerList={tickerList}
              highlights={highlights}
              lang={lang}
              trans={trans}
              setStockFilterTab={setStockFilterTab}
              activeMobileTab={activeMobileTab}
            />



            {/* Macro Economics Panel */}
            <GoldForexPanel
              loadingMacro={loadingMacro}
              macroData={macroData}
              lang={lang}
              trans={trans}
              activeMobileTab={activeMobileTab}
            />

          </aside>
        </div>

        {/* Mobile Podcast App Section */}
        {activeMobileTab === "podcast" && (
        <section 
          className="mobile-podcast-app-section mobile-only mobile-tab-animate"
          style={{ '--active-channel-color': channelsList.find(c => c.id === selectedChannel)?.color || 'var(--accent-blue)' } as React.CSSProperties}
        >

              <div className="mobile-podcast-app-header">
                <h2>
                  <img src="/icon/headphone-icon.png" className="header-3d-icon" alt="" />
                  {lang === "vi" ? "Podcast Tin Tức" : "Audio Briefing"}
                </h2>
                {loadingPodcast && <span className="podcast-live-dot"></span>}
              </div>

              {currentTrack && (
                <div className={`mobile-podcast-now-card ${isPlaying ? "playing" : ""}`} onClick={() => setIsMobilePlayerOpen(true)}>
                  <div className="mobile-podcast-now-art-wrap">
                    <img src={currentTrack.coverUrl} alt="" className="mobile-podcast-now-art" />
                    {isPlaying && (
                      <span className="mobile-podcast-now-equalizer equalizer-wave">
                        <span className="equalizer-bar"></span>
                        <span className="equalizer-bar"></span>
                        <span className="equalizer-bar"></span>
                      </span>
                    )}
                  </div>
                  <div className="mobile-podcast-now-copy">
                    <span className="mobile-podcast-now-kicker">{isPlaying ? (lang === "vi" ? "Đang phát" : "Now Playing") : (lang === "vi" ? "Sẵn sàng nghe" : "Ready to Play")}</span>
                    <strong>{getTrackTitle(currentTrack)}</strong>
                    <span>{currentTrack.artist}</span>
                  </div>
                  <button
                    className="mobile-podcast-now-play"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                  >
                    {isPlaying ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
                  </button>
                  <div className="mobile-podcast-now-progress">
                    <span style={{ width: mobilePlayerProgress }} />
                  </div>
                </div>
              )}

              {/* Glassmorphic Hub Wrapper for podcast channel selector and options */}
              <div className="mobile-podcast-hub-wrapper">
                {/* Instagram-style circular channels */}
                <div className="mobile-podcast-channels-carousel">
                  {channelsList.map((ch) => {
                    const channelLogo = ch.id === "All" ? ch.logo : channelArtworkBySource[ch.id] || ch.logo;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setSelectedChannel(ch.id);
                          setSelectedSubChannel("All");
                          setCurrentTrackIndex(0);
                        }}
                        className={`mobile-channel-bubble-btn ${selectedChannel === ch.id ? "active" : ""}`}
                        style={{ '--channel-color': ch.color } as React.CSSProperties}
                      >
                        <div className="mobile-channel-bubble-avatar-wrap">
                          <img src={channelLogo} alt={ch.name} className="mobile-channel-bubble-avatar" />
                        </div>
                        <span className="mobile-channel-bubble-name">{ch.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subchannels & search options container */}
                <div className="mobile-podcast-filters-row">
                  <input
                    type="text"
                    placeholder={lang === "vi" ? "Tìm tập podcast..." : "Search episodes..."}
                    value={podcastSearchQuery}
                    onChange={(e) => setPodcastSearchQuery(e.target.value)}
                    className="mobile-podcast-search-input"
                  />
                </div>

                {/* Subchannels horizontal capsule scrolling */}
                {subChannelsList.length > 1 && (
                  <div className="mobile-podcast-subchannels-pills">
                    {subChannelsList.map((sc) => (
                      <button
                        key={sc}
                        onClick={() => {
                          setSelectedSubChannel(sc);
                          setCurrentTrackIndex(0);
                        }}
                        className={`mobile-subchannel-pill ${selectedSubChannel === sc ? "active" : ""}`}
                      >
                        {sc === "All" ? (lang === "vi" ? "Tất cả chuyên mục" : "All Shows") : sc}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Episode Feed List */}
              <div className="mobile-podcast-episodes-feed">
                {filteredPlaylist.length === 0 ? (
                  <div className="mobile-podcast-empty-state">
                    {lang === "vi" ? "Không tìm thấy tập podcast phù hợp." : "No episodes found."}
                  </div>
                ) : (
                  filteredPlaylist.map((track, index) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div 
                        key={`${track.id}-${track.audioUrl}-${index}`}
                        className={`mobile-episode-feed-card ${isCurrent ? "active" : ""}`}
                        onClick={() => selectTrack(index)}
                      >
                        <div className="mobile-episode-card-cover-wrap">
                          <img src={track.coverUrl} alt="" className="mobile-episode-card-cover" />
                          {isCurrent && isPlaying && (
                            <div className="mobile-episode-card-cover-overlay">
                              <span className="equalizer-wave">
                                <span className="equalizer-bar"></span>
                                <span className="equalizer-bar"></span>
                                <span className="equalizer-bar"></span>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mobile-episode-card-details">
                          <span className="mobile-episode-card-source" style={{ color: channelsList.find(c => c.id === track.sourceName)?.color || 'var(--accent-blue)' }}>
                            {track.sourceName} • {track.artist}
                          </span>
                          <h4 className="mobile-episode-card-title">{getTrackTitle(track)}</h4>
                          {track.description && (
                            <p className="mobile-episode-card-desc">{track.description}</p>
                          )}
                        </div>
                        <div className="mobile-episode-card-action">
                          <button 
                            className="mobile-episode-play-circle-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCurrent) {
                                togglePlayPause();
                              } else {
                                selectTrack(index);
                              }
                            }}
                          >
                            {isCurrent && isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
        )}
      </main>

      {/* Footer */}
      <footer className="ft-footer">
        <p>{trans[lang].footerText}</p>
      </footer>

      {/* Stock Detail Sheet */}
      {activeWatchlistStock && (() => {
        const stock = activeWatchlistStock;
        const detail = activeWatchlistDetail;
        const symbol = getCleanTickerSymbol(stock.symbol || stock.ticker);
        const displayName = detail?.displayName || stock.sector || symbol;
        const price = detail?.price || stock.price || "N/A";
        const change = detail?.change || stock.change || "N/A";
        const isPositive = detail?.isPositive ?? stock.isPositive;
        const colorClass = isPositive ? "positive" : "negative";
        const chartValues = detailChartData.length > 1
          ? detailChartData
          : (detail?.history && detail.history.length > 1
            ? detail.history
            : (stock.history && stock.history.length > 1 ? stock.history : []));
        const hasChartData = chartValues.length > 1;
        const minChart = hasChartData ? Math.min(...chartValues) : 0;
        const maxChart = hasChartData ? Math.max(...chartValues) : 0;
        const range = maxChart - minChart || 1;
        const chartPoints = chartValues.map((value: number, index: number) => {
          const x = 16 + (index / Math.max(chartValues.length - 1, 1)) * 408;
          const y = 196 - ((value - minChart) / range) * 152;
          return `${x},${y}`;
        }).join(" ");
        const updatedAtText = detail?.updatedAt
          ? new Date(detail.updatedAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
          : (lang === "vi" ? "Chưa rõ" : "Unknown");
        const sourceUrl = detail?.cafefDataUrl || "https://cafef.vn/du-lieu.chn";
        const exchange = detail?.exchange || stock.exchange || "HOSE";
        const dataSource = detail?.dataSource || "CafeF / market data";
        const isFavorite = watchlist.includes(symbol);
        const timeframeOptions = [
          { label: "1D", days: 1 },
          { label: "1W", days: 7 },
          { label: "1M", days: 30 },
          { label: "3M", days: 90 },
          { label: "6M", days: 180 },
          { label: "1Y", days: 365 },
        ];
        const chartQuality = loadingDetailChart
          ? (lang === "vi" ? "Đang tải" : "Loading")
          : hasChartData
            ? (detailChartData.length > 1 ? "Delayed / cached" : "Cached")
            : "Unavailable";
        const unavailableText = lang === "vi" ? "Chưa có dữ liệu đáng tin cậy" : "No reliable data";
        const absoluteChange = (() => {
          const latestPrice = parseFloat(String(price).replace(/,/g, ""));
          const prevClose = parseFloat(String(detail?.prevClose || stock.prevClose || "").replace(/,/g, ""));
          if (!Number.isFinite(latestPrice) || !Number.isFinite(prevClose) || prevClose === 0) return "N/A";
          const diff = latestPrice - prevClose;
          return `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
        })();
        const summaryStats = [
          { label: lang === "vi" ? "Giá mới nhất" : "Latest price", value: price, accent: colorClass },
          { label: lang === "vi" ? "Thay đổi %" : "Change %", value: change, accent: colorClass },
          { label: lang === "vi" ? "Thay đổi" : "Abs change", value: absoluteChange, accent: colorClass },
          { label: lang === "vi" ? "Tổng KL" : "Volume", value: detail?.volume || formatWatchlistVolume(stock) },
          { label: lang === "vi" ? "Vốn hóa" : "Market cap", value: detail?.marketCapVnd || detail?.marketCap || "N/A" },
          { label: "P/E", value: detail?.pe || "N/A" },
          { label: "P/B", value: detail?.pb || "N/A" },
        ];
        const marketStats = [
          { label: lang === "vi" ? "Tham chiếu" : "Prev close", value: detail?.prevClose || stock.prevClose || "N/A" },
          { label: lang === "vi" ? "Mở cửa" : "Open", value: unavailableText, muted: true },
          { label: lang === "vi" ? "Trung bình" : "Average", value: unavailableText, muted: true },
          { label: lang === "vi" ? "Cao nhất" : "High", value: detail?.dayHigh || stock.dayHigh || "N/A" },
          { label: lang === "vi" ? "Thấp nhất" : "Low", value: detail?.dayLow || stock.dayLow || "N/A" },
          { label: lang === "vi" ? "Giá trị GD" : "Trading value", value: unavailableText, muted: true },
          { label: lang === "vi" ? "Tổng KL" : "Volume", value: detail?.volume || formatWatchlistVolume(stock) },
        ];
        const valuationStats = [
          { label: "EPS", value: detail?.eps || "N/A" },
          { label: "P/E", value: detail?.pe || "N/A" },
          { label: "P/B", value: detail?.pb || "N/A" },
          { label: lang === "vi" ? "Vốn hóa" : "Market cap", value: detail?.marketCapVnd || detail?.marketCap || "N/A" },
        ];
        const orderBookStats = [
          { label: lang === "vi" ? "Dư mua" : "Bid queue", value: unavailableText },
          { label: lang === "vi" ? "Dư mua %" : "Bid queue %", value: unavailableText },
          { label: lang === "vi" ? "Dư bán" : "Ask queue", value: unavailableText },
          { label: lang === "vi" ? "Dư bán %" : "Ask queue %", value: unavailableText },
        ];

        return (
          <div className={`stock-detail-overlay ${isWatchlistDetailClosing ? "closing" : ""}`} onClick={closeWatchlistStockDetail}>
            <section className={`stock-detail-sheet stock-detail-app ${isWatchlistDetailClosing ? "closing" : ""}`} onClick={(event) => event.stopPropagation()}>
              <header className="stock-detail-hero">
                <div className="stock-detail-title-wrap">
                  <span className="stock-detail-kicker">{dataSource} · {lang === "vi" ? "Cập nhật" : "Updated"} {updatedAtText}</span>
                  <div className="stock-detail-symbol-row">
                    <h2>{symbol}</h2>
                    <span className="stock-detail-exchange-badge">{exchange}</span>
                  </div>
                  <p>{displayName}</p>
                </div>

                <div className="stock-detail-header-actions">
                  <button type="button" className="stock-detail-icon-btn" onClick={(event) => { event.stopPropagation(); refreshWatchlistStockDetail(); }} disabled={loadingWatchlistDetail} aria-label={lang === "vi" ? "Làm mới dữ liệu" : "Refresh data"} title={lang === "vi" ? "Làm mới" : "Refresh"}>↻</button>
                  <button type="button" className={`stock-detail-icon-btn ${isFavorite ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); toggleWatchlist(symbol); }} aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"} title={isFavorite ? "Remove from watchlist" : "Add to watchlist"}>★</button>
                  <button type="button" className="stock-detail-back-btn" onClick={closeWatchlistStockDetail} aria-label={lang === "vi" ? "Đóng" : "Close"}>×</button>
                </div>
              </header>

              <div className="stock-detail-body">
                <div className="stock-detail-summary-grid">
                  {summaryStats.map((item) => (
                    <div key={item.label} className={`stock-detail-summary-card ${item.accent || ""}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="stock-detail-main-grid">
                  <section className="stock-detail-chart-card">
                    <div className="stock-detail-chart-head">
                      <div className="stock-detail-chart-title">
                        <span>{lang === "vi" ? "Biểu đồ giá" : "Price chart"}</span>
                        <small>{chartQuality}</small>
                      </div>
                      <div className="stock-detail-timeframe-tabs" aria-label="Chart timeframe">
                        {timeframeOptions.map((option) => (
                          <button key={option.label} type="button" className={detailChartTimeframe === option.days ? "active" : ""} onClick={() => { setDetailChartTimeframe(option.days); fetchDetailChart(symbol, option.days); }}>
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loadingDetailChart ? (
                      <div className="stock-detail-chart-empty">{lang === "vi" ? "Đang tải dữ liệu biểu đồ..." : "Loading chart data..."}</div>
                    ) : hasChartData ? (
                      <svg viewBox="0 0 440 220" role="img" aria-label={`${symbol} price chart`}>
                        <line x1="16" y1="44" x2="424" y2="44" />
                        <line x1="16" y1="120" x2="424" y2="120" />
                        <line x1="16" y1="196" x2="424" y2="196" />
                        <polyline points={chartPoints} />
                      </svg>
                    ) : (
                      <div className="stock-detail-chart-empty">{lang === "vi" ? "Chart unavailable: chưa có dữ liệu đáng tin cậy cho mã này." : "Chart unavailable: no reliable data for this symbol."}</div>
                    )}
                  </section>

                  {loadingWatchlistDetail ? (
                    <div className="stock-detail-loading">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line"></div>
                    </div>
                  ) : (
                    <div className="stock-detail-section-grid">
                      <section className="stock-detail-panel">
                        <h3>{lang === "vi" ? "Giao dịch" : "Trading stats"}</h3>
                        <div className="stock-detail-stats-grid">
                          {marketStats.map((item) => (
                            <div key={item.label} className={`stock-detail-stat ${item.muted ? "muted" : ""}`}>
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="stock-detail-panel">
                        <h3>{lang === "vi" ? "Định giá / cơ bản" : "Valuation / fundamentals"}</h3>
                        <div className="stock-detail-stats-grid compact">
                          {valuationStats.map((item) => (
                            <div key={item.label} className="stock-detail-stat">
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="stock-detail-panel stock-detail-orderbook">
                        <h3>{lang === "vi" ? "Dư mua / dư bán" : "Order book"}</h3>
                        <div className="stock-detail-stats-grid compact">
                          {orderBookStats.map((item) => (
                            <div key={item.label} className="stock-detail-stat muted">
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}

                  {detail?.description && (
                    <section className="stock-detail-panel stock-detail-about">
                      <h3>{lang === "vi" ? "Hồ sơ doanh nghiệp" : "Company profile"}</h3>
                      <p>{detail.description}</p>
                    </section>
                  )}

                  {detail?.relatedNews && detail.relatedNews.length > 0 && (
                    <section className="stock-detail-panel stock-detail-news">
                      <h3>{lang === "vi" ? "Tin liên quan" : "Related news"}</h3>
                      {detail.relatedNews.slice(0, 5).map((news, index) => {
                        const newsItem: NewsItem = { title: news.title, link: news.link, time: news.time, source: "CafeF", description: news.description || "", image: news.image || "" };
                        const hasImage = hasDisplayImage(newsItem.image);
                        const newsKey = `${news.link}-${index}`;
                        const isOpen = stockInlineArticle?.key === newsKey;
                        const showFull = isOpen && stockInlineArticle?.tab === "full" && stockInlineArticle.fullContent.length > 0;

                        return (
                          <div key={newsKey} className="stock-detail-news-entry">
                            <button type="button" onClick={() => openStockInlineArticle(newsItem, newsKey)} className={`news-card ${hasImage ? "" : "no-image"} ${isOpen ? "active" : ""}`}>
                              <div className="news-content">
                                <span className="news-source">{newsItem.source}</span>
                                <h3 className="news-title">{newsItem.title}</h3>
                                {newsItem.description && <p className="news-meta news-summary">{newsItem.description}</p>}
                                <span className="news-meta">{newsItem.time}</span>
                              </div>
                              {hasImage && <div className="news-image-wrap"><img src={newsItem.image} alt={newsItem.title} className="news-image" /></div>}
                            </button>

                            {isOpen && stockInlineArticle && (
                              <div className="stock-inline-reader">
                                <div className="stock-inline-reader-tabs">
                                  <button type="button" className={stockInlineArticle.tab === "summary" ? "active" : ""} onClick={() => setStockInlineArticleTab("summary")}>{lang === "vi" ? "Tóm tắt" : "Summary"}</button>
                                  <button type="button" className={stockInlineArticle.tab === "full" ? "active" : ""} onClick={() => setStockInlineArticleTab("full")} disabled={stockInlineArticle.fullContent.length === 0}>{lang === "vi" ? "Đọc đầy đủ" : "Full"}</button>
                                  <button type="button" onClick={() => setStockInlineArticle(null)}>{lang === "vi" ? "Thu gọn" : "Collapse"}</button>
                                </div>

                                {stockInlineArticle.loading ? (
                                  <p>{lang === "vi" ? "Đang tải tóm tắt..." : "Loading summary..."}</p>
                                ) : showFull ? (
                                  <div className="stock-inline-reader-body">
                                    {stockInlineArticle.fullContent.map((block, blockIndex) => {
                                      if (block.type === "image" && block.url) return <img key={blockIndex} src={block.url} alt="" />;
                                      if (block.type === "header" && block.text) return <h4 key={blockIndex}>{block.text}</h4>;
                                      if (block.type === "list-item" && block.text) return <li key={blockIndex}>{block.text}</li>;
                                      if (block.text) return <p key={blockIndex}>{block.text}</p>;
                                      return null;
                                    })}
                                  </div>
                                ) : (
                                  <div className="stock-inline-reader-body">
                                    {(stockInlineArticle.summary.length > 0 ? stockInlineArticle.summary : [newsItem.description || (lang === "vi" ? "Chưa có tóm tắt cho tin này." : "No summary available for this article.")]).map((paragraph, paraIndex) => <p key={paraIndex}>{paragraph}</p>)}
                                    {stockInlineArticle.error && <p className="stock-inline-reader-note">{stockInlineArticle.error}</p>}
                                    <a href={newsItem.link} target="_blank" rel="noopener noreferrer">{lang === "vi" ? "Đọc tại nguồn" : "Read at source"}</a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </section>
                  )}

                  <footer className="stock-detail-data-footer">
                    <span>{lang === "vi" ? "Nguồn" : "Source"}: {dataSource}</span>
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{lang === "vi" ? "Mở dữ liệu gốc" : "Open source data"}</a>
                    <small>{lang === "vi" ? "Dữ liệu có thể trễ, cached hoặc thiếu. Nội dung chỉ nhằm cung cấp thông tin, không phải khuyến nghị đầu tư." : "Data may be delayed, cached, or incomplete. This is informational only and not investment advice."}</small>
                  </footer>
                </div>
              </div>
            </section>
          </div>
        );
      })()}
      {/* Reader Mode Modal */}
      {activeArticle && (
        <div className={`reader-modal-overlay ${isReaderClosing ? "closing" : ""}`} onClick={closeArticle}>
          <div 
            className="reader-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={isDraggingReader ? { transform: `translateY(${readerSwipeOffset}px)`, transition: 'none' } : { transform: `translateY(${readerSwipeOffset}px)` }}
          >
            <div 
              className="reader-modal-header"
              onTouchStart={startReaderSwipe}
              onTouchMove={moveReaderSwipe}
              onTouchEnd={endReaderSwipe}
            >
              <div className="reader-modal-grabber"></div>
              <span className="reader-modal-source">{activeArticle.source}</span>
              <button className="reader-modal-close" onClick={closeArticle} title={lang === "vi" ? "Đóng" : "Close"}>
                ×
              </button>
            </div>
            <div className="reader-modal-body">
              <h2 className="reader-modal-title">{activeArticle.title}</h2>
              <div className="reader-modal-meta">
                {lang === "vi" ? "Đăng ngày" : "Published"}: {activeArticle.time}
              </div>
              
              {/* Segmented Tab switcher for Tóm tắt vs Đọc toàn bộ */}
              <div className="reader-tabs-container">
                <div className="reader-tabs">
                  <button 
                    className={`reader-tab-btn ${readerTab === "summary" ? "active" : ""}`}
                    onClick={() => setReaderTab("summary")}
                  >
                    {lang === "vi" ? "Tóm tắt nhanh" : "Quick Summary"}
                  </button>
                  <button 
                    className={`reader-tab-btn ${readerTab === "full" ? "active" : ""}`}
                    onClick={() => setReaderTab("full")}
                  >
                    {lang === "vi" ? "Đọc toàn bộ" : "Full Article"}
                  </button>
                </div>
              </div>
              
              <div className="reader-modal-text">
                {/* 1. Show temporary RSS description while loading */}
                {loadingContent && (
                  <>
                    <p className="reader-body-lead">
                      {activeArticle.description}
                    </p>
                    <div className="skeleton-container" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
                      <div className="skeleton-item" style={{ height: "14px", width: "100%", borderRadius: "4px" }}></div>
                      <div className="skeleton-item" style={{ height: "14px", width: "95%", borderRadius: "4px" }}></div>
                      <div className="skeleton-item" style={{ height: "14px", width: "85%", borderRadius: "4px" }}></div>
                      <div className="skeleton-item" style={{ height: "14px", width: "90%", borderRadius: "4px", marginTop: "10px" }}></div>
                      <div className="skeleton-item" style={{ height: "14px", width: "98%", borderRadius: "4px" }}></div>
                      <div className="skeleton-item" style={{ height: "14px", width: "70%", borderRadius: "4px" }}></div>
                    </div>
                  </>
                )}

                {/* 2. TAB A: Quick Summary (3 paragraphs) */}
                {!loadingContent && readerTab === "summary" && scrapedParagraphs.length > 0 && (
                  scrapedParagraphs.map((para, i) => (
                    <p key={i} className={i === 0 ? "reader-body-lead" : "reader-body-para"} style={{ marginTop: i > 0 ? "12px" : "0" }}>
                      {para}
                    </p>
                  ))
                )}

                {/* 3. TAB B: Full Article (Paragraphs, Headers, List Items, Inline Images) */}
                {!loadingContent && readerTab === "full" && fullContent.length > 0 && (
                  fullContent.map((el, i) => {
                    if (el.type === "paragraph" && el.text) {
                      return (
                        <p 
                          key={i} 
                          className={i === 0 ? "reader-body-lead" : "reader-body-para"} 
                          style={{ marginTop: i > 0 ? "12px" : "0" }}
                          dangerouslySetInnerHTML={{ __html: el.text }}
                        />
                      );
                    } else if (el.type === "header" && el.text) {
                      const HeadingTag = el.level === 2 ? "h3" : "h4";
                      return (
                        <HeadingTag 
                          key={i} 
                          className="reader-body-heading" 
                          style={{ marginTop: "24px", marginBottom: "8px", fontWeight: "700", fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
                          dangerouslySetInnerHTML={{ __html: el.text }}
                        />
                      );
                    } else if (el.type === "list-item" && el.text) {
                      return (
                        <ul key={i} style={{ margin: "6px 0 6px 20px", listStyleType: "disc" }}>
                          <li 
                            className="reader-body-para" 
                            style={{ margin: 0 }}
                            dangerouslySetInnerHTML={{ __html: el.text }}
                          />
                        </ul>
                      );
                    } else if (el.type === "image" && el.url) {
                      return (
                        <div key={i} className="reader-inline-image-wrap">
                          <img src={el.url} alt="Nội dung bài báo gốc" loading="lazy" />
                        </div>
                      );
                    }
                    return null;
                  })
                )}

                {/* 4. Fallbacks if loading failed or no contents are available */}
                {!loadingContent && (
                  (readerTab === "summary" && scrapedParagraphs.length === 0) || 
                  (readerTab === "full" && fullContent.length === 0)
                ) && (
                  <>
                    <p className="reader-body-lead">
                      {activeArticle.description}
                    </p>
                    {!activeArticle.body && activeArticle.link && !activeArticle.link.startsWith("#") && (
                      <p className="reader-body-para" style={{ color: "var(--ft-grey)", fontStyle: "italic", marginTop: "12px" }}>
                        {lang === "vi" ? "Không thể tải thêm nội dung chi tiết cho bài viết này." : "Unable to load more detailed content for this article."}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              <div style={{ marginTop: "30px", display: "flex", justifyContent: "center" }}>
                <a 
                  href={activeArticle.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="load-more-news-btn"
                  style={{ margin: 0, textTransform: "none", fontSize: "0.82rem" }}
                >
                  {lang === "vi" ? `Đọc bài gốc tại ${activeArticle.source} ↗` : `Read original at ${activeArticle.source} ↗`}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Macroeconomic Event Modal */}
      {activeMacroEvent && (
        <div className={`reader-modal-overlay ${isMacroEventClosing ? "closing" : ""}`} onClick={closeMacroEvent}>
          <div className="reader-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="reader-modal-header" style={{ borderBottom: "1px solid var(--border-classic)", padding: "1.25rem 1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={`ticker-change ${activeMacroEvent.class}`} style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "3px", fontWeight: "700" }}>
                  {lang === "vi" ? "Tác động" : "Impact"}: {activeMacroEvent.impact}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                  • {lang === "vi" ? "Nguồn" : "Source"}: {activeMacroEvent.source}
                </span>
              </div>
              <button className="reader-modal-close" onClick={closeMacroEvent} title={lang === "vi" ? "Đóng" : "Close"}>
                ×
              </button>
            </div>
            <div className="reader-modal-body" style={{ padding: "1.75rem" }}>
              {/* Broadsheet Banner */}
              <div style={{ textAlign: "center", borderBottom: "2px double var(--border-classic)", paddingBottom: "12px", marginBottom: "20px" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "0.85rem", letterSpacing: "2px", fontWeight: "bold", color: "var(--accent-red, #A30000)", textTransform: "uppercase" }}>
                  {lang === "vi" ? "PHÂN TÍCH VĨ MÔ CHUYÊN SÂU" : "IN-DEPTH MACRO ANALYSIS"}
                </span>
              </div>

              {/* Broadsheet Headline */}
              <h2 className="reader-modal-title" style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", lineHeight: "1.25", fontWeight: "bold", margin: "0 0 12px 0", color: "var(--text-primary)", textAlign: "center" }}>
                {activeMacroEvent.macroType === "PMI" && (lang === "vi" ? `PMI Việt Nam: Những biến số vĩ mô đáng chú ý trước giờ công bố` : `Vietnam Manufacturing PMI: Key Macro Variables to Watch Before Release`)}
                {activeMacroEvent.macroType === "GDP" && (lang === "vi" ? `GDP Quý ${activeMacroEvent.quarter || ""}: Đo lường tăng trưởng kinh tế & Xu thế dòng tiền` : `Q${activeMacroEvent.quarter || ""} GDP Growth: Measuring Expansion & Capital Market Trend`)}
                {activeMacroEvent.macroType === "CPI" && (lang === "vi" ? `Lạm phát và Chỉ số giá tiêu dùng CPI: Lộ trình chính sách vĩ mô kế tiếp` : `Inflation and Consumer Price Index (CPI): Next Macro Policy Path`)}
                {activeMacroEvent.macroType === "BCTC" && (lang === "vi" ? `Hạn chốt BCTC soát xét bán niên: Mùa kiểm chứng lợi nhuận doanh nghiệp` : `Reviewed Semi-Annual Statements Deadline: Validating Listed Earnings`)}
                {!["PMI", "GDP", "CPI", "BCTC"].includes(activeMacroEvent.macroType) && activeMacroEvent.event}
              </h2>

              <div className="reader-modal-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border-classic)", paddingBottom: "10px", marginBottom: "15px", fontFamily: "var(--font-sans)" }}>
                <span>{lang === "vi" ? "Chuyên mục: Kinh tế vĩ mô" : "Category: Macroeconomics"}</span>
                <span>{lang === "vi" ? "Thời gian" : "Date"}: {activeMacroEvent.time}</span>
              </div>

              {/* Context & Analysis */}
              <div className="reader-modal-text" style={{ fontFamily: "var(--font-serif)", fontSize: "0.95rem", lineHeight: "1.6", color: "var(--text-primary)" }}>
                {(activeMacroEvent.summary || activeMacroEvent.description || "").split("\n\n").map((para: string, i: number) => (
                  <p key={i} style={{ textIndent: i > 0 ? "1.5rem" : "0", marginBottom: "12px" }}>
                    {para}
                  </p>
                ))}
              </div>

              {/* Historical vs Forecast Comparison Table */}
              <div style={{ marginTop: "25px", marginBottom: "25px" }}>
                <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", fontWeight: "bold", borderBottom: "1px solid var(--text-primary)", paddingBottom: "4px", marginBottom: "10px" }}>
                  📊 {lang === "vi" ? "Số liệu Kỳ trước vs Dự báo đồng thuận" : "Historical vs Consensus Forecast"}
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", fontFamily: "var(--font-sans)" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--text-primary)", background: "rgba(0,0,0,0.02)" }}>
                        <th style={{ textAlign: "left", padding: "8px" }}>{lang === "vi" ? "Chỉ báo" : "Indicator"}</th>
                        <th style={{ textAlign: "center", padding: "8px" }}>{lang === "vi" ? "Đơn vị" : "Unit"}</th>
                        <th style={{ textAlign: "right", padding: "8px" }}>{lang === "vi" ? "Kỳ trước" : "Previous"}</th>
                        <th style={{ textAlign: "right", padding: "8px" }}>{lang === "vi" ? "Dự báo (Consensus)" : "Consensus Forecast"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--border-classic)" }}>
                        <td style={{ padding: "8px", fontWeight: "bold" }}>{activeMacroEvent.macroType || activeMacroEvent.event}</td>
                        <td style={{ padding: "8px", textAlign: "center", color: "var(--text-secondary)" }}>{activeMacroEvent.unit || "N/A"}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: "var(--text-primary)", fontWeight: "500" }}>{activeMacroEvent.prevValue || "N/A"}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: "var(--accent-blue)", fontWeight: "700" }}>{activeMacroEvent.forecastValue || "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expert Opinion Box */}
              {activeMacroEvent.expertOpinion && (
                <div style={{ background: "rgba(163, 0, 0, 0.03)", borderLeft: "4px solid var(--accent-red, #A30000)", padding: "12px 16px", marginTop: "25px", borderRadius: "0 4px 4px 0" }}>
                  <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "0.9rem", fontWeight: "bold", color: "var(--accent-red, #A30000)", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🗣️</span> {lang === "vi" ? "Ý kiến & Khuyến nghị Chuyên gia" : "Expert Opinion & Strategy"}
                  </h4>
                  <p style={{ margin: 0, fontStyle: "italic", fontSize: "0.88rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                    "{activeMacroEvent.expertOpinion}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Tab Bar for Mobile Devices (Apple Style) */}
      {/* ═══════════════════════════════════════════════════════
          DESKTOP PODCAST APP MODAL OVERLAY
          ═══════════════════════════════════════════════════════ */}
      {isPodcastExpanded && (
        <div className={`podcast-modal-overlay ${isPodcastClosing ? "closing" : ""}`} onClick={closePodcastExpanded}>
          <div className={`podcast-modal-content ${isPodcastClosing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="podcast-modal-header">
              <h2>
                <img src="/icon/headphone-icon.png" className="header-3d-icon" alt="" />
                {trans[lang].audioNews}
              </h2>
              <button className="podcast-modal-close-btn" onClick={closePodcastExpanded} title="Đóng | Close">
                <CloseIcon size={16} />
              </button>
            </div>
            {/* Modal Body */}
            <div className="podcast-modal-body">

                  {/* Left Column: Now Playing (Apple Music style) */}
                  <div className="podcast-modal-now-playing-panel">
                    <div className={`podcast-modal-now-playing-cover-wrap ${isPlaying ? "playing" : ""}`}>
                      <img src={currentTrack?.coverUrl} alt="" className="podcast-modal-now-playing-cover" />
                      <span className="podcast-modal-now-playing-glow"></span>
                    </div>
                    <div className="podcast-modal-now-playing-details">
                      <span className="podcast-modal-now-playing-kicker">{currentTrack?.sourceName} • {currentTrack?.artist}</span>
                      <h3 className="podcast-modal-now-playing-title">{getTrackTitle(currentTrack)}</h3>
                      <p className="podcast-modal-now-playing-desc">{getTrackDesc(currentTrack)}</p>
                    </div>
                  </div>

                  {/* Right Column: Library & Queue */}
                  <div className="podcast-modal-main-panel">
                    {/* Channels pill bar at top */}
                    <div className="podcast-modal-channels-bar">
                      {channelsList.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => { setSelectedChannel(ch.id); setSelectedSubChannel("All"); setCurrentTrackIndex(0); }}
                          className={`podcast-modal-channel-pill ${selectedChannel === ch.id ? "active" : ""}`}
                          style={{ '--channel-color': ch.color } as React.CSSProperties}
                        >
                          <img src={ch.logo} alt={ch.name} />
                          <span>{ch.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="podcast-modal-main-top-row">
                      <input 
                        type="text" 
                        placeholder={lang === "vi" ? "Tìm tập podcast..." : "Search episodes..."} 
                        value={podcastSearchQuery} 
                        onChange={(e) => setPodcastSearchQuery(e.target.value)} 
                        className="podcast-modal-search-input" 
                      />
                      {subChannelsList.length > 1 && (
                        <div className="podcast-modal-subchannel-pills">
                          {subChannelsList.map((sc) => (
                            <button key={sc} onClick={() => { setSelectedSubChannel(sc); setCurrentTrackIndex(0); }} className={`podcast-modal-subchannel-pill ${selectedSubChannel === sc ? "active" : ""}`}>
                              {sc === "All" ? (lang === "vi" ? "Tất cả chuyên mục" : "All") : sc}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tracks list */}
                    <div key={selectedChannel} className="podcast-modal-tracks-list">
                      {filteredPlaylist.length === 0 ? (
                        <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
                          {lang === "vi" ? "Không tìm thấy tập podcast." : "No episodes found."}
                        </div>
                      ) : filteredPlaylist.map((track, index) => {
                        const isCurrent = currentTrack?.id === track.id;
                        return (
                          <div key={`${track.id}-${track.audioUrl}-${index}`} className={`podcast-modal-track-row ${isCurrent ? "active" : ""}`} onClick={() => selectTrack(index)}>
                            <div className="podcast-modal-track-num">
                              {isCurrent && isPlaying ? (<span className="equalizer-wave"><span className="equalizer-bar"></span><span className="equalizer-bar"></span><span className="equalizer-bar"></span></span>) : index + 1}
                            </div>
                            <img src={track.coverUrl} alt="" className="podcast-modal-track-cover" />
                            <div className="podcast-modal-track-info">
                              <div className="podcast-modal-track-title">{getTrackTitle(track)}</div>
                              <div className="podcast-modal-track-meta">{track.sourceName} • {track.artist}</div>
                            </div>
                            <button className="podcast-modal-track-play-btn" onClick={(e) => { e.stopPropagation(); selectTrack(index); }}>
                              {isCurrent && isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
            </div>
            {/* Control Bar */}

              <div className="podcast-modal-control-bar">
                <div className={`podcast-modal-now-playing-disc ${isPlaying ? "spinning" : ""}`}>
                  <img src={currentTrack?.coverUrl} alt="" />
                </div>
                <div className="podcast-modal-now-playing-info">
                  <div className="podcast-modal-now-title">{getTrackTitle(currentTrack)}</div>
                  <div className="podcast-modal-now-artist">
                    <span>{currentTrack?.artist}</span>
                    {isPlaying && (<span className="equalizer-wave"><span className="equalizer-bar"></span><span className="equalizer-bar"></span><span className="equalizer-bar"></span></span>)}
                  </div>
                </div>
                <div className="podcast-modal-timeline-section">
                  <span className="time-label">{formatTime(currentTime)}</span>
                  <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeekChange} className="podcast-timeline-slider" style={{ flex: 1 }} />
                  <span className="time-label">{formatTime(duration)}</span>
                </div>
                <div className="podcast-modal-controls">
                  <button onClick={handlePrevTrack} className="podcast-modal-ctrl-btn" title={trans[lang].prevTrack}><SkipPreviousIcon size={18} /></button>
                  <button onClick={() => seekAudioBy(-10)} className="podcast-modal-ctrl-btn seek-btn" title={lang === "vi" ? "Tua lại 10 giây" : "Back 10 seconds"}><Rewind10Icon size={20} /></button>
                  <button onClick={togglePlayPause} className="podcast-modal-ctrl-btn play-btn">{isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}</button>
                  <button onClick={() => seekAudioBy(30)} className="podcast-modal-ctrl-btn seek-btn" title={lang === "vi" ? "Tua tới 30 giây" : "Forward 30 seconds"}><Forward30Icon size={20} /></button>
                  <button onClick={handleNextTrack} className="podcast-modal-ctrl-btn" title={trans[lang].nextTrack}><SkipNextIcon size={18} /></button>
                  <button onClick={() => setPlaybackRate(prev => { const speeds = [0.75, 1.0, 1.25, 1.5, 2.0]; return speeds[(speeds.indexOf(prev) + 1) % speeds.length]; })} className="podcast-modal-speed-btn">{playbackRate}×</button>
                </div>
                <div className="podcast-modal-volume-section">
                  <VolumeIcon size={16} />
                  <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} />
                </div>
              </div>
          </div>
        </div>
      )}

      {/* MOBILE FLOATING MINI PLAYER — shown on all tabs except podcast tab */}
      {currentTrack && activeMobileTab !== "podcast" && (
        <>
          <div
            className={`mobile-mini-player ${isMobileMiniHidden ? "hidden" : ""}`}
            onClick={openMobilePlayer}
            onTouchStart={startMiniPlayerSwipe}
            onTouchEnd={endMiniPlayerSwipe}
          >
            <img src={currentTrack.coverUrl} alt="" className={`mobile-mini-player-cover ${isPlaying ? "spinning" : ""}`} />
            <div className="mobile-mini-player-info">
              <div className="mobile-mini-player-title">{getTrackTitle(currentTrack)}</div>
              <div className="mobile-mini-player-artist">
                <span>{currentTrack.artist}</span>
                {isPlaying && (<span className="equalizer-wave"><span className="equalizer-bar"></span><span className="equalizer-bar"></span><span className="equalizer-bar"></span></span>)}
              </div>
            </div>
            <div className="mobile-mini-player-controls">
              <button className="mobile-mini-ctrl-btn" onClick={(e) => { e.stopPropagation(); handlePrevTrack(); }}><SkipPreviousIcon size={16} /></button>
              <button className="mobile-mini-ctrl-btn play-btn" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
                {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </button>
              <button className="mobile-mini-ctrl-btn" onClick={(e) => { e.stopPropagation(); handleNextTrack(); }}><SkipNextIcon size={16} /></button>
            </div>
            <div className="mobile-mini-player-progress">
              <div className="mobile-mini-player-progress-fill" style={{ width: mobilePlayerProgress }} />
            </div>
          </div>

          <button
            className={`mobile-mini-reveal-tab ${!isMobileMiniHidden ? "hidden" : ""}`}
            onClick={() => setIsMobileMiniHidden(false)}
            onTouchStart={startRevealTabSwipe}
            onTouchEnd={endRevealTabSwipe}
            title={lang === "vi" ? "Kéo sang trái để mở trình phát" : "Swipe left to reveal player"}
          >
            <span className="mobile-mini-reveal-arrow">‹</span>
            <img src={currentTrack.coverUrl} alt="" />
          </button>
        </>
      )}

      {isMobilePlayerOpen && currentTrack && (
        <div className={`mobile-player-sheet-overlay mobile-only ${isMobilePlayerClosing ? "closing" : ""}`} onClick={closeMobilePlayer}>
          <div 
            className="mobile-player-sheet" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={startPlayerSheetSwipe}
            onTouchEnd={endPlayerSheetSwipe}
          >
            <button className="mobile-player-sheet-close" onClick={closeMobilePlayer} title={lang === "vi" ? "Đóng" : "Close"}>×</button>
            <div className="mobile-player-grabber"></div>
            <div 
              className={`mobile-player-art-stage ${isPlaying ? "playing" : ""} ${artSwipeMotion ? `swipe-${artSwipeMotion}` : ""}`}
              onTouchStart={startArtworkSwipe}
              onTouchEnd={endArtworkSwipe}
              title={lang === "vi" ? "Vuốt phải để chuyển tập tiếp, vuốt trái để lùi tập" : "Swipe right for next, left for previous"}
            >
              <img src={currentTrack.coverUrl} alt="" className="mobile-player-art" />
              <span className="mobile-player-art-glow"></span>
            </div>
            <div className="mobile-player-track-row">
              <div>
                <span className="mobile-player-kicker">{currentTrack.sourceName} • {currentTrack.artist}</span>
                <h3>{getTrackTitle(currentTrack)}</h3>
              </div>
              <button className={`mobile-player-info-btn ${isAudioInfoOpen ? "active" : ""}`} onClick={() => setIsAudioInfoOpen((open) => !open)}>
                i
              </button>
            </div>
            {isAudioInfoOpen && (
              <div className="mobile-player-info-panel">
                <strong>{lang === "vi" ? "Thông tin audio" : "Audio Info"}</strong>
                <p>{getTrackDesc(currentTrack) || currentTrack.description || (lang === "vi" ? "Chưa có mô tả cho tập này." : "No description available for this episode.")}</p>
                <div>
                  <span>{currentTrack.sourceName}</span>
                  <span>{currentTrack.duration || formatTime(duration)}</span>
                  {currentTrack.pubDate && <span>{new Date(currentTrack.pubDate).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US")}</span>}
                </div>
              </div>
            )}
            <div className="mobile-player-progress-wrap">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                className="mobile-player-progress-slider"
              />
              <div className="mobile-player-time-row">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(Math.max((duration || 0) - currentTime, 0))}</span>
              </div>
            </div>
            <div className="mobile-player-main-controls">
              <button onClick={handlePrevTrack} className="mobile-player-control-btn side-btn">
                <SkipPreviousIcon size={34} />
              </button>
              <button onClick={() => seekAudioBy(-10)} className="mobile-player-control-btn seek-btn" title={lang === "vi" ? "Tua lại 10 giây" : "Back 10 seconds"}>
                <Rewind10Icon size={30} />
              </button>
              <button onClick={togglePlayPause} className="mobile-player-control-btn center-btn">
                {isPlaying ? <PauseIcon size={40} /> : <PlayIcon size={40} />}
              </button>
              <button onClick={() => seekAudioBy(30)} className="mobile-player-control-btn seek-btn" title={lang === "vi" ? "Tua tới 30 giây" : "Forward 30 seconds"}>
                <Forward30Icon size={30} />
              </button>
              <button onClick={handleNextTrack} className="mobile-player-control-btn side-btn">
                <SkipNextIcon size={34} />
              </button>
            </div>
            <div className="mobile-player-volume-row">
              <VolumeIcon size={16} />
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} />
              <VolumeIcon size={20} />
            </div>
            <div className="mobile-player-actions-row">
              <button>ⓘ</button>
              <button>AirPlay</button>
              <button onClick={() => setActiveMobileTab("podcast")}>
                <PlaylistIcon size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-tab-bar">
        <button 
          className={`mobile-tab-item ${activeMobileTab === "home" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("home")}
        >
          <span className="mobile-tab-icon">
            <img src="/icon/calendar-icon.png" alt="" />
          </span>
          <span>{lang === "vi" ? "TIN TỨC" : "NEWS"}</span>
        </button>
        <button 
          className={`mobile-tab-item ${activeMobileTab === "markets" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("markets")}
        >
          <span className="mobile-tab-icon">
            <img src="/icon/chart-icon.png" alt="" />
          </span>
          <span>{lang === "vi" ? "THỊ TRƯỜNG" : "MARKETS"}</span>
        </button>
        <button 
          className={`mobile-tab-item ${activeMobileTab === "portfolio" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("portfolio")}
        >
          <span className="mobile-tab-icon">
            <img src="/icon/wallet-icon.png" alt="" />
          </span>
          <span>{lang === "vi" ? "DANH MỤC" : "PORTFOLIO"}</span>
        </button>
        <button 
          className={`mobile-tab-item ${activeMobileTab === "podcast" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("podcast")}
        >
          <span className="mobile-tab-icon">
            <img src="/icon/headphone-icon.png" alt="" />
          </span>
          <span>AUDIO</span>
        </button>
      </nav>
    </div>
  );
}
