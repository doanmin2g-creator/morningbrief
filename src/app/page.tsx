"use client";

import { useEffect, useState, useRef, useMemo } from "react";

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
  relatedNews?: { title: string; link: string; time: string }[];
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
  image: string;
  body?: string[];
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
    footerText: "© 2026 THE MORNING BRIEF. Thiết kế theo phong cách báo giấy hiện đại của FT.",
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
    footerText: "© 2026 THE MORNING BRIEF. Designed in the modern broadsheet style of the Financial Times.",
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

// Curated Economic Calendar events with detailed read summaries
const calendarEvents = [
  {
    date: "15/06",
    event: "Báo cáo Tình hình Sản xuất Việt Nam (PMI) Tháng 5",
    impact: "LỚN",
    class: "positive",
    source: "S&P Global / CafeF",
    time: "15/06/2026",
    description: "Chỉ số Nhà quản trị Mua hàng (PMI) ngành sản xuất Việt Nam kỳ vọng phục hồi mạnh mẽ nhờ sự gia tăng của các đơn đặt hàng xuất khẩu mới và nhu cầu tiêu dùng nội địa tăng cao.",
    summary: `Chỉ số Nhà quản trị Mua hàng (PMI) ngành sản xuất Việt Nam dự kiến sẽ ghi nhận mức tăng trưởng đáng kể trong kỳ báo cáo này. Sự phục hồi được thúc đẩy bởi sự gia tăng mạnh mẽ của số lượng đơn đặt hàng mới từ cả thị trường trong nước lẫn xuất khẩu quốc tế.
Các nhà sản xuất đã chủ động mở rộng quy mô công suất, tăng cường tuyển dụng lao động và tích lũy hàng tồn kho nguyên vật liệu để đáp ứng nhu cầu tăng cao đột biến của mùa tiêu dùng giữa năm.
Theo các chuyên gia từ S&P Global, sự tăng trưởng này phản ánh niềm tin kinh doanh đang quay trở lại ở khối doanh nghiệp tư nhân. Tuy nhiên, áp lực chi phí đầu vào tăng do chi phí vận tải biển và nguyên vật liệu thô tăng vẫn là một thách thức không nhỏ mà các nhà quản trị cần đặc biệt lưu tâm để tối ưu hóa tỷ suất lợi nhuận vĩ mô.`
  },
  {
    date: "24/06",
    event: "Tổng cục Thống kê công bố số liệu GDP Quý 2",
    impact: "RẤT LỚN",
    class: "negative",
    source: "Tổng cục Thống kê (GSO)",
    time: "24/06/2026",
    description: "Công bố số liệu chính thức về tăng trưởng GDP Quý 2/2026, đánh giá sức khỏe nền kinh tế và định hướng tăng trưởng vĩ mô.",
    summary: `Tổng cục Thống kê Việt Nam sẽ chính thức công bố báo cáo kinh tế vĩ mô Quý 2/2026, trong đó tâm điểm là số liệu tăng trưởng GDP thực tế. Giới phân tích dự báo GDP Quý 2 tăng trưởng tích cực nhờ động lực mạnh mẽ từ khu vực công nghiệp chế biến chế tạo và sự phục hồi ấn tượng của ngành dịch vụ du lịch.
Báo cáo cũng sẽ chi tiết hóa các dữ liệu về giải ngân vốn đầu tư công, tình hình thu hút FDI và tăng trưởng doanh thu bán lẻ hàng hóa dịch vụ tiêu dùng cả nước.
Con số GDP này đóng vai trò tối quan trọng đối với việc điều hành chính sách tiền tệ của Ngân hàng Nhà nước trong nửa cuối năm, đặc biệt là định hướng lãi suất và kiểm soát trần tín dụng để vừa thúc đẩy phục hồi kinh tế vừa kiềm chế áp lực lạm phát cơ bản.`
  },
  {
    date: "29/06",
    event: "Báo cáo Chỉ số Giá tiêu dùng (CPI) Tháng 6",
    impact: "RẤT LỚN",
    class: "negative",
    source: "Bộ Tài chính / GSO",
    time: "29/06/2026",
    description: "Báo cáo chính thức về chỉ số lạm phát CPI tháng 6 và lỹ kế 6 tháng đầu năm 2026, làm cơ sở điều tiết giá cả mặt hàng thiết yếu.",
    summary: `Chỉ số Giá tiêu dùng (CPI) tháng 6/2026 dự báo sẽ chịu áp lực tăng nhẹ từ việc điều chỉnh giá các dịch vụ công ích và biến động của giá năng lượng toàn cầu. Tuy nhiên, nhờ sự chủ động bình ổn giá của Chính phủ và nguồn cung nông sản trong nước dào dạt, lạm phát chung vẫn sẽ được kiểm soát an toàn trong mục tiêu quốc hội giao phó.
CPI lũy kế 6 tháng đầu năm dự kiến sẽ tăng khoảng 3.8% so với cùng kỳ, tạo dư địa an toàn cho các chính sách kích cầu kinh tế tiếp theo.
Sự chú ý của các quỹ đầu tư tài chính hướng về số liệu lạm phát lõi nhằm đánh giá mức độ ổn định của đồng nội tệ VND và dự đoán hành động tiếp theo của các cơ quan hoạch định chính sách tài khóa vĩ mô.`
  },
  {
    date: "05/07",
    event: "Hạn chốt Báo cáo Tài chính Bán niên Soát xét 2026",
    impact: "TRUNG BÌNH",
    class: "neutral",
    source: "Ủy ban Chứng khoán Nhà nước",
    time: "05/07/2026",
    description: "Thời hạn cuối cùng để các doanh nghiệp niêm yết công bố báo cáo tài chính bán niên đã được các công ty kiểm toán soát xét độc lập.",
    summary: `Mùa báo cáo tài chính bán niên soát xét 2026 là thời điểm quan trọng để nhà đầu tư kiểm chứng tính xác thực của các con số lợi nhuận tự lập do doanh nghiệp công bố trước đó. Lịch sử thị trường cho thấy thường xuất hiện những biến động lệch pha đáng kể giữa báo cáo tự lập và báo cáo soát xét của kiểm toán viên ở nhóm doanh nghiệp quy mô vừa và nhỏ.
Các công ty kiểm toán lớn (Big 4) sẽ đưa ra các kết luận soát xét liên quan đến khả năng hoạt động liên tục, trích lập dự phòng nợ xấu và ghi nhận doanh thu các dự án lớn.
Việc công bố thông tin minh bạch, đúng thời hạn sẽ giúp duy trì niềm tin bền vững của cổ đông và là cơ sở để các định chế tài chính định giá lại doanh nghiệp trước thềm giai đoạn đầu tư cuối năm.`
  }
];

