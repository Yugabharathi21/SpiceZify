import mongoose from 'mongoose';
import User from '../models/User.js';
import Playlist from '../models/Playlist.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spicezify';

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing SpiceZify database...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Create indexes for better performance
    console.log('📋 Creating database indexes...');
    
    // User indexes
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ "likedSongs.id": 1 });
    await User.collection.createIndex({ "likedSongs.addedAt": -1 });
    
    // Playlist indexes
    await Playlist.collection.createIndex({ userId: 1 });
    await Playlist.collection.createIndex({ name: 1, userId: 1 });
    await Playlist.collection.createIndex({ createdAt: -1 });
    
    // Room indexes
    await Room.collection.createIndex({ code: 1 }, { unique: true });
    await Room.collection.createIndex({ hostId: 1 });
    await Room.collection.createIndex({ "members.userId": 1 });
    await Room.collection.createIndex({ createdAt: -1 });
    
    // Message indexes
    await Message.collection.createIndex({ roomCode: 1, timestamp: -1 });
    await Message.collection.createIndex({ userId: 1 });
    
    console.log('✅ Database indexes created successfully');
    
    // Get database statistics
    const stats = await mongoose.connection.db.stats();
    console.log('📊 Database Statistics:');
    console.log(`   - Database: ${mongoose.connection.name}`);
    console.log(`   - Collections: ${stats.collections}`);
    console.log(`   - Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Count documents in each collection
    const userCount = await User.countDocuments();
    const playlistCount = await Playlist.countDocuments();
    const roomCount = await Room.countDocuments();
    const messageCount = await Message.countDocuments();
    
    console.log('📈 Document Counts:');
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Playlists: ${playlistCount}`);
    console.log(`   - Rooms: ${roomCount}`);
    console.log(`   - Messages: ${messageCount}`);
    
    console.log('🎵 SpiceZify database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.name === 'MongoServerSelectionTimeoutError') {
      console.log('💡 Database connection troubleshooting:');
      console.log('   1. Check your MONGODB_URI in .env file');
      console.log('   2. Ensure MongoDB service is running (if using local MongoDB)');
      console.log('   3. Verify network connectivity (if using MongoDB Atlas)');
      console.log('   4. Check database credentials and permissions');
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the initialization
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export default initializeDatabase;