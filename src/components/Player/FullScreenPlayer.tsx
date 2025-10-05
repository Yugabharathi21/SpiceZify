import React, { useState } from 'react';
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  BackwardIcon,
  ForwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  Squares2X2Icon,
  QueueListIcon
} from '@heroicons/react/24/solid';
import { HeartIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import LyricsDisplay from '../Lyrics/LyricsDisplay';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
}

interface FullScreenPlayerProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLiked: boolean;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  autoplay: boolean;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onProgressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleLike: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleAutoplay: () => void;
}

const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  isLiked,
  isShuffled,
  repeatMode,
  autoplay,
  onClose,
  onPlayPause,
  onNext,
  onPrevious,
  onProgressChange,
  onVolumeChange,
  onToggleLike,
  onToggleShuffle,
  onToggleRepeat,
  onToggleAutoplay
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') {
      return <ArrowPathRoundedSquareIcon className="w-6 h-6" />;
    }
    return <ArrowPathIcon className="w-6 h-6" />;
  };

  const getRepeatColor = () => {
    return repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-text-gray';
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-spotify-border">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
            style={{ borderRadius: '3px' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div>
            <p className="text-spotify-text-gray text-xs uppercase tracking-wider font-medium">Now Playing</p>
            <p className="text-spotify-white text-sm font-medium">Spicezify</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleAutoplay}
            className={`transition-colors duration-150 p-2 hover:bg-spotify-medium-gray ${autoplay ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
            style={{ borderRadius: '3px' }}
            title={`Autoplay: ${autoplay ? 'On' : 'Off'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </button>
          
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className={`transition-colors duration-150 p-2 hover:bg-spotify-medium-gray ${showLyrics ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
            style={{ borderRadius: '3px' }}
            title="Show Lyrics"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </button>
          
          <button className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                  style={{ borderRadius: '3px' }}>
            <QueueListIcon className="w-5 h-5" />
          </button>
          
          <button className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                  style={{ borderRadius: '3px' }}>
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className={`max-w-6xl w-full grid gap-16 items-center transition-all duration-300 ${
          showLyrics ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'
        }`}>
          {/* Album Art */}
          <div className="flex justify-center">
            <div className="relative group">
              <img
                src={song.thumbnail}
                alt={song.title}
                className={`object-cover shadow-elevated transition-all duration-300 group-hover:scale-105 ${
                  showLyrics ? 'w-64 h-64 lg:w-72 lg:h-72' : 'w-80 h-80 lg:w-96 lg:h-96'
                }`}
                style={{ borderRadius: '6px' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" 
                   style={{ borderRadius: '6px' }}></div>
              
              {/* Floating controls overlay */}
              <div className="absolute bottom-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={onToggleLike}
                  className="bg-black/60 text-white p-2 hover:bg-black/80 transition-colors duration-150"
                  style={{ borderRadius: '3px' }}
                >
                  {isLiked ? (
                    <HeartSolid className="w-4 h-4 text-spotify-green" />
                  ) : (
                    <HeartIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Song Info and Controls */}
          <div className="space-y-8">
            {/* Song Info */}
            <div className="text-center lg:text-left">
              <p className="text-spotify-text-gray text-sm uppercase tracking-wider font-medium mb-2">Song</p>
              <h1 className="text-4xl lg:text-6xl font-bold text-spotify-white mb-4 leading-tight">
                {song.title}
              </h1>
              <p className="text-xl lg:text-2xl text-spotify-text-light font-medium">
                {song.artist}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="relative">
                <div className="w-full h-2 bg-spotify-border" style={{ borderRadius: '2px' }}>
                  <div 
                    className="h-full bg-spotify-green transition-all duration-150" 
                    style={{ 
                      width: `${progressPercentage}%`,
                      borderRadius: '2px'
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={onProgressChange}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-sm text-spotify-text-gray font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center space-x-8">
              <button
                onClick={onToggleShuffle}
                className={`transition-colors duration-150 p-2 hover:bg-spotify-medium-gray ${isShuffled ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
                style={{ borderRadius: '3px' }}
                title="Shuffle"
              >
                <Squares2X2Icon className="w-6 h-6" />
              </button>

              <button
                onClick={onPrevious}
                className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                style={{ borderRadius: '3px' }}
                title="Previous"
              >
                <BackwardIcon className="w-8 h-8" />
              </button>

              <button
                onClick={onPlayPause}
                className="bg-spotify-white text-spotify-black p-4 hover:scale-105 transition-transform duration-150 shadow-elevated"
                style={{ borderRadius: '4px' }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <PauseIcon className="w-8 h-8" />
                ) : (
                  <PlayIcon className="w-8 h-8 ml-1" />
                )}
              </button>

              <button
                onClick={onNext}
                className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                style={{ borderRadius: '3px' }}
                title="Next"
              >
                <ForwardIcon className="w-8 h-8" />
              </button>

              <button
                onClick={onToggleRepeat}
                className={`transition-colors duration-150 p-2 hover:bg-spotify-medium-gray ${getRepeatColor()} hover:text-spotify-white`}
                style={{ borderRadius: '3px' }}
                title={`Repeat: ${repeatMode}`}
              >
                {getRepeatIcon()}
              </button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-center space-x-6">
              <button
                onClick={onToggleLike}
                className="text-spotify-text-gray hover:text-spotify-green transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                style={{ borderRadius: '3px' }}
                title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
              >
                {isLiked ? (
                  <HeartSolid className="w-5 h-5 text-spotify-green" />
                ) : (
                  <HeartIcon className="w-5 h-5" />
                )}
              </button>

              {/* Volume Control */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onVolumeChange({ target: { value: volume === 0 ? '0.7' : '0' } } as React.ChangeEvent<HTMLInputElement>)}
                  className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  )}
                </button>
                
                <div className="w-32 relative">
                  <div className="w-full h-1 bg-spotify-border" style={{ borderRadius: '1px' }}>
                    <div 
                      className="h-full bg-spotify-green transition-all duration-150" 
                      style={{ 
                        width: `${volume * 100}%`,
                        borderRadius: '1px'
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={onVolumeChange}
                    className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lyrics Panel */}
          {showLyrics && (
            <div className="bg-spotify-medium-gray/30 backdrop-blur-sm border border-spotify-border/50" style={{ borderRadius: '8px' }}>
              <div className="p-4 border-b border-spotify-border/50">
                <h3 className="text-spotify-white font-medium text-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  Lyrics
                </h3>
              </div>
              <div className="overflow-hidden">
                <LyricsDisplay
                  artist={song.artist}
                  title={song.title}
                  currentTime={currentTime}
                  duration={duration}
                  className="text-spotify-white p-4"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="border-t border-spotify-border p-4 bg-spotify-dark-gray/50">
        <div className="flex items-center justify-between text-xs text-spotify-text-gray">
          <div className="flex items-center space-x-4">
            <span>Quality: High</span>
            <span>•</span>
            <span>Bitrate: 320kbps</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Shuffle: {isShuffled ? 'On' : 'Off'}</span>
            <span>•</span>
            <span>Repeat: {repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One'}</span>
            <span>•</span>
            <span>Autoplay: {autoplay ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenPlayer;