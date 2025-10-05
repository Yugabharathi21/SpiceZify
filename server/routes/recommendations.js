import express from 'express';
import RecommendationEngine from '../services/RecommendationEngine.js';
import Interaction from '../models/Interaction.js';
import UserProfile from '../models/UserProfile.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /api/recommendations - Get personalized recommendations
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      limit = 20,
      verifiedOnly = 'true',
      exploration = 'true',
      diversification = 'true',
      exploreRate = '0.15'
    } = req.query;
    
    // Parse query parameters
    const options = {
      limit: Math.min(parseInt(limit) || 20, 50), // Cap at 50
      enforceVerified: verifiedOnly.toLowerCase() === 'true',
      useExploration: exploration.toLowerCase() === 'true',
      useDiversification: diversification.toLowerCase() === 'true',
      exploreP: Math.max(0, Math.min(1, parseFloat(exploreRate) || 0.15)) // Clamp 0-1
    };
    
    console.log(`🎵 Recommendation request from user ${userId}`, options);
    
    // Generate recommendations
    const recommendations = await RecommendationEngine.getRecommendations(userId, options);
    
    // Log the request for analytics
    await Interaction.recordInteraction({
      userId,
      trackId: 'recommendation_request',
      event: 'search',
      source: 'recommendations',
      searchQuery: `limit:${options.limit},verified:${options.enforceVerified}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).catch(err => console.warn('Failed to log recommendation request:', err.message));
    
    res.json(recommendations);
    
  } catch (error) {
    console.error('Recommendation endpoint error:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

// POST /api/recommendations/interaction - Record user interaction
router.post('/interaction', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      trackId,
      event,
      value,
      position,
      durationPlayed,
      trackDuration,
      sessionId,
      source,
      previousTrackId,
      playlistId,
      searchQuery
    } = req.body;
    
    // Validate required fields
    if (!trackId || !event) {
      return res.status(400).json({
        error: 'Missing required fields: trackId and event'
      });
    }
    
    // Validate event type
    const validEvents = ['play', 'finish', 'like', 'dislike', 'skip', 'add_playlist', 'search', 'share'];
    if (!validEvents.includes(event)) {
      return res.status(400).json({
        error: 'Invalid event type',
        validEvents
      });
    }
    
    // Record the interaction
    const interaction = await Interaction.recordInteraction({
      userId,
      trackId,
      event,
      value,
      position,
      durationPlayed,
      trackDuration,
      sessionId,
      source: source || 'unknown',
      previousTrackId,
      playlistId,
      searchQuery,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    console.log(`📊 Recorded ${event} interaction for user ${userId} on track ${trackId}`);
    
    // If this is a significant interaction, trigger profile update
    if (['like', 'finish'].includes(event)) {
      // Async profile update - don't wait
      UserProfile.updateFromInteractions(userId).catch(err => 
        console.warn('Profile update failed:', err.message)
      );
    }
    
    res.json({
      success: true,
      interactionId: interaction._id,
      timestamp: interaction.timestamp
    });
    
  } catch (error) {
    console.error('Interaction recording error:', error);
    res.status(500).json({
      error: 'Failed to record interaction',
      message: error.message
    });
  }
});

// GET /api/recommendations/profile - Get user's recommendation profile
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get or create user profile
    let profile = await UserProfile.findOne({ user_id: userId });
    if (!profile) {
      profile = await UserProfile.updateFromInteractions(userId);
    }
    
    // Get recent interaction stats
    const recentStats = await Interaction.aggregate([
      {
        $match: {
          user_id: userId,
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          last_interaction: { $max: '$timestamp' }
        }
      }
    ]);
    
    const profileData = {
      user_id: userId,
      top_artists: profile.top_artists?.slice(0, 10) || [],
      top_genres: profile.top_genres?.slice(0, 10) || [],
      followed_artists: profile.followed_artists || [],
      preferences: {
        verified_preference: profile.verified_preference,
        freshness_preference: profile.freshness_preference,
        diversity_preference: profile.diversity_preference
      },
      listening_patterns: {
        average_completion_rate: profile.average_completion_rate,
        skip_threshold_seconds: profile.skip_threshold_seconds,
        total_interactions: profile.total_interactions
      },
      scoring_weights: profile.scoring_weights,
      recent_activity: recentStats,
      last_updated: profile.last_profile_update,
      onboarding_completed: profile.onboarding_completed
    };
    
    res.json(profileData);
    
  } catch (error) {
    console.error('Profile endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

// PUT /api/recommendations/profile - Update user preferences
router.put('/profile', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      followed_artists,
      verified_preference,
      freshness_preference,
      diversity_preference,
      scoring_weights,
      seed_artists
    } = req.body;
    
    const updateData = {};
    
    // Update preferences if provided
    if (followed_artists !== undefined) updateData.followed_artists = followed_artists;
    if (verified_preference !== undefined) {
      updateData.verified_preference = Math.max(0, Math.min(1, verified_preference));
    }
    if (freshness_preference !== undefined) {
      updateData.freshness_preference = Math.max(0, Math.min(1, freshness_preference));
    }
    if (diversity_preference !== undefined) {
      updateData.diversity_preference = Math.max(0, Math.min(1, diversity_preference));
    }
    if (seed_artists !== undefined) {
      updateData.seed_artists = seed_artists;
      updateData.onboarding_completed = true;
    }
    
    // Update scoring weights if provided (with validation)
    if (scoring_weights) {
      const defaultWeights = {
        collaborative: 0.45,
        content: 0.25,
        popularity: 0.10,
        freshness: 0.10,
        follow_boost: 0.15,
        dup_penalty: 0.20
      };
      
      updateData.scoring_weights = { ...defaultWeights, ...scoring_weights };
      
      // Ensure weights are reasonable (each between 0 and 1)
      Object.keys(updateData.scoring_weights).forEach(key => {
        updateData.scoring_weights[key] = Math.max(0, Math.min(1, updateData.scoring_weights[key]));
      });
    }
    
    updateData.last_profile_update = new Date();
    
    const profile = await UserProfile.findOneAndUpdate(
      { user_id: userId },
      updateData,
      { upsert: true, new: true }
    );
    
    console.log(`⚙️ Updated profile for user ${userId}`);
    
    res.json({
      success: true,
      profile: {
        user_id: userId,
        preferences: {
          verified_preference: profile.verified_preference,
          freshness_preference: profile.freshness_preference,
          diversity_preference: profile.diversity_preference
        },
        scoring_weights: profile.scoring_weights,
        followed_artists: profile.followed_artists,
        seed_artists: profile.seed_artists,
        onboarding_completed: profile.onboarding_completed,
        last_updated: profile.last_profile_update
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// GET /api/recommendations/similar-users - Get users with similar taste (for debugging/analytics)
router.get('/similar-users', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    
    const similarUsers = await Interaction.getSimilarUsers(userId, limit);
    
    res.json({
      user_id: userId,
      similar_users: similarUsers,
      count: similarUsers.length
    });
    
  } catch (error) {
    console.error('Similar users endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get similar users',
      message: error.message
    });
  }
});

// GET /api/recommendations/trending - Get trending music
router.get('/trending', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    
    const trending = await Interaction.aggregate([
      {
        $match: {
          event: { $in: ['play', 'finish', 'like'] },
          timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$track_id',
          play_count: { $sum: { $cond: [{ $eq: ['$event', 'play'] }, 1, 0] } },
          finish_count: { $sum: { $cond: [{ $eq: ['$event', 'finish'] }, 1, 0] } },
          like_count: { $sum: { $cond: [{ $eq: ['$event', 'like'] }, 1, 0] } },
          unique_users: { $addToSet: '$user_id' },
          last_interaction: { $max: '$timestamp' }
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
      { $sort: { trend_score: -1, last_interaction: -1 } },
      { $limit: limit }
    ]);
    
    res.json({
      trending_tracks: trending,
      period_days: days,
      generated_at: new Date()
    });
    
  } catch (error) {
    console.error('Trending endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get trending music',
      message: error.message
    });
  }
});

export default router;