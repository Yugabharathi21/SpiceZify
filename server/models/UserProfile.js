import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Materialized views for fast recommendations
  top_artists: [{
    artist: String,
    weight: Number,
    last_updated: Date
  }],
  
  top_genres: [{
    genre: String, 
    weight: Number,
    last_updated: Date
  }],
  
  followed_artists: [String], // Artists user explicitly follows
  
  // Listening patterns
  preferred_time_slots: [{
    hour: Number, // 0-23
    weight: Number
  }],
  
  preferred_duration_range: {
    min_seconds: { type: Number, default: 75 },
    max_seconds: { type: Number, default: 600 }
  },
  
  // Content preferences
  verified_preference: {
    type: Number,
    default: 0.5, // 0 = no preference, 1 = strong preference for verified
    min: 0,
    max: 1
  },
  
  freshness_preference: {
    type: Number,
    default: 0.3, // 0 = no preference for new music, 1 = only new music  
    min: 0,
    max: 1
  },
  
  diversity_preference: {
    type: Number,
    default: 0.7, // 0 = very similar songs, 1 = very diverse
    min: 0,
    max: 1
  },
  
  // Behavioral signals
  average_completion_rate: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1
  },
  
  skip_threshold_seconds: {
    type: Number,
    default: 20 // User typically skips before this
  },
  
  total_interactions: {
    type: Number,
    default: 0
  },
  
  // Cold start helpers
  onboarding_completed: {
    type: Boolean,
    default: false
  },
  
  seed_artists: [String], // Artists chosen during onboarding
  
  // System metadata
  last_recommendation_at: Date,
  last_profile_update: {
    type: Date,
    default: Date.now
  },
  
  // Recommendation personalization weights
  scoring_weights: {
    collaborative: { type: Number, default: 0.45 },
    content: { type: Number, default: 0.25 },
    popularity: { type: Number, default: 0.10 },
    freshness: { type: Number, default: 0.10 },
    follow_boost: { type: Number, default: 0.15 },
    dup_penalty: { type: Number, default: 0.20 }
  }
}, {
  timestamps: true,
  collection: 'user_profiles'
});

// Indexes
userProfileSchema.index({ 'top_artists.artist': 1 });
userProfileSchema.index({ 'top_genres.genre': 1 });
userProfileSchema.index({ last_profile_update: 1 });

// Static method to build/update profile from interactions
userProfileSchema.statics.updateFromInteractions = async function(userId) {
  const Interaction = mongoose.model('Interaction');
  
  // Get user's listening data
  const [topTracks, topArtists, topGenres] = await Promise.all([
    Interaction.getUserTopTracks(userId, 50),
    Interaction.getUserTopArtists(userId, 20),
    Interaction.getUserTopGenres(userId, 15)
  ]);
  
  // Calculate average completion rate
  const completionStats = await Interaction.aggregate([
    {
      $match: {
        user_id: userId,
        event: 'play',
        value: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        avg_completion: { $avg: '$value' },
        total_interactions: { $sum: 1 }
      }
    }
  ]);
  
  const avgCompletion = completionStats[0]?.avg_completion || 0.5;
  const totalInteractions = completionStats[0]?.total_interactions || 0;
  
  // Update or create profile
  const update = {
    top_artists: topArtists.map(a => ({
      artist: a.artist,
      weight: a.weight,
      last_updated: new Date()
    })),
    top_genres: topGenres.map(g => ({
      genre: g.genre,
      weight: g.weight,
      last_updated: new Date()
    })),
    average_completion_rate: avgCompletion,
    total_interactions: totalInteractions,
    last_profile_update: new Date()
  };
  
  return this.findOneAndUpdate(
    { user_id: userId },
    update,
    { upsert: true, new: true }
  );
};

// Check if profile needs updating (every 24 hours or after 10 new interactions)
userProfileSchema.methods.needsUpdate = function() {
  if (!this.last_profile_update) return true;
  
  const hoursSinceUpdate = (Date.now() - this.last_profile_update) / (1000 * 60 * 60);
  return hoursSinceUpdate > 24;
};

// Get content similarity between user profile and track
userProfileSchema.methods.getContentSimilarity = function(track) {
  let score = 0.0;
  
  // Artist match
  const artistMatch = this.top_artists.find(a => a.artist === track.artist);
  if (artistMatch) {
    score += Math.min(0.6, artistMatch.weight / 10); // normalize weight
  }
  
  // Genre overlap
  if (track.genres && track.genres.length > 0) {
    const userGenres = new Set(this.top_genres.map(g => g.genre));
    const genreOverlap = track.genres.filter(g => userGenres.has(g)).length;
    score += Math.min(0.4, genreOverlap * 0.1);
  }
  
  return Math.min(score, 1.0);
};

// Check if user follows an artist
userProfileSchema.methods.followsArtist = function(artist) {
  return this.followed_artists.includes(artist);
};

export default mongoose.model('UserProfile', userProfileSchema);