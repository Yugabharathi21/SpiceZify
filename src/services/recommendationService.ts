import { API_BASE_URL } from '../config/constants';

// Types for recommendations
export interface RecommendationOptions {
  limit?: number;
  verifiedOnly?: boolean;
  exploration?: boolean;
  diversification?: boolean;
  exploreRate?: number;
}

export interface UserProfile {
  user_id: string;
  top_artists: Array<{ name: string; score: number; count: number }>;
  top_genres: Array<{ name: string; score: number; count: number }>;
  followed_artists: string[];
  preferences: {
    verified_preference: number;
    freshness_preference: number;
    diversity_preference: number;
  };
  listening_patterns: {
    average_completion_rate: number;
    skip_threshold_seconds: number;
    total_interactions: number;
  };
  scoring_weights: {
    collaborative: number;
    content: number;
    popularity: number;
    freshness: number;
    follow_boost: number;
    dup_penalty: number;
  };
  recent_activity: Array<{
    _id: string;
    count: number;
    last_interaction: string;
  }>;
  last_updated: string;
  onboarding_completed: boolean;
}

export interface TrendingTrack {
  _id: string;
  play_count: number;
  finish_count: number;
  like_count: number;
  unique_user_count: number;
  trend_score: number;
  last_interaction: string;
}

export interface SimilarUser {
  user_id: string;
  similarity_score: number;
  common_tracks: number;
  username?: string;
}

export interface InteractionData {
  trackId: string;
  event: 'play' | 'finish' | 'like' | 'dislike' | 'skip' | 'add_playlist' | 'search' | 'share';
  value?: number;
  position?: number;
  durationPlayed?: number;
  trackDuration?: number;
  sessionId?: string;
  source?: string;
  previousTrackId?: string;
  playlistId?: string;
  searchQuery?: string;
}

export interface RecommendedTrack {
  youtube_id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  view_count: number;
  is_verified: boolean;
  genres: string[];
  published_at: string;
  score: number;
  explanation: {
    method: string;
    reason: string;
    confidence: number;
  };
}

class RecommendationService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authentication headers
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Get personalized recommendations
  async getRecommendations(options: RecommendationOptions = {}): Promise<RecommendedTrack[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.verifiedOnly !== undefined) queryParams.append('verifiedOnly', options.verifiedOnly.toString());
      if (options.exploration !== undefined) queryParams.append('exploration', options.exploration.toString());
      if (options.diversification !== undefined) queryParams.append('diversification', options.diversification.toString());
      if (options.exploreRate !== undefined) queryParams.append('exploreRate', options.exploreRate.toString());

      const response = await fetch(`${this.baseURL}/api/recommendations?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recommendations || [];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  // Record user interaction with music
  async recordInteraction(interaction: InteractionData): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/recommendations/interaction`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(interaction)
      });

      if (!response.ok) {
        throw new Error(`Failed to record interaction: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
      // Don't throw - interaction recording should be non-blocking
    }
  }

  // Get user's recommendation profile
  async getUserProfile(): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseURL}/api/recommendations/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user preferences
  async updateProfile(updates: Partial<{
    followed_artists: string[];
    verified_preference: number;
    freshness_preference: number;
    diversity_preference: number;
    scoring_weights: Record<string, number>;
    seed_artists: string[];
  }>): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/recommendations/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Get trending music
  async getTrending(limit: number = 20, days: number = 7): Promise<TrendingTrack[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/recommendations/trending?limit=${limit}&days=${days}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get trending music: ${response.statusText}`);
      }

      const data = await response.json();
      return data.trending_tracks || [];
    } catch (error) {
      console.error('Error getting trending music:', error);
      throw error;
    }
  }

  // Get similar users (for debugging/analytics)
  async getSimilarUsers(limit: number = 10): Promise<SimilarUser[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/recommendations/similar-users?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get similar users: ${response.statusText}`);
      }

      const data = await response.json();
      return data.similar_users || [];
    } catch (error) {
      console.error('Error getting similar users:', error);
      throw error;
    }
  }

  // Convenience methods for common interactions
  async trackPlay(trackId: string, sessionId?: string, source?: string): Promise<void> {
    return this.recordInteraction({
      trackId,
      event: 'play',
      sessionId,
      source: source || 'player'
    });
  }

  async trackFinish(trackId: string, durationPlayed: number, trackDuration: number, sessionId?: string): Promise<void> {
    return this.recordInteraction({
      trackId,
      event: 'finish',
      durationPlayed,
      trackDuration,
      sessionId
    });
  }

  async trackLike(trackId: string, sessionId?: string): Promise<void> {
    return this.recordInteraction({
      trackId,
      event: 'like',
      sessionId
    });
  }

  async trackDislike(trackId: string, sessionId?: string): Promise<void> {
    return this.recordInteraction({
      trackId,
      event: 'dislike',
      sessionId
    });
  }

  async trackSkip(trackId: string, position: number, durationPlayed: number, sessionId?: string): Promise<void> {
    return this.recordInteraction({
      trackId,
      event: 'skip',
      position,
      durationPlayed,
      sessionId
    });
  }

  async trackAddToPlaylist(trackId: string, playlistId: string, sessionId?: string): Promise<void> {
    return this.recordInteraction({
      trackId,
      event: 'add_playlist',
      playlistId,
      sessionId
    });
  }

  async trackSearch(searchQuery: string, sessionId?: string): Promise<void> {
    return this.recordInteraction({
      trackId: 'search_query',
      event: 'search',
      searchQuery,
      sessionId
    });
  }
}

export default new RecommendationService();