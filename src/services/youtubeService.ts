const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyD6WBFi39Z2y7EYUHTLVPiPpJMelzyDeU0';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

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

export class YouTubeService {
  static async searchSongs(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
    try {
      const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(query + ' music')}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        console.warn('YouTube API error, using fallback data');
        return this.getMockResults(query, maxResults);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return this.getMockResults(query, maxResults);
      }

      // Get video details including duration
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `${YOUTUBE_API_BASE_URL}/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      return data.items.map((item: any, index: number) => {
        const details = detailsData.items?.[index];
        const duration = details ? this.parseDuration(details.contentDetails.duration) : '0:00';
        
        // Clean up title to extract artist and song name
        const { title, artist } = this.parseTitle(item.snippet.title);
        
        return {
          id: item.id.videoId,
          title,
          artist: artist || item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
          duration,
          youtubeId: item.id.videoId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt
        };
      }).filter(song => {
        // Filter out videos that are too long (likely not music)
        const durationParts = song.duration.split(':');
        const totalMinutes = durationParts.length === 3 
          ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
          : parseInt(durationParts[0]);
        return totalMinutes <= 15; // Max 15 minutes
      });
    } catch (error) {
      console.error('YouTube search error:', error);
      return this.getMockResults(query, maxResults);
    }
  }

  static async getStreamUrl(videoId: string): Promise<string | null> {
    try {
      const response = await fetch(`http://localhost:3001/api/stream/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        return data.streamUrl;
      }
    } catch (error) {
      console.error('Failed to get stream URL:', error);
    }
    return null;
  }

  static async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    try {
      const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return null;
      }

      const item = data.items[0];
      const { title, artist } = this.parseTitle(item.snippet.title);
      
      return {
        id: item.id,
        title,
        artist: artist || item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || '',
        duration: this.parseDuration(item.contentDetails.duration),
        youtubeId: item.id,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
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

  private static parseTitle(fullTitle: string): { title: string; artist: string } {
    // Remove common YouTube suffixes
    let cleanTitle = fullTitle
      .replace(/\s*\(Official.*?\)/gi, '')
      .replace(/\s*\[Official.*?\]/gi, '')
      .replace(/\s*- Official.*$/gi, '')
      .replace(/\s*\| Official.*$/gi, '')
      .replace(/\s*HD$/gi, '')
      .replace(/\s*4K$/gi, '')
      .trim();

    // Common patterns in YouTube music titles
    const patterns = [
      /^(.+?)\s*-\s*(.+?)$/,  // Artist - Song
      /^(.+?)\s*by\s*(.+?)$/i, // Song by Artist
      /^(.+?)\s*\|\s*(.+?)$/,  // Artist | Song
      /^(.+?)\s*:\s*(.+?)$/,   // Artist: Song
    ];

    for (const pattern of patterns) {
      const match = cleanTitle.match(pattern);
      if (match) {
        const part1 = match[1].trim();
        const part2 = match[2].trim();
        
        // Heuristic: if first part looks like an artist name (shorter, common patterns)
        if (part1.length < part2.length && !part1.includes('feat') && !part1.includes('ft.')) {
          return { artist: part1, title: part2 };
        } else {
          return { artist: part2, title: part1 };
        }
      }
    }

    // Fallback: use full title as song name
    return {
      title: cleanTitle,
      artist: ''
    };
  }

  private static parseDuration(duration: string): string {
    // Parse ISO 8601 duration format (PT4M13S) to MM:SS
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private static getMockResults(query: string, maxResults: number = 20): YouTubeVideo[] {
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