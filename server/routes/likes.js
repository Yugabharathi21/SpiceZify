import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Check if a song is liked
router.get('/liked/:songId', auth, async (req, res) => {
  try {
    const { songId } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isLiked = user.likedSongs.some(song => song.id === songId);
    res.json({ isLiked });
  } catch (error) {
    console.error('Check liked song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a song (POST /api/liked/:songId)
router.post('/liked/:songId', auth, async (req, res) => {
  try {
    const { songId } = req.params;
    const songData = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if song is already liked
    const isLiked = user.likedSongs.some(song => song.id === songId);
    if (isLiked) {
      return res.status(400).json({ message: 'Song already liked' });
    }

    // Add song to liked songs
    user.likedSongs.push({
      id: songId,
      title: songData.title,
      artist: songData.artist,
      thumbnail: songData.thumbnail,
      duration: songData.duration,
      youtubeId: songData.youtubeId,
      channelTitle: songData.channelTitle,
      isVerified: songData.isVerified,
      addedAt: new Date()
    });

    await user.save();
    res.json({ message: 'Song liked successfully', isLiked: true });
  } catch (error) {
    console.error('Like song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unlike a song (DELETE /api/liked/:songId)
router.delete('/liked/:songId', auth, async (req, res) => {
  try {
    const { songId } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const originalLength = user.likedSongs.length;
    user.likedSongs = user.likedSongs.filter(song => song.id !== songId);
    
    if (user.likedSongs.length === originalLength) {
      return res.status(404).json({ message: 'Song not found in liked songs' });
    }

    await user.save();
    res.json({ message: 'Song unliked successfully', isLiked: false });
  } catch (error) {
    console.error('Unlike song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all liked songs
router.get('/liked', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.likedSongs);
  } catch (error) {
    console.error('Get liked songs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Legacy endpoints for backwards compatibility
router.post('/like', auth, async (req, res) => {
  try {
    const { song } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if song is already liked
    const isLiked = user.likedSongs.some(likedSong => likedSong.id === song.id);
    if (isLiked) {
      return res.status(400).json({ message: 'Song already liked' });
    }

    user.likedSongs.push({
      ...song,
      addedAt: new Date()
    });

    await user.save();
    res.json({ message: 'Song liked successfully', likedSongs: user.likedSongs });
  } catch (error) {
    console.error('Like song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/unlike', auth, async (req, res) => {
  try {
    const { songId } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.likedSongs = user.likedSongs.filter(song => song.id !== songId);
    await user.save();

    res.json({ message: 'Song unliked successfully', likedSongs: user.likedSongs });
  } catch (error) {
    console.error('Unlike song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;