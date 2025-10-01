// Using Python backend service instead of direct YouTube API
const YOUTUBE_SERVICE_BASE_URL = 'http://localhost:3001/api/youtube';

// Performance optimization constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PREFETCH_COUNT = 5; // Number of songs to prefetch
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent requests
const REQUEST_TIMEOUT = 8000; // 8 seconds timeout

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
  
  static getSearch(query: string, maxResults: number): YouTubeVideo[] | null {
    const key = `${query}:${maxResults}`;
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`🎯 Cache hit for search: "${query}"`);
      return cached.data;
    }
    return null;
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
        
        const response = await optimizedFetch(searchUrl);
        
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
        console.error(`❌ [Frontend] Search failed in ${totalTime.toFixed(2)}ms:`, error);
        console.error('Make sure the Python YouTube service is running on port 5001');
        const mockResults = this.getMockResults(query, maxResults);
        CacheManager.setSearch(query, maxResults, mockResults);
        return mockResults;
      }
    });
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