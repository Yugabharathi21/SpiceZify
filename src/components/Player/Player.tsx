import React, { useState, useEffect } from 'react';
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
  Squares2X2Icon,
  PlusCircleIcon
} from '@heroicons/react/24/solid';
import { HeartIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { usePlayer } from '../../contexts/PlayerContext';
import FullScreenPlayer from './FullScreenPlayer';
import QueuePanel from './QueuePanel';
import ContextMenu from '../UI/ContextMenu';

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
    toggleAutoplay,
    queue,
    upcomingCount
  } = usePlayer();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [playlists, setPlaylists] = useState<{_id: string, name: string}[]>([]);
  
  // Check if song is liked on load
  useEffect(() => {
    const checkIfSongIsLiked = async () => {
      try {
        if (!currentSong) return;
        const response = await fetch(`http://localhost:3001/api/liked/${currentSong.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setIsLiked(response.ok);
      } catch (error) {
        console.error('Error checking if song is liked:', error);
      }
    };

    if (currentSong) {
      checkIfSongIsLiked();
    }
  }, [currentSong]);
  
  // Fetch user playlists for the context menu
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/playlists', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data.map((p: {_id: string, name: string}) => ({ _id: p._id, name: p.name })));
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };
    
    fetchPlaylists();
  }, []);

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

  // Handle adding song to a playlist
  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          songId: currentSong.id,
          title: currentSong.title,
          artist: currentSong.artist,
          thumbnail: currentSong.thumbnail,
          duration: currentSong.duration,
          youtubeId: currentSong.youtubeId
        })
      });
      
      if (response.ok) {
        // You can add a toast notification here if you have a toast system
        console.log('Song added to playlist successfully');
      } else {
        const errorData = await response.json();
        console.error('Error adding song to playlist:', errorData);
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
    }
  };
  


  return (
    <>
      <div className="bg-spotify-dark-gray border-t border-spotify-border px-4 py-3 flex items-center justify-between shadow-player">
      
      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        position={contextMenu}
        onClose={() => setContextMenu({...contextMenu, visible: false})}
        items={[
          {
            label: isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs',
            onClick: () => {
              const newLikedState = !isLiked;
              setIsLiked(newLikedState);
              
              fetch(`http://localhost:3001/api/liked/${currentSong.id}`, {
                method: newLikedState ? 'POST' : 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  songId: currentSong.id,
                  title: currentSong.title,
                  artist: currentSong.artist,
                  thumbnail: currentSong.thumbnail,
                  duration: currentSong.duration,
                  youtubeId: currentSong.youtubeId
                })
              }).catch(err => console.error('Error updating liked status:', err));
            },
            icon: isLiked ? <HeartSolid className="w-4 h-4 text-spotify-green" /> : <HeartIcon className="w-4 h-4" />
          },
          {
            label: 'Add to Playlist',
            onClick: () => {},
            className: 'border-b border-spotify-border',
            icon: <PlusCircleIcon className="w-4 h-4" />
          },
          ...playlists.map(playlist => ({
            label: playlist.name,
            onClick: () => handleAddToPlaylist(playlist._id),
          }))
        ]}
      />
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
              onClick={() => {
                const newLikedState = !isLiked;
                setIsLiked(newLikedState);
                
                // Update liked status in backend
                fetch(`http://localhost:3001/api/liked/${currentSong.id}`, {
                  method: newLikedState ? 'POST' : 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    songId: currentSong.id,
                    title: currentSong.title,
                    artist: currentSong.artist,
                    thumbnail: currentSong.thumbnail,
                    duration: currentSong.duration,
                    youtubeId: currentSong.youtubeId
                  })
                }).catch(err => console.error('Error updating liked status:', err));
              }}
              className="text-spotify-text-gray hover:text-spotify-green transition-colors duration-150"
            >
              {isLiked ? (
                <HeartSolid className="w-4 h-4 text-spotify-green" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
            </button>
            
            <button 
              className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY
                });
              }}
            >
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
          
          {/* Next Song Preview */}
          {queue.upcoming.length > 0 && (
            <div className="flex items-center text-xs text-gray-500 max-w-md">
              <span className="mr-2">Up next:</span>
              <span className="truncate">
                {queue.upcoming[0].title} • {queue.upcoming[0].artist}
                {queue.upcoming[0].isVerified && (
                  <svg className="inline w-2.5 h-2.5 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            </div>
          )}
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
          
          <div className="relative">
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`transition-colors duration-150 ${showQueue ? 'text-spotify-green' : 'text-spotify-text-gray hover:text-spotify-white'}`}
              title={`Queue (${upcomingCount} songs)`}
            >
              <QueueListIcon className="w-4 h-4" />
            </button>
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {upcomingCount > 9 ? '9+' : upcomingCount}
              </span>
            )}
          </div>
          
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