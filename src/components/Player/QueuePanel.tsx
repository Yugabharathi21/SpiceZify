import React from 'react';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import { usePlayer } from '../../contexts/PlayerContext';

interface QueuePanelProps {
  onClose: () => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ onClose }) => {
  const { 
    queue, 
    currentIndex, 
    currentSong, 
    playSong, 
    removeFromQueue, 
    clearQueue 
  } = usePlayer();

  const upNext = queue.slice(currentIndex + 1);
  const playHistory = queue.slice(0, currentIndex);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-spotify-dark-gray border-l border-spotify-border z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-spotify-border">
        <h2 className="text-lg font-semibold text-spotify-white">Queue</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearQueue}
            className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-1"
            title="Clear Queue"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-1"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Now Playing */}
        {currentSong && (
          <div className="p-4 border-b border-spotify-border">
            <h3 className="text-sm font-medium text-spotify-white mb-3">Now Playing</h3>
            <div className="flex items-center space-x-3 p-2 bg-spotify-medium-gray border border-spotify-green"
                 style={{ borderRadius: '3px' }}>
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-10 h-10 object-cover"
                style={{ borderRadius: '2px' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-spotify-green text-sm font-medium truncate">
                  {currentSong.title}
                </p>
                <p className="text-spotify-text-gray text-xs truncate">
                  {currentSong.artist}
                </p>
              </div>
              <div className="w-3 h-3 bg-spotify-green animate-pulse" style={{ borderRadius: '1px' }}></div>
            </div>
          </div>
        )}

        {/* Up Next */}
        {upNext.length > 0 && (
          <div className="p-4 border-b border-spotify-border">
            <h3 className="text-sm font-medium text-spotify-white mb-3">Up Next</h3>
            <div className="space-y-1">
              {upNext.map((song, index) => (
                <div
                  key={`next-${song.id}-${index}`}
                  className="group flex items-center space-x-3 p-2 hover:bg-spotify-medium-gray transition-colors duration-150 cursor-pointer"
                  style={{ borderRadius: '3px' }}
                  onClick={() => playSong(song)}
                >
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 object-cover"
                    style={{ borderRadius: '2px' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-spotify-white text-sm font-medium truncate">
                      {song.title}
                    </p>
                    <p className="text-spotify-text-gray text-xs truncate">
                      {song.artist}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(song.id);
                      }}
                      className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Play History */}
        {playHistory.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-spotify-white mb-3">Recently Played</h3>
            <div className="space-y-1">
              {playHistory.reverse().map((song, index) => (
                <div
                  key={`history-${song.id}-${index}`}
                  className="group flex items-center space-x-3 p-2 hover:bg-spotify-medium-gray transition-colors duration-150 cursor-pointer opacity-60 hover:opacity-100"
                  style={{ borderRadius: '3px' }}
                  onClick={() => playSong(song)}
                >
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 object-cover"
                    style={{ borderRadius: '2px' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-spotify-white text-sm font-medium truncate">
                      {song.title}
                    </p>
                    <p className="text-spotify-text-gray text-xs truncate">
                      {song.artist}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <PlayIcon className="w-3 h-3 text-spotify-text-gray" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {queue.length === 0 && (
          <div className="p-8 text-center">
            <QueueListIcon className="w-12 h-12 text-spotify-text-gray mx-auto mb-4" />
            <h3 className="text-lg font-medium text-spotify-white mb-2">Your queue is empty</h3>
            <p className="text-spotify-text-gray text-sm">Add songs to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePanel;