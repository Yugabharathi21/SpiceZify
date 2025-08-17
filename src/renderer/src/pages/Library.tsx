import React, { useState, useEffect } from 'react';
import { Plus, FolderPlus, RefreshCw, Grid3X3, List, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore, Album } from '../stores/useLibraryStore';
import { usePlayerStore, Track } from '../stores/usePlayerStore';
import TrackList from '../components/TrackList';
import AlbumCover from '../components/AlbumCover';

export default function Library() {
  const [view, setView] = useState<'tracks' | 'albums' | 'artists'>('tracks');
  const navigate = useNavigate();
  const {
    tracks,
    albums,
    artists,
    isScanning,
    scanProgress,
    currentScanFile,
    loadLibrary,
    scanFolders,
    albumsViewMode,
    setAlbumsViewMode,
    getAlbumTracks
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

  const handlePlayTrack = (track: Track) => {
    // Find the index of the clicked track in the full tracks list
    const trackIndex = tracks.findIndex(t => t.id === track.id);
    
    // Set the entire tracks list as the queue with the correct starting index
    setQueue(tracks, trackIndex >= 0 ? trackIndex : 0);
    
    // Play the selected track
    play(track);
    
    console.log('🎵 Playing track:', track.title, 'at index:', trackIndex, 'of', tracks.length, 'tracks');
  };

  const handleAlbumClick = (album: Album) => {
    navigate(`/album/${album.id}`);
  };

  const handlePlayAlbum = (album: Album, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    const albumTracks = getAlbumTracks(album.id);
    if (albumTracks.length === 0) return;

    setQueue(albumTracks, 0);
    play(albumTracks[0]);
    
    console.log('🎵 Playing album:', album.name, 'with', albumTracks.length, 'tracks');
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
              onClick={() => setView(id as 'tracks' | 'albums' | 'artists')}
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
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Albums</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAlbumsViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    albumsViewMode === 'grid' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAlbumsViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    albumsViewMode === 'list' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Albums Grid/List View */}
            {albumsViewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {albums.map((album, index) => {
                  const albumTracks = getAlbumTracks(album.id);
                  const representativeTrack = albumTracks[0];
                  
                  return (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="album-card group cursor-pointer"
                      onClick={() => handleAlbumClick(album)}
                    >
                      <div className="aspect-square bg-muted rounded-xl mb-4 overflow-hidden relative">
                        {representativeTrack ? (
                          <AlbumCover
                            trackId={representativeTrack.id}
                            className="w-full h-full"
                            size="custom"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                            <div className="w-12 h-12 bg-muted-foreground/20 rounded" />
                          </div>
                        )}
                        {/* Play Button Overlay */}
                        <button
                          onClick={(e) => handlePlayAlbum(album, e)}
                          className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-105"
                        >
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-base truncate mb-1">
                        {album.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        {album.artist_name || 'Various Artists'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {albumTracks.length} song{albumTracks.length !== 1 ? 's' : ''}
                        {album.year && ` • ${album.year}`}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {albums.map((album, index) => {
                  const albumTracks = getAlbumTracks(album.id);
                  const representativeTrack = albumTracks[0];
                  
                  return (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                      onClick={() => handleAlbumClick(album)}
                    >
                      {/* Album Cover */}
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {representativeTrack ? (
                          <AlbumCover
                            trackId={representativeTrack.id}
                            className="w-full h-full"
                            size="custom"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                            <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
                          </div>
                        )}
                      </div>

                      {/* Album Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate mb-1">
                          {album.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{album.artist_name || 'Various Artists'}</span>
                          <span>•</span>
                          <span>{albumTracks.length} song{albumTracks.length !== 1 ? 's' : ''}</span>
                          {album.year && (
                            <>
                              <span>•</span>
                              <span>{album.year}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Play Button */}
                      <button
                        onClick={(e) => handlePlayAlbum(album, e)}
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
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