import React from 'react';
import { PlayIcon, HeartIcon, PlusIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { usePlayer } from '../../contexts/PlayerContext';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
}

interface SongCardProps {
  song: Song;
  isLiked?: boolean;
  onLike?: (songId: string) => void;
  showPlayButton?: boolean;
  layout?: 'grid' | 'list';
}

const SongCard: React.FC<SongCardProps> = ({ 
  song, 
  isLiked = false, 
  onLike,
  showPlayButton = true,
  layout = 'grid'
}) => {
  const { playSong, addToQueue, currentSong, isPlaying } = usePlayer();
  const isCurrentSong = currentSong?.id === song.id;

  const handlePlay = () => {
    playSong(song);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(song);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike) {
      onLike(song.id);
    }
  };

  if (layout === 'list') {
    return (
      <div className="group flex items-center p-2 hover:bg-spotify-medium-gray transition-all duration-150 border border-transparent hover:border-spotify-border" style={{ borderRadius: '3px' }}>
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="relative">
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-12 h-12 object-cover"
              style={{ borderRadius: '2px' }}
            />
            {showPlayButton && (
              <button
                onClick={handlePlay}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ borderRadius: '2px' }}
              >
                <PlayIcon className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm truncate ${isCurrentSong ? 'text-spotify-green' : 'text-spotify-white'}`}>
              {song.title}
            </h3>
            <p className="text-spotify-text-gray text-xs truncate">
              {song.artist}
            </p>
          </div>
          
          <div className="text-spotify-text-gray text-xs">
            {song.duration}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {onLike && (
            <button
              onClick={handleLike}
              className="text-spotify-text-gray hover:text-spotify-green transition-colors duration-150"
            >
              {isLiked ? (
                <HeartIcon className="w-4 h-4 text-spotify-green" />
              ) : (
                <HeartOutline className="w-4 h-4" />
              )}
            </button>
          )}
          
          <button
            onClick={handleAddToQueue}
            className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          
          <button className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150">
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group card p-4 cursor-pointer">
      <div className="relative mb-4">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full aspect-square object-cover"
          style={{ borderRadius: '3px' }}
        />
        {showPlayButton && (
          <button
            onClick={handlePlay}
            className="absolute bottom-2 right-2 bg-spotify-green text-spotify-black p-3 opacity-0 group-hover:opacity-100 hover:scale-105 transition-all duration-150 shadow-elevated"
            style={{ borderRadius: '3px' }}
          >
            <PlayIcon className="w-4 h-4" />
          </button>
        )}
        
        {isCurrentSong && isPlaying && (
          <div className="absolute top-2 left-2 bg-spotify-green text-spotify-black px-2 py-1 text-xs font-medium"
               style={{ borderRadius: '2px' }}>
            Playing
          </div>
        )}
      </div>
      
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-sm truncate mb-1 ${isCurrentSong ? 'text-spotify-green' : 'text-spotify-white'}`}>
            {song.title}
          </h3>
          <p className="text-spotify-text-gray text-xs truncate">
            {song.artist}
          </p>
        </div>
        
        {onLike && (
          <button
            onClick={handleLike}
            className="ml-2 text-spotify-text-gray hover:text-spotify-green transition-colors duration-150"
          >
            {isLiked ? (
              <HeartIcon className="w-4 h-4 text-spotify-green" />
            ) : (
              <HeartOutline className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SongCard;