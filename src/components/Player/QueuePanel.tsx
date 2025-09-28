import React from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { QueueItem } from '../../services/queueService';

interface QueuePanelProps {
  onClose: () => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ onClose }) => {
  const { 
    queue, 
    playSong, 
    removeFromQueue, 
    clearQueue,
    upcomingCount,
    queueDuration
  } = usePlayer();

  const handlePlayFromQueue = async (song: QueueItem) => {
    await playSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      duration: song.duration,
      youtubeId: song.youtubeId,
      channelTitle: song.channelTitle,
      isVerified: song.isVerified,
      streamUrl: song.streamUrl
    }, false);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-white">Queue</h2>
          <p className="text-gray-400 text-sm">
            {upcomingCount} songs • {queueDuration}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearQueue}
            className="text-gray-400 hover:text-white transition-colors duration-150 p-1"
            title="Clear Queue"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-150 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Now Playing */}
        {queue.current && (
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white mb-3">Now Playing</h3>
            <div className="flex items-center space-x-3 p-2 bg-gray-800 border border-green-500 rounded">
              <img
                src={queue.current.thumbnail}
                alt={queue.current.title}
                className="w-10 h-10 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-green-500 text-sm font-medium truncate flex items-center">
                  {queue.current.title}
                  {queue.current.isVerified && (
                    <svg className="inline w-3 h-3 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {queue.current.artist}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">{queue.current.duration}</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Up Next */}
        {queue.upcoming.length > 0 ? (
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white mb-3">Up Next</h3>
            <div className="space-y-1">
              {queue.upcoming.map((song, index) => (
                <div
                  key={`next-${song.id}-${song.addedAt}`}
                  className="group flex items-center space-x-3 p-2 hover:bg-gray-800 transition-colors duration-150 cursor-pointer rounded"
                  onClick={() => handlePlayFromQueue(song)}
                >
                  <div className="text-gray-400 text-xs w-4 text-center group-hover:hidden">
                    {index + 1}
                  </div>
                  <button className="hidden group-hover:block text-white hover:text-green-500 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-8 h-8 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate flex items-center">
                      {song.title}
                      {song.isVerified && (
                        <svg className="inline w-3 h-3 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {song.artist}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{song.duration}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(song.id);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty Queue */
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-3">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Your queue is empty</h3>
            <p className="text-gray-400 text-sm">Songs will be automatically added when you play music</p>
          </div>
        )}

        {/* Auto-play status */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${queue.isAutoPlay ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span className="text-gray-400 text-xs">
                {queue.isAutoPlay ? 'Auto-play enabled' : 'Auto-play disabled'}
              </span>
            </div>
            {queue.repeatMode !== 'none' && (
              <div className="text-gray-400 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                {queue.repeatMode}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueuePanel;