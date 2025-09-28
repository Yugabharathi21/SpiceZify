// Using Python backend service instead of direct YouTube API
const YOUTUBE_SERVICE_BASE_URL = 'http://localhost:3001/api/youtube';

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
}

export class YouTubeService {
  static async searchSongs(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
    const startTime = performance.now();
    console.log(`🔍 [Frontend] Starting search for: "${query}" (maxResults: ${maxResults})`);
    
    try {
      const searchUrl = `${YOUTUBE_SERVICE_BASE_URL}/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
      
      console.log(`📡 [Frontend] Fetching: ${searchUrl}`);
      const fetchStart = performance.now();
      
      const response = await fetch(searchUrl);
      
      const fetchTime = performance.now() - fetchStart;
      console.log(`⏱️ [Frontend] Fetch completed in ${fetchTime.toFixed(2)}ms, status: ${response.status}`);
      
      if (!response.ok) {
        console.warn('YouTube service error, using fallback data');
        if (response.status === 503) {
          console.error('Python YouTube service is not running. Start it with: python server/youtube_service.py');
        }
        return this.getMockResults(query, maxResults);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('YouTube service error:', data.error);
        return this.getMockResults(query, maxResults);
      }
      
      if (!data.results || data.results.length === 0) {
        return this.getMockResults(query, maxResults);
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
        streamUrl: `${YOUTUBE_SERVICE_BASE_URL}/audio/${item.youtubeId}`
      }));
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ [Frontend] Search completed: ${results.length} results in ${totalTime.toFixed(2)}ms`);
      
      return results;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ [Frontend] Search failed in ${totalTime.toFixed(2)}ms:`, error);
      console.error('Make sure the Python YouTube service is running on port 5001');
      return this.getMockResults(query, maxResults);
    }
  }

  static async getStreamUrl(videoId: string): Promise<string | null> {
    try {
      // Return direct stream URL from our Python service
      return `${YOUTUBE_SERVICE_BASE_URL}/audio/${videoId}`;
    } catch (error) {
      console.error('Failed to get stream URL:', error);
      return null;
    }
  }

  static async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    try {
      const url = `${YOUTUBE_SERVICE_BASE_URL}/video/${videoId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube service error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('YouTube service error:', data.error);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        artist: data.artist,
        thumbnail: data.thumbnail,
        duration: data.duration,
        youtubeId: data.youtubeId,
        channelTitle: data.channelTitle,
        publishedAt: data.publishedAt,
        streamUrl: data.streamUrl
      };
    } catch (error) {
      console.error('YouTube video details error:', error);
      return null;
    }
  }

  static async getTrendingMusic(): Promise<YouTubeVideo[]> {
    return this.searchSongs('trending music 2024', 20);
  }

  static async getPopularMusic(): Promise<YouTubeVideo[]> {
    return this.searchSongs('popular songs 2024', 20);
  }

  static async getRecommendations(): Promise<YouTubeVideo[]> {
    const genres = ['pop music', 'rock music', 'hip hop music', 'electronic music', 'indie music'];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    return this.searchSongs(`${randomGenre} 2024`, 15);
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