// Helper to get Vietnamese date labels for trading days
function getTradingDays(count: number) {
  if (count <= 0) return [];
  const dates: string[] = [];
  let current = new Date();
  
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

  const getTrackTitle = (track: PodcastTrack) => {
    if (!track) return "";
    if (track.id === 1) return lang === "vi" ? trans.vi.vovTitle : trans.en.vovTitle;
    if (track.id === 2) return lang === "vi" ? trans.vi.tuoitreTitle : trans.en.tuoitreTitle;
    if (track.id === 3) return lang === "vi" ? trans.vi.vietceteraTitle : trans.en.vietceteraTitle;
    if (track.id === 4) return lang === "vi" ? trans.vi.bbcTitle : trans.en.bbcTitle;
    if (track.id === 5) return lang === "vi" ? trans.vi.havesipTitle : trans.en.havesipTitle;
    return track.title;
  };

  const getTrackDesc = (track: PodcastTrack) => {
    if (!track) return "";
    if (track.id === 1) return lang === "vi" ? trans.vi.vovDesc : trans.en.vovDesc;
    if (track.id === 2) return lang === "vi" ? trans.vi.tuoitreDesc : trans.en.tuoitreDesc;
    if (track.id === 3) return lang === "vi" ? trans.vi.vietceteraDesc : trans.en.vietceteraDesc;
    if (track.id === 4) return lang === "vi" ? trans.vi.bbcDesc : trans.en.bbcDesc;
    if (track.id === 5) return lang === "vi" ? trans.vi.havesipDesc : trans.en.havesipDesc;
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
  const [watchlistNews, setWatchlistNews] = useState<any[]>([]);
  const [loadingWatchlistNews, setLoadingWatchlistNews] = useState(false);
  const [visibleWatchlistNewsCount, setVisibleWatchlistNewsCount] = useState(8);
  const [macroData, setMacroData] = useState<any>(null);
  const [loadingMacro, setLoadingMacro] = useState(true);
  // Index overview stats (liquidity, breadth, foreign trading) from CafeF
  const [indexStats, setIndexStats] = useState<Record<string, IndexOverview>>({});
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [scrapedParagraphs, setScrapedParagraphs] = useState<string[]>([]);
  const [fullContent, setFullContent] = useState<Array<{ type: "paragraph" | "header" | "list-item" | "image"; text?: string; url?: string; level?: number }>>([]);
  const [readerTab, setReaderTab] = useState<"summary" | "full">("summary");
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Podcast State Hooks
  const [podcastPlaylist, setPodcastPlaylist] = useState<PodcastTrack[]>(fallbackPlaylist);
  const [loadingPodcast, setLoadingPodcast] = useState(true);
  const [podcastSource, setPodcastSource] = useState<string>("Offline");
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
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
  const [isMobilePlaylistOpen, setIsMobilePlaylistOpen] = useState<boolean>(false);
  const [isMobileMiniHidden, setIsMobileMiniHidden] = useState(false);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);

  // Curated Channels List with custom styling details
  const channelsList = useMemo(() => {
    return [
      { id: "All", name: lang === "vi" ? "Tất cả" : "All", logo: "/icon/headphone-icon.png", color: "var(--accent-blue)", desc: lang === "vi" ? "Tất cả các nguồn tin phát thanh tổng hợp sáng nay." : "All curated audio feeds for this morning." },
      { id: "VOV", name: "VOV", logo: "/icon/microphone-icon.png", color: "#A30000", desc: lang === "vi" ? "Đài Tiếng nói Việt Nam VOV - Tin thời sự & kinh tế vĩ mô nóng hổi." : "Voice of Vietnam news and macroeconomic updates." },
      { id: "Tuổi Trẻ", name: "Tuổi Trẻ", logo: "/icon/closed-book-icon.png", color: "#005ea5", desc: lang === "vi" ? "Báo Tuổi Trẻ - Tin tức đời sống & tài chính tiêu dùng." : "Tuoi Tre news, social updates & consumer finance." },
      { id: "Vietcetera", name: "Vietcetera", logo: "/icon/coffee-cup-icon.png", color: "#ff3e00", desc: lang === "vi" ? "Podcast đối thoại kinh doanh, đổi mới & lối sống." : "Vietcetera conversations on business, career & lifestyle." },
      { id: "BBC", name: "BBC", logo: "/icon/globes-icon.png", color: "#b00000", desc: lang === "vi" ? "BBC World Service - Tin tức toàn cầu & Tiếng Anh." : "BBC global perspective and English learning." }
    ];
  }, [lang]);

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
    if (filteredPlaylist.length > 0) {
      if (currentTrackIndex < filteredPlaylist.length) {
        return filteredPlaylist[currentTrackIndex];
      }
      return filteredPlaylist[0];
    }
    return podcastPlaylist[currentTrackIndex] || podcastPlaylist[0] || fallbackPlaylist[0];
  }, [filteredPlaylist, currentTrackIndex, podcastPlaylist]);

  // Safely bound currentTrackIndex when the filtered playlist changes
  useEffect(() => {
    if (currentTrackIndex >= filteredPlaylist.length) {
      setCurrentTrackIndex(0);
    }
  }, [filteredPlaylist, currentTrackIndex]);

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
    if (!isPlaying) {
      setIsMobileMiniHidden(false);
      setIsMobilePlayerOpen(false);
      return;
    }
    setIsMobileMiniHidden(false);
  }, [isPlaying]);
  
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
  const miniPlayerSwipeHandledRef = useRef(false);

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

  // Fetch Vietnamese Stocks
  const fetchStocks = async () => {
    const shouldShowInitialLoader = !hasLoadedStocksRef.current && tickerList.length === 0;
    if (shouldShowInitialLoader) {
      setLoadingStocks(true);
    }
    try {
      // Load watchlist from localStorage directly to get the latest updated values
      const saved = localStorage.getItem("morningbrief_watchlist");
      let watchlistParams = "";
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            watchlistParams = `?watchlist=${encodeURIComponent(parsed.join(","))}`;
          }
        } catch (e) {
          console.error(e);
        }
      }

      const res = await fetch(`/api/stocks${watchlistParams}`);
      if (!res.ok) throw new Error("Failed to fetch stock data");
      const data = await res.json();
      const combined = [...(data.indices || []), ...(data.watchlistTickers || [])];
      setTickerList(combined);
      setHighlights(data.highlights || null);
      hasLoadedStocksRef.current = true;
      // Extract index overview stats from each index entry
      const statsMap: Record<string, IndexOverview> = {};
      (data.indices || []).forEach((idx: any) => {
        if (idx.overview) {
          statsMap[idx.symbol] = idx.overview;
        }
      });
      setIndexStats(statsMap);
    } catch (error) {
      console.error(error);
      setErrorMsg("Unable to retrieve stock data");
    } finally {
      if (shouldShowInitialLoader) {
        setLoadingStocks(false);
      }
    }
  };

  // Fetch News Feed based on selected category tab
  const fetchNews = async (category: string) => {
    setLoadingNews(true);
    try {
      const res = await fetch(`/api/news?category=${category}`);
      if (!res.ok) throw new Error("Failed to fetch news data");
      const data = await res.json();
      setNewsList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNews(false);
    }
  };

  const fetchMacroData = async () => {
    setLoadingMacro(true);
    try {
      const res = await fetch("/api/macro");
      if (res.ok) {
        const data = await res.json();
        setMacroData(data);
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
      <div key={idx} className="stock-search-result-card animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}>
        <div className="stock-search-result-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              onClick={() => toggleWatchlist(item.symbol)}
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
                  <a href={news.link} target="_blank" rel="noopener noreferrer" className="stock-news-title">
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
    if (filteredPlaylist.length === 0) return;
    setCurrentTrackIndex((prev) => (prev + 1) % filteredPlaylist.length);
  };

  const handlePrevTrack = () => {
    if (filteredPlaylist.length === 0) return;
    setCurrentTrackIndex((prev) => (prev - 1 + filteredPlaylist.length) % filteredPlaylist.length);
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

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
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
      if (!isPlaying) {
        setIsMobilePlayerOpen(false);
      }
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
    setIsMobilePlayerOpen(true);
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

  const renderStockTable = (list: TickerItem[], showVolume: boolean = false) => {
    if (!list || list.length === 0) {
      return (
        <div style={{ padding: "20px", textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          {lang === "vi" ? "Đang tải dữ liệu..." : "Loading data..."}
        </div>
      );
    }
    return (
      <div className="highlights-detailed-table-wrap">
        <table className="highlights-detailed-table">
          <thead>
            <tr>
              <th>{lang === "vi" ? "Mã" : "Symbol"}</th>
              <th style={{ textAlign: "right" }}>{lang === "vi" ? "Giá" : "Price"}</th>
              <th style={{ textAlign: "right" }}>{lang === "vi" ? "Tăng/Giảm" : "Change"}</th>
              {showVolume && <th style={{ textAlign: "right" }}>{lang === "vi" ? "Khối lượng" : "Volume"}</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((item, idx) => {
              const code = item.symbol;
              const colorClass = getStockColorClass(item);
              return (
                <tr key={idx}>
                  <td>
                    <span className="stock-table-symbol">{code}</span>
                    <span className="stock-table-exchange">{item.exchange}</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700" }}>{item.price}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`ticker-change ${colorClass}`} style={{ fontSize: "0.78rem" }}>
                      {item.change}
                    </span>
                  </td>
                  {showVolume && (
                    <td style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {(item as any).volumeStr || (item as any).volume || "0"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Click handler for financial calendar event reading
  const handleCalendarClick = (event: typeof calendarEvents[number]) => {
    const mockArticle: NewsItem = {
      source: event.source,
      title: event.event,
      description: event.description,
      link: "#",
      time: event.time,
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=600&auto=format&fit=crop",
      body: [
        event.summary,
        `Sự kiện kinh tế vĩ mô này được đánh giá có mức độ tác động ${event.impact} tới thị trường tài chính Việt Nam. Nhà đầu tư được khuyến nghị theo sát các báo cáo phân tích chi tiết hơn từ các tổ chức tài chính uy tín nhằm chủ động quản trị rủi ro danh mục kinh doanh của mình.`,
        `Nguồn tin chi tiết và chính thống được cung cấp trực tiếp bởi các cơ quan quản lý nhà nước có thẩm quyền hoặc từ các tổ chức nghiên cứu kinh tế hàng đầu.`
      ]
    };
    setActiveArticle(mockArticle);
  };

  // Synchronize track change and playing state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(err => console.log("Audio auto-play failed:", err));
      }
    }
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
    setLoadingPodcast(true);
    try {
      const res = await fetch("/api/podcast");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPodcastPlaylist(data);
          setPodcastSource(data[0].sourceName || "VnExpress");
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
      return;
    }

    const fetchWatchlistNews = async () => {
      setLoadingWatchlistNews(true);
      try {
        const symbolsParam = watchlist.join(",");
        const res = await fetch(`/api/watchlist-news?symbols=${encodeURIComponent(symbolsParam)}`);
        if (res.ok) {
          const data = await res.json();
          setWatchlistNews(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching watchlist news:", err);
      } finally {
        setLoadingWatchlistNews(false);
      }
    };

    fetchWatchlistNews();
  }, [watchlist]);

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
  const shouldShowFloatingMiniPlayer = Boolean(currentTrack && isPlaying && !isMobileMiniHidden && activeMobileTab !== "podcast");
  const shouldShowMiniRevealTab = Boolean(currentTrack && isPlaying && isMobileMiniHidden && activeMobileTab !== "podcast");

  return (
    <div className="app-container">
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

            <button
              onClick={togglePlayPause}
              className={`see-more-btn ${isPlaying ? "active-audio" : ""}`}
              style={{
                margin: 0,
                padding: "6px 12px",
                fontSize: "0.78rem",
                textTransform: "none",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              title={isPlaying ? (lang === "vi" ? "Dừng nghe" : "Stop") : (lang === "vi" ? "Nghe Bản tin" : "Listen")}
            >
              <span>
                {isPlaying ? (
                  lang === "vi" ? "■ Dừng nghe" : "■ Stop"
                ) : (
                  <>
                    <img src="/icon/headphone-icon.png" style={{ width: '14px', height: '14px', marginRight: '4px', verticalAlign: 'middle', objectFit: 'contain', display: 'inline-block' }} alt="" />
                    {lang === "vi" ? "Nghe Bản tin" : "Listen"}
                  </>
                )}
              </span>
            </button>

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
            {loadingStocks ? (
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
            )}
          </div>
        </div>
      </header>

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
          <section className={`news-section ${activeMobileTab === "home" ? "" : "hidden-mobile"}`}>
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

            <div className="news-feed">
              {loadingNews ? (
                <>
                  <div className="skeleton-card"></div>
                  <div className="skeleton-card"></div>
                </>
              ) : (
                <>
                  {newsList.slice(0, visibleNewsCount).map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActiveArticle(item)} 
                      className="news-card" 
                      style={{ cursor: "pointer" }}
                    >
                      <div className="news-content">
                        <span className="news-source">{item.source}</span>
                        <h3 className="news-title">{item.title}</h3>
                        <p className="news-meta" style={{ marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                          {item.description}
                        </p>
                        <span className="news-meta">{item.time}</span>
                      </div>
                      <div className="news-image-wrap">
                        <img src={item.image} alt={item.title} className="news-image" />
                      </div>
                    </div>
                  ))}
                  {newsList.length > visibleNewsCount && (
                    <button 
                      className="load-more-news-btn"
                      onClick={() => setVisibleNewsCount(prev => prev + 6)}
                    >
                      {trans[lang].loadMore}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Economic Calendar Panel (Interactive click-to-read) */}
            <div className="widget-panel" style={{ marginTop: "2rem" }}>
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>
                  <img src="/icon/calendar-icon.png" className="header-3d-icon" alt="" />
                  {trans[lang].economicCalendar}
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
                {calendarEvents.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleCalendarClick(item)}
                    className="calendar-item-card"
                    style={{ 
                      display: "flex", 
                      gap: "10px", 
                      paddingBottom: "8px", 
                      borderBottom: idx < calendarEvents.length - 1 ? "1px dashed var(--border-classic)" : "none",
                      cursor: "pointer" 
                    }}
                  >
                    <div className="calendar-date-badge">
                      {item.date}
                    </div>
                    <div>
                      <strong className="calendar-event-title" style={{ display: "block", color: "var(--text-primary)", fontSize: "0.8rem", lineHeight: "1.3", transition: "color 0.2s" }}>{item.event}</strong>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                        <span className={`ticker-change ${item.class}`} style={{ fontSize: "0.65rem", padding: "1px 4px", borderRadius: "3px", fontWeight: "700" }}>
                          {lang === "vi" ? "Tác động" : "Impact"}: {item.impact === "LỚN" ? (lang === "vi" ? "LỚN" : "HIGH") : item.impact === "VỪA" ? (lang === "vi" ? "VỪA" : "MED") : (lang === "vi" ? "NHỎ" : "LOW")}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          • {lang === "vi" ? "Nguồn" : "Source"}: {item.source}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


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

            {/* Spotify-style Podcast Player */}
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
                  <button onClick={togglePlayPause} className="podcast-control-btn play-btn" title={isPlaying ? trans[lang].pause : trans[lang].play}>
                    {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
                  </button>
                  <button onClick={handleNextTrack} className="podcast-control-btn" title={trans[lang].nextTrack}>
                    <SkipNextIcon size={20} />
                  </button>
                  <button 
                    onClick={() => setShowPlaylist(!showPlaylist)} 
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
                        key={track.id} 
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
            <div className={`widget-panel ${activeMobileTab === "markets" ? "" : "hidden-mobile"}`} style={{ borderLeft: "4px solid var(--accent-red)", background: "rgba(0,0,0,0.01)" }}>
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3 style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "1.5px", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                  <img src="/icon/notebook-icon.png" className="header-3d-icon" style={{ width: '16px', height: '16px', marginRight: '6px' }} alt="" />
                  {trans[lang].expertBrief}
                </h3>
              </div>
              <p style={{ lineHeight: "1.5", fontSize: "0.85rem", fontStyle: "italic", fontFamily: "var(--font-serif)", color: "var(--text-secondary)", margin: 0 }}>
                "{analysis.summary}"
              </p>
            </div>

            {/* Market Trend Chart Panel */}
            <div className={`widget-panel ${activeMobileTab === "markets" ? "" : "hidden-mobile"}`}>
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
                            "{indexAnalyses[selectedChartIndex]?.analysis}"
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
            <div className={`widget-panel ${activeMobileTab === "portfolio" ? "" : "hidden-mobile"}`}>
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
                  tickerList.filter(item => watchlist.includes(item.symbol.split(" ")[0])).map((item, idx) => (
                    <div key={idx} className="crypto-item" style={{ padding: "4px 0" }}>
                      <div className="crypto-info">
                        <h4 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(item.symbol.split(" ")[0]);
                            }}
                            style={{ color: "var(--accent-red)", cursor: "pointer", fontSize: "0.95rem" }}
                          >
                            ⭐
                          </span>
                          {item.symbol.split(" ")[0]}
                        </h4>
                        <p style={{ fontSize: "0.7rem" }}>{item.sector}</p>
                      </div>
                      <div className="crypto-price-info">
                        <h4 style={{ fontSize: "0.88rem" }}>{item.price}</h4>
                        <span className={`ticker-change ${getStockColorClass(item)}`} style={{ fontSize: "0.78rem" }}>
                          {item.change}
                        </span>
                      </div>
                    </div>
                  ))
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
                      const newsItem = {
                        ...news,
                        source: news.relatedSymbol ? `${news.relatedSymbol} • CafeF` : "CafeF"
                      };
                      return (
                        <div 
                          key={ni} 
                          onClick={() => setActiveArticle(newsItem)} 
                          className="news-card" 
                          style={{ cursor: "pointer" }}
                        >
                          <div className="news-content">
                            <span className="news-source">{newsItem.source}</span>
                            <h3 className="news-title">{newsItem.title}</h3>
                            {newsItem.description && (
                              <p className="news-meta" style={{ marginBottom: "8px", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                                {newsItem.description}
                              </p>
                            )}
                            <span className="news-meta">{newsItem.time}</span>
                          </div>
                          <div className="news-image-wrap">
                            <img src={newsItem.image} alt={newsItem.title} className="news-image" />
                          </div>
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
                        const newsItem = {
                          ...news,
                          source: news.relatedSymbol ? `${news.relatedSymbol} • CafeF` : "CafeF"
                        };
                        return (
                          <div 
                            key={ni} 
                            onClick={() => setActiveArticle(newsItem)} 
                            className="news-card" 
                            style={{ cursor: "pointer" }}
                          >
                            <div className="news-content">
                              <span className="news-source">{newsItem.source}</span>
                              <h3 className="news-title">{newsItem.title}</h3>
                              {newsItem.description && (
                                <p className="news-meta" style={{ marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                                  {newsItem.description}
                                </p>
                              )}
                              <span className="news-meta">{newsItem.time}</span>
                            </div>
                            <div className="news-image-wrap">
                              <img src={newsItem.image} alt={newsItem.title} className="news-image" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {watchlistNews.length > visibleWatchlistNewsCount && (
                      <button 
                        className="load-more-news-btn"
                        onClick={() => setVisibleWatchlistNewsCount(prev => prev + 8)}
                        style={{ marginTop: "1rem", width: "100%" }}
                      >
                        {lang === "vi" ? "Xem thêm tin hệ sinh thái" : "Load more ecosystem news"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Top VN Stocks List (Điểm nhấn Thị trường) */}
            <div className={`widget-panel ${activeMobileTab === "markets" ? "" : "hidden-mobile"}`}>
              <div className="widget-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.85rem", letterSpacing: "1.5px" }}>
                  <img src="/icon/stock-tickers-icon.png" className="header-3d-icon" style={{ width: '16px', height: '16px', marginRight: '6px' }} alt="" />
                  {trans[lang].marketHighlights}
                </h3>
                
                {/* Sub-tabs for Market Highlights */}
                <div className="tabs" style={{ padding: "2px", borderRadius: "20px" }}>
                  <button
                    className={`tab ${stockFilterTab === "all" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("all")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    {trans[lang].allTab}
                  </button>
                  <button
                    className={`tab ${stockFilterTab === "gainers" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("gainers")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    {trans[lang].gainerTab}
                  </button>
                  <button
                    className={`tab ${stockFilterTab === "losers" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("losers")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    {trans[lang].loserTab}
                  </button>
                  <button
                    className={`tab ${stockFilterTab === "volume" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("volume")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    {trans[lang].volumeTab}
                  </button>
                </div>
              </div>

              {/* === TOP 5 GAINERS & LOSERS LEADERBOARD === */}
              {!loadingStocks && stockFilterTab === "all" && (() => {
                const stocksOnly = tickerList.filter(item => item.sector !== "Chỉ số");
                const parseChangePercent = (s: string) => { try { return parseFloat(s.replace("%", "")); } catch { return 0; } };
                const sorted = [...stocksOnly].sort((a, b) => parseChangePercent(b.change) - parseChangePercent(a.change));

                const top5Gainers = (highlights && highlights.gainers && highlights.gainers.length > 0)
                  ? highlights.gainers.slice(0, 5)
                  : sorted.filter(s => parseChangePercent(s.change) > 0).slice(0, 5);

                const top5Losers = (highlights && highlights.losers && highlights.losers.length > 0)
                  ? highlights.losers.slice(0, 5)
                  : sorted.filter(s => parseChangePercent(s.change) < 0).reverse().slice(0, 5);

                const renderLeaderItem = (item: TickerItem, rank: number, type: "gainer" | "loser") => {
                  const code = item.symbol.split(" ")[0];
                  const exTag = item.exchange ? ` ${item.exchange}` : "";
                  const colorClass = getStockColorClass(item);
                  const typeMapped = type === "gainer" ? "gainers" : "losers";
                  return (
                    <div key={code} className={`leaderboard-item ${typeMapped}`}>
                      <div className="leaderboard-rank">{rank}</div>
                      <div className="leaderboard-info">
                        <span className="leaderboard-code">{code}</span>
                        <span className="leaderboard-exchange">{exTag}</span>
                      </div>
                      <div className="leaderboard-price">{item.price}</div>
                      <div className={`leaderboard-change ticker-change ${colorClass}`}>
                        {item.change}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="leaderboard-grid">
                    <div className="leaderboard-column">
                      <div className="leaderboard-column-header gainers" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="leaderboard-icon">🌱</span>
                        <span>{lang === "vi" ? "TĂNG" : "GAINERS"}</span>
                      </div>
                      {top5Gainers.length > 0 ? (
                        top5Gainers.map((item, i) => renderLeaderItem(item, i + 1, "gainer"))
                      ) : (
                        <div className="leaderboard-empty">{lang === "vi" ? "Không có mã tăng" : "No Gainers"}</div>
                      )}
                    </div>
                    <div className="leaderboard-column">
                      <div className="leaderboard-column-header losers" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="leaderboard-icon">🍂</span>
                        <span>{lang === "vi" ? "GIẢM" : "LOSERS"}</span>
                      </div>
                      {top5Losers.length > 0 ? (
                        top5Losers.map((item, i) => renderLeaderItem(item, i + 1, "loser"))
                      ) : (
                        <div className="leaderboard-empty">{lang === "vi" ? "Không có mã giảm" : "No Losers"}</div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {!loadingStocks && stockFilterTab === "gainers" && (
                renderStockTable(highlights?.gainers || [])
              )}

              {!loadingStocks && stockFilterTab === "losers" && (
                renderStockTable(highlights?.losers || [])
              )}

              {!loadingStocks && stockFilterTab === "volume" && (
                renderStockTable(highlights?.volume || [], true)
              )}
            </div>



            {/* Macro Economics Panel */}
            <div className={`widget-panel ${activeMobileTab === "markets" ? "" : "hidden-mobile"}`}>
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>
                  <img src="/icon/landmark-icon.png" className="header-3d-icon" alt="" />
                  {trans[lang].goldForex}
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
                {loadingMacro ? (
                  <>
                    <div className="skeleton-item" style={{ height: "30px" }}></div>
                    <div className="skeleton-item" style={{ height: "30px" }}></div>
                  </>
                ) : macroData ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed var(--border-classic)" }}>
                      <div>
                        <strong style={{ display: "block" }}>{lang === "vi" ? "Vàng SJC" : "SJC Gold Bar"}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {lang === "vi" ? "Đơn vị: Triệu đ/lượng" : "Unit: Million VND/Tael"}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", display: "block" }}>{macroData.goldSjc.buy} - {macroData.goldSjc.sell}</span>
                        <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0 }}>{macroData.goldSjc.change}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed var(--border-classic)" }}>
                      <div>
                        <strong style={{ display: "block" }}>{lang === "vi" ? "Vàng Nhẫn 9999" : "24K Gold Ring"}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {lang === "vi" ? "Đơn vị: Triệu đ/lượng" : "Unit: Million VND/Tael"}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", display: "block" }}>{macroData.goldRing.buy} - {macroData.goldRing.sell}</span>
                        <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0 }}>{macroData.goldRing.change}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ display: "block" }}>{lang === "vi" ? "Tỷ giá USD/VND" : "USD/VND Rate"}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {lang === "vi" ? "Nguồn: Vietcombank" : "Source: Vietcombank"}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", display: "block" }}>{macroData.usdRate.buy} - {macroData.usdRate.sell}</span>
                        <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0, color: "var(--success-green)" }}>{macroData.usdRate.change}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "right", marginTop: "4px" }}>
                      {lang === "vi" ? "Cập nhật" : "Updated"}: {macroData.updatedAt}
                    </div>
                  </>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    {lang === "vi" ? "Không tải được dữ liệu vĩ mô" : "Failed to load macro data"}
                  </div>
                )}
              </div>
            </div>

          </aside>

          {/* Mobile Podcast App Section */}
          {activeMobileTab === "podcast" && (
            <section className="mobile-podcast-app-section mobile-only">
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

              {/* Instagram-style circular channels */}
              <div className="mobile-podcast-channels-carousel">
                {channelsList.map((ch) => (
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
                      <img src={ch.logo} alt={ch.name} className="mobile-channel-bubble-avatar" />
                    </div>
                    <span className="mobile-channel-bubble-name">{ch.name}</span>
                  </button>
                ))}
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

              {/* Active Channel Intro Banner */}
              {selectedChannel !== "All" && (
                <div className="mobile-channel-intro-banner" style={{ borderLeft: `3px solid ${channelsList.find(c => c.id === selectedChannel)?.color || 'var(--accent-blue)'}` }}>
                  <h4>{selectedChannel}</h4>
                  <p>{channelsList.find(c => c.id === selectedChannel)?.desc}</p>
                </div>
              )}

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
                        key={track.id}
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

        </div>
      </main>

      {/* Footer */}
      <footer className="ft-footer">
        <p>{trans[lang].footerText}</p>
      </footer>

      {/* Reader Mode Modal */}
      {activeArticle && (
        <div className="reader-modal-overlay" onClick={() => setActiveArticle(null)}>
          <div className="reader-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="reader-modal-header">
              <span className="reader-modal-source">{activeArticle.source}</span>
              <button className="reader-modal-close" onClick={() => setActiveArticle(null)}>
                {lang === "vi" ? "ĐÓNG [✕]" : "CLOSE [✕]"}
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

      {/* Floating Bottom Tab Bar for Mobile Devices (Apple Style) */}
      {/* ═══════════════════════════════════════════════════════
          DESKTOP PODCAST APP MODAL OVERLAY
          ═══════════════════════════════════════════════════════ */}
      {isPodcastExpanded && (
        <div className="podcast-modal-overlay" onClick={() => setIsPodcastExpanded(false)}>
          <div className="podcast-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="podcast-modal-header">
              <h2>
                <img src="/icon/headphone-icon.png" className="header-3d-icon" alt="" />
                {trans[lang].audioNews}
              </h2>
              <button className="podcast-modal-close-btn" onClick={() => setIsPodcastExpanded(false)} title="Đóng | Close">
                <CloseIcon size={16} />
              </button>
            </div>
            {/* Modal Body */}
            <div className="podcast-modal-body">
              {/* Sidebar Channels */}
              <div className="podcast-modal-sidebar">
                {channelsList.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => { setSelectedChannel(ch.id); setSelectedSubChannel("All"); setCurrentTrackIndex(0); }}
                    className={`podcast-modal-sidebar-btn ${selectedChannel === ch.id ? "active" : ""}`}
                    style={{ '--channel-color': ch.color } as React.CSSProperties}
                  >
                    <img src={ch.logo} alt={ch.name} />
                    {ch.name}
                  </button>
                ))}
              </div>
              {/* Main Panel */}
              <div className="podcast-modal-main">
                <div className="podcast-modal-main-top">
                  <div className="podcast-modal-channel-banner">
                    {(() => { const ch = channelsList.find(c => c.id === selectedChannel); return ch ? (<><img src={ch.logo} alt={ch.name} /><div className="podcast-modal-channel-info"><h3>{ch.name}</h3><p>{ch.desc}</p></div></>) : null; })()}
                  </div>
                  <div className="podcast-modal-search-row">
                    <input type="text" placeholder={lang === "vi" ? "Tìm tập podcast..." : "Search episodes..."} value={podcastSearchQuery} onChange={(e) => setPodcastSearchQuery(e.target.value)} className="podcast-modal-search-input" />
                  </div>
                  {subChannelsList.length > 1 && (
                    <div className="podcast-modal-subchannel-pills">
                      {subChannelsList.map((sc) => (
                        <button key={sc} onClick={() => { setSelectedSubChannel(sc); setCurrentTrackIndex(0); }} className={`podcast-modal-subchannel-pill ${selectedSubChannel === sc ? "active" : ""}`}>
                          {sc === "All" ? (lang === "vi" ? "Tất cả" : "All") : sc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="podcast-modal-tracks-list">
                  {filteredPlaylist.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
                      {lang === "vi" ? "Không tìm thấy tập podcast." : "No episodes found."}
                    </div>
                  ) : filteredPlaylist.map((track, index) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div key={track.id} className={`podcast-modal-track-row ${isCurrent ? "active" : ""}`} onClick={() => selectTrack(index)}>
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
                <button onClick={togglePlayPause} className="podcast-modal-ctrl-btn play-btn">{isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}</button>
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
      {shouldShowFloatingMiniPlayer && (
        <div
          className="mobile-mini-player"
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
      )}

      {shouldShowMiniRevealTab && (
        <button
          className="mobile-mini-reveal-tab"
          onClick={() => setIsMobileMiniHidden(false)}
          onTouchStart={startRevealTabSwipe}
          onTouchEnd={endRevealTabSwipe}
          title={lang === "vi" ? "Kéo sang trái để mở trình phát" : "Swipe left to reveal player"}
        >
          <span className="mobile-mini-reveal-arrow">‹</span>
          <img src={currentTrack.coverUrl} alt="" />
        </button>
      )}

      {isMobilePlayerOpen && currentTrack && (
        <div className="mobile-player-sheet-overlay mobile-only" onClick={() => setIsMobilePlayerOpen(false)}>
          <div className="mobile-player-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="mobile-player-sheet-close" onClick={() => setIsMobilePlayerOpen(false)}>×</button>
            <div className="mobile-player-grabber"></div>
            <div className={`mobile-player-art-stage ${isPlaying ? "playing" : ""}`}>
              <img src={currentTrack.coverUrl} alt="" className="mobile-player-art" />
              <span className="mobile-player-art-glow"></span>
            </div>
            <div className="mobile-player-track-row">
              <div>
                <span className="mobile-player-kicker">{currentTrack.sourceName} • {currentTrack.artist}</span>
                <h3>{getTrackTitle(currentTrack)}</h3>
              </div>
              <button className="mobile-player-more-btn">•••</button>
            </div>
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
              <button onClick={togglePlayPause} className="mobile-player-control-btn center-btn">
                {isPlaying ? <PauseIcon size={40} /> : <PlayIcon size={40} />}
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
