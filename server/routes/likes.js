import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Like a song
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

// Unlike a song
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

// Get liked songs
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

export default router;