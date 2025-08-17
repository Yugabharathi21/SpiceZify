import React, { useState, useEffect } from 'react';
import { Plus, FolderPlus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLibraryStore } from '../stores/useLibraryStore';
import TrackList from '../components/TrackList';
import { usePlayerStore } from '../stores/usePlayerStore';

export default function Library() {
  const [view, setView] = useState<'tracks' | 'albums' | 'artists'>('tracks');
  const {
    tracks,
    albums,
    artists,
    isScanning,
    scanProgress,
    currentScanFile,
    loadLibrary,
    scanFolders
  } = useLibraryStore();
  const { play, setQueue } = usePlayerStore();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleAddFolders = async () => {
    try {
      const folders = await window.electronAPI.chooseFolders();
      if (folders.length > 0) {
        await scanFolders(folders);
        toast.success(`Scanned ${folders.length} folder${folders.length > 1 ? 's' : ''} successfully`);
      }
    } catch (error) {
      console.error('Error adding folders:', error);
      toast.error('Failed to scan folders');
    }
  };

  const handlePlayTrack = (track: any) => {
    setQueue([track]);
    play(track);
  };

  const viewButtons = [
    { id: 'tracks', label: 'Songs', count: tracks.length },
    { id: 'albums', label: 'Albums', count: albums.length },
    { id: 'artists', label: 'Artists', count: artists.length },
  ];

  if (tracks.length === 0 && !isScanning) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-xl"
        >
          {/* Spotify-style centered circle */}
          <div
            className="w-40 h-40 rounded-full mb-8 mx-auto flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, rgba(18,26,37,1), rgba(10,14,18,1))',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6), 0 8px 30px rgba(2,6,10,0.6)'
            }}
          >
            <div className="flex items-center justify-center w-full h-full">
              <FolderPlus className="w-16 h-16 text-white block" strokeWidth={1.5} />
            </div>
          </div>

          <h2 className="text-4xl font-extrabold mb-4">Your library is empty</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Add your music folders to start building your personal music library
          </p>

          <button
            onClick={handleAddFolders}
            className="px-8 py-3 rounded-full font-semibold inline-flex items-center gap-3"
            style={{
              background: '#1DB954',
              color: '#062018',
              boxShadow: '0 8px 20px rgba(29,185,84,0.18)'
            }}
          >
            <Plus className="w-5 h-5 text-black" />
            Add Music Folders
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-8 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Library</h1>
            <p className="text-muted-foreground">
              {tracks.length} songs • {albums.length} albums • {artists.length} artists
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddFolders}
              disabled={isScanning}
              className="bg-muted text-foreground px-4 py-2 rounded-full hover:bg-muted/80 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Folders
            </button>
          </div>
        </div>

        {/* Scan Progress */}
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-card/50 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scanning library...</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(scanProgress)}%
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-200"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            {currentScanFile && (
              <p className="text-xs text-muted-foreground truncate">
                {currentScanFile}
              </p>
            )}
          </motion.div>
        )}

        {/* View Selector */}
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full">
          {viewButtons.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setView(id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                view === id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'tracks' && (
          <div className="p-8">
            <TrackList
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              showCover
              showIndex
              showAlbum
              showDuration
            />
          </div>
        )}

        {view === 'albums' && (
          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {albums.map((album, index) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="album-card"
                >
                  <div className="aspect-square bg-muted rounded-xl mb-4 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <div className="w-12 h-12 bg-muted-foreground/20 rounded" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-base truncate mb-1">
                    {album.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate mb-1">
                    {album.artist_name || 'Various Artists'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {album.track_count} song{album.track_count !== 1 ? 's' : ''}
                    {album.year && ` • ${album.year}`}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {view === 'artists' && (
          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {artists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="album-card text-center"
                >
                  <div className="aspect-square bg-muted rounded-full mb-4 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <div className="w-12 h-12 bg-muted-foreground/20 rounded-full" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-base truncate mb-1">
                    {artist.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {artist.track_count} song{artist.track_count !== 1 ? 's' : ''}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}