// Playlist service for managing user playlists and songs
export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  songs: PlaylistSong[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistSong {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  channelTitle?: string;
  isVerified?: boolean;
  addedAt: string;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
}

export interface AddSongData {
  songId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  channelTitle?: string;
  isVerified?: boolean;
}

class PlaylistService {
  private baseUrl = 'http://localhost:3001/api/playlists';

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all user playlists
  async getUserPlaylists(): Promise<Playlist[]> {
    try {
      const response = await fetch(this.baseUrl, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  // Get specific playlist
  async getPlaylist(playlistId: string): Promise<Playlist> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching playlist:', error);
      throw error;
    }
  }

  // Create new playlist
  async createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create playlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  // Update playlist
  async updatePlaylist(playlistId: string, data: Partial<CreatePlaylistData>): Promise<Playlist> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update playlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  // Delete playlist
  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  // Add song to playlist
  async addSongToPlaylist(playlistId: string, songData: AddSongData): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/songs`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(songData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add song to playlist');
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      throw error;
    }
  }

  // Remove song from playlist
  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove song from playlist');
      }
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      throw error;
    }
  }

  // Get songs from playlist
  async getPlaylistSongs(playlistId: string): Promise<PlaylistSong[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/songs`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist songs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
      throw error;
    }
  }

  // Check if song exists in playlist
  async checkSongInPlaylist(playlistId: string, songId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/songs/${songId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.exists;
    } catch (error) {
      console.error('Error checking song in playlist:', error);
      return false;
    }
  }

  // Reorder songs in playlist
  async reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/reorder`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ songIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reorder playlist');
      }
    } catch (error) {
      console.error('Error reordering playlist:', error);
      throw error;
    }
  }

  // Duplicate playlist
  async duplicatePlaylist(playlistId: string, newName?: string): Promise<Playlist> {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/duplicate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to duplicate playlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error duplicating playlist:', error);
      throw error;
    }
  }

  // Convert song from any format to AddSongData
  convertToAddSongData(song: {
    id: string;
    title: string;
    artist: string;  
    thumbnail: string;
    duration: string;
    youtubeId: string;
    channelTitle?: string;
    isVerified?: boolean;
  }): AddSongData {
    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      duration: song.duration,
      youtubeId: song.youtubeId,
      channelTitle: song.channelTitle,
      isVerified: song.isVerified || false
    };
  }
}

export const playlistService = new PlaylistService();
export default playlistService;