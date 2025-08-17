import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../stores/usePlayerStore';

export default function NowPlayingBar() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    play,
    pause,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    setRepeat,
    updateCurrentTime,
    updateDuration,
  } = usePlayerStore();

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        updateCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      updateDuration(audio.duration);
    };

    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDragging, repeat, next, updateCurrentTime, updateDuration]);

  // Sync audio playback with store state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack) {
      if (audio.src !== `file://${currentTrack.path}`) {
        audio.src = `file://${currentTrack.path}`;
      }
      
      if (isPlaying) {
        audio.play().catch(console.error);
      } else {
        audio.pause();
      }
    }
  }, [currentTrack, isPlaying]);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync current time
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    seekTo(time);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  const getRepeatIcon = () => {
    switch (repeat) {
      case 'one': return Repeat1;
      case 'all': return Repeat;
      default: return Repeat;
    }
  };

  const cycleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeat(modes[nextIndex]);
  };

  if (!currentTrack) {
    return (
      <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border flex items-center justify-center">
        <p className="text-muted-foreground">Select a song to start playing</p>
      </div>
    );
  }

  const RepeatIcon = getRepeatIcon();

  return (
    <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border">
      <audio ref={audioRef} />
      
      {/* Progress Bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <div 
            className="flex-1 progress-bar"
            onClick={handleProgressClick}
          >
            <div 
              className="progress-fill"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div 
              className="progress-thumb"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Track Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {currentTrack.cover ? (
              <img 
                src={currentTrack.cover} 
                alt="Album art"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.artist_name || 'Unknown Artist'}
            </p>
          </div>
          <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-full transition-colors ${
              shuffle ? 'text-primary bg-primary/20' : 'hover:bg-muted/50'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={previous}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={isPlaying ? pause : () => play()}
            className="p-3 bg-primary hover:bg-primary/90 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            )}
          </button>

          <button
            onClick={next}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-2 rounded-full transition-colors ${
              repeat !== 'none' ? 'text-primary bg-primary/20' : 'hover:bg-muted/50'
            }`}
          >
            <RepeatIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Queue */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 80 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="progress-bar h-1"
                  onClick={handleVolumeChange}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <div 
                    className="progress-fill"
                    style={{ width: `${volume * 100}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}