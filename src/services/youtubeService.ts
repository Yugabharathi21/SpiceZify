// Using Python backend service instead of direct YouTube API
const YOUTUBE_SERVICE_BASE_URL = 'http://localhost:5001/api/youtube';

// Performance optimization constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PREFETCH_COUNT = 5; // Number of songs to prefetch
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent requests
const REQUEST_TIMEOUT = 120000; // 120 seconds timeout (YouTube search can be very slow)

export interface YouTubeVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  channelTitle: string;
  publishedAt: string;
  streamUrl?: string;
  isVerified?: boolean;
  cachedAt?: number;
}

export interface LyricsData {
  artist: string;
  title: string;
  album?: string;
  duration?: number;
  plainLyrics?: string;
  syncedLyrics?: string;
  source: 'LRCLIB';
}

export interface LyricsLine {
  time: number; // Time in seconds
  text: string;
}

interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  channelTitle: string;
  publishedAt: string;
  streamUrl: string;
  isVerified?: boolean;
}

// Enhanced caching system
class CacheManager {
  private static searchCache = new Map<string, { data: YouTubeVideo[]; timestamp: number }>();
  private static detailsCache = new Map<string, { data: YouTubeVideo; timestamp: number }>();
  private static relatedCache = new Map<string, { data: YouTubeVideo[]; timestamp: number }>();
  private static lyricsCache = new Map<string, { data: LyricsData | null; timestamp: number }>();
  
  static getSearch(query: string, maxResults: number): YouTubeVideo[] | null {
    const key = `${query}:${maxResults}`;
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`🎯 Cache hit for search: "${query}"`);
      return cached.data;
    }
    return null;
  }

  static getLyrics(artist: string, title: string): LyricsData | null | undefined {
    const key = `${artist.toLowerCase()}:${title.toLowerCase()}`;
    const cached = this.lyricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`🎯 Lyrics cache hit for: "${title}" by "${artist}"`);
      return cached.data;
    }
    return undefined; // undefined means not cached, null means not found
  }

  static setLyrics(artist: string, title: string, lyrics: LyricsData | null): void {
    const key = `${artist.toLowerCase()}:${title.toLowerCase()}`;
    this.lyricsCache.set(key, {
      data: lyrics,
      timestamp: Date.now()
    });
  }
  
  static setSearch(query: string, maxResults: number, data: YouTubeVideo[]): void {
    const key = `${query}:${maxResults}`;
    this.searchCache.set(key, { data, timestamp: Date.now() });
    this.cleanupCache(this.searchCache);
  }
  
  static getDetails(videoId: string): YouTubeVideo | null {
    const cached = this.detailsCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }
  
  static setDetails(videoId: string, data: YouTubeVideo): void {
    this.detailsCache.set(videoId, { data, timestamp: Date.now() });
    this.cleanupCache(this.detailsCache);
  }
  
  static getRelated(videoId: string): YouTubeVideo[] | null {
    const cached = this.relatedCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }
  
  static setRelated(videoId: string, data: YouTubeVideo[]): void {
    this.relatedCache.set(videoId, { data, timestamp: Date.now() });
    this.cleanupCache(this.relatedCache);
  }
  
  private static cleanupCache(cache: Map<string, { data: YouTubeVideo[] | YouTubeVideo; timestamp: number }>): void {
    if (cache.size > 100) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, 20);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }
  
  static getCacheSize(): number {
    return this.searchCache.size + this.detailsCache.size + this.relatedCache.size;
  }
  
  static clearAll(): void {
    this.searchCache.clear();
    this.detailsCache.clear();
    this.relatedCache.clear();
  }
}

// Request queue for managing concurrent requests
class RequestQueue {
  private static queue: Array<() => Promise<unknown>> = [];
  private static running = 0;
  
  static async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
  
