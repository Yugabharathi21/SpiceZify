import express from 'express';
import Playlist from '../models/Playlist.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get user playlists
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific playlist
router.get('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.json(playlist);
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create playlist
router.post('/create', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Playlist name is required' });
    }
    
    const playlist = new Playlist({
      name: name.trim(),
      description: description?.trim() || '',
      userId: req.userId,
      songs: []
    });

    await playlist.save();
    res.status(201).json(playlist);
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update playlist
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (name) playlist.name = name.trim();
    if (description !== undefined) playlist.description = description.trim();
    
    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete playlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add song to playlist
router.post('/:id/add', auth, async (req, res) => {
  try {
    const { song } = req.body;
    
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check if song already exists in playlist
    const songExists = playlist.songs.some(existingSong => existingSong.id === song.id);
    if (songExists) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }

    playlist.songs.push({
      ...song,
      addedAt: new Date()
    });

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove song from playlist
router.delete('/:id/remove/:songId', auth, async (req, res) => {
  try {
    const { id, songId } = req.params;

    const playlist = await Playlist.findOne({ _id: id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(song => song.id !== songId);
    await playlist.save();

    res.json(playlist);
  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;