import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    uppercase: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['message', 'system', 'song_change'],
    default: 'message'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ roomCode: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);