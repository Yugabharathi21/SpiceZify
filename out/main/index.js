"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const promises = require("fs/promises");
const musicMetadata = require("music-metadata");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const chokidar = require("chokidar");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
class LibraryScanner {
  constructor(database2) {
    this.supportedFormats = [".mp3", ".flac", ".m4a", ".ogg", ".wav", ".aac"];
    this.database = database2;
  }
  async scanFolders(folders, onProgress) {
    let totalFiles = [];
    for (const folder of folders) {
      const files = await this.collectAudioFiles(folder);
      totalFiles = totalFiles.concat(files);
    }
    let scanned = 0;
    let added = 0;
    let updated = 0;
    for (const filePath of totalFiles) {
      try {
        onProgress?.(scanned / totalFiles.length, path.basename(filePath));
        const result = await this.processAudioFile(filePath);
        if (result === "added") added++;
        if (result === "updated") updated++;
        scanned++;
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
    return { scanned, added, updated };
  }
  async collectAudioFiles(folder) {
    const files = [];
    try {
      const entries = await promises.readdir(folder);
      for (const entry of entries) {
        const fullPath = path.join(folder, entry);
        const stats = await promises.stat(fullPath);
        if (stats.isDirectory()) {
          const subFiles = await this.collectAudioFiles(fullPath);
          files.push(...subFiles);
        } else if (stats.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          if (this.supportedFormats.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning folder ${folder}:`, error);
    }
    return files;
  }
  async processAudioFile(filePath) {
    try {
      const stats = await promises.stat(filePath);
      const fileHash = this.generateFileHash(filePath, stats.size, stats.mtime);
      const existingTrack = this.database.prepare(
        "SELECT id, hash FROM tracks WHERE path = ?"
      ).get(filePath);
      if (existingTrack && existingTrack.hash === fileHash) {
        return "skipped";
      }
      const metadata = await musicMetadata.parseFile(filePath);
      const artistId = this.getOrCreateArtist(
        metadata.common.artist || metadata.common.albumartist || "Unknown Artist"
      );
      const albumId = this.getOrCreateAlbum(
        metadata.common.album || "Unknown Album",
        artistId,
        metadata.common.year
      );
      const trackData = {
        path: filePath,
        title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
        artist_id: artistId,
        album_id: albumId,
        track_no: metadata.common.track?.no || null,
        disc_no: metadata.common.disk?.no || 1,
        duration_ms: Math.round((metadata.format.duration || 0) * 1e3),
        bitrate: metadata.format.bitrate || null,
        sample_rate: metadata.format.sampleRate || null,
        year: metadata.common.year || null,
        genre: metadata.common.genre?.[0] || null,
        hash: fileHash
      };
      if (existingTrack) {
        this.database.prepare(`
          UPDATE tracks SET
            title = ?, artist_id = ?, album_id = ?, track_no = ?, disc_no = ?,
            duration_ms = ?, bitrate = ?, sample_rate = ?, year = ?, genre = ?,
            hash = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          trackData.title,
          trackData.artist_id,
          trackData.album_id,
          trackData.track_no,
          trackData.disc_no,
          trackData.duration_ms,
          trackData.bitrate,
          trackData.sample_rate,
          trackData.year,
          trackData.genre,
          trackData.hash,
          existingTrack.id
        );
        return "updated";
      } else {
        this.database.prepare(`
          INSERT INTO tracks (
            path, title, artist_id, album_id, track_no, disc_no,
            duration_ms, bitrate, sample_rate, year, genre, hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          trackData.path,
          trackData.title,
          trackData.artist_id,
          trackData.album_id,
          trackData.track_no,
          trackData.disc_no,
          trackData.duration_ms,
          trackData.bitrate,
          trackData.sample_rate,
          trackData.year,
          trackData.genre,
          trackData.hash
        );
        return "added";
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      throw error;
    }
  }
  generateFileHash(path2, size, mtime) {
    return crypto.createHash("sha1").update(`${path2}:${size}:${mtime.getTime()}`).digest("hex");
  }
  getOrCreateArtist(name) {
    let artist = this.database.prepare("SELECT id FROM artists WHERE name = ?").get(name);
    if (!artist) {
      const result = this.database.prepare("INSERT INTO artists (name) VALUES (?)").run(name);
      return result.lastInsertRowid;
    }
    return artist.id;
  }
  getOrCreateAlbum(name, artistId, year) {
    let album = this.database.prepare(
      "SELECT id FROM albums WHERE name = ? AND artist_id = ?"
    ).get(name, artistId);
    if (!album) {
      const result = this.database.prepare(
        "INSERT INTO albums (name, artist_id, year) VALUES (?, ?, ?)"
      ).run(name, artistId, year);
      return result.lastInsertRowid;
    }
    return album.id;
  }
}
let database;
function initializeDatabase() {
  const dbPath = path.join(electron.app.getPath("userData"), "spicezify.db");
  database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  createTables();
  createIndexes();
}
function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      is_watched BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      artist_id INTEGER,
      year INTEGER,
      cover_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists (id)
    )`,
    `CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      folder_id INTEGER,
      title TEXT NOT NULL,
      artist_id INTEGER,
      album_id INTEGER,
      track_no INTEGER,
      disc_no INTEGER DEFAULT 1,
      duration_ms INTEGER,
      bitrate INTEGER,
      sample_rate INTEGER,
      year INTEGER,
      genre TEXT,
      hash TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders (id),
      FOREIGN KEY (artist_id) REFERENCES artists (id),
      FOREIGN KEY (album_id) REFERENCES albums (id)
    )`,
    `CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'local',
      name TEXT NOT NULL,
      is_smart BOOLEAN DEFAULT 0,
      smart_query_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS playlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id INTEGER NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      device TEXT DEFAULT 'local',
      FOREIGN KEY (track_id) REFERENCES tracks (id)
    )`,
    `CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id INTEGER NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'local',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(track_id, user_id),
      FOREIGN KEY (track_id) REFERENCES tracks (id)
    )`
  ];
  tables.forEach((table) => {
    database.exec(table);
  });
}
function createIndexes() {
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash)",
    "CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path)",
    "CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title)",
    "CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id)",
    "CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id)",
    "CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id)",
    "CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position)",
    "CREATE INDEX IF NOT EXISTS idx_history_played_at ON history(played_at)",
    "CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name)",
    "CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name)"
  ];
  indexes.forEach((index) => {
    database.exec(index);
  });
}
class CoverCache {
  constructor() {
    this.cacheDir = path.join(electron.app.getPath("userData"), "cache", "covers");
    this.ensureCacheDir();
  }
  async ensureCacheDir() {
    try {
      await promises.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error("Error creating cache directory:", error);
    }
  }
  async getCoverForTrack(trackId) {
    try {
      const track = database.prepare("SELECT path, hash FROM tracks WHERE id = ?").get(trackId);
      if (!track) return null;
      const cacheKey = `${track.hash}.jpg`;
      const cachePath = path.join(this.cacheDir, cacheKey);
      if (fs.existsSync(cachePath)) {
        const data = await promises.readFile(cachePath);
        return `data:image/jpeg;base64,${data.toString("base64")}`;
      }
      const metadata = await musicMetadata.parseFile(track.path);
      const picture = metadata.common.picture?.[0];
      if (picture) {
        await promises.writeFile(cachePath, picture.data);
        return `data:${picture.format};base64,${picture.data.toString("base64")}`;
      }
      return null;
    } catch (error) {
      console.error("Error getting cover for track:", error);
      return null;
    }
  }
}
class FolderWatcher {
  constructor(database2) {
    this.watchers = /* @__PURE__ */ new Map();
    this.supportedFormats = [".mp3", ".flac", ".m4a", ".ogg", ".wav", ".aac"];
    this.database = database2;
    this.libraryScanner = new LibraryScanner(database2);
  }
  watchFolders(folders) {
    this.stopWatching();
    folders.forEach((folder) => {
      const watcher = chokidar.watch(folder, {
        persistent: true,
        ignoreInitial: true,
        depth: void 0
        // Watch all subdirectories
      });
      watcher.on("add", (path2) => this.handleFileAdd(path2)).on("change", (path2) => this.handleFileChange(path2)).on("unlink", (path2) => this.handleFileDelete(path2)).on("error", (error) => console.error("Watcher error:", error));
      this.watchers.set(folder, watcher);
    });
  }
  async handleFileAdd(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) return;
    try {
      await this.libraryScanner.processAudioFile(filePath);
      console.log("Added new file:", filePath);
    } catch (error) {
      console.error("Error adding file:", error);
    }
  }
  async handleFileChange(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) return;
    try {
      await this.libraryScanner.processAudioFile(filePath);
      console.log("Updated file:", filePath);
    } catch (error) {
      console.error("Error updating file:", error);
    }
  }
  handleFileDelete(filePath) {
    try {
      const result = this.database.prepare("DELETE FROM tracks WHERE path = ?").run(filePath);
      if (result.changes > 0) {
        console.log("Removed file:", filePath);
      }
    } catch (error) {
      console.error("Error removing file:", error);
    }
  }
  stopWatching() {
    this.watchers.forEach((watcher) => {
      watcher.close();
    });
    this.watchers.clear();
  }
}
let libraryScanner;
let folderWatcher;
let coverCache;
function initializeIPC(mainWindow) {
  libraryScanner = new LibraryScanner(database);
  folderWatcher = new FolderWatcher(database);
  coverCache = new CoverCache();
  electron.ipcMain.handle("library:chooseFolders", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "multiSelections"],
      title: "Select Music Folders"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });
  electron.ipcMain.handle("library:scan", async (_, folders) => {
    try {
      const onProgress = (progress, current) => {
        mainWindow.webContents.send("library:scanProgress", { progress, current });
      };
      const stats = await libraryScanner.scanFolders(folders, onProgress);
      folderWatcher.watchFolders(folders);
      return stats;
    } catch (error) {
      console.error("Library scan error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("library:getTracks", async (_, filters) => {
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
      console.error("Get tracks error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("library:getAlbums", async () => {
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
      console.error("Get albums error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("library:getArtists", async () => {
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
      console.error("Get artists error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("library:search", async (_, query) => {
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
      console.error("Search error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("cover:getForTrack", async (_, trackId) => {
    try {
      return await coverCache.getCoverForTrack(trackId);
    } catch (error) {
      console.error("Get cover error:", error);
      return null;
    }
  });
  electron.ipcMain.handle("playlist:create", async (_, name, tracks) => {
    try {
      const stmt = database.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)");
      const result = stmt.run(name, "local");
      const playlistId = result.lastInsertRowid;
      if (tracks && tracks.length > 0) {
        const insertItem = database.prepare("INSERT INTO playlist_items (playlist_id, track_id, position) VALUES (?, ?, ?)");
        tracks.forEach((trackId, index) => {
          insertItem.run(playlistId, trackId, index);
        });
      }
      return playlistId;
    } catch (error) {
      console.error("Create playlist error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("playlist:getAll", async () => {
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
      console.error("Get playlists error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("playlist:getTracks", async (_, playlistId) => {
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
      console.error("Get playlist tracks error:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("db:query", async (_, query, params = []) => {
    try {
      return database.prepare(query).all(...params);
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  });
}
const buildIconPath = path.join(__dirname, "../../build/icon.png");
const iconPath = fs.existsSync(buildIconPath) ? buildIconPath : void 0;
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  initializeIPC(mainWindow);
}
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.spicezify");
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  initializeDatabase();
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== "http://localhost:5173" && parsedUrl.origin !== "file://") {
      event.preventDefault();
    }
  });
});
