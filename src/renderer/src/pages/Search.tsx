import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Clock, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLibraryStore } from '../stores/useLibraryStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import TrackList from '../components/TrackList';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tracks: any[];
    albums: any[];
    artists: any[];
  }>({ tracks: [], albums: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { searchLibrary } = useLibraryStore();
  const { play, setQueue } = usePlayerStore();

  useEffect(() => {
    // Focus search input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.trim()) {
      setIsSearching(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          const searchResults = await searchLibrary(query.trim());
          setResults(searchResults);
        } catch (error) {
          console.error('Search error:', error);
          setResults({ tracks: [], albums: [], artists: [] });
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setResults({ tracks: [], albums: [], artists: [] });
      setIsSearching(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, searchLibrary]);

  const handlePlayTrack = (track: any, tracks: any[] = []) => {
    const trackList = tracks.length > 0 ? tracks : [track];
    const index = trackList.findIndex(t => t.id === track.id);
    setQueue(trackList, Math.max(0, index));
    play(track);
  };

  const hasResults = results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-8 pb-6">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-full pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto px-8">
        {!query.trim() && !hasResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64"
          >
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Start searching</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Search for your favorite songs, albums, and artists in your library
            </p>
          </motion.div>
        )}

        {query.trim() && !isSearching && !hasResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64"
          >
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No results found</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Try different keywords or add more music to your library
            </p>
          </motion.div>
        )}

        {hasResults && (
          <div className="space-y-8 pb-8">
            {/* Top Result */}
            {results.tracks.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Top result</h2>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card/30 rounded-xl p-6 max-w-sm cursor-pointer group hover:bg-card/50 transition-colors"
                  onClick={() => handlePlayTrack(results.tracks[0], results.tracks)}
                >
                  <div className="w-20 h-20 bg-muted rounded-lg mb-4 overflow-hidden">
                    {results.tracks[0].cover ? (
                      <img 
                        src={results.tracks[0].cover} 
                        alt={`${results.tracks[0].title} cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2 truncate">
                    {results.tracks[0].title}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Mic className="w-4 h-4" />
                    <span>Song • {results.tracks[0].artist_name || 'Unknown Artist'}</span>
                  </div>
                </motion.div>
              </section>
            )}

            {/* Songs */}
            {results.tracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Songs</h2>
                  {results.tracks.length > 5 && (
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Show all
                    </button>
                  )}
                </div>
                <TrackList 
                  tracks={results.tracks.slice(0, 5)}
                  onPlayTrack={(track) => handlePlayTrack(track, results.tracks)}
                  showCover
                  showIndex
                />
              </section>
            )}

            {/* Albums */}
            {results.albums.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Albums</h2>
                  {results.albums.length > 6 && (
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Show all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.albums.slice(0, 6).map((album, index) => (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="album-card"
                    >
                      <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {album.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {album.artist_name || 'Various Artists'}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Artists */}
            {results.artists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Artists</h2>
                  {results.artists.length > 6 && (
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Show all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.artists.slice(0, 6).map((artist, index) => (
                    <motion.div
                      key={artist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="album-card text-center"
                    >
                      <div className="aspect-square bg-muted rounded-full mb-3 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          <div className="w-8 h-8 bg-muted-foreground/20 rounded-full" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {artist.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Artist
                      </p>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}