// Recommendation Engine Service for SpiceZify
// Implements hybrid recommendation system with YTMusic, collaborative filtering, and content-based approaches

import Track from '../models/Track.js';
import Interaction from '../models/Interaction.js';
import UserProfile from '../models/UserProfile.js';
import fetch from 'node-fetch';

// Configuration
const CONFIG = {
  YTMUSIC_SERVICE_URL: 'http://localhost:5001/api/youtube',
  DEFAULT_WEIGHTS: {
    collaborative: 0.45,
    content: 0.25,
    popularity: 0.10,
    freshness: 0.10,
    follow_boost: 0.15,
    dup_penalty: 0.20
  },
  MMR_LAMBDA: 0.8, // Balance between relevance and diversity
  EXPLORE_PROBABILITY: 0.15,
  MAX_CANDIDATES: 200,
  DEFAULT_RECOMMENDATION_COUNT: 20
};

class RecommendationEngine {
  constructor() {
    this.vocabulary = new Map(); // For simple embeddings
    this.initializeVocabulary();
  }

  async initializeVocabulary() {
    // Build vocabulary from existing tracks (artist, genres, title keywords)
    try {
      const tracks = await Track.find({}, 'artist genres title').lean();
      const vocabSet = new Set();
      
      tracks.forEach(track => {
        // Add artist
        if (track.artist) vocabSet.add(track.artist.toLowerCase());
        
        // Add genres
        if (track.genres) {
          track.genres.forEach(genre => vocabSet.add(genre.toLowerCase()));
        }
        
        // Add title keywords (first 3 words)
        if (track.title) {
          const words = track.title.toLowerCase().split(/\s+/).slice(0, 3);
          words.forEach(word => {
            if (word.length > 2) vocabSet.add(word);
          });
        }
      });
      
      // Convert to Map with indices
      Array.from(vocabSet).forEach((token, index) => {
        this.vocabulary.set(token, index);
      });
      
      console.log(`🧠 Initialized recommendation vocabulary with ${this.vocabulary.size} tokens`);
    } catch (error) {
      console.warn('Failed to initialize vocabulary:', error.message);
    }
  }

