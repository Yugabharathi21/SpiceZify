import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  volume: number;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnd?: () => void;
  seekTime?: number;
  onError?: (error: string) => void;
  // Optimization props
  preloadNext?: string; // Next video ID to preload
  bufferSize?: number; // Buffer size preference
  enablePreloading?: boolean;
}

// Audio preloading and caching system
class AudioCache {
  private static cache = new Map<string, { audio: HTMLAudioElement; loaded: boolean; lastUsed: number }>();
  private static readonly MAX_CACHE_SIZE = 5;
  
  static preload(videoId: string): HTMLAudioElement {
    const existing = this.cache.get(videoId);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.audio;
    }
    
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = `http://localhost:5001/api/youtube/audio/${videoId}`;
    audio.crossOrigin = 'anonymous';
    
    // Clean up old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      const oldestKey = entries[0][0];
      const oldAudio = this.cache.get(oldestKey)?.audio;
      if (oldAudio) {
        oldAudio.src = '';
        oldAudio.load();
      }
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(videoId, {
      audio,
      loaded: false,
      lastUsed: Date.now()
    });
    
    // Set up load event
    audio.addEventListener('canplaythrough', () => {
      const entry = this.cache.get(videoId);
      if (entry) {
        entry.loaded = true;
        console.log(`🚀 Preloaded audio: ${videoId}`);
      }
    });
    
    audio.addEventListener('error', () => {
      console.warn(`⚠️ Failed to preload audio: ${videoId}`);
      this.cache.delete(videoId);
    });
    
