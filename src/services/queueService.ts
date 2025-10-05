// Queue management service for SpiceZify
const YOUTUBE_SERVICE_BASE_URL = 'http://localhost:5001/api/youtube';

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  channelTitle: string;
  isVerified?: boolean;
  streamUrl: string;
  addedAt: number;
}

export interface Queue {
  current: QueueItem | null;
  upcoming: QueueItem[];
  history: QueueItem[];
  isAutoPlay: boolean;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
}

class QueueService {
  private queue: Queue = {
    current: null,
    upcoming: [],
    history: [],
    isAutoPlay: true,
    isShuffled: false,
    repeatMode: 'none'
  };

  private listeners: Array<(queue: Queue) => void> = [];
  private storageKey = 'spicezify_queue';

  constructor() {
    this.loadFromStorage();
  }

  // Event listeners
  subscribe(listener: (queue: Queue) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener({ ...this.queue }));
    this.saveToStorage();
  }

  // Storage management
  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        ...this.queue,
        // Don't save too much history to avoid storage bloat
        history: this.queue.history.slice(-20)
      }));
    } catch (error) {
      console.warn('Failed to save queue to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.queue = {
          ...this.queue,
          ...parsed,
          // Reset current song on app restart for fresh experience
          current: null
        };
      }
    } catch (error) {
      console.warn('Failed to load queue from localStorage:', error);
    }
  }

  // Queue management
  getQueue(): Queue {
    return { ...this.queue };
  }

  async playSong(song: QueueItem, addRelated: boolean = true) {
    console.log('🎵 Playing song:', song.title, 'by', song.artist);
    
    // Move current song to history if exists
    if (this.queue.current) {
      this.queue.history.unshift(this.queue.current);
      // Keep history manageable
      if (this.queue.history.length > 50) {
        this.queue.history = this.queue.history.slice(0, 50);
      }
    }

    // Set new current song
    this.queue.current = {
      ...song,
      addedAt: Date.now()
    };

    // Auto-add related songs if queue is empty or auto-play is enabled
    if (addRelated && (this.queue.upcoming.length < 3 || this.queue.isAutoPlay)) {
      await this.addRelatedSongs(song.id);
    }

    this.notify();
  }

  async addToQueue(song: QueueItem, position: 'next' | 'end' = 'end') {
    const queueItem = {
      ...song,
      addedAt: Date.now()
    };

    if (position === 'next') {
      this.queue.upcoming.unshift(queueItem);
    } else {
      this.queue.upcoming.push(queueItem);
    }

    console.log(`➕ Added to queue (${position}):`, song.title);
    this.notify();
  }

  async addRelatedSongs(videoId: string) {
    try {
      console.log('🔗 Fetching related songs for:', videoId);
      const startTime = performance.now();
      
      const response = await fetch(`${YOUTUBE_SERVICE_BASE_URL}/related/${videoId}`);
      const data = await response.json();
      
      const fetchTime = performance.now() - startTime;
      console.log(`✅ Related songs fetched in ${fetchTime.toFixed(2)}ms:`, data.count || 0, 'songs');

      if (data.related && data.related.length > 0) {
        // Filter out songs already in queue or history
        const existingIds = new Set([
          this.queue.current?.id,
          ...this.queue.upcoming.map(s => s.id),
          ...this.queue.history.slice(0, 10).map(s => s.id) // Check recent history
        ].filter(Boolean));

        const newSongs = data.related
          .filter((song: QueueItem) => !existingIds.has(song.id))
          .slice(0, 5) // Add max 5 related songs
          .map((song: QueueItem) => ({
            ...song,
            addedAt: Date.now()
          }));

        if (newSongs.length > 0) {
          // Add verified artists first, then others
          const verified = newSongs.filter((s: QueueItem) => s.isVerified);
          const regular = newSongs.filter((s: QueueItem) => !s.isVerified);
          
          this.queue.upcoming.push(...verified, ...regular);
          
          console.log(`🎶 Added ${newSongs.length} related songs (${verified.length} verified)`);
          this.notify();
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch related songs:', error);
    }
  }

  playNext() {
    if (this.queue.upcoming.length === 0) {
      console.log('📭 No more songs in queue');
      return null;
    }

    let nextSong: QueueItem;
    
    if (this.queue.repeatMode === 'one' && this.queue.current) {
      // Repeat current song
      nextSong = this.queue.current;
    } else {
      // Get next song from queue
      nextSong = this.queue.upcoming.shift()!;
      
      // If repeat all is enabled and we're at the end, add current to end of queue
      if (this.queue.repeatMode === 'all' && this.queue.current) {
        this.queue.upcoming.push(this.queue.current);
      }
    }

    // Move current to history
    if (this.queue.current && this.queue.repeatMode !== 'one') {
      this.queue.history.unshift(this.queue.current);
    }

    this.queue.current = nextSong;

    // Auto-add more related songs if queue is getting low
    if (this.queue.upcoming.length < 2 && this.queue.isAutoPlay) {
      this.addRelatedSongs(nextSong.id);
    }

    console.log('⏭️ Playing next:', nextSong.title);
    this.notify();
    return nextSong;
  }

  playPrevious() {
    if (this.queue.history.length === 0) {
      console.log('📭 No previous songs');
      return null;
    }

    const previousSong = this.queue.history.shift()!;
    
    // Move current song back to queue
    if (this.queue.current) {
      this.queue.upcoming.unshift(this.queue.current);
    }

    this.queue.current = previousSong;
    
    console.log('⏮️ Playing previous:', previousSong.title);
    this.notify();
    return previousSong;
  }

  removeSong(songId: string) {
    const initialLength = this.queue.upcoming.length;
    this.queue.upcoming = this.queue.upcoming.filter(song => song.id !== songId);
    
    if (initialLength !== this.queue.upcoming.length) {
      console.log('🗑️ Removed song from queue:', songId);
      this.notify();
    }
  }

  clearQueue() {
    this.queue.upcoming = [];
    console.log('🧹 Queue cleared');
    this.notify();
  }

  shuffleQueue() {
    if (this.queue.upcoming.length <= 1) return;

    // Fisher-Yates shuffle
    for (let i = this.queue.upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue.upcoming[i], this.queue.upcoming[j]] = [this.queue.upcoming[j], this.queue.upcoming[i]];
    }

    this.queue.isShuffled = true;
    console.log('🔀 Queue shuffled');
    this.notify();
  }

  setAutoPlay(enabled: boolean) {
    this.queue.isAutoPlay = enabled;
    console.log('🔁 Auto-play:', enabled ? 'enabled' : 'disabled');
    
    // If enabling auto-play and queue is empty, add related songs
    if (enabled && this.queue.upcoming.length === 0 && this.queue.current) {
      this.addRelatedSongs(this.queue.current.id);
    }
    
    this.notify();
  }

  setRepeatMode(mode: 'none' | 'one' | 'all') {
    this.queue.repeatMode = mode;
    console.log('🔂 Repeat mode:', mode);
    this.notify();
  }

  // Utility methods
  getUpcomingCount(): number {
    return this.queue.upcoming.length;
  }

  getCurrentSong(): QueueItem | null {
    return this.queue.current;
  }

  hasNext(): boolean {
    return this.queue.upcoming.length > 0 || this.queue.repeatMode !== 'none';
  }

  hasPrevious(): boolean {
    return this.queue.history.length > 0;
  }

  getQueueDuration(): string {
    const totalSeconds = this.queue.upcoming.reduce((acc, song) => {
      const [minutes, seconds] = song.duration.split(':').map(Number);
      return acc + (minutes * 60) + (seconds || 0);
    }, 0);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

// Export singleton instance
export const queueService = new QueueService();