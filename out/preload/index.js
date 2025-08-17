"use strict";
const electron = require("electron");
const electronAPI = {
  // Library
  chooseFolders: () => electron.ipcRenderer.invoke("library:chooseFolders"),
  scanLibrary: (folders) => electron.ipcRenderer.invoke("library:scan", folders),
  getTracks: (filters) => electron.ipcRenderer.invoke("library:getTracks", filters),
  getAlbums: () => electron.ipcRenderer.invoke("library:getAlbums"),
  getArtists: () => electron.ipcRenderer.invoke("library:getArtists"),
  search: (query) => electron.ipcRenderer.invoke("library:search", query),
  // Cover art
  getCoverForTrack: (trackId) => electron.ipcRenderer.invoke("cover:getForTrack", trackId),
  // Playlists
  createPlaylist: (name, tracks) => electron.ipcRenderer.invoke("playlist:create", name, tracks),
  getAllPlaylists: () => electron.ipcRenderer.invoke("playlist:getAll"),
  getPlaylistTracks: (playlistId) => electron.ipcRenderer.invoke("playlist:getTracks", playlistId),
  // Database
  query: (query, params) => electron.ipcRenderer.invoke("db:query", query, params),
  // Window controls
  toggleFullscreen: () => electron.ipcRenderer.invoke("window:toggleFullscreen"),
  exitFullscreen: () => electron.ipcRenderer.invoke("window:exitFullscreen"),
  isFullscreen: () => electron.ipcRenderer.invoke("window:isFullscreen"),
  // Events
  onScanProgress: (callback) => electron.ipcRenderer.on("library:scanProgress", (_, data) => callback(data)),
  removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
