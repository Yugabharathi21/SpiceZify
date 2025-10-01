import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  // Primary identifiers
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  youtube_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Metadata
  title: {
    type: String,
    required: true,
    index: true
  },
  artist: {
    type: String,
    required: true,
    index: true
  },
  channel_id: {
    type: String,
    index: true
  },
  channel_title: {
    type: String,
    index: true
  },
  
  // Audio properties
  duration: {
    type: Number, // duration in seconds
    required: true,
    index: true
  },
  
  // Content classification
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  genres: [{
    type: String,
    index: true
  }],
  categories: [{
    type: String,
    index: true
  }],
  
  // Temporal data
  released_at: {
    type: Date,
    index: true
  },
  discovered_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Media URLs and thumbnails  
  thumbnail: String,
  stream_url: String,
  
  // Engagement metrics (updated periodically)
  view_count: {
    type: Number,
    default: 0,
    index: true
  },
  like_count: {
    type: Number,
    default: 0
  },
  
  // Content flags (from yt-dlp probing)
  is_live: {
    type: Boolean,
    default: false,
    index: true
  },
  is_shorts_url: {
    type: Boolean,
    default: false,
    index: true
  },
  is_music_cat: {
    type: Boolean,
    default: true,
    index: true
  },
  embeddable: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Recommendation system fields
  popularity_score: {
    type: Number,
    default: 0,
    index: true
  },
  freshness_score: {
    type: Number,
    default: 0,
    index: true
  },
  content_vector: [Number], // Simple embedding for MMR
  
  // Statistics for recommendation tuning
  total_plays: {
    type: Number,
    default: 0,
    index: true
  },
  total_likes: {
    type: Number,
    default: 0
  },
  total_skips: {
    type: Number,
    default: 0
  },
  completion_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  
  // System metadata
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'tracks'
});

// Compound indexes for efficient queries
trackSchema.index({ artist: 1, verified: 1 });
trackSchema.index({ genres: 1, popularity_score: -1 });
trackSchema.index({ discovered_at: -1, is_music_cat: 1 });
trackSchema.index({ total_plays: -1, completion_rate: -1 });

// Virtual field for age in days
trackSchema.virtual('age_days').get(function() {
  if (!this.released_at) return 365 * 10; // default old age
  const now = new Date();
  const released = new Date(this.released_at);
  return Math.floor((now - released) / (1000 * 60 * 60 * 24));
});

// Update popularity and freshness scores when saving
trackSchema.pre('save', function(next) {
  // Popularity score (log scale)
  const viewCount = Math.max(1, this.view_count || 1);
  this.popularity_score = Math.min(1.0, Math.log(viewCount + 1) / 15.0);
  
  // Freshness score (exponential decay over 90 days)
  const ageDays = this.age_days;
  const halfLife = 90;
  this.freshness_score = Math.pow(0.5, ageDays / halfLife);
  
  this.last_updated = new Date();
  next();
});

// Static method to create/update track from yt-dlp probe
trackSchema.statics.fromProbe = function(probeData) {
  const info = probeData.info;
  const flags = probeData.flags;
  
  return {
    id: info.id,
    youtube_id: info.id,
    title: info.title || 'Unknown Title',
    artist: info.channel || info.uploader || 'Unknown Artist',
    channel_id: info.channel_id,
    channel_title: info.channel,
    duration: Math.floor(info.duration || 0),
    verified: flags.verified || false,
    genres: info.genres || [],
    categories: info.categories || [],
    released_at: info.upload_date ? new Date(info.upload_date) : new Date(),
    thumbnail: info.thumbnail,
    view_count: parseInt(info.view_count) || 0,
    like_count: parseInt(info.like_count) || 0,
    is_live: flags.is_live || false,
    is_shorts_url: flags.is_shorts_url || false,
    is_music_cat: flags.is_music_cat !== false,
    embeddable: flags.embeddable !== false
  };
};

export default mongoose.model('Track', trackSchema);