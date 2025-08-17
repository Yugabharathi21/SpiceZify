import { create } from 'zustand';
import {
  Artist,
  ArtistWithStats,
  ArtistWithPopularTracks,
  AlbumWithArtist,
  TrackWithDetails,
  ArtistFavorite,
} from '../types/database';
import {
  getArtists,
  getArtist,
  getArtistWithStats,
  getArtistWithPopularTracks,
  getAlbumsByArtist,
  getTracksByArtist,
  createArtist,
  updateArtist,
  deleteArtist,
  getArtistFavorites,
  addArtistFavorite,
  removeArtistFavorite,
  isArtistFavorited,
  recordArtistPlay,
} from '../lib/database';

interface ArtistState {
  // Data
  artists: ArtistWithStats[];
  currentArtist: Artist | null;
  currentArtistStats: ArtistWithStats | null;
  currentArtistPopularTracks: ArtistWithPopularTracks | null;
  currentArtistAlbums: AlbumWithArtist[];
  currentArtistTracks: TrackWithDetails[];
  artistFavorites: ArtistFavorite[];
  
  // View state
  artistsViewMode: 'grid' | 'list';
  loading: {
    artists: boolean;
    currentArtist: boolean;
    favorites: boolean;
  };
  errors: {
    artists: string | null;
    currentArtist: string | null;
    favorites: string | null;
  };
  
  // Actions
  setArtistsViewMode: (mode: 'grid' | 'list') => void;
  
  // Data loading
  loadArtists: () => Promise<void>;
  loadArtist: (id: string) => Promise<void>;
  loadArtistStats: (id: string) => Promise<void>;
  loadArtistPopularTracks: (id: string) => Promise<void>;
  loadArtistAlbums: (artistId: string) => Promise<void>;
  loadArtistTracks: (artistId: string) => Promise<void>;
  loadArtistFavorites: (userId: string) => Promise<void>;
  
  // CRUD operations
  createNewArtist: (name: string, description?: string, coverUrl?: string) => Promise<Artist | null>;
  updateArtistInfo: (id: string, updates: { name?: string; description?: string; cover_url?: string }) => Promise<Artist | null>;
  deleteArtistById: (id: string) => Promise<boolean>;
  
  // Favorites
  toggleArtistFavorite: (userId: string, artistId: string) => Promise<void>;
  checkIfArtistFavorited: (userId: string, artistId: string) => Promise<boolean>;
  
  // Playback
  playArtist: (artist: Artist, startTrackIndex?: number) => Promise<{ tracks: TrackWithDetails[]; startIndex: number } | null>;
  playArtistPopularTracks: (artistId: string) => Promise<{ tracks: TrackWithDetails[]; startIndex: number } | null>;
  recordPlay: (userId: string, artistId: string) => Promise<void>;
  
  // Search and filter
  searchArtists: (query: string) => ArtistWithStats[];
  filterArtistsByGenre: (genre: string) => ArtistWithStats[];
  sortArtists: (sortBy: 'name' | 'album_count' | 'track_count' | 'favorite_count') => ArtistWithStats[];
  
  // Cleanup
  clearCurrentArtist: () => void;
  clearErrors: () => void;
}