  private static async processQueue(): Promise<void> {
    if (this.running >= MAX_CONCURRENT_REQUESTS || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const request = this.queue.shift()!;
    
    try {
      await request();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
  
  static getQueueLength(): number {
    return this.queue.length;
  }
}

// Optimized fetch with timeout and retry
const optimizedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export class YouTubeService {
  static async searchSongs(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
    const startTime = performance.now();
    console.log(`🔍 [Frontend] Starting optimized search for: "${query}" (maxResults: ${maxResults})`);
    
    // Check cache first
    const cachedResults = CacheManager.getSearch(query, maxResults);
    if (cachedResults) {
      const cacheTime = performance.now() - startTime;
      console.log(`⚡ [Frontend] Cache hit: ${cachedResults.length} results in ${cacheTime.toFixed(2)}ms`);
      return cachedResults;
    }
    
    return RequestQueue.add(async () => {
      try {
        const searchUrl = `${YOUTUBE_SERVICE_BASE_URL}/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
        
        console.log(`📡 [Frontend] Fetching: ${searchUrl}`);
        const fetchStart = performance.now();
        
        // Show progress indicator for long searches
        const progressTimer = setTimeout(() => {
          console.log(`⏳ [Frontend] Search still running... (${((performance.now() - startTime) / 1000).toFixed(1)}s elapsed)`);
        }, 10000);
        
        const response = await optimizedFetch(searchUrl);
        clearTimeout(progressTimer);
        
        const fetchTime = performance.now() - fetchStart;
        console.log(`⏱️ [Frontend] Fetch completed in ${fetchTime.toFixed(2)}ms, status: ${response.status}`);
        
        if (!response.ok) {
          console.warn('YouTube service error, using fallback data');
          if (response.status === 503) {
            console.error('Python YouTube service is not running. Start it with: python server/youtube_service.py');
          }
          const mockResults = this.getMockResults(query, maxResults);
          CacheManager.setSearch(query, maxResults, mockResults);
          return mockResults;
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('YouTube service error:', data.error);
          const mockResults = this.getMockResults(query, maxResults);
          CacheManager.setSearch(query, maxResults, mockResults);
          return mockResults;
        }
        
        if (!data.results || data.results.length === 0) {
          const mockResults = this.getMockResults(query, maxResults);
          CacheManager.setSearch(query, maxResults, mockResults);
          return mockResults;
        }

        const results = data.results.map((item: YouTubeSearchResult) => ({
          id: item.id,
          title: item.title,
          artist: item.artist,
          thumbnail: item.thumbnail,
          duration: item.duration,
          youtubeId: item.youtubeId,
          channelTitle: item.channelTitle,
          publishedAt: item.publishedAt,
          isVerified: item.isVerified || false,
          streamUrl: `${YOUTUBE_SERVICE_BASE_URL}/audio/${item.youtubeId}`,
          cachedAt: Date.now()
        }));
        
        // Cache the results
        CacheManager.setSearch(query, maxResults, results);
        
        // Prefetch audio URLs for top results to speed up playback
        this.prefetchAudioUrls(results.slice(0, PREFETCH_COUNT));
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ [Frontend] Search completed: ${results.length} results in ${totalTime.toFixed(2)}ms`);
        
        return results;
      } catch (error) {
        const totalTime = performance.now() - startTime;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`⏱️ [Frontend] Search timed out after ${totalTime.toFixed(2)}ms (${REQUEST_TIMEOUT/1000}s limit)`);
          console.error('📡 The Python service is running but search is taking too long.');
          console.error('💡 Consider optimizing search queries or increasing timeout.');
        } else {
          console.error(`❌ [Frontend] Search failed in ${totalTime.toFixed(2)}ms:`, error);
          console.error('🔧 Make sure the Python YouTube service is running on port 5001');
        }
        
        const mockResults = this.getMockResults(query, maxResults);
        CacheManager.setSearch(query, maxResults, mockResults);
        return mockResults;
      }
    });
  }
  
