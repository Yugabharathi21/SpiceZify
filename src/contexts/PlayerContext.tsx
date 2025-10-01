import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import YouTubePlayer from '../components/Player/YouTubePlayer';
import { queueService, QueueItem, Queue } from '../services/queueService';
import { YouTubeService } from '../services/youtubeService';

// Updated Song interface to match QueueItem
interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  channelTitle?: string;
  isVerified?: boolean;
  streamUrl?: string;
}

export interface PlayerContextType {
  // Current playback state
  currentSong: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  
  // Queue state
  queue: Queue;
  upcomingCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  queueDuration: string;
  
  // Control methods
  playSong: (song: Song, addRelated?: boolean) => Promise<void>;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  previousSong: () => void;
  
  // Queue management
  addToQueue: (song: Song, position?: 'next' | 'end') => Promise<void>;
  removeFromQueue: (songId: string) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  
  // Settings
  setVolume: (volume: number) => void;
  setAutoPlay: (enabled: boolean) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  
  // Playback control
  seekTo: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const PlayerContext = createContext<PlayerContextType | undefined>(undefined);



interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  // Core playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDurationState] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  
  // Queue state from service
  const [queue, setQueue] = useState<Queue>(queueService.getQueue());
  
  // Optimization state
  const [prefetchEnabled] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map());
  
  // Prefetch next songs for faster transitions
  const prefetchNextSongs = useCallback(async () => {
    if (!prefetchEnabled || !queue.current) return;
    
    const nextSongs = queue.upcoming.slice(0, 2); // Prefetch next 2 songs
    
    for (const song of nextSongs) {
      if (!loadingStates.get(song.id)) {
        console.log(`🚀 Starting prefetch for: ${song.title}`);
        setLoadingStates(prev => new Map(prev).set(song.id, true));
        
        try {
          // Prefetch audio details to warm up the cache
          await YouTubeService.getVideoDetails(song.youtubeId);
          console.log(`✅ Prefetched: ${song.title}`);
        } catch (error) {
          console.warn(`⚠️ Failed to prefetch ${song.title}:`, error);
        } finally {
          setLoadingStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(song.id);
            return newMap;
          });
        }
      }
    }
  }, [prefetchEnabled, queue, loadingStates]);
  
  // Subscribe to queue changes with prefetching
  useEffect(() => {
    const unsubscribe = queueService.subscribe((newQueue: Queue) => {
      setQueue(newQueue);
      
      // If a new song is set as current, start playing
      if (newQueue.current && (!queue.current || newQueue.current.id !== queue.current.id)) {
        setIsPlaying(true);
        setCurrentTimeState(0);
        setSeekTime(0);
        
        // Start prefetching next songs
        setTimeout(() => prefetchNextSongs(), 1000); // Delay to not interfere with current playback
      }
    });
    
    return unsubscribe;
  }, [queue, prefetchNextSongs]);

  // Convert Song to QueueItem
  const songToQueueItem = (song: Song): QueueItem => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    duration: song.duration,
    youtubeId: song.youtubeId,
    channelTitle: song.channelTitle || 'Unknown Channel',
    isVerified: song.isVerified || false,
    streamUrl: song.streamUrl || `http://localhost:3001/api/youtube/audio/${song.youtubeId}`,
    addedAt: Date.now()
  });

  // Play a song and optionally add related songs
  const playSong = useCallback(async (song: Song, addRelated: boolean = true) => {
    try {
      console.log(`🎵 Playing: ${song.title} by ${song.artist}`);
      const startTime = performance.now();
      
      const queueItem = songToQueueItem(song);
      
      // Prefetch video details for better performance
      const detailsPromise = YouTubeService.getVideoDetails(song.youtubeId).catch(() => null);
      
      // Play the song
      await queueService.playSong(queueItem, addRelated);
      
      // Wait for details and use them if available
      const details = await detailsPromise;
      if (details) {
        console.log(`🔍 Enhanced details loaded for ${song.title}`);
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`⚡ Song loaded in ${totalTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Failed to play song:', error);
      // Could show user notification here
    }
  }, []);

  // Playback controls
  const pauseSong = () => {
    setIsPlaying(false);
  };

  const resumeSong = () => {
    setIsPlaying(true);
  };

  const nextSong = useCallback(() => {
    console.log('⏭ Fast forward to next song');
    const nextSongData = queueService.playNext();
    if (nextSongData) {
      setCurrentTimeState(0);
      setSeekTime(0);
      // Trigger prefetch for the new upcoming songs
      setTimeout(() => prefetchNextSongs(), 500);
    } else {
      console.log('🔚 End of queue reached');
      setIsPlaying(false);
    }
  }, [prefetchNextSongs]);

  const previousSong = useCallback(() => {
    console.log('⏮ Rewinding to previous song');
    // If more than 3 seconds have passed, restart current song
    if (currentTime > 3) {
      setCurrentTimeState(0);
      setSeekTime(0);
      return;
    }

    const prevSongData = queueService.playPrevious();
    if (prevSongData) {
      setCurrentTimeState(0);
      setSeekTime(0);
    }
  }, [currentTime]);

  // Queue management
  const addToQueue = async (song: Song, position: 'next' | 'end' = 'end') => {
    const queueItem = songToQueueItem(song);
    await queueService.addToQueue(queueItem, position);
  };

  const removeFromQueue = (songId: string) => {
    queueService.removeSong(songId);
  };

  const clearQueue = () => {
    queueService.clearQueue();
    setIsPlaying(false);
  };

  const shuffleQueue = () => {
    queueService.shuffleQueue();
  };

  // Settings
  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  };

  const setAutoPlay = (enabled: boolean) => {
    queueService.setAutoPlay(enabled);
  };

  const setRepeatMode = (mode: 'none' | 'one' | 'all') => {
    queueService.setRepeatMode(mode);
  };

  // Playback control
  const setCurrentTime = (time: number) => {
    const newTime = Math.max(0, Math.min(duration, time));
    setCurrentTimeState(newTime);
    setSeekTime(newTime);
  };

  const setDuration = (newDuration: number) => {
    setDurationState(newDuration);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
  };

  // Handle song end - auto-play next song
  const handleSongEnd = () => {
    if (queue.repeatMode === 'one') {
      setCurrentTimeState(0);
      setSeekTime(0);
      setIsPlaying(true);
    } else if (queueService.hasNext()) {
      nextSong();
    } else {
      setIsPlaying(false);
    }
  };

  // Handle time updates from YouTube player
  const handleTimeUpdate = (time: number) => {
    setCurrentTimeState(time);
  };

  // Calculate next song ID for prefetching
  const nextSongId = useMemo(() => {
    return queue.upcoming.length > 0 ? queue.upcoming[0].youtubeId : undefined;
  }, [queue.upcoming]);

  const value: PlayerContextType = {
    // Current playback state
    currentSong: queue.current,
    isPlaying,
    currentTime,
    duration,
    volume,
    
    // Queue state
    queue,
    upcomingCount: queueService.getUpcomingCount(),
    hasNext: queueService.hasNext(),
    hasPrevious: queueService.hasPrevious(),
    queueDuration: queueService.getQueueDuration(),
    
    // Control methods
    playSong,
    pauseSong,
    resumeSong,
    nextSong,
    previousSong,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    clearQueue,
    shuffleQueue,
    
    // Settings
    setVolume,
    setAutoPlay,
    setRepeatMode,
    
    // Playback control
    seekTo,
    setCurrentTime,
    setDuration
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {queue.current && (
        <YouTubePlayer
          videoId={queue.current.youtubeId}
          isPlaying={isPlaying}
          volume={volume}
          onReady={() => console.log('✅ YouTube player ready for:', queue.current?.title)}
          onStateChange={(state) => console.log('🔄 Player state changed:', state)}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={setDuration}
          onEnd={handleSongEnd}
          seekTime={seekTime}
          // Optimization props
          preloadNext={nextSongId}
          enablePreloading={prefetchEnabled}
          bufferSize={8} // 8 seconds buffer
        />
      )}
    </PlayerContext.Provider>
  );
};