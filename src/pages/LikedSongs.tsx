import React, { useState, useEffect } from 'react';
import { HeartIcon } from '@heroicons/react/24/solid';
import SongCard from '../components/UI/SongCard';

interface LikedSong {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  addedAt: string;
}

const LikedSongs: React.FC = () => {
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikedSongs();
  }, []);

  const fetchLikedSongs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/liked', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLikedSongs(data);
      }
    } catch (error) {
      console.error('Failed to fetch liked songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (songId: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/unlike', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ songId })
      });

      if (response.ok) {
        setLikedSongs(prev => prev.filter(song => song.id !== songId));
      }
    } catch (error) {
      console.error('Failed to unlike song:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-60 h-60 bg-spotify-gray animate-pulse" style={{ borderRadius: '4px' }}></div>
          <div className="space-y-4">
            <div className="h-4 bg-spotify-gray w-20 animate-pulse" style={{ borderRadius: '2px' }}></div>
            <div className="h-12 bg-spotify-gray w-64 animate-pulse" style={{ borderRadius: '2px' }}></div>
            <div className="h-4 bg-spotify-gray w-32 animate-pulse" style={{ borderRadius: '2px' }}></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-spotify-gray p-4 animate-pulse" style={{ borderRadius: '4px' }}>
              <div className="w-full aspect-square bg-spotify-medium-gray mb-4" style={{ borderRadius: '3px' }}></div>
              <div className="h-4 bg-spotify-medium-gray mb-2" style={{ borderRadius: '2px' }}></div>
              <div className="h-3 bg-spotify-medium-gray w-3/4" style={{ borderRadius: '2px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center space-x-6 mb-8">
        <div className="w-60 h-60 bg-gradient-to-br from-purple-800 to-blue-800 flex items-center justify-center" style={{ borderRadius: '4px' }}>
          <HeartIcon className="w-20 h-20 text-spotify-white" />
        </div>
        <div>
          <p className="text-spotify-text-gray text-sm uppercase tracking-wide mb-2">Playlist</p>
          <h1 className="text-5xl font-bold text-spotify-white mb-4">Liked Songs</h1>
          <p className="text-spotify-text-gray">{likedSongs.length} liked song{likedSongs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {likedSongs.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {likedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isLiked={true}
              onLike={handleUnlike}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <HeartIcon className="w-16 h-16 text-spotify-text-gray mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-spotify-white mb-2">Songs you like will appear here</h2>
          <p className="text-spotify-text-gray">Save songs by tapping the heart icon.</p>
        </div>
      )}
    </div>
  );
};

export default LikedSongs;