  // Fetch lyrics from LRCLIB API
  static async fetchLyrics(artist: string, title: string, album?: string, duration?: number): Promise<LyricsData | null> {
    const startTime = performance.now();
    console.log(`🎵 [Lyrics] Fetching lyrics for: "${title}" by "${artist}"`);
    
    // Check cache first
    const cached = CacheManager.getLyrics(artist, title);
    if (cached !== undefined) {
      const cacheTime = performance.now() - startTime;
      console.log(`⚡ [Lyrics] Cache result in ${cacheTime.toFixed(2)}ms:`, cached ? 'Found' : 'Not found');
      return cached;
    }
    
    try {
      const params = new URLSearchParams({
        artist: artist.trim(),
        title: title.trim()
      });
      
      if (album?.trim()) {
        params.append('album', album.trim());
      }
      
      if (duration) {
        params.append('duration', duration.toString());
      }
      
      const lyricsUrl = `${YOUTUBE_SERVICE_BASE_URL.replace('/youtube', '')}/lyrics?${params}`;
      console.log(`📡 [Lyrics] Fetching: ${lyricsUrl}`);
      
      const response = await optimizedFetch(lyricsUrl);
      const fetchTime = performance.now() - startTime;
      
      if (response.ok) {
        const lyricsData: LyricsData = await response.json();
        console.log(`✅ [Lyrics] Found lyrics in ${fetchTime.toFixed(2)}ms:`, {
          synced: !!lyricsData.syncedLyrics,
          plain: !!lyricsData.plainLyrics
        });
        
        CacheManager.setLyrics(artist, title, lyricsData);
        return lyricsData;
      } else if (response.status === 404) {
        console.log(`❌ [Lyrics] No lyrics found in ${fetchTime.toFixed(2)}ms`);
        CacheManager.setLyrics(artist, title, null);
        return null;
      } else {
        console.error(`⚠️ [Lyrics] API error ${response.status} in ${fetchTime.toFixed(2)}ms`);
        return null;
      }
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ [Lyrics] Fetch failed in ${totalTime.toFixed(2)}ms:`, error);
      return null;
    }
  }
  
  // Parse LRC format to timestamped lines
  static parseLRC(lrcContent: string): LyricsLine[] {
    if (!lrcContent?.trim()) return [];
    
    const lines: LyricsLine[] = [];
    const lrcLines = lrcContent.split('\n');
    
    for (const line of lrcLines) {
      // Match LRC timestamp format: [mm:ss.xx] or [mm:ss]
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const centiseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
        const text = match[4].trim();
        
        if (text) { // Skip empty lines
          const timeInSeconds = minutes * 60 + seconds + centiseconds / 1000;
          lines.push({ time: timeInSeconds, text });
        }
      }
    }
    
    // Sort by time
    return lines.sort((a, b) => a.time - b.time);
  }
  
  // Get current lyric line based on playback time
  static getCurrentLyricLine(lyricsLines: LyricsLine[], currentTime: number): { current?: LyricsLine; next?: LyricsLine; index: number } {
    if (!lyricsLines.length) return { index: -1 };
    
    let currentIndex = -1;
    
    for (let i = 0; i < lyricsLines.length; i++) {
      if (lyricsLines[i].time <= currentTime) {
        currentIndex = i;
      } else {
        break;
      }
    }
    
    return {
      current: currentIndex >= 0 ? lyricsLines[currentIndex] : undefined,
      next: currentIndex + 1 < lyricsLines.length ? lyricsLines[currentIndex + 1] : undefined,
      index: currentIndex
    };
  }

  // Prefetch audio URLs to speed up playback
  private static async prefetchAudioUrls(videos: YouTubeVideo[]): Promise<void> {
    console.log(`🚀 Prefetching audio URLs for ${videos.length} videos`);
    
    const prefetchPromises = videos.map(async (video) => {
      try {
        // Just make a HEAD request to prime the connection
        const audioUrl = `${YOUTUBE_SERVICE_BASE_URL}/audio/${video.youtubeId}`;
        await optimizedFetch(audioUrl, { method: 'HEAD' });
        console.log(`✅ Prefetched: ${video.title}`);
      } catch {
        console.log(`⚠️ Prefetch failed for: ${video.title}`);
      }
    });
    
    // Don't wait for all prefetches to complete
    Promise.allSettled(prefetchPromises);
  }

  static async getStreamUrl(videoId: string): Promise<string | null> {
    try {
      // Return direct stream URL from our Python service - optimized path
      return `${YOUTUBE_SERVICE_BASE_URL}/audio/${videoId}`;
    } catch (error) {
      console.error('Failed to get stream URL:', error);
      return null;
    }
  }

  static async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    const startTime = performance.now();
    
    // Check cache first
    const cachedDetails = CacheManager.getDetails(videoId);
    if (cachedDetails) {
      const cacheTime = performance.now() - startTime;
      console.log(`🎯 Cache hit for video details: ${videoId} in ${cacheTime.toFixed(2)}ms`);
      return cachedDetails;
    }
    
    return RequestQueue.add(async () => {
      try {
        const url = `${YOUTUBE_SERVICE_BASE_URL}/video/${videoId}`;
        
        const response = await optimizedFetch(url);
        
        if (!response.ok) {
          console.warn(`YouTube service error for ${videoId}: ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('YouTube service error:', data.error);
          return null;
        }

        const videoDetails: YouTubeVideo = {
          id: data.id,
          title: data.title,
          artist: data.artist,
          thumbnail: data.thumbnail,
          duration: data.duration,
          youtubeId: data.youtubeId,
          channelTitle: data.channelTitle,
          publishedAt: data.publishedAt,
          streamUrl: data.streamUrl,
          isVerified: data.isVerified || false,
          cachedAt: Date.now()
        };
        
        // Cache the result
        CacheManager.setDetails(videoId, videoDetails);
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ Video details fetched: ${videoId} in ${totalTime.toFixed(2)}ms`);
        
        return videoDetails;
      } catch (error) {
        const totalTime = performance.now() - startTime;
        console.error(`❌ Video details failed for ${videoId} in ${totalTime.toFixed(2)}ms:`, error);
        return null;
      }
    });
  }

  static async getTrendingMusic(): Promise<YouTubeVideo[]> {
    const cacheKey = 'trending_music';
    const cached = CacheManager.getSearch(cacheKey, 20);
    if (cached) {
      console.log('🎯 Using cached trending music');
      return cached;
    }
    
    const results = await this.searchSongs('trending music 2024', 20);
    CacheManager.setSearch(cacheKey, 20, results);
    return results;
  }

  static async getPopularMusic(): Promise<YouTubeVideo[]> {
    const cacheKey = 'popular_music';
    const cached = CacheManager.getSearch(cacheKey, 20);
    if (cached) {
      console.log('🎯 Using cached popular music');
      return cached;
    }
    
    const results = await this.searchSongs('popular songs 2024', 20);
    CacheManager.setSearch(cacheKey, 20, results);
    return results;
  }

  static async getRecommendations(): Promise<YouTubeVideo[]> {
    const genres = ['pop music', 'rock music', 'hip hop music', 'electronic music', 'indie music'];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    const cacheKey = `recommendations_${randomGenre}`;
    
    const cached = CacheManager.getSearch(cacheKey, 15);
    if (cached) {
      console.log(`🎯 Using cached recommendations for ${randomGenre}`);
      return cached;
    }
    
    const results = await this.searchSongs(`${randomGenre} 2024`, 15);
    CacheManager.setSearch(cacheKey, 15, results);
    return results;
  }
  
  // Get related songs with caching and optimization
  static async getRelatedSongs(videoId: string): Promise<YouTubeVideo[]> {
    const startTime = performance.now();
    
    // Check cache first
    const cachedRelated = CacheManager.getRelated(videoId);
    if (cachedRelated) {
      const cacheTime = performance.now() - startTime;
      console.log(`🎯 Cache hit for related songs: ${videoId} in ${cacheTime.toFixed(2)}ms`);
      return cachedRelated;
    }
    
    return RequestQueue.add(async () => {
      try {
        const url = `${YOUTUBE_SERVICE_BASE_URL}/related/${videoId}`;
        const response = await optimizedFetch(url);
        
        if (!response.ok) {
          console.warn(`Related songs service error for ${videoId}: ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('Related songs service error:', data.error);
          return [];
        }
        
