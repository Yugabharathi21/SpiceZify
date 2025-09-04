import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnd?: () => void;
  seekTime?: number;
  onError?: (error: any) => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  videoId, 
  isPlaying,
  volume,
  currentTime,
  onReady, 
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  onEnd,
  onError,
  seekTime
}) => {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const opts: YouTubeProps['opts'] = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      showinfo: 0,
      origin: window.location.origin
    },
  };

  const handleReady = (event: any) => {
    console.log('YouTube player ready for video:', videoId);
    playerRef.current = event.target;
    setIsPlayerReady(true);
    setHasError(false);
    
    // Set initial volume and get duration
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(volume * 100);
        const duration = playerRef.current.getDuration();
        if (duration && onDurationChange) {
          onDurationChange(duration);
        }
        
        // Auto-play if needed
        if (isPlaying) {
          playerRef.current.playVideo();
        }
      } catch (error) {
        console.error('YouTube player setup error:', error);
      }
    }
    
    onReady?.();
  };

  const handleStateChange = (event: any) => {
    const state = event.data;
    console.log('YouTube player state changed:', state);
    onStateChange?.(state);
    
    // YouTube Player States:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    
    if (state === 0) {
      // Video ended
      stopTimeUpdates();
      onEnd?.();
    } else if (state === 1) {
      // Playing - start time updates
      setHasError(false);
      startTimeUpdates();
    } else if (state === 2) {
      // Paused - stop time updates
      stopTimeUpdates();
    } else if (state === 3) {
      // Buffering - continue time updates but slower
      startTimeUpdates(2000);
    }
  };

  const handleError = (event: any) => {
    console.error('YouTube player error:', event.data);
    setHasError(true);
    stopTimeUpdates();
    onError?.(event.data);
  };

  const startTimeUpdates = (interval: number = 1000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && onTimeUpdate && !hasError) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          onTimeUpdate(currentTime);
        } catch (error) {
          console.error('Time update error:', error);
        }
      }
    }, interval);
  };

  const stopTimeUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Control playback state
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || hasError) return;

    try {
      if (isPlaying) {
        console.log('Playing video:', videoId);
        playerRef.current.playVideo();
      } else {
        console.log('Pausing video:', videoId);
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('YouTube player control error:', error);
      setHasError(true);
    }
  }, [isPlaying, isPlayerReady, hasError]);

  // Control volume
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || hasError) return;
    
    try {
      playerRef.current.setVolume(volume * 100);
    } catch (error) {
      console.error('YouTube player volume error:', error);
    }
  }, [volume, isPlayerReady, hasError]);

  // Handle seeking
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || seekTime === undefined || hasError) return;
    
    const timeDiff = Math.abs(seekTime - lastSeekTime);
    
    // Only seek if there's a significant difference (avoid infinite loops)
    if (timeDiff > 2) {
      try {
        playerRef.current.seekTo(seekTime, true);
        setLastSeekTime(seekTime);
      } catch (error) {
        console.error('YouTube player seek error:', error);
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
    console.log('Video changed to:', videoId);
    setIsPlayerReady(false);
    setLastSeekTime(0);
    setHasError(false);
    stopTimeUpdates();
  }, [videoId]);

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
      <YouTube
        key={videoId}
        videoId={videoId}
        opts={opts}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={handleError}
      />
    </div>
  );
};

export default YouTubePlayer;