import { join } from 'path';
import { app } from 'electron';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { parseFileSafe } from './mmHelper';
import { database } from './db';

interface TrackRecord {
  path: string;
  hash: string;
}

export class CoverCache {
  private cacheDir: string;

  constructor() {
    this.cacheDir = join(app.getPath('userData'), 'cache', 'covers');
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      const userDataDir = app.getPath('userData');
      try {
        await mkdir(userDataDir, { recursive: true });
      } catch (err) {
        // non-fatal: we'll try to create cache dir anyway
        console.warn('Could not ensure userData dir exists:', err);
      }

      await mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Error creating cache directory:', (error as Error).message);
    }
  }

  async getCoverForTrack(trackId: number): Promise<string | null> {
    try {
      // Get track path from database
      const track = database.prepare('SELECT path, hash FROM tracks WHERE id = ?').get(trackId) as TrackRecord | undefined;
      if (!track) return null;

      const cacheKey = `${track.hash}.jpg`;
      const cachePath = join(this.cacheDir, cacheKey);

      // Check if cover is already cached
      if (existsSync(cachePath)) {
        const data = await readFile(cachePath);
        return `data:image/jpeg;base64,${data.toString('base64')}`;
      }

      // Extract cover from audio file
      const metadata = await parseFileSafe(track.path);
      const picture = metadata.common.picture?.[0];
      
      if (picture && picture.data) {
        try {
          // Ensure cache directory exists before writing
          await this.ensureCacheDir();
          
          // Cache the cover
          await writeFile(cachePath, picture.data);
          return `data:${picture.format || 'image/jpeg'};base64,${picture.data.toString('base64')}`;
        } catch (writeError) {
          console.warn('Failed to cache cover, returning uncached version:', (writeError as Error).message);
          // Return the cover without caching if write fails
          return `data:${picture.format || 'image/jpeg'};base64,${picture.data.toString('base64')}`;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cover for track:', (error as Error).message);
      return null;
    }
  }
}