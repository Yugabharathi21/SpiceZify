import { create } from 'zustand';
import { Track } from './usePlayerStore';

export interface Album {
  id: number;
  name: string;
  artist_name?: string;
  year?: number;
  cover_path?: string;
  track_count?: number;
}

export interface Artist {
  id: number;
  name: string;
  album_count?: number;
  track_count?: number;
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
  
  // Actions
  setTracks: (tracks: Track[]) => void;
  setAlbums: (albums: Album[]) => void;
  setArtists: (artists: Artist[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  setScanProgress: (progress: number, currentFile: string) => void;
  setIsScanning: (isScanning: boolean) => void;
  
  // Library operations
  loadLibrary: () => Promise<void>;
  scanFolders: (folders: string[]) => Promise<void>;
  searchLibrary: (query: string) => Promise<{ tracks: Track[]; albums: Album[]; artists: Artist[] }>;
  loadTrackCover: (trackId: number) => Promise<string | null>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  isScanning: false,
  scanProgress: 0,
  currentScanFile: '',

  setTracks: (tracks) => set({ tracks }),
  setAlbums: (albums) => set({ albums }),
  setArtists: (artists) => set({ artists }),
  setPlaylists: (playlists) => set({ playlists }),
  
  setScanProgress: (progress, currentFile) => 
    set({ scanProgress: progress, currentScanFile: currentFile }),
  
  setIsScanning: (isScanning) => set({ isScanning }),

  loadLibrary: async () => {
    try {
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
}));