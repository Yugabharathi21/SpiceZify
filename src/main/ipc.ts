import { ipcMain, dialog, BrowserWindow } from 'electron';
import { join } from 'path';
import { LibraryScanner } from './libraryScanner';
import { database } from './db';
import { CoverCache } from './coverCache';
import { FolderWatcher } from './folderWatcher';

let libraryScanner: LibraryScanner;
let folderWatcher: FolderWatcher;
let coverCache: CoverCache;

export function initializeIPC(mainWindow: BrowserWindow): void {
  libraryScanner = new LibraryScanner(database);
  folderWatcher = new FolderWatcher(database);
  coverCache = new CoverCache();

  // Library management
  ipcMain.handle('library:chooseFolders', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections'],
      title: 'Select Music Folders'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });

  ipcMain.handle('library:scan', async (_, folders: string[]) => {
    try {
      const onProgress = (progress: number, current: string) => {
        mainWindow.webContents.send('library:scanProgress', { progress, current });
      };

      const stats = await libraryScanner.scanFolders(folders, onProgress);
      
      // Start watching folders for changes
      folderWatcher.watchFolders(folders);
      
      return stats;
    } catch (error) {
      console.error('Library scan error:', error);
      throw error;
    }
  });

  ipcMain.handle('library:getTracks', async (_, filters?: any) => {
    try {
      const query = `
        SELECT t.*, a.name as album_name, ar.name as artist_name
        FROM tracks t
        LEFT JOIN albums a ON t.album_id = a.id
        LEFT JOIN artists ar ON t.artist_id = ar.id
        ORDER BY t.title ASC
      `;
      return database.prepare(query).all();
    } catch (error) {
      console.error('Get tracks error:', error);
      throw error;
    }
  });

  ipcMain.handle('library:getAlbums', async () => {
    try {
      const query = `
        SELECT a.*, ar.name as artist_name, COUNT(t.id) as track_count
        FROM albums a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        LEFT JOIN tracks t ON a.id = t.album_id
        GROUP BY a.id
        ORDER BY a.name ASC
      `;
      return database.prepare(query).all();
    } catch (error) {
      console.error('Get albums error:', error);
      throw error;
    }
  });

  ipcMain.handle('library:getArtists', async () => {
    try {
      const query = `
        SELECT ar.*, COUNT(DISTINCT a.id) as album_count, COUNT(t.id) as track_count
        FROM artists ar
        LEFT JOIN albums a ON ar.id = a.artist_id
        LEFT JOIN tracks t ON ar.id = t.artist_id
        GROUP BY ar.id
        ORDER BY ar.name ASC
      `;
      return database.prepare(query).all();
    } catch (error) {
      console.error('Get artists error:', error);
      throw error;
    }
  });

  // Search
  ipcMain.handle('library:search', async (_, query: string) => {
    try {
      const searchQuery = `%${query}%`;
      const tracks = database.prepare(`
        SELECT t.*, a.name as album_name, ar.name as artist_name
        FROM tracks t
        LEFT JOIN albums a ON t.album_id = a.id
        LEFT JOIN artists ar ON t.artist_id = ar.id
        WHERE t.title LIKE ? OR ar.name LIKE ? OR a.name LIKE ?
        LIMIT 50
      `).all(searchQuery, searchQuery, searchQuery);

      const albums = database.prepare(`
        SELECT a.*, ar.name as artist_name
        FROM albums a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE a.name LIKE ?
        LIMIT 20
      `).all(searchQuery);

      const artists = database.prepare(`
        SELECT * FROM artists WHERE name LIKE ? LIMIT 20
      `).all(searchQuery);

      return { tracks, albums, artists };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  });

  // Cover art
  ipcMain.handle('cover:getForTrack', async (_, trackId: number) => {
    try {
      return await coverCache.getCoverForTrack(trackId);
    } catch (error) {
      console.error('Get cover error:', error);
      return null;
    }
  });

  // Playlists
  ipcMain.handle('playlist:create', async (_, name: string, tracks?: number[]) => {
    try {
      const stmt = database.prepare('INSERT INTO playlists (name, user_id) VALUES (?, ?)');
      const result = stmt.run(name, 'local');
      const playlistId = result.lastInsertRowid;

      if (tracks && tracks.length > 0) {
        const insertItem = database.prepare('INSERT INTO playlist_items (playlist_id, track_id, position) VALUES (?, ?, ?)');
        tracks.forEach((trackId, index) => {
          insertItem.run(playlistId, trackId, index);
        });
      }

      return playlistId;
    } catch (error) {
      console.error('Create playlist error:', error);
      throw error;
    }
  });

  ipcMain.handle('playlist:getAll', async () => {
    try {
      const query = `
        SELECT p.*, COUNT(pi.id) as track_count
        FROM playlists p
        LEFT JOIN playlist_items pi ON p.id = pi.playlist_id
        GROUP BY p.id
        ORDER BY p.name ASC
      `;
      return database.prepare(query).all();
    } catch (error) {
      console.error('Get playlists error:', error);
      throw error;
    }
  });

  ipcMain.handle('playlist:getTracks', async (_, playlistId: number) => {
    try {
      const query = `
        SELECT t.*, a.name as album_name, ar.name as artist_name, pi.position
        FROM playlist_items pi
        JOIN tracks t ON pi.track_id = t.id
        LEFT JOIN albums a ON t.album_id = a.id
        LEFT JOIN artists ar ON t.artist_id = ar.id
        WHERE pi.playlist_id = ?
        ORDER BY pi.position ASC
      `;
      return database.prepare(query).all(playlistId);
    } catch (error) {
      console.error('Get playlist tracks error:', error);
      throw error;
    }
  });

  // Database queries
  ipcMain.handle('db:query', async (_, query: string, params: any[] = []) => {
    try {
      return database.prepare(query).all(...params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  });
}