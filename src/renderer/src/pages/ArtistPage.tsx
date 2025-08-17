import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Heart, 
  ArrowLeft, 
  Users, 
  Music, 
  Disc3,
  ExternalLink
} from 'lucide-react';
import { useArtistStore } from '../stores/useArtistStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { AlbumWithArtist, TrackWithDetails } from '../types/database';

const TrackRow: React.FC<{ 
  track: TrackWithDetails;
  index: number;
  onPlay: () => void;
  isPlaying?: boolean;
}> = ({ track, index, onPlay, isPlaying = false }) => {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`group flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors ${
      isPlaying ? 'bg-purple-50' : ''
    }`}>
      {/* Track Number / Play Button */}
      <div className="w-8 flex items-center justify-center">
        <span className="text-sm text-gray-500 group-hover:hidden">
          {index + 1}
        </span>
        <button
          onClick={onPlay}
          className="hidden group-hover:flex items-center justify-center w-8 h-8 text-gray-600 hover:text-purple-600 transition-colors"
        >
          <Play className="w-4 h-4" fill="currentColor" />
        </button>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium truncate ${
          isPlaying ? 'text-purple-600' : 'text-gray-900'
        }`}>
          {track.title}
        </h4>
        {track.album && (
          <p className="text-sm text-gray-600 truncate mt-0.5">
            {track.album.name}
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="text-sm text-gray-500">
        {formatDuration(track.duration_ms)}
      </div>
    </div>
  );
};

const AlbumCard: React.FC<{ 
  album: AlbumWithArtist;
  onPlay: () => void;
}> = ({ album, onPlay }) => {
  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Album Cover */}
      <div className="aspect-square relative">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.name}
            className="w-full h-full object-cover rounded-t-xl"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center rounded-t-xl">
            <Disc3 className="w-12 h-12 text-white opacity-80" />
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
          <button
            onClick={onPlay}
            className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg"
          >
            <Play className="w-6 h-6 ml-1" fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Album Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
          {album.name}
        </h3>
        
        {album.release_date && (
          <p className="text-gray-500 text-xs mt-1">
            {new Date(album.release_date).getFullYear()}
          </p>
        )}
      </div>
    </div>
  );
};

const Artist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentArtist,
    currentArtistStats,
    currentArtistAlbums,
    currentArtistTracks,
    loading,
    errors,
    loadArtist,
    loadArtistStats,
    loadArtistAlbums,
    loadArtistTracks,
    toggleArtistFavorite,
    checkIfArtistFavorited,
    playArtist,
    recordPlay,
    clearCurrentArtist,
  } = useArtistStore();

  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'albums' | 'tracks'>('overview');

  // Load artist data
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      await loadArtist(id);
      await loadArtistStats(id);
      await loadArtistAlbums(id);
      await loadArtistTracks(id);
    };

    loadData();

    return () => {
      clearCurrentArtist();
    };
  }, [id, loadArtist, loadArtistStats, loadArtistAlbums, loadArtistTracks, clearCurrentArtist]);

  // Check if favorited
  useEffect(() => {
    if (user?.id && id) {
      checkIfArtistFavorited(user.id, id).then(setIsFavorited);
    }
  }, [user?.id, id, checkIfArtistFavorited]);

  const handlePlay = async () => {
    if (!currentArtist || !user?.id) return;

    try {
      const result = await playArtist(currentArtist);
      if (result) {
        console.log('Playing artist:', currentArtist.name, 'with', result.tracks.length, 'tracks');
        // Here you would integrate with your player store to start playback
        
        // Record the play
        await recordPlay(user.id, currentArtist.id);
      }
    } catch (error) {
      console.error('Error playing artist:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user?.id || !id) return;
    
    await toggleArtistFavorite(user.id, id);
    setIsFavorited(!isFavorited);
  };

  const handleTrackPlay = (track: TrackWithDetails, index: number) => {
    console.log('Playing track:', track.title, 'at index:', index);
    // Here you would integrate with your player store to play specific track
  };

  const handleAlbumPlay = (album: AlbumWithArtist) => {
    console.log('Playing album:', album.name);
    // Here you would integrate with your player store to play album
  };

  if (loading.currentArtist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artist...</p>
        </div>
      </div>
    );
  }

  if (errors.currentArtist || !currentArtist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p>Error loading artist: {errors.currentArtist || 'Artist not found'}</p>
          <button 
            onClick={() => navigate('/artists')}
            className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Artists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Artist Cover */}
        <div className="w-48 h-48 rounded-xl overflow-hidden flex-shrink-0">
          {currentArtist.cover_url ? (
            <img
              src={currentArtist.cover_url}
              alt={currentArtist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <Users className="w-24 h-24 text-white opacity-80" />
            </div>
          )}
        </div>

        {/* Artist Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-purple-600 font-medium mb-2">ARTIST</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {currentArtist.name}
          </h1>
          
          {currentArtist.description && (
            <p className="text-gray-600 mb-4 leading-relaxed">
              {currentArtist.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-1">
              <Disc3 className="w-4 h-4" />
              <span>{currentArtistAlbums.length} albums</span>
            </div>
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              <span>{currentArtistTracks.length} tracks</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{(currentArtistStats?.favorite_count ?? 0)} likes</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Play Artist
            </button>
            
            <button
              onClick={handleToggleFavorite}
              className={`p-3 rounded-lg border transition-colors ${
                isFavorited
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Heart 
                className="w-5 h-5" 
                fill={isFavorited ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['overview', 'albums', 'tracks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Popular Tracks */}
          {currentArtistTracks.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Tracks</h2>
              <div className="space-y-1">
                {currentArtistTracks.slice(0, 5).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    onPlay={() => handleTrackPlay(track, index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {currentArtistAlbums.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Albums</h2>
                {currentArtistAlbums.length > 6 && (
                  <button
                    onClick={() => setActiveTab('albums')}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                  >
                    View all
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentArtistAlbums.slice(0, 6).map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onPlay={() => handleAlbumPlay(album)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'albums' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Albums ({currentArtistAlbums.length})
          </h2>
          {currentArtistAlbums.length === 0 ? (
            <div className="text-center py-12">
              <Disc3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No albums found</h3>
              <p className="text-gray-600">This artist has no albums in your library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentArtistAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onPlay={() => handleAlbumPlay(album)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tracks' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            All Tracks ({currentArtistTracks.length})
          </h2>
          {currentArtistTracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tracks found</h3>
              <p className="text-gray-600">This artist has no tracks in your library.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {currentArtistTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  onPlay={() => handleTrackPlay(track, index)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Artist;