  // CANDIDATE GENERATION
  async generateCandidates(userId, userProfile, maxCandidates = CONFIG.MAX_CANDIDATES) {
    console.log(`🎯 Generating candidates for user ${userId}`);
    
    const candidateIds = new Set();
    
    try {
      // 1. User's top track seeds -> YTMusic related
      const topTracks = await Interaction.getUserTopTracks(userId, 5);
      for (const trackData of topTracks) {
        try {
          const related = await this.getYTMusicRelated(trackData.track_id, 10);
          related.forEach(id => candidateIds.add(id));
        } catch (error) {
          console.warn(`Failed to get related for ${trackData.track_id}:`, error.message);
        }
      }
      
      // 2. User's top artists -> more songs by same artists
      const topArtists = await Interaction.getUserTopArtists(userId, 5);
      for (const artistData of topArtists) {
        try {
          const artistSongs = await this.searchArtistSongs(artistData.artist, 12);
          artistSongs.forEach(id => candidateIds.add(id));
        } catch (error) {
          console.warn(`Failed to get songs for ${artistData.artist}:`, error.message);
        }
      }
      
      // 3. Collaborative filtering: similar users' likes
      try {
        const cfCandidates = await this.getCollaborativeCandidates(userId, 40);
        cfCandidates.forEach(id => candidateIds.add(id));
      } catch (error) {
        console.warn('CF candidates failed:', error.message);
      }
      
      // 4. Global trending fallback
      try {
        const trending = await this.getTrendingMusic(20);
        trending.forEach(id => candidateIds.add(id));
      } catch (error) {
        console.warn('Trending fallback failed:', error.message);
      }
      
      // 5. Genre-based discovery
      if (userProfile && userProfile.top_genres.length > 0) {
        for (const genreData of userProfile.top_genres.slice(0, 3)) {
          try {
            const genreSongs = await this.searchGenreSongs(genreData.genre, 10);
            genreSongs.forEach(id => candidateIds.add(id));
          } catch (error) {
            console.warn(`Failed to get songs for genre ${genreData.genre}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('Error in candidate generation:', error);
    }
    
    const candidates = Array.from(candidateIds).slice(0, maxCandidates);
    console.log(`📊 Generated ${candidates.length} candidate track IDs`);
    
    return candidates;
  }
  
  async getYTMusicRelated(videoId, maxResults = 10) {
    try {
      // Get track metadata first
      const track = await Track.findOne({ youtube_id: videoId });
      if (!track) return [];
      
      // Search for related songs using artist + title
      const query = `${track.artist} ${track.title}`.trim();
      const searchUrl = `${CONFIG.YTMUSIC_SERVICE_URL}/search?q=${encodeURIComponent(query)}&maxResults=${maxResults * 2}`;
      
      const response = await fetch(searchUrl, {
        timeout: 5000
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.results || [])
        .map(result => result.youtubeId)
        .filter(id => id && id !== videoId)
        .slice(0, maxResults);
    } catch (error) {
      console.warn(`YTMusic related lookup failed for ${videoId}:`, error.message);
      return [];
    }
  }
  
  async searchArtistSongs(artist, maxResults = 12) {
    try {
      const searchUrl = `${CONFIG.YTMUSIC_SERVICE_URL}/search?q=${encodeURIComponent(artist)}&maxResults=${maxResults}`;
      
      const response = await fetch(searchUrl, {
        timeout: 5000
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.results || [])
        .map(result => result.youtubeId)
        .filter(id => id);
    } catch (error) {
      console.warn(`Artist search failed for ${artist}:`, error.message);
      return [];
    }
  }
  
  async searchGenreSongs(genre, maxResults = 10) {
    try {
      const query = `${genre} music`;
      const searchUrl = `${CONFIG.YTMUSIC_SERVICE_URL}/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
      
      const response = await fetch(searchUrl, {
        timeout: 5000
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.results || [])
        .map(result => result.youtubeId)
        .filter(id => id);
    } catch (error) {
      console.warn(`Genre search failed for ${genre}:`, error.message);
      return [];
    }
  }
  
  async getCollaborativeCandidates(userId, maxResults = 40) {
    try {
      // Find similar users
      const similarUsers = await Interaction.getSimilarUsers(userId, 10);
      if (similarUsers.length === 0) return [];
      
      // Get their recent likes that this user hasn't interacted with
      const userInteractedTracks = new Set();
      const userInteractions = await Interaction.find({ user_id: userId }, 'track_id').lean();
      userInteractions.forEach(i => userInteractedTracks.add(i.track_id));
      
      const candidateIds = [];
      
      for (const similarUser of similarUsers) {
        const theirLikes = await Interaction.find({
          user_id: similarUser.user_id,
          event: 'like',
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // last 30 days
        }, 'track_id').lean();
        
        theirLikes.forEach(like => {
          if (!userInteractedTracks.has(like.track_id)) {
            candidateIds.push(like.track_id);
          }
        });
        
        if (candidateIds.length >= maxResults) break;
      }
      
      return candidateIds.slice(0, maxResults);
    } catch (error) {
      console.warn('Collaborative filtering failed:', error.message);
      return [];
    }
  }
  
  async getTrendingMusic(maxResults = 20) {
    try {
      // Get most played tracks in the last 7 days
      const trending = await Interaction.aggregate([
        {
          $match: {
            event: { $in: ['play', 'finish', 'like'] },
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$track_id',
            play_count: { $sum: { $cond: [{ $eq: ['$event', 'play'] }, 1, 0] } },
            unique_users: { $addToSet: '$user_id' },
            like_count: { $sum: { $cond: [{ $eq: ['$event', 'like'] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            unique_user_count: { $size: '$unique_users' },
            trend_score: {
              $add: [
                '$play_count',
                { $multiply: ['$like_count', 2] },
                { $multiply: [{ $size: '$unique_users' }, 3] }
              ]
            }
          }
        },
        { $sort: { trend_score: -1 } },
        { $limit: maxResults },
        { $project: { track_id: '$_id' } }
      ]);
      
      return trending.map(t => t.track_id);
    } catch (error) {
      console.warn('Trending music lookup failed:', error.message);
      return [];
    }
  }

  // HARD FILTERING (reuse existing yt-dlp filtering)
  async filterCandidates(candidateIds, enforceVerified = false) {
    const validTracks = [];
    
    for (const candidateId of candidateIds) {
      try {
        // Check if track exists in our database
        let track = await Track.findOne({ youtube_id: candidateId });
        
        if (!track) {
          // Track not in DB, need to probe it
          const probeUrl = `${CONFIG.YTMUSIC_SERVICE_URL}/probe/${candidateId}`;
          const response = await fetch(probeUrl, { timeout: 10000 });
          
          if (response.ok) {
            const probeData = await response.json();
            
            // Apply hard filters
            if (this.shouldKeepTrack(probeData.flags, enforceVerified)) {
              // Create track from probe data
              const trackData = Track.fromProbe(probeData);
              track = await Track.findOneAndUpdate(
                { youtube_id: candidateId },
                trackData,
                { upsert: true, new: true }
              );
              validTracks.push(track);
            }
          }
        } else {
          // Track exists, check if it passes filters
          const flags = {
            duration: track.duration,
            is_live: track.is_live,
            is_shorts_url: track.is_shorts_url,
            is_music_cat: track.is_music_cat,
            embeddable: track.embeddable,
            verified: track.verified
          };
          
          if (this.shouldKeepTrack(flags, enforceVerified)) {
            validTracks.push(track);
          }
        }
      } catch (error) {
        console.warn(`Failed to process candidate ${candidateId}:`, error.message);
      }
    }
    
    console.log(`✅ Filtered to ${validTracks.length} valid tracks from ${candidateIds.length} candidates`);
    return validTracks;
  }
  
  shouldKeepTrack(flags, enforceVerified = false) {
    // Duration check: 75s to 10min (600s)
    if (flags.duration < 75 || flags.duration > 600) return false;
    
    // No live streams or shorts
    if (flags.is_live || flags.is_shorts_url) return false;
    
    // Must be music category when available
    if (flags.is_music_cat === false) return false;
    
    // Must be embeddable
    if (flags.embeddable === false) return false;
    
    // Verified requirement
    if (enforceVerified && !flags.verified) return false;
    
    return true;
  }

  // SCORING SYSTEM
  async scoreTrack(userId, userProfile, track, prevRecommendations, cfScores = {}) {
    const weights = userProfile?.scoring_weights || CONFIG.DEFAULT_WEIGHTS;
    let score = 0.0;
    
    try {
      // 1. Collaborative filtering similarity
      const cfScore = cfScores[track.youtube_id] || 0;
      score += weights.collaborative * cfScore;
      
      // 2. Content/metadata similarity
      const contentScore = userProfile ? userProfile.getContentSimilarity(track) : 0;
      score += weights.content * contentScore;
      
      // 3. Popularity score (already computed in track model)
      score += weights.popularity * (track.popularity_score || 0);
      
      // 4. Freshness score (already computed in track model)
      score += weights.freshness * (track.freshness_score || 0);
      
      // 5. Follow boost
      const followBoost = userProfile?.followsArtist(track.artist) ? 1.0 : 0.0;
      score += weights.follow_boost * followBoost;
      
      // 6. Duplicate penalty
      const dupPenalty = prevRecommendations.artists.has(track.artist) ? 1.0 : 0.0;
      score -= weights.dup_penalty * dupPenalty;
      
      return Math.max(0, score); // Ensure non-negative
    } catch (error) {
      console.warn(`Scoring failed for track ${track.youtube_id}:`, error.message);
      return 0;
    }
  }

  // Simple embedding for MMR diversification
  createSimpleEmbedding(track) {
    const vector = new Array(this.vocabulary.size).fill(0);
    
    // Add artist
    if (track.artist) {
      const artistIndex = this.vocabulary.get(track.artist.toLowerCase());
      if (artistIndex !== undefined) vector[artistIndex] = 1.0;
    }
    
    // Add genres
    if (track.genres) {
      track.genres.forEach(genre => {
        const genreIndex = this.vocabulary.get(genre.toLowerCase());
        if (genreIndex !== undefined) vector[genreIndex] = 1.0;
      });
    }
    
    // Add title keywords
    if (track.title) {
      const words = track.title.toLowerCase().split(/\s+/).slice(0, 3);
      words.forEach(word => {
        if (word.length > 2) {
          const wordIndex = this.vocabulary.get(word);
          if (wordIndex !== undefined) vector[wordIndex] = 1.0;
        }
      });
    }
    
    return vector;
  }

  // MMR Diversification
  applyMMRDiversification(scoredTracks, k = CONFIG.DEFAULT_RECOMMENDATION_COUNT, lambda = CONFIG.MMR_LAMBDA) {
    const selected = [];
    const selectedVectors = [];
    let candidates = [...scoredTracks];
    
    // Precompute embeddings
    const embeddings = new Map();
    candidates.forEach(([track, score]) => {
      embeddings.set(track.youtube_id, this.createSimpleEmbedding(track));
    });
    
    while (candidates.length > 0 && selected.length < k) {
      let bestTrack = null;
      let bestScore = -Infinity;
      let bestIndex = -1;
      
      for (let i = 0; i < candidates.length; i++) {
        const [track, baseScore] = candidates[i];
        const embedding = embeddings.get(track.youtube_id);
        
        // Calculate max similarity to already selected tracks
        let maxSimilarity = 0;
        if (selectedVectors.length > 0) {
          for (const selectedVector of selectedVectors) {
            const similarity = this.cosineSimilarity(embedding, selectedVector);
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
        }
        
        // MMR score: λ * relevance - (1-λ) * max_similarity
        const mmrScore = lambda * baseScore - (1 - lambda) * maxSimilarity;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestTrack = candidates[i];
          bestIndex = i;
        }
      }
      
      if (bestTrack) {
        selected.push(bestTrack);
        selectedVectors.push(embeddings.get(bestTrack[0].youtube_id));
        candidates.splice(bestIndex, 1);
      } else {
        break;
      }
    }
    
    console.log(`🎲 MMR diversification selected ${selected.length} tracks`);
    return selected;
  }
  
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Explore/Exploit mechanism
  applyExploration(scoredTracks, exploreP = CONFIG.EXPLORE_PROBABILITY, k = CONFIG.DEFAULT_RECOMMENDATION_COUNT) {
    const chosen = [];
    const topCandidates = scoredTracks.slice(0, k * 3); // Top 3x candidates for exploration pool
    
    for (let i = 0; i < Math.min(k, scoredTracks.length); i++) {
      if (Math.random() < exploreP && topCandidates.length > k) {
        // Explore: pick from 30th-90th percentile
        const exploreStart = Math.floor(topCandidates.length / 3);
        const exploreEnd = Math.floor((topCandidates.length / 3) * 2);
        const explorePool = topCandidates.slice(exploreStart, exploreEnd);
        
        if (explorePool.length > 0) {
          const randomChoice = explorePool[Math.floor(Math.random() * explorePool.length)];
          chosen.push(randomChoice);
          
          // Remove from future consideration
          const index = topCandidates.indexOf(randomChoice);
          if (index > -1) topCandidates.splice(index, 1);
        } else {
          chosen.push(scoredTracks[i]);
        }
      } else {
        // Exploit: pick top-ranked
        chosen.push(scoredTracks[i]);
      }
    }
    
    return chosen;
  }

  // Main recommendation method
  async getRecommendations(userId, options = {}) {
    const {
      limit = CONFIG.DEFAULT_RECOMMENDATION_COUNT,
      enforceVerified = false,
      exploreP = CONFIG.EXPLORE_PROBABILITY,
      useDiversification = true,
      useExploration = true
    } = options;
    
    console.log(`🚀 Generating recommendations for user ${userId}`);
    const startTime = Date.now();
    
    try {
      // 1. Get or update user profile
      let userProfile = await UserProfile.findOne({ user_id: userId });
      if (!userProfile || userProfile.needsUpdate()) {
        console.log('📊 Updating user profile...');
        userProfile = await UserProfile.updateFromInteractions(userId);
      }
      
      // 2. Generate candidates
      const candidateIds = await this.generateCandidates(userId, userProfile);
      if (candidateIds.length === 0) {
        return { results: [], metadata: { processing_time_ms: Date.now() - startTime, reason: 'no_candidates' } };
      }
      
      // 3. Filter candidates
      const validTracks = await this.filterCandidates(candidateIds, enforceVerified);
      if (validTracks.length === 0) {
        return { results: [], metadata: { processing_time_ms: Date.now() - startTime, reason: 'no_valid_tracks' } };
      }
      
      // 4. Score tracks
      const prevRecommendations = { artists: new Set() };
      const cfScores = {}; // TODO: Implement proper CF scores
      
      const scoredTracks = [];
      for (const track of validTracks) {
        const score = await this.scoreTrack(userId, userProfile, track, prevRecommendations, cfScores);
        scoredTracks.push([track, score]);
      }
      
      // Sort by score
      scoredTracks.sort((a, b) => b[1] - a[1]);
      
      // 5. Apply exploration
      let finalTracks = scoredTracks;
      if (useExploration) {
        finalTracks = this.applyExploration(scoredTracks, exploreP, limit);
      }
      
      // 6. Apply MMR diversification
      if (useDiversification) {
        finalTracks = this.applyMMRDiversification(finalTracks, limit);
      }
      
      // 7. Format results
      const results = finalTracks.slice(0, limit).map(([track, score]) => ({
        id: track.youtube_id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: this.formatDuration(track.duration),
        youtubeId: track.youtube_id,
        channelTitle: track.channel_title,
        isVerified: track.verified,
        score: Math.round(score * 1000) / 1000 // Round to 3 decimal places
      }));
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Generated ${results.length} recommendations in ${processingTime}ms`);
      
      return {
        results,
        metadata: {
          processing_time_ms: processingTime,
          candidates_generated: candidateIds.length,
          valid_tracks: validTracks.length,
          user_profile_last_updated: userProfile?.last_profile_update,
          weights_used: userProfile?.scoring_weights || CONFIG.DEFAULT_WEIGHTS,
          exploration_enabled: useExploration,
          diversification_enabled: useDiversification
        }
      };
      
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return {
        results: [],
        metadata: {
          processing_time_ms: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }
  
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export default new RecommendationEngine();