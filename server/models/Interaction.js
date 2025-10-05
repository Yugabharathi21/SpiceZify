import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  // Who and what
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  track_id: {
    type: String, // matches Track.id (youtube_id)
    required: true,
    index: true
  },
  
  // When
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  session_id: {
    type: String,
    index: true // to group interactions in the same listening session
  },
  
  // What happened
  event: {
    type: String,
    required: true,
    enum: ['play', 'finish', 'like', 'dislike', 'skip', 'add_playlist', 'search', 'share'],
    index: true
  },
  
  // Context and metrics
  value: {
    type: Number, // completion ratio for 'play', position for 'search', etc.
    min: 0,
    max: 1
  },
  position: {
    type: Number, // position in playlist/search results
    min: 0
  },
  duration_played: {
    type: Number, // seconds actually played
    min: 0
  },
  track_duration: {
    type: Number, // total track duration for completion rate calculation
    min: 0
  },
  
  // Context signals
  context: {
    device_type: String, // mobile, desktop, tablet
    time_of_day: Number, // hour 0-23
    day_of_week: Number, // 0-6 (Sunday = 0)
    source: String, // home, search, playlist, recommendation, radio
    previous_track_id: String, // what was playing before
    playlist_id: String, // if from a playlist
    search_query: String // if from search
  },
  
  // System metadata  
  ip_address: String,
  user_agent: String
}, {
  timestamps: true,
  collection: 'interactions'
});

// Compound indexes for efficient recommendation queries
interactionSchema.index({ user_id: 1, timestamp: -1 });
interactionSchema.index({ track_id: 1, event: 1, timestamp: -1 });
interactionSchema.index({ user_id: 1, event: 1, timestamp: -1 });
interactionSchema.index({ session_id: 1, timestamp: 1 });
interactionSchema.index({ 'context.source': 1, event: 1 });

// Static methods for recommendation system
interactionSchema.statics.getUserTopTracks = async function(userId, limit = 10, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        user_id: userId,
        timestamp: { $gte: cutoff },
        event: { $in: ['play', 'finish', 'like'] }
      }
    },
    {
      $group: {
        _id: '$track_id',
        play_count: { $sum: { $cond: [{ $eq: ['$event', 'play'] }, 1, 0] } },
        finish_count: { $sum: { $cond: [{ $eq: ['$event', 'finish'] }, 1, 0] } },
        like_count: { $sum: { $cond: [{ $eq: ['$event', 'like'] }, 1, 0] } },
        avg_completion: { $avg: '$value' },
        last_played: { $max: '$timestamp' },
        total_duration_played: { $sum: '$duration_played' }
      }
    },
    {
      $addFields: {
        // Composite score: likes * 3 + finishes * 2 + plays + completion_rate
        score: {
          $add: [
            { $multiply: ['$like_count', 3] },
            { $multiply: ['$finish_count', 2] },
            '$play_count',
            { $multiply: [{ $ifNull: ['$avg_completion', 0] }, 2] }
          ]
        }
      }
    },
    { $sort: { score: -1, last_played: -1 } },
    { $limit: limit },
    {
      $project: {
        track_id: '$_id',
        weight: '$score',
        play_count: 1,
        finish_count: 1,
        like_count: 1,
        avg_completion: 1,
        last_played: 1
      }
    }
  ]);
};

