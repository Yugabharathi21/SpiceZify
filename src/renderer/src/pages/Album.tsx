import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Heart, 
  MoreHorizontal, 
  Shuffle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLibraryStore } from '../stores/useLibraryStore';
import { usePlayerStore, Track } from '../stores/usePlayerStore';
import AlbumCover from '../components/AlbumCover';
import TrackList from '../components/TrackList';

export default function Album() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    currentAlbum, 
    currentAlbumTracks, 
    loadAlbum,
    toggleAlbumFavorite
  } = useLibraryStore();
  
  const { 
    currentTrack, 
    isPlaying, 
    play, 
    pause,
    setQueue 
  } = usePlayerStore();

  useEffect(() => {
    const loadAlbumData = async () => {
      if (!albumId) {
        navigate('/library');
        return;
      }

      try {
        setIsLoading(true);
        await loadAlbum(parseInt(albumId));
      } catch (error) {
        console.error('Error loading album:', error);
        toast.error('Failed to load album');
        navigate('/library');
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbumData();
  }, [albumId, loadAlbum, navigate]);

  const handlePlayAlbum = (startTrackIndex: number = 0) => {
    if (!currentAlbum || currentAlbumTracks.length === 0) return;

    // Set the album tracks as the queue
    setQueue(currentAlbumTracks, startTrackIndex);
    
    // Play the selected track (or first track)
    const trackToPlay = currentAlbumTracks[startTrackIndex] || currentAlbumTracks[0];
    play(trackToPlay);
    
    console.log('🎵 Playing album:', currentAlbum.name, 'starting at track:', startTrackIndex);
  };

  const handlePlayTrack = (track: Track) => {
    const trackIndex = currentAlbumTracks.findIndex(t => t.id === track.id);
    handlePlayAlbum(trackIndex >= 0 ? trackIndex : 0);
  };

  const handleToggleFavorite = async () => {
    if (!currentAlbum) return;
    
    try {
      await toggleAlbumFavorite(currentAlbum.id);
      toast.success(
        currentAlbum.is_favorite 
          ? 'Removed from favorites' 
          : 'Added to favorites'
      );
    } catch {
      toast.error('Failed to update favorites');
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const getCurrentlyPlayingAlbumTrack = () => {
    if (!currentTrack) return null;
    return currentAlbumTracks.find(track => track.id === currentTrack.id);
  };

  const isCurrentAlbumPlaying = () => {
    return getCurrentlyPlayingAlbumTrack() !== null && isPlaying;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted animate-pulse rounded-lg mb-4 mx-auto" />
          <p className="text-muted-foreground">Loading album...</p>
        </div>
      </div>
    );
  }

  if (!currentAlbum) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Album not found</h2>
          <p className="text-muted-foreground mb-6">
            The requested album could not be found.
          </p>
          <button
            onClick={() => navigate('/library')}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Get a representative track for cover display
  const representativeTrack = currentAlbumTracks[0];

  return (
    <div className="h-full overflow-y-auto">
      {/* Album Header */}
      <div 
        className="relative"
        style={{
          background: `linear-gradient(180deg, 
            rgba(var(--primary-rgb, 59, 130, 246), 0.4) 0%, 
            rgba(var(--background-rgb, 0, 0, 0), 0.8) 70%,
            rgb(var(--background-rgb, 0, 0, 0)) 100%)`
        }}
      >
        {/* Navigation */}
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={() => navigate('/library')}
            className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Album Info */}
        <div className="p-8 pt-20">
          <div className="flex items-end gap-8 max-w-7xl">
            {/* Album Cover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0"
            >
              <div className="w-64 h-64 bg-muted rounded-2xl overflow-hidden shadow-2xl">
                {representativeTrack ? (
                  <AlbumCover
                    trackId={representativeTrack.id}
                    className="w-full h-full"
                    size="custom"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <div className="w-16 h-16 bg-muted-foreground/20 rounded" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Album Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-white/80 mb-2">Album</p>
              <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
                {currentAlbum.name}
              </h1>
              
              {/* Album Metadata */}
              <div className="flex items-center gap-1 text-white/90 mb-6">
                {currentAlbum.artist_name && (
                  <>
                    <span className="font-semibold hover:underline cursor-pointer">
                      {currentAlbum.artist_name}
                    </span>
                    <span className="mx-1">•</span>
                  </>
                )}
                {currentAlbum.year && (
                  <>
                    <span>{currentAlbum.year}</span>
                    <span className="mx-1">•</span>
                  </>
                )}
                <span>{currentAlbumTracks.length} song{currentAlbumTracks.length !== 1 ? 's' : ''}</span>
                {currentAlbum.total_duration && (
                  <>
                    <span className="mx-1">•</span>
                    <span>{formatDuration(currentAlbum.total_duration)}</span>
                  </>
                )}
              </div>

              {/* Description */}
              {currentAlbum.description && (
                <p className="text-white/70 text-sm mb-6 max-w-2xl line-clamp-3">
                  {currentAlbum.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Play/Pause Button */}
                <button
                  onClick={() => isCurrentAlbumPlaying() ? pause() : handlePlayAlbum()}
                  className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  {isCurrentAlbumPlaying() ? (
                    <Pause className="w-6 h-6 text-black" />
                  ) : (
                    <Play className="w-6 h-6 text-black ml-1" />
                  )}
                </button>

                {/* Shuffle Play */}
                <button
                  onClick={() => {
                    // TODO: Implement shuffle play
                    handlePlayAlbum();
                  }}
                  className="w-14 h-14 border-2 border-white/20 hover:border-white/40 rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <Shuffle className="w-5 h-5 text-white" />
                </button>

                {/* Favorite Button */}
                <button
                  onClick={handleToggleFavorite}
                  className="w-12 h-12 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                  <Heart 
                    className={`w-6 h-6 ${
                      currentAlbum.is_favorite 
                        ? 'fill-green-500 text-green-500' 
                        : 'text-white/60 hover:text-white'
                    }`} 
                  />
                </button>

                {/* More Options */}
                <button className="w-12 h-12 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors">
                  <MoreHorizontal className="w-6 h-6 text-white/60 hover:text-white" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {currentAlbumTracks.length > 0 ? (
            <TrackList
              tracks={currentAlbumTracks}
              onPlayTrack={handlePlayTrack}
              showCover={false} // Album page doesn't need individual covers
              showIndex={true}
              showAlbum={false} // We're already in an album
              showDuration={true}
            />
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No tracks found</h3>
              <p className="text-muted-foreground">
                This album appears to be empty.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
