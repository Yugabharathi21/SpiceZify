import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ytdl from 'ytdl-core';
import authRoutes from './routes/auth.js';
import songRoutes from './routes/songs.js';
import playlistRoutes from './routes/playlists.js';
import roomRoutes from './routes/rooms.js';
import likeRoutes from './routes/likes.js';
import Room from './models/Room.js';
import Message from './models/Message.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spicezify';

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10
})
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💡 To fix this issue:');
    console.log('   1. Install MongoDB: https://docs.mongodb.com/manual/installation/');
    console.log('   2. Start MongoDB service: sudo systemctl start mongod (Linux) or brew services start mongodb/brew/mongodb-community (Mac)');
    console.log('   3. Or start manually: mongod --dbpath /usr/local/var/mongodb');
    console.log('   4. Verify MongoDB is running: mongo --eval "db.adminCommand(\'listCollections\')"');
    console.log('   5. Alternative: Use MongoDB Atlas cloud database and update MONGODB_URI');
    console.log('⚠️  Server will continue running without database functionality');
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', likeRoutes);

// YouTube stream endpoint
app.get('/api/stream/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!ytdl.validateURL(`https://www.youtube.com/watch?v=${videoId}`)) {
      return res.status(400).json({ message: 'Invalid YouTube video ID' });
    }

    const info = await ytdl.getInfo(videoId);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      return res.status(404).json({ message: 'No audio stream found' });
    }

    // Get best quality audio stream
    const bestFormat = audioFormats.reduce((best, current) => {
      return (current.audioBitrate || 0) > (best.audioBitrate || 0) ? current : best;
    });

    res.json({
      streamUrl: bestFormat.url,
      quality: bestFormat.audioBitrate,
      container: bestFormat.container,
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ message: 'Failed to get stream URL' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Socket.IO for real-time features
const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Room management
  socket.on('joinRoom', async ({ roomCode, userId, username }) => {
    try {
      socket.join(roomCode);
      
      // Update room members
      const room = await Room.findOne({ code: roomCode });
      if (room) {
        const isMember = room.members.some(member => member.userId.toString() === userId);
        if (!isMember) {
          room.members.push({ userId, username });
          await room.save();
        }
        
        // Store socket info
        socket.userId = userId;
        socket.username = username;
        socket.roomCode = roomCode;
        
        // Notify room members
        socket.to(roomCode).emit('userJoined', { username, userId, memberCount: room.members.length });
        
        // Send current room state
        socket.emit('roomState', {
          currentSong: room.currentSong,
          isPlaying: room.isPlaying,
          queue: room.queue,
          members: room.members,
          hostId: room.hostId
        });
        
        console.log(`✅ User ${username} joined room ${roomCode}`);
      }
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('leaveRoom', async ({ roomCode, userId, username }) => {
    try {
      socket.leave(roomCode);
      
      // Remove from room members
      const room = await Room.findOne({ code: roomCode });
      if (room) {
        room.members = room.members.filter(member => member.userId.toString() !== userId);
        
        // If host leaves, transfer to another member or delete room
        if (room.hostId.toString() === userId) {
          if (room.members.length > 0) {
            room.hostId = room.members[0].userId;
            await room.save();
            io.to(roomCode).emit('hostChanged', { newHostId: room.hostId, newHostName: room.members[0].username });
          } else {
            await Room.findByIdAndDelete(room._id);
            io.to(roomCode).emit('roomClosed');
            return;
          }
        } else {
          await room.save();
        }
        
        socket.to(roomCode).emit('userLeft', { username, userId, memberCount: room.members.length });
      }
      
      console.log(`❌ User ${username} left room ${roomCode}`);
    } catch (error) {
      console.error('Leave room error:', error);
    }
  });

  // Music synchronization (only host can control)
  socket.on('playSong', async ({ roomCode, song, currentTime, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Only host can control playback
      if (room.hostId.toString() !== userId) {
        socket.emit('error', { message: 'Only host can control playback' });
        return;
      }

      room.currentSong = {
        ...song,
        startTime: new Date(),
        currentTime: currentTime || 0
      };
      room.isPlaying = true;
      await room.save();
      
      io.to(roomCode).emit('syncPlay', { 
        song, 
        currentTime: currentTime || 0, 
        startedBy: userId,
        timestamp: Date.now()
      });
      
      console.log(`🎵 Song started in room ${roomCode}: ${song.title}`);
    } catch (error) {
      console.error('Play song error:', error);
      socket.emit('error', { message: 'Failed to start song' });
    }
  });

  socket.on('pauseSong', async ({ roomCode, currentTime, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room || room.hostId.toString() !== userId) {
        socket.emit('error', { message: 'Only host can control playback' });
        return;
      }

      room.isPlaying = false;
      if (room.currentSong) {
        room.currentSong.currentTime = currentTime;
      }
      await room.save();
      
      io.to(roomCode).emit('syncPause', { 
        currentTime, 
        pausedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Pause song error:', error);
    }
  });

  socket.on('seekSong', async ({ roomCode, currentTime, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room || room.hostId.toString() !== userId) {
        socket.emit('error', { message: 'Only host can control playback' });
        return;
      }

      if (room.currentSong) {
        room.currentSong.currentTime = currentTime;
        room.currentSong.startTime = new Date();
      }
      await room.save();
      
      io.to(roomCode).emit('syncSeek', { 
        currentTime, 
        seekedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Seek song error:', error);
    }
  });

  // Chat functionality
  socket.on('sendMessage', async ({ roomCode, message, userId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const room = await Room.findOne({ code: roomCode });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const newMessage = new Message({
        roomCode,
        userId,
        username: user.username,
        message: message.trim()
      });
      
      await newMessage.save();
      
      io.to(roomCode).emit('messageReceived', {
        id: newMessage._id,
        user: user.username,
        message: message.trim(),
        timestamp: newMessage.timestamp,
        userId,
        isHost: room.hostId.toString() === userId
      });
      
      console.log(`💬 Message in room ${roomCode} from ${user.username}: ${message.trim()}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      if (socket.roomCode && socket.userId && socket.username) {
        const room = await Room.findOne({ code: socket.roomCode });
        if (room) {
          room.members = room.members.filter(member => member.userId.toString() !== socket.userId);
          
          if (room.hostId.toString() === socket.userId) {
            if (room.members.length > 0) {
              room.hostId = room.members[0].userId;
              await room.save();
              io.to(socket.roomCode).emit('hostChanged', { 
                newHostId: room.hostId, 
                newHostName: room.members[0].username 
              });
            } else {
              await Room.findByIdAndDelete(room._id);
              io.to(socket.roomCode).emit('roomClosed');
            }
          } else {
            await room.save();
          }
          
          socket.to(socket.roomCode).emit('userLeft', { 
            username: socket.username, 
            userId: socket.userId, 
            memberCount: room.members.length 
          });
        }
      }
    } catch (error) {
      console.error('Disconnect cleanup error:', error);
    }
    
    console.log('❌ User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:5173`);
  console.log(`🔗 Backend: http://localhost:${PORT}`);
});