import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { playlistService, Playlist, CreatePlaylistData, AddSongData } from '../services/playlistService';

interface PlaylistContextType {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  loading: boolean;
  error: string | null;
  
  // Playlist management
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (data: CreatePlaylistData) => Promise<Playlist>;
  updatePlaylist: (playlistId: string, data: Partial<CreatePlaylistData>) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  duplicatePlaylist: (playlistId: string, newName?: string) => Promise<Playlist>;
  
  // Song management
  addSongToPlaylist: (playlistId: string, song: AddSongData) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  checkSongInPlaylist: (playlistId: string, songId: string) => Promise<boolean>;
  reorderPlaylistSongs: (playlistId: string, songIds: string[]) => Promise<void>;
  
  // UI helpers
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  clearError: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

interface PlaylistProviderProps {
  children: ReactNode;
}

export const PlaylistProvider: React.FC<PlaylistProviderProps> = ({ children }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user playlists
  const fetchPlaylists = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userPlaylists = await playlistService.getUserPlaylists();
      setPlaylists(userPlaylists);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
    } finally {
      setLoading(false);
    }
  };

  // Create new playlist
  const createPlaylist = async (data: CreatePlaylistData): Promise<Playlist> => {
    setError(null);
    
    try {
      const newPlaylist = await playlistService.createPlaylist(data);
      setPlaylists(prev => [newPlaylist, ...prev]);
      return newPlaylist;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update playlist
  const updatePlaylist = async (playlistId: string, data: Partial<CreatePlaylistData>) => {
    setError(null);
    
    try {
      const updatedPlaylist = await playlistService.updatePlaylist(playlistId, data);
      setPlaylists(prev => 
        prev.map(playlist => 
          playlist._id === playlistId ? updatedPlaylist : playlist
        )
      );
      
      if (currentPlaylist?._id === playlistId) {
        setCurrentPlaylist(updatedPlaylist);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Delete playlist
  const deletePlaylist = async (playlistId: string) => {
    setError(null);
    
    try {
      await playlistService.deletePlaylist(playlistId);
      setPlaylists(prev => prev.filter(playlist => playlist._id !== playlistId));
      
      if (currentPlaylist?._id === playlistId) {
        setCurrentPlaylist(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Duplicate playlist
  const duplicatePlaylist = async (playlistId: string, newName?: string): Promise<Playlist> => {
    setError(null);
    
    try {
      const duplicatedPlaylist = await playlistService.duplicatePlaylist(playlistId, newName);
      setPlaylists(prev => [duplicatedPlaylist, ...prev]);
      return duplicatedPlaylist;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Add song to playlist
  const addSongToPlaylist = async (playlistId: string, song: AddSongData) => {
    setError(null);
    
    try {
      await playlistService.addSongToPlaylist(playlistId, song);
      
      // Update playlists state
      const updatedPlaylist = await playlistService.getPlaylist(playlistId);
      setPlaylists(prev =>
        prev.map(playlist =>
          playlist._id === playlistId ? updatedPlaylist : playlist
        )
      );
      
      if (currentPlaylist?._id === playlistId) {
        setCurrentPlaylist(updatedPlaylist);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add song to playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Remove song from playlist
  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    setError(null);
    
    try {
      await playlistService.removeSongFromPlaylist(playlistId, songId);
      
      // Update playlists state
      const updatedPlaylist = await playlistService.getPlaylist(playlistId);
      setPlaylists(prev =>
        prev.map(playlist =>
          playlist._id === playlistId ? updatedPlaylist : playlist
        )
      );
      
      if (currentPlaylist?._id === playlistId) {
        setCurrentPlaylist(updatedPlaylist);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove song from playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Check if song exists in playlist
  const checkSongInPlaylist = async (playlistId: string, songId: string): Promise<boolean> => {
    try {
      return await playlistService.checkSongInPlaylist(playlistId, songId);
    } catch (err) {
      console.error('Error checking song in playlist:', err);
      return false;
    }
  };

  // Reorder playlist songs
  const reorderPlaylistSongs = async (playlistId: string, songIds: string[]) => {
    setError(null);
    
    try {
      await playlistService.reorderPlaylistSongs(playlistId, songIds);
      
      // Update playlists state
      const updatedPlaylist = await playlistService.getPlaylist(playlistId);
      setPlaylists(prev =>
        prev.map(playlist =>
          playlist._id === playlistId ? updatedPlaylist : playlist
        )
      );
      
      if (currentPlaylist?._id === playlistId) {
        setCurrentPlaylist(updatedPlaylist);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Load playlists on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchPlaylists();
    }
  }, []);

  const value: PlaylistContextType = {
    playlists,
    currentPlaylist,
    loading,
    error,
    fetchPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    checkSongInPlaylist,
    reorderPlaylistSongs,
    setCurrentPlaylist,
    clearError
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = (): PlaylistContextType => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};

export default PlaylistContext;