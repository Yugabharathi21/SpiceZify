import { create } from 'zustand';
import { Track } from './usePlayerStore';

export interface Album {
  id: number;
  name: string;
  artist_id?: number;
  artist_name?: string; // From JOIN
  year?: number;
  cover_path?: string;
  created_at?: string;
  track_count?: number; // From GROUP BY COUNT
  // Extended fields
  tracks?: Track[];
  is_favorite?: boolean;
  play_count?: number;
  last_played?: string;
}

// Local SQLite artist interface  
export interface Artist {
  id: number;
  name: string;
  created_at?: string;
  album_count?: number; // From GROUP BY COUNT
  track_count?: number; // From GROUP BY COUNT
}

export interface Playlist {
  id: number;
  name: string;
  track_count?: number;
  created_at: string;
}

interface LibraryState {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  isScanning: boolean;
  scanProgress: number;
  currentScanFile: string;
  
  // Current album (for album page)
  currentAlbum: Album | null;
  currentAlbumTracks: Track[];
  
  // View state
  albumsViewMode: 'grid' | 'list';
  
  // Actions
  setTracks: (tracks: Track[]) => void;
  setAlbums: (albums: Album[]) => void;
  setArtists: (artists: Artist[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  setScanProgress: (progress: number, currentFile: string) => void;
  setIsScanning: (isScanning: boolean) => void;
  setAlbumsViewMode: (mode: 'grid' | 'list') => void;
  
  // Library operations
  loadLibrary: () => Promise<void>;
  scanFolders: (folders: string[]) => Promise<void>;
  searchLibrary: (query: string) => Promise<{ tracks: Track[]; albums: Album[]; artists: Artist[] }>;
  loadTrackCover: (trackId: number) => Promise<string | null>;
  
  // Album-specific operations
  loadAlbum: (albumId: number) => Promise<void>;
  getAlbumTracks: (albumId: number) => Track[];
  toggleAlbumFavorite: (albumId: number) => Promise<void>;
  playAlbum: (album: Album, startTrackIndex?: number) => { tracks: Track[]; startIndex: number } | void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  isScanning: false,
  scanProgress: 0,
  currentScanFile: '',
  
  // Album-specific state
  currentAlbum: null,
  currentAlbumTracks: [],
  albumsViewMode: 'grid',

  setTracks: (tracks) => set({ tracks }),
  setAlbums: (albums) => set({ albums }),
  setArtists: (artists) => set({ artists }),
  setPlaylists: (playlists) => set({ playlists }),
  
  setScanProgress: (progress, currentFile) => 
    set({ scanProgress: progress, currentScanFile: currentFile }),
  
  setIsScanning: (isScanning) => set({ isScanning }),
  
  setAlbumsViewMode: (mode) => set({ albumsViewMode: mode }),

  loadLibrary: async () => {
    try {
      // Use local Electron APIs for music data (not Supabase database functions)
      const [tracks, albums, artists, playlists] = await Promise.all([
        window.electronAPI.getTracks(),
        window.electronAPI.getAlbums(), 
        window.electronAPI.getArtists(),
        window.electronAPI.getAllPlaylists(),
      ]);

      set({ tracks, albums, artists, playlists });
    } catch (error) {
      console.error('Error loading library:', error);
    }
  },

  scanFolders: async (folders: string[]) => {
    set({ isScanning: true, scanProgress: 0, currentScanFile: '' });
    
    try {
      // Set up progress listener
      const handleProgress = (data: { progress: number; current: string }) => {
        set({ 
          scanProgress: data.progress * 100, 
          currentScanFile: data.current 
        });
      };

      window.electronAPI.onScanProgress(handleProgress);

      // Start scan
      await window.electronAPI.scanLibrary(folders);
      
      // Reload library after scan
      await get().loadLibrary();
      
      // Clean up listener
      window.electronAPI.removeAllListeners('library:scanProgress');
      
    } catch (error) {
      console.error('Error scanning folders:', error);
      throw error;
    } finally {
      set({ isScanning: false, scanProgress: 0, currentScanFile: '' });
    }
  },

  searchLibrary: async (query: string) => {
    try {
      return await window.electronAPI.search(query);
    } catch (error) {
      console.error('Error searching library:', error);
      return { tracks: [], albums: [], artists: [] };
    }
  },

  loadTrackCover: async (trackId: number) => {
    try {
      return await window.electronAPI.getCoverForTrack(trackId);
    } catch (error) {
      console.error('Error loading track cover:', error);
      return null;
    }
  },

  // Album-specific operations
  loadAlbum: async (albumId: number) => {
    try {
      // Find album in current albums list
      const album = get().albums.find(a => a.id === albumId);
      if (!album) {
        throw new Error(`Album with ID ${albumId} not found`);
      }

      // Get tracks for this album
      const albumTracks = get().getAlbumTracks(albumId);
      
      set({ 
        currentAlbum: { ...album, tracks: albumTracks }, 
        currentAlbumTracks: albumTracks 
      });
    } catch (error) {
      console.error('Error loading album:', error);
      throw error;
    }
  },

  getAlbumTracks: (albumId: number) => {
    const { tracks, albums } = get();
    const album = albums.find(a => a.id === albumId);
    if (!album) return [];
    
    return tracks.filter(track => 
      track.album_name === album.name
    ).sort((a, b) => {
      // Sort by track number if available
      const trackA = a.track_no || 0;
      const trackB = b.track_no || 0;
      return trackA - trackB;
    });
  },

  toggleAlbumFavorite: async (albumId: number) => {
    try {
      // TODO: Implement favorite toggle with local SQLite
      console.log('Toggle album favorite:', albumId);
      
      // For now, just update local state
      const albums = get().albums.map(album => 
        album.id === albumId 
          ? { ...album, is_favorite: !album.is_favorite }
          : album
      );
      set({ albums });
    } catch (error) {
      console.error('Error toggling album favorite:', error);
    }
  },

  playAlbum: (album: Album, startTrackIndex: number = 0) => {
    const albumTracks = get().getAlbumTracks(album.id);
    if (albumTracks.length === 0) return;

    // We'll let the calling component handle the actual playback
    // to avoid circular dependencies between stores
    console.log('🎵 Preparing to play album:', album.name, 'starting at track:', startTrackIndex);
    
    // Return the tracks and index for the caller to handle
    return { tracks: albumTracks, startIndex: startTrackIndex };
  },
}));