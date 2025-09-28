import React, { useEffect, useRef, useState } from 'react';

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
  seekTime
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Audio event handlers
  const handleLoadStart = () => {
    console.log('Audio loading started for video:', videoId);
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    console.log('Audio ready for video:', videoId);
    setIsPlayerReady(true);
    setIsLoading(false);
    setHasError(false);
    
    if (audioRef.current) {
      audioRef.current.volume = volume;
      const duration = audioRef.current.duration;
      if (duration && onDurationChange && !isNaN(duration)) {
        onDurationChange(duration);
      }
    }
    
    onReady?.();
  };

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

  // Reset when video changes
  useEffect(() => {
    console.log('Audio source changed to:', videoId);
    setIsPlayerReady(false);
    setLastSeekTime(0);
    setHasError(false);
    setIsLoading(false);
    stopTimeUpdates();
  }, [videoId]);

  // Generate stream URL - now working properly
  const streamUrl = `http://localhost:3001/api/youtube/audio/${videoId}`;

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
      <audio
        ref={audioRef}
        key={videoId}
        src={streamUrl}
        preload="metadata"
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default YouTubePlayer;