import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import YouTubePlayer from '../components/Player/YouTubePlayer';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
}

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  autoplay: boolean;
  currentIndex: number;
  playSong: (song: Song, addToQueue?: boolean) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  previousSong: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
  clearQueue: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  seekTo: (time: number) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
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
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDurationState] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<'off' | 'all' | 'one'>('off');
  const [autoplay, setAutoplay] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);

  // Shuffle array function
  const shuffleArray = (array: Song[]): Song[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playSong = (song: Song, addToQueue: boolean = false) => {
    if (addToQueue) {
      setQueue(prev => [...prev, song]);
      return;
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTimeState(0);
    setSeekTime(0);
    
    // If queue is empty, add current song to queue
    if (queue.length === 0) {
      setQueue([song]);
      setCurrentIndex(0);
      if (!isShuffled) {
        setOriginalQueue([song]);
      }
    } else {
      // Find song in queue or add it
      const songIndex = queue.findIndex(q => q.id === song.id);
      if (songIndex !== -1) {
        setCurrentIndex(songIndex);
      } else {
        const newQueue = [...queue, song];
        setQueue(newQueue);
        setCurrentIndex(newQueue.length - 1);
        if (!isShuffled) {
          setOriginalQueue(newQueue);
        }
      }
    }
  };

  const playQueue = (songs: Song[], startIndex: number = 0) => {
    if (songs.length === 0) return;
    
    setQueue(songs);
    setOriginalQueue(songs);
    setCurrentIndex(startIndex);
    setCurrentSong(songs[startIndex]);
    setIsPlaying(true);
    setCurrentTimeState(0);
    setSeekTime(0);
  };

  const pauseSong = () => {
    setIsPlaying(false);
  };

  const resumeSong = () => {
    setIsPlaying(true);
  };

  const nextSong = () => {
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    setCurrentIndex(nextIndex);
    setCurrentSong(queue[nextIndex]);
    setCurrentTimeState(0);
    setSeekTime(0);
    
    if (autoplay) {
      setIsPlaying(true);
    }
  };

  const previousSong = () => {
    if (queue.length === 0) return;

    // If more than 3 seconds have passed, restart current song
    if (currentTime > 3) {
      setCurrentTimeState(0);
      setSeekTime(0);
      return;
    }

    let prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setCurrentIndex(prevIndex);
    setCurrentSong(queue[prevIndex]);
    setCurrentTimeState(0);
    setSeekTime(0);
    
    if (autoplay) {
      setIsPlaying(true);
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => {
      const newQueue = [...prev, song];
      if (!isShuffled) {
        setOriginalQueue(newQueue);
      }
      return newQueue;
    });
  };

  const removeFromQueue = (songId: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(song => song.id !== songId);
      const removedIndex = prev.findIndex(song => song.id === songId);
      
      if (removedIndex !== -1 && removedIndex <= currentIndex && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
      if (!isShuffled) {
        setOriginalQueue(newQueue);
      }
      
      return newQueue;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(0);
    setCurrentSong(null);
    setIsPlaying(false);
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  };

  const setCurrentTime = (time: number) => {
    const newTime = Math.max(0, Math.min(duration, time));
    setCurrentTimeState(newTime);
    setSeekTime(newTime);
  };

  const setDuration = (newDuration: number) => {
    setDurationState(newDuration);
  };

  const toggleShuffle = () => {
    const newShuffled = !isShuffled;
    setIsShuffled(newShuffled);

    if (newShuffled) {
      // Save original queue and shuffle
      if (originalQueue.length === 0) {
        setOriginalQueue(queue);
      }
      const shuffledQueue = shuffleArray(queue);
      setQueue(shuffledQueue);
      
      // Find current song in shuffled queue
      const newIndex = shuffledQueue.findIndex(song => song.id === currentSong?.id);
      setCurrentIndex(newIndex !== -1 ? newIndex : 0);
    } else {
      // Restore original queue
      setQueue(originalQueue);
      const originalIndex = originalQueue.findIndex(song => song.id === currentSong?.id);
      setCurrentIndex(originalIndex !== -1 ? originalIndex : 0);
    }
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') {
      setRepeatModeState('all');
    } else if (repeatMode === 'all') {
      setRepeatModeState('one');
    } else {
      setRepeatModeState('off');
    }
  };

  const toggleAutoplay = () => {
    setAutoplay(!autoplay);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
  };

  // Handle song end
  const handleSongEnd = () => {
    if (repeatMode === 'one') {
      setCurrentTimeState(0);
      setSeekTime(0);
      setIsPlaying(true);
    } else if (autoplay && queue.length > 1) {
      nextSong();
    } else {
      setIsPlaying(false);
    }
  };

  // Handle time updates from YouTube player
  const handleTimeUpdate = (time: number) => {
    setCurrentTimeState(time);
  };

  const value = {
    currentSong,
    isPlaying,
    queue,
    currentTime,
    duration,
    volume,
    isShuffled,
    repeatMode,
    autoplay,
    currentIndex,
    playSong,
    pauseSong,
    resumeSong,
    nextSong,
    previousSong,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setVolume,
    setCurrentTime,
    setDuration,
    toggleShuffle,
    toggleRepeat,
    toggleAutoplay,
    seekTo,
    playQueue
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {currentSong && (
        <YouTubePlayer
          videoId={currentSong.youtubeId}
          isPlaying={isPlaying}
          volume={volume}
          currentTime={currentTime}
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