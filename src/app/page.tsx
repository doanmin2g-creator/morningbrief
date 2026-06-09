"use client";

import { useEffect, useState, useRef } from "react";

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

export default function Home() {
  const [dateText, setDateText] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [tickerList, setTickerList] = useState<TickerItem[]>([]);
  const [brokerOutlooks, setBrokerOutlooks] = useState<BrokerOutlook[]>(initialBrokerOutlooks);
  const [errorMsg, setErrorMsg] = useState("");
  const [visibleNewsCount, setVisibleNewsCount] = useState(8);
  const [selectedChartIndex, setSelectedChartIndex] = useState("VN-Index");
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; index: number; x: number; y: number } | null>(null);
  const [isChartTransitioning, setIsChartTransitioning] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [macroData, setMacroData] = useState<any>(null);
  const [loadingMacro, setLoadingMacro] = useState(true);
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
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
  
  // Stock list highlight filter
  const [stockFilterTab, setStockFilterTab] = useState<"all" | "gainers" | "losers">("all");

  // Stock Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format Date in traditional FT format (Vietnamese Locale)
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    setDateText(new Date().toLocaleDateString("vi-VN", options));
  }, []);

  // Fetch Vietnamese Stocks
  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      const res = await fetch("/api/stocks");
      if (!res.ok) throw new Error("Failed to fetch stock data");
      const data = await res.json();
      setTickerList(data);
    } catch (error) {
      console.error(error);
      setErrorMsg("Unable to retrieve stock data");
    } finally {
      setLoadingStocks(false);
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
    setCurrentTrackIndex((prev) => (prev + 1) % podcastPlaylist.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + podcastPlaylist.length) % podcastPlaylist.length);
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
  }, [currentTrackIndex]);

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

  return (
    <div className="app-container">
      {/* Floating Header/Masthead */}
      <header className="masthead">
        <div className="masthead-top">
          <div className="date-badge">{dateText || "Đang tải ngày..."}</div>
          <div className="logo">
            <h1>THE MORNING BRIEF</h1>
          </div>
          <div className="user-profile" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
              title={isPlaying ? "Dừng phát Podcast" : "Nghe Podcast Bản tin"}
            >
              <span>{isPlaying ? "■ Dừng nghe" : "🔊 Nghe Podcast"}</span>
            </button>
            <div className="avatar" onClick={fetchStocks} title="Tải lại dữ liệu">↻</div>
          </div>
        </div>

        {/* Animated Market Ticker Banner */}
        <div className="ticker-wrap">
          <div className="ticker-label">THỊ TRƯỜNG VN</div>
          <div className={`ticker-scroll ${loadingStocks ? "loading" : ""}`}>
            {loadingStocks ? (
              <div className="ticker-item-placeholder">Đang tải dữ liệu thị trường...</div>
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

      {/* Main Content Area */}
      <main className="main-content">
        <div className="broadsheet-grid">
          
          {/* Left Column: Lead Stories (News Feed) */}
          <section className="news-section">
            <div className="column-header">
              <h2>Tin nổi bật & Phân tích</h2>
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "general" ? "active" : ""}`}
                  onClick={() => setActiveTab("general")}
                >
                  Tiêu điểm
                </button>
                <button
                  className={`tab ${activeTab === "business" ? "active" : ""}`}
                  onClick={() => setActiveTab("business")}
                >
                  Kinh Doanh
                </button>
                <button
                  className={`tab ${activeTab === "tech" ? "active" : ""}`}
                  onClick={() => setActiveTab("tech")}
                >
                  Số Hóa
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
                      className="see-more-btn"
                      onClick={() => setVisibleNewsCount(prev => prev + 6)}
                    >
                      Xem thêm tin cũ hơn
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Right Column: Market Intelligence & Institutional Consensus */}
          <aside className="sidebar-section">
            
            {/* Audio tag for podcast streaming */}
            <audio
              ref={audioRef}
              src={podcastPlaylist[currentTrackIndex].audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleTrackEnded}
            />

            {/* Spotify-style Podcast Player */}
            <div className="widget-panel podcast-player-card">
              <div className="widget-header" style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                  <span style={{ marginRight: "6px" }}>🎙️</span>Bản Tin Âm Thanh
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {loadingPodcast && <span className="podcast-live-dot"></span>}
                  <span className="podcast-source-tag">{podcastPlaylist[currentTrackIndex]?.sourceName || podcastSource}</span>
                </div>
              </div>
              
              <div className="podcast-player-body">
                <div className="podcast-cover-section">
                  <div className={`podcast-cover-wrap ${isPlaying ? "spinning" : ""}`}>
                    <img 
                      src={podcastPlaylist[currentTrackIndex].coverUrl} 
                      alt={podcastPlaylist[currentTrackIndex].title} 
                      className="podcast-cover-image"
                    />
                    <div className="podcast-cover-center"></div>
                  </div>
                  <div className="podcast-track-details">
                    <div className="podcast-track-title-container">
                      <div className={`podcast-track-title ${isPlaying ? "marquee-text" : ""}`}>
                        {podcastPlaylist[currentTrackIndex].title}
                      </div>
                    </div>
                    <div className="podcast-track-artist">
                      {podcastPlaylist[currentTrackIndex].artist}
                    </div>
                  </div>
                </div>

                <p className="podcast-track-desc">
                  {podcastPlaylist[currentTrackIndex].description}
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
                  <button onClick={handlePrevTrack} className="podcast-control-btn" title="Tập trước">
                    ⏮
                  </button>
                  <button onClick={togglePlayPause} className="podcast-control-btn play-btn" title={isPlaying ? "Tạm dừng" : "Phát"}>
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                  <button onClick={handleNextTrack} className="podcast-control-btn" title="Tập tiếp theo">
                    ⏭
                  </button>
                  <button 
                    onClick={() => setShowPlaylist(!showPlaylist)} 
                    className={`podcast-control-btn list-btn ${showPlaylist ? "active" : ""}`}
                    title="Danh sách tập"
                  >
                    ☰
                  </button>
                </div>

                {/* Playlist Drawer (Slide Down) */}
                {showPlaylist && (
                  <div className="podcast-playlist-drawer">
                    <h4 className="playlist-drawer-title">Danh sách phát</h4>
                    <div className="playlist-drawer-items">
                      {podcastPlaylist.map((track, index) => (
                        <div 
                          key={track.id} 
                          onClick={() => selectTrack(index)} 
                          className={`playlist-item ${currentTrackIndex === index ? "active" : ""}`}
                        >
                          <div className="playlist-item-index">{index + 1}</div>
                          <div className="playlist-item-details">
                            <div className="playlist-item-title">{track.title}</div>
                            <div className="playlist-item-meta">{track.sourceName} • {track.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic AI Analysis Panel (VN Broad Market Perspective) */}
            <div className="widget-panel" style={{ borderLeft: "4px solid var(--accent-red)", background: "var(--bg-paper-darker)" }}>
              <div className="widget-header" style={{ marginBottom: "0.75rem" }}>
                <h3 style={{ textTransform: "uppercase", fontSize: "0.9rem", letterSpacing: "1px", color: "var(--accent-red)", fontFamily: "var(--font-sans)" }}>
                  Báo cáo Thị trường Buổi sáng
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Độ rộng thị trường chung:
                  </strong>
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "0.85rem", fontWeight: "700" }}>
                    <span className="ticker-change positive" style={{ padding: "2px 8px", borderRadius: "4px" }}>
                      Tăng: {analysis.advancing}
                    </span>
                    <span className="ticker-change negative" style={{ padding: "2px 8px", borderRadius: "4px" }}>
                      Giảm: {analysis.declining}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: "600", display: "inline-block", marginTop: "6px", color: "var(--text-secondary)" }}>
                    Khái quát chung: {analysis.sentiment}
                  </span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Chủ đề chính trong ngày:
                  </strong>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: "700", display: "block", marginTop: "2px" }}>
                    {analysis.theme}
                  </span>
                </div>
                <hr style={{ border: "none", borderTop: "1px dashed var(--border-classic)", margin: "4px 0" }} />
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>
                    Báo cáo nhanh:
                  </strong>
                  <p style={{ lineHeight: "1.5", fontSize: "0.88rem", fontStyle: "italic", fontFamily: "var(--font-serif)", color: "var(--text-secondary)" }}>
                    "{analysis.summary}"
                  </p>
                </div>
              </div>
            </div>

            {/* Market Trend Chart Panel */}
            <div className="widget-panel">
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>Xu hướng Chỉ số</h3>
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
                        Không có dữ liệu xu hướng cho {selectedChartIndex}
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
                  const displayDate = hoveredPoint ? `Phiên ${dates[hoveredPoint.index]}` : `Giá hiện tại`;
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
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>Xu hướng 10N</span>
                          <span className={`ticker-change ${trendColorClass}`} style={{ background: "transparent", padding: 0, fontWeight: "700", fontSize: "0.85rem", marginTop: "2px" }}>
                            {trendSign}{netPct.toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-classic)", paddingLeft: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>Đỉnh - Đáy (10N)</span>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.85rem", marginTop: "2px" }}>
                            {max.toFixed(0)} - {min.toFixed(0)}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-classic)", paddingLeft: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>Biến động 10N</span>
                          <span style={{ fontWeight: "700", color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
                            {rangeValue.toFixed(1)} điểm
                          </span>
                        </div>
                      </div>

                      {/* Expert Analysis & Forecast */}
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--border-classic)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div>
                          <span style={{ color: "var(--accent-red)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "700", display: "block", letterSpacing: "0.5px", marginBottom: "3px" }}>
                            Nhận định chuyên gia • {indexAnalyses[selectedChartIndex]?.expert}
                          </span>
                          <p style={{ lineHeight: "1.45", color: "var(--text-secondary)", fontStyle: "italic", fontFamily: "var(--font-serif)", fontSize: "0.82rem" }}>
                            "{indexAnalyses[selectedChartIndex]?.analysis}"
                          </p>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "700", display: "block", letterSpacing: "0.5px", marginBottom: "2px" }}>
                            Dự đoán tương lai
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

            {/* Market Indexes Panel */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>Chỉ số Thị trường</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loadingStocks ? (
                  <>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                  </>
                ) : (
                  tickerList.filter(item => item.sector === "Chỉ số").map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: idx < tickerList.filter(i => i.sector === "Chỉ số").length - 1 ? "1px dashed var(--border-classic)" : "none" }}>
                      <div className="crypto-info">
                        <h4 style={{ fontSize: "0.88rem", fontWeight: "600" }}>{item.symbol}</h4>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "500" }}>{item.ticker.startsWith("^") ? "Dữ liệu Yahoo Finance" : "Dữ liệu Entrade API"}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <h4 style={{ fontSize: "0.88rem", fontWeight: "700" }}>{item.price}</h4>
                        <span className={`ticker-change ${getStockColorClass(item)}`} style={{ fontSize: "0.78rem" }}>
                          {item.change}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Broker Stance Panel: Stated bullish/bearish/neutral from securities firms */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>Đồng thuận Thị trường Định chế</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {brokerOutlooks.map((broker, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "10px", borderBottom: idx < brokerOutlooks.length - 1 ? "1px dashed var(--border-classic)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{broker.name}</strong>
                      <span className={`ticker-change ${broker.class}`} style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        {broker.stance === "BULLISH" ? "TÍCH CỰC" : broker.stance === "BEARISH" ? "THẬN TRỌNG" : "TRUNG LẬP"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                      Vùng điểm kỳ vọng: {broker.targetRange}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: "1.4" }}>
                      "{broker.quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Watchlist Panel */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>Danh mục Theo dõi (Watchlist)</h3>
              </div>
              <div className="crypto-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {watchlist.length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
                    Nhấp chọn biểu tượng ngôi sao bên cạnh các mã ở "Điểm nhấn Thị trường" bên dưới để ghim vào đây.
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
                            ★
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

            {/* Top VN Stocks List (Điểm nhấn Thị trường) */}
            <div className="widget-panel">
              <div className="widget-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Điểm nhấn Thị trường</h3>
                
                {/* Sub-tabs for Market Highlights */}
                <div className="tabs" style={{ padding: "2px", borderRadius: "20px" }}>
                  <button
                    className={`tab ${stockFilterTab === "all" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("all")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    Tất cả
                  </button>
                  <button
                    className={`tab ${stockFilterTab === "gainers" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("gainers")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    Tăng mạnh
                  </button>
                  <button
                    className={`tab ${stockFilterTab === "losers" ? "active" : ""}`}
                    onClick={() => setStockFilterTab("losers")}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
                  >
                    Giảm mạnh
                  </button>
                </div>
              </div>

              {/* === TOP 5 GAINERS & LOSERS LEADERBOARD === */}
              {!loadingStocks && stockFilterTab === "all" && (() => {
                const stocksOnly = tickerList.filter(item => item.sector !== "Chỉ số");
                const parseChangePercent = (s: string) => { try { return parseFloat(s.replace("%", "")); } catch { return 0; } };
                const sorted = [...stocksOnly].sort((a, b) => parseChangePercent(b.change) - parseChangePercent(a.change));
                const top5Gainers = sorted.filter(s => parseChangePercent(s.change) > 0).slice(0, 5);
                const top5Losers = sorted.filter(s => parseChangePercent(s.change) < 0).reverse().slice(0, 5);

                const renderLeaderItem = (item: TickerItem, rank: number, type: "gainer" | "loser") => {
                  const code = item.symbol.split(" ")[0];
                  const exTag = item.exchange ? ` ${item.exchange}` : "";
                  const colorClass = getStockColorClass(item);
                  return (
                    <div key={code} className={`leaderboard-item ${type}`}>
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
                      <div className="leaderboard-column-header gainer">
                        <span className="leaderboard-icon">🔺</span>
                        <span>Top 5 Tăng mạnh nhất</span>
                      </div>
                      {top5Gainers.length > 0 ? (
                        top5Gainers.map((item, i) => renderLeaderItem(item, i + 1, "gainer"))
                      ) : (
                        <div className="leaderboard-empty">Không có mã tăng</div>
                      )}
                    </div>
                    <div className="leaderboard-column">
                      <div className="leaderboard-column-header loser">
                        <span className="leaderboard-icon">🔻</span>
                        <span>Top 5 Giảm mạnh nhất</span>
                      </div>
                      {top5Losers.length > 0 ? (
                        top5Losers.map((item, i) => renderLeaderItem(item, i + 1, "loser"))
                      ) : (
                        <div className="leaderboard-empty">Không có mã giảm</div>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* === STOCK SEARCH BOX === */}
              <div style={{ borderTop: "1px dashed var(--border-classic)", margin: "12px 0 8px 0", paddingTop: "12px" }}>
                <div className="stock-search-box">
                  <div className="stock-search-input-wrap">
                    <span className="stock-search-icon">🔍</span>
                    <input
                      type="text"
                      className="stock-search-input"
                      placeholder="Nhập mã CK hoặc tên công ty (VD: VCB, Vinamilk...)"
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        setSearchError("");

                        // Debounced search
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
                                setSearchError("Không tìm thấy mã chứng khoán phù hợp.");
                              }
                            } else {
                              setSearchError("Lỗi khi tra cứu.");
                            }
                          } catch {
                            setSearchError("Không thể kết nối máy chủ.");
                          } finally {
                            setSearchLoading(false);
                          }
                        }, 500);
                      }}
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
                      <span className="podcast-live-dot"></span> Đang tra cứu...
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
                    <div className="stock-search-results">
                      {searchResults.map((item, idx) => {
                        const pct = parseFloat(item.change.replace("%", ""));
                        let colorClass = item.isPositive ? "positive" : "negative";
                        const ex = item.exchange || "HOSE";
                        if (ex === "HOSE" && Math.abs(pct) >= 6.85) colorClass = pct > 0 ? "ceiling" : "floor";
                        else if (ex === "HNX" && Math.abs(pct) >= 9.85) colorClass = pct > 0 ? "ceiling" : "floor";
                        else if (ex === "UPCoM" && Math.abs(pct) >= 14.85) colorClass = pct > 0 ? "ceiling" : "floor";

                        const isStarred = watchlist.includes(item.symbol);

                        return (
                          <div key={idx} className="stock-search-result-card">
                            <div className="stock-search-result-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  onClick={() => toggleWatchlist(item.symbol)}
                                  style={{ color: isStarred ? "var(--accent-red)" : "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}
                                >
                                  {isStarred ? "★" : "☆"}
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
                                <span className="stock-detail-label">TC hôm trước</span>
                                <span className="stock-detail-value">{item.prevClose}</span>
                              </div>
                              <div className="stock-search-detail">
                                <span className="stock-detail-label">Cao nhất</span>
                                <span className="stock-detail-value">{item.dayHigh}</span>
                              </div>
                              <div className="stock-search-detail">
                                <span className="stock-detail-label">Thấp nhất</span>
                                <span className="stock-detail-value">{item.dayLow}</span>
                              </div>
                              <div className="stock-search-detail">
                                <span className="stock-detail-label">Khối lượng</span>
                                <span className="stock-detail-value">{item.volume}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state hint */}
                  {!searchLoading && searchResults.length === 0 && !searchError && !searchQuery && (
                    <div className="stock-search-hint">
                      <p>💡 Tra cứu bất kỳ mã chứng khoán Việt Nam nào</p>
                      <div className="stock-search-hint-tags">
                        {["VCB", "FPT", "VNM", "HPG", "MWG", "NVL"].map(tag => (
                          <button
                            key={tag}
                            className="stock-search-hint-tag"
                            onClick={() => {
                              setSearchQuery(tag);
                              setSearchLoading(true);
                              fetch(`/api/stock-search?q=${tag}`)
                                .then(r => r.json())
                                .then(d => { setSearchResults(Array.isArray(d) ? d : []); })
                                .catch(() => setSearchError("Lỗi kết nối."))
                                .finally(() => setSearchLoading(false));
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Macro Economics Panel */}
            <div className="widget-panel">
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>Giá Vàng & Tỷ Giá USD</h3>
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
                        <strong style={{ display: "block" }}>Vàng SJC (Miếng)</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Đơn vị: Triệu đ/lượng</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", display: "block" }}>{macroData.goldSjc.buy} - {macroData.goldSjc.sell}</span>
                        <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0 }}>{macroData.goldSjc.change}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed var(--border-classic)" }}>
                      <div>
                        <strong style={{ display: "block" }}>Vàng Nhẫn 9999</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Đơn vị: Triệu đ/lượng</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", display: "block" }}>{macroData.goldRing.buy} - {macroData.goldRing.sell}</span>
                        <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0 }}>{macroData.goldRing.change}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ display: "block" }}>Tỷ giá USD/VND</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Nguồn: Vietcombank</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", display: "block" }}>{macroData.usdRate.buy} - {macroData.usdRate.sell}</span>
                        <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0, color: "var(--success-green)" }}>{macroData.usdRate.change}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "right", marginTop: "4px" }}>
                      Cập nhật: {macroData.updatedAt}
                    </div>
                  </>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Không tải được dữ liệu vĩ mô</div>
                )}
              </div>
            </div>

            {/* Economic Calendar Panel (Interactive click-to-read) */}
            <div className="widget-panel">
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>Sự Kiện Tài Chính Sắp Tới</h3>
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
                          Mức độ: {item.impact}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>• Nguồn: {item.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>
      </main>

      {/* Footer */}
      <footer className="ft-footer">
        <p>© 2026 THE MORNING BRIEF. Thiết kế theo phong cách báo giấy hiện đại của FT.</p>
      </footer>

      {/* Reader Mode Modal */}
      {activeArticle && (
        <div className="reader-modal-overlay" onClick={() => setActiveArticle(null)}>
          <div className="reader-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="reader-modal-header">
              <span className="reader-modal-source">{activeArticle.source}</span>
              <button className="reader-modal-close" onClick={() => setActiveArticle(null)}>ĐÓNG [X]</button>
            </div>
            <div className="reader-modal-body">
              <h2 className="reader-modal-title">{activeArticle.title}</h2>
              <div className="reader-modal-meta">Đăng ngày {activeArticle.time}</div>
              
              <div className="reader-modal-text">
                {generateMockArticleBody(activeArticle).map((para, i) => (
                  <p key={i} className={i === 0 ? "reader-body-lead" : "reader-body-para"}>
                    {para}
                  </p>
                ))}
              </div>
              
              <div style={{ marginTop: "30px", display: "flex", justifyContent: "center" }}>
                <a 
                  href={activeArticle.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="see-more-btn"
                  style={{ margin: 0, textTransform: "none", fontSize: "0.82rem" }}
                >
                  Đọc bài viết gốc tại {activeArticle.source} ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
