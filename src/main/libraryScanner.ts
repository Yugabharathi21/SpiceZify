import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { parseFileSafe } from './mmHelper';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';

export class LibraryScanner {
  private database: Database.Database;
  private supportedFormats = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aac'];

  constructor(database: Database.Database) {
    this.database = database;
  }

  async scanFolders(
    folders: string[], 
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<{ scanned: number; added: number; updated: number }> {
    let totalFiles: string[] = [];
    
    // First pass: collect all audio files
    for (const folder of folders) {
      const files = await this.collectAudioFiles(folder);
      totalFiles = totalFiles.concat(files);
    }

    let scanned = 0;
    let added = 0;
    let updated = 0;

    // Second pass: process each file
    for (const filePath of totalFiles) {
      try {
        onProgress?.(scanned / totalFiles.length, basename(filePath));
        
        const result = await this.processAudioFile(filePath);
        if (result === 'added') added++;
        if (result === 'updated') updated++;
        
        scanned++;
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }

    return { scanned, added, updated };
  }

  private async collectAudioFiles(folder: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await readdir(folder);
      
      for (const entry of entries) {
        const fullPath = join(folder, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.collectAudioFiles(fullPath);
          files.push(...subFiles);
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();
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

  private async processAudioFile(filePath: string): Promise<'added' | 'updated' | 'skipped'> {
    try {
      const stats = await stat(filePath);
      const fileHash = this.generateFileHash(filePath, stats.size, stats.mtime);
      
      // Check if file already exists
      const existingTrack = this.database.prepare(
        'SELECT id, hash FROM tracks WHERE path = ?'
      ).get(filePath);
      
      if (existingTrack && existingTrack.hash === fileHash) {
        return 'skipped'; // File hasn't changed
      }

  // Parse metadata using runtime-safe helper
  const metadata = await parseFileSafe(filePath);
      
      // Get or create artist
      const artistId = this.getOrCreateArtist(
        metadata.common.artist || metadata.common.albumartist || 'Unknown Artist'
      );
      
      // Get or create album
      const albumId = this.getOrCreateAlbum(
        metadata.common.album || 'Unknown Album',
        artistId,
        metadata.common.year
      );

      const trackData = {
        path: filePath,
        title: metadata.common.title || basename(filePath, extname(filePath)),
        artist_id: artistId,
        album_id: albumId,
        track_no: metadata.common.track?.no || null,
        disc_no: metadata.common.disk?.no || 1,
        duration_ms: Math.round((metadata.format.duration || 0) * 1000),
        bitrate: metadata.format.bitrate || null,
        sample_rate: metadata.format.sampleRate || null,
        year: metadata.common.year || null,
        genre: metadata.common.genre?.[0] || null,
        hash: fileHash
      };

      if (existingTrack) {
        // Update existing track
        this.database.prepare(`
          UPDATE tracks SET
            title = ?, artist_id = ?, album_id = ?, track_no = ?, disc_no = ?,
            duration_ms = ?, bitrate = ?, sample_rate = ?, year = ?, genre = ?,
            hash = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          trackData.title, trackData.artist_id, trackData.album_id,
          trackData.track_no, trackData.disc_no, trackData.duration_ms,
          trackData.bitrate, trackData.sample_rate, trackData.year,
          trackData.genre, trackData.hash, existingTrack.id
        );
        return 'updated';
      } else {
        // Insert new track
        this.database.prepare(`
          INSERT INTO tracks (
            path, title, artist_id, album_id, track_no, disc_no,
            duration_ms, bitrate, sample_rate, year, genre, hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          trackData.path, trackData.title, trackData.artist_id, trackData.album_id,
          trackData.track_no, trackData.disc_no, trackData.duration_ms,
          trackData.bitrate, trackData.sample_rate, trackData.year,
          trackData.genre, trackData.hash
        );
        return 'added';
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      throw error;
    }
  }

  private generateFileHash(path: string, size: number, mtime: Date): string {
    return createHash('sha1')
      .update(`${path}:${size}:${mtime.getTime()}`)
      .digest('hex');
  }

  private getOrCreateArtist(name: string): number {
    let artist = this.database.prepare('SELECT id FROM artists WHERE name = ?').get(name);
    
    if (!artist) {
      const result = this.database.prepare('INSERT INTO artists (name) VALUES (?)').run(name);
      return result.lastInsertRowid as number;
    }
    
    return artist.id;
  }

  private getOrCreateAlbum(name: string, artistId: number, year?: number): number {
    let album = this.database.prepare(
      'SELECT id FROM albums WHERE name = ? AND artist_id = ?'
    ).get(name, artistId);
    
    if (!album) {
      const result = this.database.prepare(
        'INSERT INTO albums (name, artist_id, year) VALUES (?, ?, ?)'
      ).run(name, artistId, year);
      return result.lastInsertRowid as number;
    }
    
    return album.id;
  }
}