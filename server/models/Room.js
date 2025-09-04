import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentSong: {
    id: String,
    title: String,
    artist: String,
    thumbnail: String,
    duration: String,
    youtubeId: String,
    startTime: Date,
    currentTime: Number
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  queue: [{
    id: String,
    title: String,
    artist: String,
    thumbnail: String,
    duration: String,
    youtubeId: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowGuestControl: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 50
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Room', roomSchema);