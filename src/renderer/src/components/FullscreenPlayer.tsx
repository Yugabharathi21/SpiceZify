import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
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
  Settings
} from 'lucide-react';
import { usePlayerStore } from '../stores/usePlayerStore';
import MusicVisualizer from './MusicVisualizer';

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  audioElement: HTMLAudioElement | null;
}

export default function FullscreenPlayer({ isOpen, onClose, audioElement }: FullscreenPlayerProps) {
  const [showControls, setShowControls] = useState(true);
  const [albumCover, setAlbumCover] = useState<string | null>(null);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

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
  } = usePlayerStore();

  // Auto-hide controls after 3 seconds of no mouse movement
  useEffect(() => {
    if (!isOpen) return;

    const resetTimer = () => {
      setShowControls(true);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetTimer();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (e.key === 'ArrowLeft') {
        seekTo(Math.max(0, currentTime - 10));
      } else if (e.key === 'ArrowRight') {
        seekTo(Math.min(duration, currentTime + 10));
      }
      resetTimer();
    };

    if (isOpen) {
      resetTimer();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isPlaying, pause, play, currentTime, duration, seekTo, onClose]);

  // Load album cover when track changes
  useEffect(() => {
    if (!currentTrack) {
      setAlbumCover(null);
      return;
    }

    window.electronAPI.getCoverForTrack(currentTrack.id).then(cover => {
      setAlbumCover(cover);
    }).catch(err => {
      console.error('Failed to get album cover:', err);
      setAlbumCover(null);
    });
  }, [currentTrack]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
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

  if (!isOpen) return null;

  const RepeatIcon = getRepeatIcon();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ cursor: showControls ? 'default' : 'none' }}
        >
          {/* Background */}
          <div className="absolute inset-0">
            {albumCover ? (
              <div 
                className="w-full h-full bg-cover bg-center filter blur-3xl opacity-30"
                style={{ backgroundImage: `url(${albumCover})` }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-teal-900/30" />
            )}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Music Visualizer */}
          {showVisualizer && audioElement && (
            <div className="absolute inset-0">
              <MusicVisualizer audioElement={audioElement} />
            </div>
          )}

          {/* Content */}
          <div className="relative flex-1 flex flex-col justify-center items-center p-8 text-white">
            {/* Album Cover */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <div className="w-80 h-80 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900">
                {albumCover ? (
                  <img 
                    src={albumCover} 
                    alt="Album art"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-24 h-24 bg-white/20 rounded-lg" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Track Info */}
            {currentTrack && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-8 max-w-2xl"
              >
                <h1 className="text-4xl font-bold mb-4 text-white">
                  {currentTrack.title}
                </h1>
                <p className="text-xl text-white/80 mb-2">
                  {currentTrack.artist_name || 'Unknown Artist'}
                </p>
                {currentTrack.album_name && (
                  <p className="text-lg text-white/60">
                    {currentTrack.album_name}
                  </p>
                )}
              </motion.div>
            )}

            {/* Progress Bar */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-2xl mb-8"
            >
              <div className="flex items-center gap-4 text-white/80 mb-2">
                <span className="text-sm font-mono">{formatTime(currentTime)}</span>
                <div 
                  className="flex-1 h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden group"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-200 group-hover:from-purple-300 group-hover:to-pink-300"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-mono">{formatTime(duration)}</span>
              </div>
            </motion.div>
          </div>

          {/* Controls Overlay */}
          <AnimatePresence>
            {showControls && (
              <>
                {/* Top Controls */}
                <motion.div
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -100, opacity: 0 }}
                  className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setShowVisualizer(!showVisualizer)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        title="Toggle Visualizer"
                      >
                        <Settings className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </motion.div>

                {/* Bottom Controls */}
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent"
                >
                  <div className="flex items-center justify-center gap-6">
                    {/* Left Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleShuffle}
                        className={`p-3 rounded-full transition-colors ${
                          shuffle ? 'bg-purple-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                      >
                        <Shuffle className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={previous}
                        className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <SkipBack className="w-6 h-6 text-white" />
                      </button>

                      <button
                        onClick={isPlaying ? pause : () => play()}
                        className="p-4 rounded-full bg-white hover:bg-white/90 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8 text-black" />
                        ) : (
                          <Play className="w-8 h-8 text-black ml-1" />
                        )}
                      </button>

                      <button
                        onClick={next}
                        className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <SkipForward className="w-6 h-6 text-white" />
                      </button>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={cycleRepeat}
                        className={`p-3 rounded-full transition-colors ${
                          repeat !== 'none' ? 'bg-purple-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                      >
                        <RepeatIcon className="w-5 h-5" />
                      </button>

                      <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                        <Heart className="w-5 h-5 text-white" />
                      </button>

                      {/* Volume */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-5 h-5 text-white" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                        <div 
                          className="w-20 h-1 bg-white/20 rounded-full cursor-pointer"
                          onClick={handleVolumeChange}
                        >
                          <div 
                            className="h-full bg-white rounded-full transition-all"
                            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
