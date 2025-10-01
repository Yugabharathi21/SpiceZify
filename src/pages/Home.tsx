import React, { useState, useEffect } from 'react';
import SongCard from '../components/UI/SongCard';
import Recommendations from '../components/Recommendations/Recommendations';
import { YouTubeService, YouTubeVideo } from '../services/youtubeService';

const Home: React.FC = () => {
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>([]);
  const [madeForYou, setMadeForYou] = useState<YouTubeVideo[]>([]);
  const [trendingNow, setTrendingNow] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeContent = async () => {
      setLoading(true);
      try {
        // Fetch different categories of music
        const [recent, trending, recommended] = await Promise.all([
          YouTubeService.searchSongs('popular songs 2024', 8),
          YouTubeService.searchSongs('trending music', 8),
          YouTubeService.searchSongs('top hits playlist', 8)
        ]);

        setRecentlyPlayed(recent);
        setTrendingNow(trending);
        setMadeForYou(recommended);
      } catch (error) {
        console.error('Failed to fetch home content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeContent();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-spotify-white mb-2">{getGreeting()}</h1>
          <p className="text-spotify-light-gray">Loading your music...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-spotify-dark-gray p-4 rounded-lg animate-pulse">
              <div className="w-full aspect-square bg-spotify-gray rounded-md mb-4"></div>
              <div className="h-4 bg-spotify-gray rounded mb-2"></div>
              <div className="h-3 bg-spotify-gray rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-spotify-white mb-2">{getGreeting()}</h1>
        <p className="text-spotify-light-gray">Welcome back to Spicezify</p>
      </div>

      {/* Quick Play Cards */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentlyPlayed.slice(0, 6).map((song) => (
            <div
              key={`quick-${song.id}`}
              className="bg-spotify-gray hover:bg-opacity-80 rounded-md flex items-center cursor-pointer transition-colors group"
            >
              <img
                src={song.thumbnail}
                alt={song.title}
                className="w-20 h-20 rounded-l-md object-cover"
              />
              <div className="flex-1 px-4 py-2 min-w-0">
                <p className="text-white font-medium text-sm truncate">{song.title}</p>
                <p className="text-spotify-light-gray text-xs truncate">{song.artist}</p>
              </div>
              <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-spotify-green text-spotify-black rounded-full p-2 hover:scale-105 transition-transform">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-spotify-white mb-6">Recently played</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {recentlyPlayed.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      </div>

      {/* Trending Now */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-spotify-white mb-6">Trending now</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {trendingNow.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="mb-8">
        <Recommendations 
          options={{ 
            limit: 15, 
            verifiedOnly: true,
            exploration: true,
            diversification: true 
          }}
          className="bg-gray-900/50 rounded-lg p-6"
        />
      </div>

      {/* Made for You */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-spotify-white mb-6">Made for you</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {madeForYou.map((song) => (
            <SongCard key={`made-${song.id}`} song={song} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;