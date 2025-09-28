import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import YouTubePlayer from '../components/Player/YouTubePlayer';
import { queueService, QueueItem, Queue } from '../services/queueService';

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

interface PlayerContextType {
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

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

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
  
  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queueService.subscribe((newQueue: Queue) => {
      setQueue(newQueue);
      
      // If a new song is set as current, start playing
      if (newQueue.current && (!queue.current || newQueue.current.id !== queue.current.id)) {
        setIsPlaying(true);
        setCurrentTimeState(0);
        setSeekTime(0);
      }
    });
    
    return unsubscribe;
  }, [queue.current]);

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
  const playSong = async (song: Song, addRelated: boolean = true) => {
    const queueItem = songToQueueItem(song);
    await queueService.playSong(queueItem, addRelated);
  };

  // Playback controls
  const pauseSong = () => {
    setIsPlaying(false);
  };

  const resumeSong = () => {
    setIsPlaying(true);
  };

  const nextSong = () => {
    const nextSongData = queueService.playNext();
    if (nextSongData) {
      setCurrentTimeState(0);
      setSeekTime(0);
    } else {
      setIsPlaying(false);
    }
  };

  const previousSong = () => {
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
  };

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
          onReady={() => console.log('YouTube player ready')}
          onStateChange={(state) => console.log('YouTube player state:', state)}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={setDuration}
          onEnd={handleSongEnd}
          seekTime={seekTime}
        />
      )}
    </PlayerContext.Provider>
  );
};