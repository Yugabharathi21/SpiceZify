import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer
export interface ElectronAPI {
  // Library
  chooseFolders: () => Promise<string[]>;
  scanLibrary: (folders: string[]) => Promise<{ scanned: number; added: number; updated: number }>;
  getTracks: (filters?: any) => Promise<any[]>;
  getAlbums: () => Promise<any[]>;
  getArtists: () => Promise<any[]>;
  search: (query: string) => Promise<{ tracks: any[]; albums: any[]; artists: any[] }>;
  
  // Cover art
  getCoverForTrack: (trackId: number) => Promise<string | null>;
  
  // Playlists
  createPlaylist: (name: string, tracks?: number[]) => Promise<number>;
  getAllPlaylists: () => Promise<any[]>;
  getPlaylistTracks: (playlistId: number) => Promise<any[]>;
  
  // Database
  query: (query: string, params?: any[]) => Promise<any[]>;
  
  // Events
  onScanProgress: (callback: (data: { progress: number; current: string }) => void) => void;
  removeAllListeners: (channel: string) => void;
}

const electronAPI: ElectronAPI = {
  // Library
  chooseFolders: () => ipcRenderer.invoke('library:chooseFolders'),
  scanLibrary: (folders: string[]) => ipcRenderer.invoke('library:scan', folders),
  getTracks: (filters?: any) => ipcRenderer.invoke('library:getTracks', filters),
  getAlbums: () => ipcRenderer.invoke('library:getAlbums'),
  getArtists: () => ipcRenderer.invoke('library:getArtists'),
  search: (query: string) => ipcRenderer.invoke('library:search', query),
  
  // Cover art
  getCoverForTrack: (trackId: number) => ipcRenderer.invoke('cover:getForTrack', trackId),
  
  // Playlists
  createPlaylist: (name: string, tracks?: number[]) => ipcRenderer.invoke('playlist:create', name, tracks),
  getAllPlaylists: () => ipcRenderer.invoke('playlist:getAll'),
  getPlaylistTracks: (playlistId: number) => ipcRenderer.invoke('playlist:getTracks', playlistId),
  
  // Database
  query: (query: string, params?: any[]) => ipcRenderer.invoke('db:query', query, params),
  
  // Events
  onScanProgress: (callback) => ipcRenderer.on('library:scanProgress', (_, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}