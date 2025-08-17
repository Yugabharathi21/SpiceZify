import { join } from 'path';
import { app } from 'electron';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { parseFileSafe } from './mmHelper';
import { database } from './db';

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
      console.error('Error creating cache directory:', error && (error as any).code, error);
    }
  }

  async getCoverForTrack(trackId: number): Promise<string | null> {
    try {
      // Get track path from database
      const track = database.prepare('SELECT path, hash FROM tracks WHERE id = ?').get(trackId);
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
      
      if (picture) {
        // Cache the cover
        await writeFile(cachePath, picture.data);
        return `data:${picture.format};base64,${picture.data.toString('base64')}`;
      }

      return null;
    } catch (error) {
      console.error('Error getting cover for track:', error);
      return null;
    }
  }
}