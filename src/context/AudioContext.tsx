"use client";
import React, { createContext, useContext, useState, useRef, useMemo, useEffect, ReactNode } from 'react';
import { PodcastTrack, fallbackPlaylist } from '../data/podcastData';

interface AudioContextProps {
  podcastPlaylist: PodcastTrack[];
  setPodcastPlaylist: (p: PodcastTrack[]) => void;
  loadingPodcast: boolean;
  setLoadingPodcast: (l: boolean) => void;
  currentTrackIndex: number;
  setCurrentTrackIndex: (i: number) => void;
  currentTrackId: number | null;
  setCurrentTrackId: (id: number | null) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  selectedChannel: string;
  setSelectedChannel: (c: string) => void;
  selectedSubChannel: string;
  setSelectedSubChannel: (c: string) => void;
  podcastSearchQuery: string;
  setPodcastSearchQuery: (q: string) => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  isPodcastExpanded: boolean;
  showPlaylist: boolean;
  setShowPlaylist: (s: boolean) => void;
  handleSeekChange: (e: any) => void;
  setIsPodcastExpanded: (e: boolean) => void;
  isPodcastClosing: boolean;
  setIsPodcastClosing: (c: boolean) => void;
  isMobilePlaylistOpen: boolean;
  setIsMobilePlaylistOpen: (o: boolean) => void;
  isMobileMiniHidden: boolean;
  setIsMobileMiniHidden: (h: boolean) => void;
  isMobilePlayerOpen: boolean;
  setIsMobilePlayerOpen: (o: boolean) => void;
  isMobilePlayerClosing: boolean;
  setIsMobilePlayerClosing: (c: boolean) => void;
  isAudioInfoOpen: boolean;
  setIsAudioInfoOpen: (o: boolean) => void;
  artSwipeMotion: "next" | "prev" | null;
  setArtSwipeMotion: (m: "next" | "prev" | null) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTrack: PodcastTrack;
  filteredPlaylist: PodcastTrack[];
  channelsList: any[];
  subChannelsList: string[];
  togglePlayPause: () => void;
  playTrack: (track: PodcastTrack) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  closePodcastExpanded: () => void;
  openMobilePlayer: () => void;
  closeMobilePlayer: () => void;
}

const AudioContext = createContext<AudioContextProps | undefined>(undefined);

export function AudioProvider({ children, lang }: { children: ReactNode, lang: string }) {
  const [podcastPlaylist, setPodcastPlaylist] = useState<PodcastTrack[]>(fallbackPlaylist);
  const [loadingPodcast, setLoadingPodcast] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<string>("All");
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>("All");
  const [podcastSearchQuery, setPodcastSearchQuery] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isPodcastExpanded, setIsPodcastExpanded] = useState<boolean>(false);
  const [isPodcastClosing, setIsPodcastClosing] = useState<boolean>(false);
  const [isMobilePlaylistOpen, setIsMobilePlaylistOpen] = useState<boolean>(false);
  const [isMobileMiniHidden, setIsMobileMiniHidden] = useState(true);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [isMobilePlayerClosing, setIsMobilePlayerClosing] = useState(false);
  const [isAudioInfoOpen, setIsAudioInfoOpen] = useState(false);
  const [artSwipeMotion, setArtSwipeMotion] = useState<"next" | "prev" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const allTracks = podcastPlaylist.length > 0 ? podcastPlaylist : fallbackPlaylist;
    if (currentTrackId !== null) {
      const match = allTracks.find((track) => track.id === currentTrackId);
      if (match) return match;
    }
    return allTracks[currentTrackIndex] || allTracks[0] || fallbackPlaylist[0];
  }, [currentTrackId, currentTrackIndex, podcastPlaylist]);

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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentTrack, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Playback error:", e));
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingPodcast(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsMobileMiniHidden(false);
      setIsPlaying(true);
      audioRef.current.play().catch(e => {
        console.error(e);
        setIsPlaying(false);
      });
    }
  };

  const playTrack = (track: PodcastTrack) => {
    setCurrentTrackId(track.id);
    setIsMobileMiniHidden(false);
    setIsPlaying(true);
  };

  const nextTrack = () => {
    setArtSwipeMotion("next");
    setTimeout(() => setArtSwipeMotion(null), 400);
    let nextIdx = filteredPlaylist.findIndex(t => t.id === currentTrackId) + 1;
    if (nextIdx >= filteredPlaylist.length) nextIdx = 0;
    setCurrentTrackId(filteredPlaylist[nextIdx].id);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setArtSwipeMotion("prev");
    setTimeout(() => setArtSwipeMotion(null), 400);
    let prevIdx = filteredPlaylist.findIndex(t => t.id === currentTrackId) - 1;
    if (prevIdx < 0) prevIdx = filteredPlaylist.length - 1;
    setCurrentTrackId(filteredPlaylist[prevIdx].id);
    setIsPlaying(true);
  };

  const closePodcastExpanded = () => {
    setIsPodcastClosing(true);
    setTimeout(() => {
      setIsPodcastExpanded(false);
      setIsPodcastClosing(false);
    }, 350);
  };

  const openMobilePlayer = () => {
    setIsMobileMiniHidden(false);
    setIsMobilePlayerClosing(false);
    setIsMobilePlayerOpen(true);
  };

  const closeMobilePlayer = () => {
    setIsMobilePlayerClosing(true);
    setTimeout(() => {
      setIsMobilePlayerOpen(false);
      setIsMobilePlayerClosing(false);
    }, 420);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeekChange = (e: any) => { if (!audioRef.current) return; const newTime = parseFloat(e.target.value); audioRef.current.currentTime = newTime; setCurrentTime(newTime); };

  const handleTrackEnded = () => {
    nextTrack();
  };

  return (
    <AudioContext.Provider value={{
      podcastPlaylist, setPodcastPlaylist,
      loadingPodcast, setLoadingPodcast,
      currentTrackIndex, setCurrentTrackIndex,
      currentTrackId, setCurrentTrackId,
      isPlaying, setIsPlaying,
      currentTime, setCurrentTime,
      duration, setDuration,
      selectedChannel, setSelectedChannel,
      selectedSubChannel, setSelectedSubChannel,
      podcastSearchQuery, setPodcastSearchQuery,
      playbackRate, setPlaybackRate,
      volume, setVolume,
      isPodcastExpanded, setIsPodcastExpanded,
      showPlaylist, setShowPlaylist,
      handleSeekChange,
      isPodcastClosing, setIsPodcastClosing,
      isMobilePlaylistOpen, setIsMobilePlaylistOpen,
      isMobileMiniHidden, setIsMobileMiniHidden,
      isMobilePlayerOpen, setIsMobilePlayerOpen,
      isMobilePlayerClosing, setIsMobilePlayerClosing,
      isAudioInfoOpen, setIsAudioInfoOpen,
      artSwipeMotion, setArtSwipeMotion,
      audioRef,
      currentTrack,
      filteredPlaylist,
      channelsList,
      subChannelsList,
      togglePlayPause,
      playTrack,
      nextTrack,
      prevTrack,
      closePodcastExpanded,
      openMobilePlayer,
      closeMobilePlayer,
    }}>
      {children}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnded}
      />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
