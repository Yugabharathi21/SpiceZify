import React, { useState } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  BackwardIcon, 
  ForwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  QueueListIcon,
  Squares2X2Icon
} from '@heroicons/react/24/solid';
import { HeartIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { usePlayer } from '../../contexts/PlayerContext';
import FullScreenPlayer from './FullScreenPlayer';
import QueuePanel from './QueuePanel';

const Player: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    pauseSong,
    resumeSong,
    nextSong,
    previousSong,
    volume,
    setVolume,
    setCurrentTime,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    autoplay,
    toggleAutoplay
  } = usePlayer();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  if (!currentSong) {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSong();
    } else {
      resumeSong();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume || 0.7);
    }
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') {
      return <ArrowPathRoundedSquareIcon className="w-4 h-4" />;
    }
    return <ArrowPathIcon className="w-4 h-4" />;
  };

  const getRepeatColor = () => {
    return repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-text-gray';
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="bg-spotify-dark-gray border-t border-spotify-border px-4 py-3 flex items-center justify-between shadow-player">
        {/* Song Info */}
        <div className="flex items-center space-x-4 flex-1 min-w-0 max-w-sm">
          <div className="relative group">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-14 h-14 object-cover cursor-pointer transition-all duration-150 hover:brightness-75"
              style={{ borderRadius: '3px' }}
              onClick={() => setIsFullScreen(true)}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150"
                 style={{ borderRadius: '3px' }}>
              <ArrowsPointingOutIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div className="min-w-0 flex-1">
            <p className="text-spotify-white text-sm font-medium truncate cursor-pointer hover:underline">
              {currentSong.title}
            </p>
            <p className="text-spotify-text-gray text-xs truncate cursor-pointer hover:underline hover:text-spotify-white transition-colors duration-150">
              {currentSong.artist}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="text-spotify-text-gray hover:text-spotify-green transition-colors duration-150"
            >
              {isLiked ? (
                <HeartSolid className="w-4 h-4 text-spotify-green" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
            </button>
            
            <button className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150">
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center flex-1 justify-center space-y-3 max-w-2xl">
          <div className="flex items-center space-x-6">
            <button
              onClick={toggleShuffle}
              className={`transition-colors duration-150 ${isShuffled ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
              title="Shuffle"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            
            <button
              onClick={previousSong}
              className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
              title="Previous"
            >
              <BackwardIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="bg-spotify-white text-spotify-black p-2 hover:scale-105 transition-transform duration-150 shadow-card"
              style={{ borderRadius: '3px' }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <PauseIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4 ml-0.5" />
              )}
            </button>
            
            <button
              onClick={nextSong}
              className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
              title="Next"
            >
              <ForwardIcon className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`transition-colors duration-150 ${getRepeatColor()} hover:text-spotify-white`}
              title={`Repeat: ${repeatMode}`}
            >
              {getRepeatIcon()}
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-3 w-full max-w-lg">
            <span className="text-xs text-spotify-text-gray w-10 text-right font-mono">
              {formatTime(currentTime)}
            </span>
            
            <div className="flex-1 relative">
              <div className="w-full h-1 bg-spotify-border" style={{ borderRadius: '1px' }}>
                <div 
                  className="h-full bg-spotify-green transition-all duration-150" 
                  style={{ 
                    width: `${progressPercentage}%`,
                    borderRadius: '1px'
                  }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
              />
            </div>
            
            <span className="text-xs text-spotify-text-gray w-10 font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-4 flex-1 justify-end max-w-sm">
          <button
            onClick={toggleAutoplay}
            className={`transition-colors duration-150 ${autoplay ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
            title={`Autoplay: ${autoplay ? 'On' : 'Off'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </button>
          
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`transition-colors duration-150 ${showQueue ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
            title="Queue"
          >
            <QueueListIcon className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <SpeakerXMarkIcon className="w-4 h-4" />
              ) : (
                <SpeakerWaveIcon className="w-4 h-4" />
              )}
            </button>
            
            <div className="w-24 relative">
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
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
              />
            </div>
          </div>
          
          <button
            onClick={() => setIsFullScreen(true)}
            className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
            title="Full Screen"
          >
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Panel */}
      {showQueue && (
        <QueuePanel onClose={() => setShowQueue(false)} />
      )}

      {/* Full Screen Player */}
      {isFullScreen && (
        <FullScreenPlayer
          song={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isLiked={isLiked}
          isShuffled={isShuffled}
          repeatMode={repeatMode}
          autoplay={autoplay}
          onClose={() => setIsFullScreen(false)}
          onPlayPause={handlePlayPause}
          onNext={nextSong}
          onPrevious={previousSong}
          onProgressChange={handleProgressChange}
          onVolumeChange={handleVolumeChange}
          onToggleLike={() => setIsLiked(!isLiked)}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onToggleAutoplay={toggleAutoplay}
        />
      )}
    </>
  );
};

export default Player;