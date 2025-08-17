import { watch, FSWatcher } from 'chokidar';
import { extname } from 'path';
import Database from 'better-sqlite3';
import { LibraryScanner } from './libraryScanner';

export class FolderWatcher {
  private watchers: Map<string, FSWatcher> = new Map();
  private database: Database.Database;
  private libraryScanner: LibraryScanner;
  private supportedFormats = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aac'];

  constructor(database: Database.Database) {
    this.database = database;
    this.libraryScanner = new LibraryScanner(database);
  }

  watchFolders(folders: string[]): void {
    // Stop existing watchers
    this.stopWatching();

    // Start watching each folder
    folders.forEach(folder => {
      const watcher = watch(folder, {
        persistent: true,
        ignoreInitial: true,
        depth: undefined // Watch all subdirectories
      });

      watcher
        .on('add', (path) => this.handleFileAdd(path))
        .on('change', (path) => this.handleFileChange(path))
        .on('unlink', (path) => this.handleFileDelete(path))
        .on('error', (error) => console.error('Watcher error:', error));

      this.watchers.set(folder, watcher);
    });
  }

  private async handleFileAdd(filePath: string): Promise<void> {
    const ext = extname(filePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) return;

    try {
      await this.libraryScanner.processAudioFile(filePath);
      console.log('Added new file:', filePath);
    } catch (error) {
      console.error('Error adding file:', error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const ext = extname(filePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) return;

    try {
      await this.libraryScanner.processAudioFile(filePath);
      console.log('Updated file:', filePath);
    } catch (error) {
      console.error('Error updating file:', error);
    }
  }

  private handleFileDelete(filePath: string): void {
    try {
      const result = this.database.prepare('DELETE FROM tracks WHERE path = ?').run(filePath);
      if (result.changes > 0) {
        console.log('Removed file:', filePath);
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }
  }

  stopWatching(): void {
    this.watchers.forEach(watcher => {
      watcher.close();
    });
    this.watchers.clear();
  }
}