interactionSchema.statics.getUserTopArtists = async function(userId, limit = 5, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // We'll need to join with Track collection to get artist info
  return this.aggregate([
    {
      $match: {
        user_id: userId,
        timestamp: { $gte: cutoff },
        event: { $in: ['play', 'finish', 'like'] }
      }
    },
    {
      $lookup: {
        from: 'tracks',
        localField: 'track_id',
        foreignField: 'id',
        as: 'track'
      }
    },
    { $unwind: '$track' },
    {
      $group: {
        _id: '$track.artist',
        play_count: { $sum: { $cond: [{ $eq: ['$event', 'play'] }, 1, 0] } },
        finish_count: { $sum: { $cond: [{ $eq: ['$event', 'finish'] }, 1, 0] } },
        like_count: { $sum: { $cond: [{ $eq: ['$event', 'like'] }, 1, 0] } },
        unique_tracks: { $addToSet: '$track_id' },
        last_played: { $max: '$timestamp' }
      }
    },
    {
      $addFields: {
        unique_track_count: { $size: '$unique_tracks' },
        score: {
          $add: [
            { $multiply: ['$like_count', 3] },
            { $multiply: ['$finish_count', 2] },
            '$play_count',
            { $multiply: ['$unique_track_count', 0.5] } // diversity bonus
          ]
        }
      }
    },
    { $sort: { score: -1, last_played: -1 } },
    { $limit: limit },
    {
      $project: {
        artist: '$_id',
        weight: '$score',
        play_count: 1,
        finish_count: 1,
        like_count: 1,
        unique_track_count: 1,
        last_played: 1
      }
    }
  ]);
};

interactionSchema.statics.getUserTopGenres = async function(userId, limit = 10, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        user_id: userId,
        timestamp: { $gte: cutoff },
        event: { $in: ['play', 'finish', 'like'] }
      }
    },
    {
      $lookup: {
        from: 'tracks',
        localField: 'track_id',
        foreignField: 'id',
        as: 'track'
      }
    },
    { $unwind: '$track' },
    { $unwind: '$track.genres' },
    {
      $group: {
        _id: '$track.genres',
        count: { $sum: 1 },
        last_interaction: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1, last_interaction: -1 } },
    { $limit: limit },
    {
      $project: {
        genre: '$_id',
        weight: '$count'
      }
    }
  ]);
};

// Method to record interaction with context
interactionSchema.statics.recordInteraction = async function(data) {
  const interaction = new this({
    user_id: data.userId,
    track_id: data.trackId,
    event: data.event,
    value: data.value || null,
    position: data.position || null,
    duration_played: data.durationPlayed || null,
    track_duration: data.trackDuration || null,
    session_id: data.sessionId || null,
    context: {
      device_type: data.deviceType || 'unknown',
      time_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      source: data.source || 'unknown',
      previous_track_id: data.previousTrackId || null,
      playlist_id: data.playlistId || null,
      search_query: data.searchQuery || null
    },
    ip_address: data.ipAddress || null,
    user_agent: data.userAgent || null
  });
  
  return interaction.save();
};

// Get similar users for collaborative filtering
interactionSchema.statics.getSimilarUsers = async function(userId, limit = 100) {
  // Simple collaborative filtering: users who liked similar tracks
  return this.aggregate([
    // Get user's liked tracks
    { $match: { user_id: userId, event: 'like' } },
    { $group: { _id: null, liked_tracks: { $addToSet: '$track_id' } } },
    
    // Find other users who liked the same tracks
    {
      $lookup: {
        from: 'interactions',
        let: { user_liked: '$liked_tracks' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ['$user_id', userId] },
                  { $eq: ['$event', 'like'] },
                  { $in: ['$track_id', '$$user_liked'] }
                ]
              }
            }
          },
          {
            $group: {
              _id: '$user_id',
              common_likes: { $addToSet: '$track_id' },
              total_likes: { $sum: 1 }
            }
          }
        ],
        as: 'similar_users'
      }
    },
    { $unwind: '$similar_users' },
    {
      $addFields: {
        similarity: {
          $divide: [
            { $size: '$similar_users.common_likes' },
            { $add: [{ $size: '$liked_tracks' }, '$similar_users.total_likes'] }
          ]
        }
      }
    },
    { $sort: { similarity: -1 } },
    { $limit: limit },
    {
      $project: {
        user_id: '$similar_users._id',
        similarity: 1,
        common_tracks: '$similar_users.common_likes'
      }
    }
  ]);
};

export default mongoose.model('Interaction', interactionSchema);