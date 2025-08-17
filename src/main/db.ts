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
  
  // Run migrations for duplicate prevention
  runMigrations();
  
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
      normalized_name TEXT,
      cover_url TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      normalized_name TEXT,
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

function runMigrations(): void {
  // Add normalized_name columns if they don't exist
  try {
    console.log('🔄 Running database migrations...');
    
    interface ColumnInfo {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }
    
    const artistColumns = database.prepare("PRAGMA table_info(artists)").all() as ColumnInfo[];
    const hasArtistNormalizedName = artistColumns.some((col) => col.name === 'normalized_name');
    
    if (!hasArtistNormalizedName) {
      console.log('📝 Adding normalized_name column to artists table...');
      database.exec('ALTER TABLE artists ADD COLUMN normalized_name TEXT');
      database.exec('ALTER TABLE artists ADD COLUMN cover_url TEXT'); 
      database.exec('ALTER TABLE artists ADD COLUMN description TEXT');
    }
    
    const albumColumns = database.prepare("PRAGMA table_info(albums)").all() as ColumnInfo[];
    const hasAlbumNormalizedName = albumColumns.some((col) => col.name === 'normalized_name');
    
    if (!hasAlbumNormalizedName) {
      console.log('📝 Adding normalized_name column to albums table...');
      database.exec('ALTER TABLE albums ADD COLUMN normalized_name TEXT');
    }
    
    // Populate normalized names for existing records
    console.log('🔧 Populating normalized names for existing records...');
    const artistsUpdated = database.prepare(`
      UPDATE artists 
      SET normalized_name = UPPER(TRIM(name)) 
      WHERE normalized_name IS NULL OR normalized_name = ''
    `).run();
    
    const albumsUpdated = database.prepare(`
      UPDATE albums 
      SET normalized_name = UPPER(TRIM(name)) 
      WHERE normalized_name IS NULL OR normalized_name = ''
    `).run();
    
    console.log(`📊 Updated ${artistsUpdated.changes} artists and ${albumsUpdated.changes} albums with normalized names`);
    
    // Check for duplicates before fixing
    checkDuplicates();
    
    // Fix duplicates
    fixDuplicatesLocal();
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

export function checkDuplicates(): void {
  try {
    console.log('🔍 Checking for duplicates...');
    
    // Check artists
    const artistDuplicates = database.prepare(`
      SELECT name, normalized_name, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM artists 
      GROUP BY UPPER(TRIM(name))
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `).all() as Array<{name: string, normalized_name: string, count: number, ids: string}>;
    
    console.log(`📊 Found ${artistDuplicates.length} artist duplicate groups:`);
    artistDuplicates.forEach(dup => {
      console.log(`  - "${dup.name}" (normalized: "${dup.normalized_name}") appears ${dup.count} times with IDs: ${dup.ids}`);
    });
    
    // Check albums  
    const albumDuplicates = database.prepare(`
      SELECT a.name, a.normalized_name, ar.name as artist_name, COUNT(*) as count, GROUP_CONCAT(a.id) as ids
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      GROUP BY UPPER(TRIM(a.name)), a.artist_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `).all() as Array<{name: string, normalized_name: string, artist_name: string, count: number, ids: string}>;
    
    console.log(`📊 Found ${albumDuplicates.length} album duplicate groups:`);
    albumDuplicates.forEach(dup => {
      console.log(`  - "${dup.name}" by "${dup.artist_name}" (normalized: "${dup.normalized_name}") appears ${dup.count} times with IDs: ${dup.ids}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  }
}

export function fixDuplicatesLocal(): void {
  try {
    console.log('🔧 Starting duplicate fix...');
    
    // Fix artist duplicates
    const duplicateArtists = database.prepare(`
      SELECT normalized_name, GROUP_CONCAT(id) as ids, COUNT(*) as count
      FROM artists 
      GROUP BY normalized_name 
      HAVING COUNT(*) > 1
    `).all() as Array<{normalized_name: string, ids: string, count: number}>;
    
    console.log(`Found ${duplicateArtists.length} duplicate artist groups`);
    
    duplicateArtists.forEach(duplicate => {
      const ids = duplicate.ids.split(',').map(Number);
      const keepId = ids[0]; // Keep the first (oldest) record
      const removeIds = ids.slice(1);
      
      console.log(`Merging artist "${duplicate.normalized_name}": keeping ID ${keepId}, removing IDs ${removeIds.join(', ')}`);
      
      // Update foreign key references
      removeIds.forEach(removeId => {
        database.prepare('UPDATE tracks SET artist_id = ? WHERE artist_id = ?').run(keepId, removeId);
        database.prepare('UPDATE albums SET artist_id = ? WHERE artist_id = ?').run(keepId, removeId);
      });
      
      // Delete duplicates
      removeIds.forEach(removeId => {
        database.prepare('DELETE FROM artists WHERE id = ?').run(removeId);
      });
    });
    
    // Fix album duplicates (by normalized_name AND artist_id)
    const duplicateAlbums = database.prepare(`
      SELECT normalized_name, COALESCE(artist_id, 0) as artist_id, GROUP_CONCAT(id) as ids, COUNT(*) as count
      FROM albums 
      GROUP BY normalized_name, COALESCE(artist_id, 0)
      HAVING COUNT(*) > 1
    `).all() as Array<{normalized_name: string, artist_id: number, ids: string, count: number}>;
    
    console.log(`Found ${duplicateAlbums.length} duplicate album groups`);
    
    duplicateAlbums.forEach(duplicate => {
      const ids = duplicate.ids.split(',').map(Number);
      const keepId = ids[0]; // Keep the first (oldest) record
      const removeIds = ids.slice(1);
      
      console.log(`Merging album "${duplicate.normalized_name}" (artist_id: ${duplicate.artist_id}): keeping ID ${keepId}, removing IDs ${removeIds.join(', ')}`);
      
      // Update foreign key references  
      removeIds.forEach(removeId => {
        database.prepare('UPDATE tracks SET album_id = ? WHERE album_id = ?').run(keepId, removeId);
        database.prepare('UPDATE playlist_items SET track_id = (SELECT t.id FROM tracks t WHERE t.album_id = ?) WHERE track_id IN (SELECT t.id FROM tracks t WHERE t.album_id = ?)').run(keepId, removeId);
      });
      
      // Delete duplicates
      removeIds.forEach(removeId => {
        database.prepare('DELETE FROM albums WHERE id = ?').run(removeId);
      });
    });
    
    console.log(`✅ Fixed ${duplicateArtists.length} duplicate artist groups and ${duplicateAlbums.length} duplicate album groups`);
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error);
  }
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
    'CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name)',
    // Indexes for normalized names (helps with duplicate prevention)
    'CREATE INDEX IF NOT EXISTS idx_artists_normalized_name ON artists(normalized_name)',
    'CREATE INDEX IF NOT EXISTS idx_albums_normalized_name ON albums(normalized_name)',
    // Composite index for album uniqueness (by normalized name and artist)
    'CREATE INDEX IF NOT EXISTS idx_albums_normalized_artist ON albums(normalized_name, artist_id)'
  ];

  indexes.forEach(index => {
    database.exec(index);
  });
}

export { database };