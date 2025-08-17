import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';

let database: Database.Database;

export function initializeDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'spicezify.db');
  database = new Database(dbPath);

  // Enable WAL mode for better performance
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // Create tables
  createTables();
  createIndexes();
}

function createTables(): void {
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

  tables.forEach(table => {
    database.exec(table);
  });
}

function createIndexes(): void {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash)',
    'CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path)',
    'CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title)',
    'CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id)',
    'CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id)',
    'CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id)',
    'CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position)',
    'CREATE INDEX IF NOT EXISTS idx_history_played_at ON history(played_at)',
    'CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name)',
    'CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name)'
  ];

  indexes.forEach(index => {
    database.exec(index);
  });
}

export { database };