    console.log(`🔊 Starting preload: ${videoId}`);
    return audio;
  }
  
  static get(videoId: string): HTMLAudioElement | null {
    const entry = this.cache.get(videoId);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.audio;
    }
    return null;
  }
  
  static isLoaded(videoId: string): boolean {
    const entry = this.cache.get(videoId);
    return entry ? entry.loaded : false;
  }
  
  static clear(): void {
    this.cache.forEach(({ audio }) => {
      audio.src = '';
      audio.load();
    });
    this.cache.clear();
    console.log('🧹 Audio cache cleared');
  }
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  videoId, 
  isPlaying,
  volume,
  onReady, 
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  onEnd,
  onError,
  seekTime,
  // Optimization props
  preloadNext,
  bufferSize = 5, // seconds
  enablePreloading = true
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const performanceRef = useRef({ startTime: 0, firstByteTime: 0, canPlayTime: 0 });

  // Optimized audio event handlers with performance tracking
  const handleLoadStart = useCallback(() => {
    console.log('🔊 Audio loading started for video:', videoId);
    performanceRef.current.startTime = performance.now();
    setIsLoading(true);
    setHasError(false);
  }, [videoId]);
  
  const handleProgress = useCallback(() => {
    if (audioRef.current) {
      const buffered = audioRef.current.buffered;
      const currentTime = audioRef.current.currentTime;
      
      if (buffered.length > 0) {
        // Calculate buffer health (how much is buffered ahead)
        let bufferEnd = 0;
        for (let i = 0; i < buffered.length; i++) {
          if (buffered.start(i) <= currentTime && buffered.end(i) > currentTime) {
            bufferEnd = buffered.end(i);
            break;
          }
        }
        
        const bufferAhead = Math.max(0, bufferEnd - currentTime);
        // Buffer health tracking (can be used for UI indicators)
        
        // Log first data arrival
        if (performanceRef.current.firstByteTime === 0 && bufferAhead > 0) {
          performanceRef.current.firstByteTime = performance.now();
          const firstByteLatency = performanceRef.current.firstByteTime - performanceRef.current.startTime;
          console.log(`⚡ First byte received in ${firstByteLatency.toFixed(2)}ms for ${videoId}`);
        }
      }
    }
  }, [videoId]);

  const handleCanPlay = useCallback(() => {
    const canPlayTime = performance.now();
    performanceRef.current.canPlayTime = canPlayTime;
    const totalLoadTime = canPlayTime - performanceRef.current.startTime;
    
    console.log(`✅ Audio ready for ${videoId} in ${totalLoadTime.toFixed(2)}ms`);
    
    setIsPlayerReady(true);
    setIsLoading(false);
    setHasError(false);
    
    if (audioRef.current) {
      audioRef.current.volume = volume;
      const duration = audioRef.current.duration;
      if (duration && onDurationChange && !isNaN(duration)) {
        onDurationChange(duration);
      }
      
      // Optimize buffer settings
      try {
        // Set buffer parameters if supported
        if ('mozAudioChannelType' in audioRef.current) {
          (audioRef.current as HTMLAudioElement & { mozAudioChannelType?: string }).mozAudioChannelType = 'content';
        }
      } catch {
        // Browser doesn't support this optimization
      }
    }
    
    onReady?.();
  }, [videoId, volume, onDurationChange, onReady]);

  const handlePlay = () => {
    console.log('Audio playing:', videoId);
    onStateChange?.(1); // Playing state
    startTimeUpdates();
  };

  const handlePause = () => {
    console.log('Audio paused:', videoId);
    onStateChange?.(2); // Paused state
    stopTimeUpdates();
  };

  const handleEnded = () => {
    console.log('Audio ended:', videoId);
    onStateChange?.(0); // Ended state
    stopTimeUpdates();
    onEnd?.();
  };

  const handleError = () => {
    console.error('Audio error for video:', videoId);
    setHasError(true);
    setIsLoading(false);
    setIsPlayerReady(false);
    stopTimeUpdates();
    onError?.('Audio loading failed');
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && onDurationChange) {
      const duration = audioRef.current.duration;
      if (!isNaN(duration)) {
        onDurationChange(duration);
      }
    }
  };

  const startTimeUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = window.setInterval(() => {
      if (audioRef.current && onTimeUpdate && !hasError) {
        const currentTime = audioRef.current.currentTime;
        if (!isNaN(currentTime)) {
          onTimeUpdate(currentTime);
        }
      }
    }, 1000);
  };

  const stopTimeUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Control playback state
  useEffect(() => {
    console.log('Playback control:', { isPlayerReady, hasError, isLoading, isPlaying, videoId });
    
    if (!isPlayerReady || !audioRef.current || hasError || isLoading) {
      console.log('Skipping playback control - not ready');
      return;
    }

    try {
      if (isPlaying) {
        console.log('Attempting to play audio:', videoId);
        audioRef.current.play().catch((error) => {
          console.error('Play failed:', error);
          setHasError(true);
          onError?.('Playback failed');
        });
      } else {
        console.log('Pausing audio:', videoId);
        audioRef.current.pause();
      }
    } catch (error) {
      console.error('Audio control error:', error);
      setHasError(true);
    }
  }, [isPlaying, isPlayerReady, hasError, isLoading, videoId, onError]);

  // Control volume
  useEffect(() => {
    if (!audioRef.current) return;
    
    try {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    } catch (error) {
      console.error('Volume control error:', error);
    }
  }, [volume]);

  // Handle seeking
  useEffect(() => {
    if (!isPlayerReady || !audioRef.current || seekTime === undefined || hasError) return;
    
    const timeDiff = Math.abs(seekTime - lastSeekTime);
    
    // Only seek if there's a significant difference (avoid infinite loops)
    if (timeDiff > 2) {
      try {
        audioRef.current.currentTime = seekTime;
        setLastSeekTime(seekTime);
      } catch (error) {
        console.error('Seek error:', error);
      }
    }
  }, [seekTime, isPlayerReady, lastSeekTime, hasError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeUpdates();
    };
  }, []);

  // Preload next track for faster transitions
  useEffect(() => {
    if (enablePreloading && preloadNext && preloadNext !== videoId) {
      console.log(`🚀 Preloading next track: ${preloadNext}`);
      AudioCache.preload(preloadNext);
    }
  }, [preloadNext, videoId, enablePreloading]);
  
  // Reset when video changes
  useEffect(() => {
    console.log('🔄 Audio source changed to:', videoId);
    setIsPlayerReady(false);
    setLastSeekTime(0);
    setHasError(false);
    setIsLoading(false);
    performanceRef.current = { startTime: 0, firstByteTime: 0, canPlayTime: 0 };
    stopTimeUpdates();
  }, [videoId]);

  // Generate stream URL - now working properly
  // Try to use cached audio first, then fallback to new instance
  const streamUrl = useMemo(() => {
    if (enablePreloading && AudioCache.isLoaded(videoId)) {
      console.log(`🎯 Using cached audio for ${videoId}`);
      return AudioCache.get(videoId)?.src || `http://localhost:5001/api/youtube/audio/${videoId}`;
    }
    return `http://localhost:5001/api/youtube/audio/${videoId}`;
  }, [videoId, enablePreloading]);

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
      <audio
        ref={audioRef}
        key={videoId}
        src={streamUrl}
        preload={enablePreloading ? "auto" : "metadata"}
        onLoadStart={handleLoadStart}
        onProgress={handleProgress}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
        crossOrigin="anonymous"
        // Optimization attributes
        autoPlay={false}
        muted={false}
        // Add buffer size hint if supported
        {...(bufferSize && { 'data-buffer-size': bufferSize })}
      />

    </div>
  );
};

export default YouTubePlayer;