        const relatedSongs = (data.related || []).map((item: YouTubeSearchResult) => ({
          id: item.id,
          title: item.title,
          artist: item.artist,
          thumbnail: item.thumbnail,
          duration: item.duration,
          youtubeId: item.youtubeId,
          channelTitle: item.channelTitle,
          publishedAt: item.publishedAt,
          isVerified: item.isVerified || false,
          streamUrl: `${YOUTUBE_SERVICE_BASE_URL}/audio/${item.youtubeId}`,
          cachedAt: Date.now()
        }));
        
        // Cache the results
        CacheManager.setRelated(videoId, relatedSongs);
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ Related songs fetched: ${relatedSongs.length} results for ${videoId} in ${totalTime.toFixed(2)}ms`);
        
        return relatedSongs;
      } catch (error) {
        const totalTime = performance.now() - startTime;
        console.error(`❌ Related songs failed for ${videoId} in ${totalTime.toFixed(2)}ms:`, error);
        return [];
      }
    });
  }
  
  // Batch process multiple video details for better performance
  static async getMultipleVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
    console.log(`🚀 Batch processing ${videoIds.length} video details`);
    
    const results: YouTubeVideo[] = [];
    const uncachedIds: string[] = [];
    
    // Check cache for each video
    for (const videoId of videoIds) {
      const cached = CacheManager.getDetails(videoId);
      if (cached) {
        results.push(cached);
      } else {
        uncachedIds.push(videoId);
      }
    }
    
    console.log(`🎯 Found ${results.length} cached, fetching ${uncachedIds.length} from API`);
    
    // Fetch uncached videos in parallel (limited by request queue)
    if (uncachedIds.length > 0) {
      const fetchPromises = uncachedIds.map(id => this.getVideoDetails(id));
      const fetchedResults = await Promise.allSettled(fetchPromises);
      
      fetchedResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          console.warn(`Failed to fetch details for ${uncachedIds[index]}`);
        }
      });
    }
    
    return results;
  }

  // Performance monitoring
  static getPerformanceStats(): { cacheSize: number; queueLength: number; cacheHitRate: number } {
    return {
      cacheSize: CacheManager.getCacheSize(),
      queueLength: RequestQueue.getQueueLength(),
      cacheHitRate: 0 // TODO: Implement hit rate tracking
    };
  }
  
  // Clear all caches (useful for debugging)
  static clearCache(): void {
    CacheManager.clearAll();
    console.log('🧹 All caches cleared');
  }
  
  private static getMockResults(_query: string, maxResults: number = 20): YouTubeVideo[] {
    const mockSongs = [
      {
        id: `mock-1-${Date.now()}`,
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        thumbnail: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '3:20',
        youtubeId: '4NRXx6U8ABQ',
        channelTitle: 'The Weeknd',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-2-${Date.now()}`,
        title: 'Watermelon Sugar',
        artist: 'Harry Styles',
        thumbnail: 'https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '2:54',
        youtubeId: 'E07s5ZYygMg',
        channelTitle: 'Harry Styles',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-3-${Date.now()}`,
        title: 'Levitating',
        artist: 'Dua Lipa',
        thumbnail: 'https://images.pexels.com/photos/811838/pexels-photo-811838.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '3:23',
        youtubeId: 'TUVcZfQe-Kw',
        channelTitle: 'Dua Lipa',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-4-${Date.now()}`,
        title: 'Good 4 U',
        artist: 'Olivia Rodrigo',
        thumbnail: 'https://images.pexels.com/photos/1370545/pexels-photo-1370545.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '2:58',
        youtubeId: 'gNi_6U5Pm_o',
        channelTitle: 'Olivia Rodrigo',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-5-${Date.now()}`,
        title: 'Stay',
        artist: 'The Kid LAROI & Justin Bieber',
        thumbnail: 'https://images.pexels.com/photos/1564506/pexels-photo-1564506.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '2:21',
        youtubeId: 'kTJczUoc26U',
        channelTitle: 'The Kid LAROI',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-6-${Date.now()}`,
        title: 'Anti-Hero',
        artist: 'Taylor Swift',
        thumbnail: 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '3:20',
        youtubeId: 'b1kbLWvqugk',
        channelTitle: 'Taylor Swift',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-7-${Date.now()}`,
        title: 'As It Was',
        artist: 'Harry Styles',
        thumbnail: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '2:47',
        youtubeId: 'H5v3kku4y6Q',
        channelTitle: 'Harry Styles',
        publishedAt: new Date().toISOString()
      },
      {
        id: `mock-8-${Date.now()}`,
        title: 'Heat Waves',
        artist: 'Glass Animals',
        thumbnail: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400',
        duration: '3:58',
        youtubeId: 'mRD0-GxqHVo',
        channelTitle: 'Glass Animals',
        publishedAt: new Date().toISOString()
      }
    ];

    // Randomize and return subset
    const shuffled = mockSongs.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(maxResults, mockSongs.length));
  }
}