export const useArtistStore = create<ArtistState>((set, get) => ({
  // Initial state
  artists: [],
  currentArtist: null,
  currentArtistStats: null,
  currentArtistPopularTracks: null,
  currentArtistAlbums: [],
  currentArtistTracks: [],
  artistFavorites: [],
  
  artistsViewMode: 'grid',
  loading: {
    artists: false,
    currentArtist: false,
    favorites: false,
  },
  errors: {
    artists: null,
    currentArtist: null,
    favorites: null,
  },

  // View actions
  setArtistsViewMode: (mode) => set({ artistsViewMode: mode }),

  // Data loading
  loadArtists: async () => {
    set(state => ({
      loading: { ...state.loading, artists: true },
      errors: { ...state.errors, artists: null },
    }));

    try {
      const { data, error } = await getArtists();
      
      if (error) {
        set(state => ({
          loading: { ...state.loading, artists: false },
          errors: { ...state.errors, artists: error },
        }));
        return;
      }

      set(state => ({
        artists: data || [],
        loading: { ...state.loading, artists: false },
        errors: { ...state.errors, artists: null },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set(state => ({
        loading: { ...state.loading, artists: false },
        errors: { ...state.errors, artists: message },
      }));
    }
  },

  loadArtist: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, currentArtist: true },
      errors: { ...state.errors, currentArtist: null },
    }));

    try {
      const { data, error } = await getArtist(id);
      
      if (error) {
        set(state => ({
          loading: { ...state.loading, currentArtist: false },
          errors: { ...state.errors, currentArtist: error },
        }));
        return;
      }

      set(state => ({
        currentArtist: data,
        loading: { ...state.loading, currentArtist: false },
        errors: { ...state.errors, currentArtist: null },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set(state => ({
        loading: { ...state.loading, currentArtist: false },
        errors: { ...state.errors, currentArtist: message },
      }));
    }
  },

  loadArtistStats: async (id: string) => {
    try {
      const { data } = await getArtistWithStats(id);
      set({ currentArtistStats: data });
    } catch (error) {
      console.error('Error loading artist stats:', error);
    }
  },

  loadArtistPopularTracks: async (id: string) => {
    try {
      const { data } = await getArtistWithPopularTracks(id);
      set({ currentArtistPopularTracks: data });
    } catch (error) {
      console.error('Error loading artist popular tracks:', error);
    }
  },

  loadArtistAlbums: async (artistId: string) => {
    try {
      const { data } = await getAlbumsByArtist(artistId);
      set({ currentArtistAlbums: data || [] });
    } catch (error) {
      console.error('Error loading artist albums:', error);
    }
  },

  loadArtistTracks: async (artistId: string) => {
    try {
      const { data } = await getTracksByArtist(artistId);
      set({ currentArtistTracks: data || [] });
    } catch (error) {
      console.error('Error loading artist tracks:', error);
    }
  },

  loadArtistFavorites: async (userId: string) => {
    set(state => ({
      loading: { ...state.loading, favorites: true },
      errors: { ...state.errors, favorites: null },
    }));

    try {
      const { data, error } = await getArtistFavorites(userId);
      
      if (error) {
        set(state => ({
          loading: { ...state.loading, favorites: false },
          errors: { ...state.errors, favorites: error },
        }));
        return;
      }

      set(state => ({
        artistFavorites: data || [],
        loading: { ...state.loading, favorites: false },
        errors: { ...state.errors, favorites: null },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set(state => ({
        loading: { ...state.loading, favorites: false },
        errors: { ...state.errors, favorites: message },
      }));
    }
  },

  // CRUD operations
  createNewArtist: async (name: string, description?: string, coverUrl?: string) => {
    try {
      const { data, error } = await createArtist({
        name,
        description: description || undefined,
        cover_url: coverUrl || undefined,
      });

      if (error || !data) {
        console.error('Error creating artist:', error);
        return null;
      }

      // Reload artists list
      await get().loadArtists();
      return data;
    } catch (error) {
      console.error('Error creating artist:', error);
      return null;
    }
  },

  updateArtistInfo: async (id: string, updates) => {
    try {
      const { data, error } = await updateArtist(id, updates);

      if (error || !data) {
        console.error('Error updating artist:', error);
        return null;
      }

      // Update current artist if it's the one being updated
      const { currentArtist } = get();
      if (currentArtist && currentArtist.id === id) {
        set({ currentArtist: data });
      }

      // Reload artists list
      await get().loadArtists();
      return data;
    } catch (error) {
      console.error('Error updating artist:', error);
      return null;
    }
  },

  deleteArtistById: async (id: string) => {
    try {
      const { error } = await deleteArtist(id);

      if (error) {
        console.error('Error deleting artist:', error);
        return false;
      }

      // Clear current artist if it's the one being deleted
      const { currentArtist } = get();
      if (currentArtist && currentArtist.id === id) {
        get().clearCurrentArtist();
      }

      // Reload artists list
      await get().loadArtists();
      return true;
    } catch (error) {
      console.error('Error deleting artist:', error);
      return false;
    }
  },

  // Favorites
  toggleArtistFavorite: async (userId: string, artistId: string) => {
    try {
      const isFavorited = await get().checkIfArtistFavorited(userId, artistId);
      
      if (isFavorited) {
        const { error } = await removeArtistFavorite(userId, artistId);
        if (error) {
          console.error('Error removing favorite:', error);
          return;
        }
      } else {
        const { error } = await addArtistFavorite(userId, artistId);
        if (error) {
          console.error('Error adding favorite:', error);
          return;
        }
      }

      // Reload favorites
      await get().loadArtistFavorites(userId);
    } catch (error) {
      console.error('Error toggling artist favorite:', error);
    }
  },

  checkIfArtistFavorited: async (userId: string, artistId: string) => {
    try {
      const { data } = await isArtistFavorited(userId, artistId);
      return data;
    } catch (error) {
      console.error('Error checking if artist favorited:', error);
      return false;
    }
  },

  // Playback
  playArtist: async (artist: Artist, startTrackIndex: number = 0) => {
    try {
      // Load artist tracks if not already loaded
      const { currentArtistTracks } = get();
      let tracks = currentArtistTracks;
      
      if (tracks.length === 0 || tracks[0]?.artist_id !== artist.id) {
        await get().loadArtistTracks(artist.id);
        tracks = get().currentArtistTracks;
      }

      if (tracks.length === 0) {
        console.warn('No tracks found for artist:', artist.name);
        return null;
      }

      return { 
        tracks, 
        startIndex: Math.max(0, Math.min(startTrackIndex, tracks.length - 1)) 
      };
    } catch (error) {
      console.error('Error preparing artist playback:', error);
      return null;
    }
  },

  playArtistPopularTracks: async (artistId: string) => {
    try {
      const { data } = await getArtistWithPopularTracks(artistId);
      
      if (!data || !data.popular_tracks || data.popular_tracks.length === 0) {
        // Fallback to regular artist tracks
        return await get().playArtist({ id: artistId } as Artist);
      }

      // For popular tracks, we'll just return the simplified format
      // The actual playback will need to handle PopularTrack format
      // or we'll need to fetch full track details
      console.log('Playing popular tracks for artist:', artistId);
      
      // For now, fallback to regular tracks until we can properly map PopularTrack to TrackWithDetails
      return await get().playArtist({ id: artistId } as Artist);
    } catch (error) {
      console.error('Error preparing popular tracks playback:', error);
      return null;
    }
  },

  recordPlay: async (userId: string, artistId: string) => {
    try {
      await recordArtistPlay(userId, artistId);
    } catch (error) {
      console.error('Error recording artist play:', error);
    }
  },

  // Search and filter
  searchArtists: (query: string) => {
    const { artists } = get();
    const lowercaseQuery = query.toLowerCase();
    
    return artists.filter(artist =>
      artist.name.toLowerCase().includes(lowercaseQuery) ||
      (artist.description && artist.description.toLowerCase().includes(lowercaseQuery))
    );
  },

  filterArtistsByGenre: (genre: string) => {
    const { artists } = get();
    // Note: This would require genre information in the artist or related tables
    // For now, return all artists
    console.log('Genre filtering not yet implemented:', genre);
    return artists;
  },

  sortArtists: (sortBy: 'name' | 'album_count' | 'track_count' | 'favorite_count') => {
    const { artists } = get();
    
    return [...artists].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'album_count':
          return (b.album_count || 0) - (a.album_count || 0);
        case 'track_count':
          return (b.track_count || 0) - (a.track_count || 0);
        case 'favorite_count':
          return (b.favorite_count || 0) - (a.favorite_count || 0);
        default:
          return 0;
      }
    });
  },

  // Cleanup
  clearCurrentArtist: () => {
    set({
      currentArtist: null,
      currentArtistStats: null,
      currentArtistPopularTracks: null,
      currentArtistAlbums: [],
      currentArtistTracks: [],
    });
  },

  clearErrors: () => {
    set({
      errors: {
        artists: null,
        currentArtist: null,
        favorites: null,
      },
    });
  },
}));
