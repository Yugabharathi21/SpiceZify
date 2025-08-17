import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Grid3X3, 
  List, 
  Search, 
  Heart, 
  Play,
  Users,
  Music,
  Disc3,
  Filter
} from 'lucide-react';
import { useArtistStore } from '../stores/useArtistStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { ArtistWithStats } from '../types/database';

const ArtistCard: React.FC<{ 
  artist: ArtistWithStats; 
  onPlay: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
}> = ({ artist, onPlay, onToggleFavorite, isFavorited }) => {
  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Artist Cover */}
      <div className="aspect-square relative">
        {artist.cover_url ? (
          <img
            src={artist.cover_url}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
            <Users className="w-16 h-16 text-white opacity-80" />
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

        {/* Favorite Button */}
        <button
          onClick={onToggleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
            isFavorited 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 hover:bg-white text-gray-600'
          }`}
        >
          <Heart 
            className="w-4 h-4" 
            fill={isFavorited ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Artist Info */}
      <div className="p-4">
        <Link 
          to={`/artist/${artist.id}`}
          className="block hover:text-purple-600 transition-colors duration-200"
        >
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {artist.name}
          </h3>
        </Link>
        
        {artist.description && (
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {artist.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Disc3 className="w-4 h-4" />
            <span>{artist.album_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Music className="w-4 h-4" />
            <span>{artist.track_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{artist.favorite_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArtistListItem: React.FC<{ 
  artist: ArtistWithStats; 
  onPlay: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
}> = ({ artist, onPlay, onToggleFavorite, isFavorited }) => {
  return (
    <div className="group flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150">
      {/* Artist Cover */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        {artist.cover_url ? (
          <img
            src={artist.cover_url}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
            <Users className="w-6 h-6 text-white opacity-80" />
          </div>
        )}
      </div>

      {/* Artist Info */}
      <div className="flex-1 min-w-0">
        <Link 
          to={`/artist/${artist.id}`}
          className="block hover:text-purple-600 transition-colors duration-200"
        >
          <h3 className="font-medium text-gray-900 truncate">
            {artist.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
          <span>{artist.album_count || 0} albums</span>
          <span>{artist.track_count || 0} tracks</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={onToggleFavorite}
          className={`p-2 rounded-full transition-colors duration-200 ${
            isFavorited 
              ? 'text-red-500 hover:text-red-600' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Heart 
            className="w-4 h-4" 
            fill={isFavorited ? "currentColor" : "none"}
          />
        </button>
        
        <button
          onClick={onPlay}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors duration-200"
        >
          <Play className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Artists: React.FC = () => {
  const { user } = useAuthStore();
  const {
    artists,
    artistsViewMode,
    artistFavorites,
    loading,
    errors,
    setArtistsViewMode,
    loadArtists,
    loadArtistFavorites,
    toggleArtistFavorite,
    playArtist,
    searchArtists,
    sortArtists,
  } = useArtistStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'album_count' | 'track_count' | 'favorite_count'>('name');
  const [filteredArtists, setFilteredArtists] = useState<ArtistWithStats[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadArtists();
    if (user?.id) {
      loadArtistFavorites(user.id);
    }
  }, [loadArtists, loadArtistFavorites, user?.id]);

  // Update filtered artists when search, sort, or artists change
  useEffect(() => {
    let result = artists;

    // Apply search
    if (searchQuery) {
      result = searchArtists(searchQuery);
    }

    // Apply sorting
    result = sortArtists(sortBy);

    setFilteredArtists(result);
  }, [artists, searchQuery, sortBy, searchArtists, sortArtists]);

  const handlePlay = async (artist: ArtistWithStats) => {
    try {
      const result = await playArtist(artist);
      if (result) {
        console.log('Playing artist:', artist.name, 'with', result.tracks.length, 'tracks');
        // Here you would integrate with your player store to start playback
      }
    } catch (error) {
      console.error('Error playing artist:', error);
    }
  };

  const handleToggleFavorite = async (artistId: string) => {
    if (!user?.id) return;
    await toggleArtistFavorite(user.id, artistId);
  };

  const isFavorited = (artistId: string) => {
    return artistFavorites.some(fav => fav.artist_id === artistId);
  };

  if (loading.artists) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artists...</p>
        </div>
      </div>
    );
  }

  if (errors.artists) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p>Error loading artists: {errors.artists}</p>
          <button 
            onClick={() => loadArtists()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Artists</h1>
          <p className="text-gray-600 mt-1">
            {filteredArtists.length} {filteredArtists.length === 1 ? 'artist' : 'artists'}
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setArtistsViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                artistsViewMode === 'grid'
                  ? 'bg-white shadow-sm text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setArtistsViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                artistsViewMode === 'list'
                  ? 'bg-white shadow-sm text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'album_count' | 'track_count' | 'favorite_count')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
          >
            <option value="name">Name</option>
            <option value="album_count">Albums</option>
            <option value="track_count">Tracks</option>
            <option value="favorite_count">Favorites</option>
          </select>
        </div>
      </div>

      {/* Artists List */}
      {filteredArtists.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No artists found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search terms.' : 'Your artist library is empty.'}
          </p>
        </div>
      ) : (
        <div className={
          artistsViewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
            : 'space-y-1'
        }>
          {filteredArtists.map((artist) => (
            artistsViewMode === 'grid' ? (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onPlay={() => handlePlay(artist)}
                onToggleFavorite={() => handleToggleFavorite(artist.id)}
                isFavorited={isFavorited(artist.id)}
              />
            ) : (
              <ArtistListItem
                key={artist.id}
                artist={artist}
                onPlay={() => handlePlay(artist)}
                onToggleFavorite={() => handleToggleFavorite(artist.id)}
                isFavorited={isFavorited(artist.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default Artists;
