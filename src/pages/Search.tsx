import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import SongCard from '../components/UI/SongCard';
import { YouTubeService, YouTubeVideo } from '../services/youtubeService';

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    try {
      const searchResults = await YouTubeService.searchSongs(query, 20);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    }
    
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-spotify-light-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-3 bg-spotify-gray border border-spotify-gray rounded-full text-spotify-white placeholder-spotify-light-gray focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent"
            placeholder="What do you want to listen to?"
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-spotify-light-gray">Searching...</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-spotify-white mb-6">Search Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}

      {!loading && searchQuery && results.length === 0 && (
        <div className="text-center py-8">
          <div className="text-spotify-light-gray">No results found for "{searchQuery}"</div>
        </div>
      )}
    </div>
  );
};

export default Search;