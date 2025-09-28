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
router.post('/:id/songs', auth, async (req, res) => {
  try {
    const songData = req.body;
    
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check if song already exists in playlist
    const songExists = playlist.songs.some(existingSong => existingSong.id === songData.songId);
    if (songExists) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }

    playlist.songs.push({
      id: songData.songId,
      title: songData.title,
      artist: songData.artist,
      thumbnail: songData.thumbnail,
      duration: songData.duration,
      youtubeId: songData.youtubeId,
      channelTitle: songData.channelTitle,
      isVerified: songData.isVerified || false,
      addedAt: new Date()
    });

    await playlist.save();
    res.json({ message: 'Song added to playlist successfully', playlist });
  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Legacy endpoint for backwards compatibility
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
router.delete('/:id/songs/:songId', auth, async (req, res) => {
  try {
    const { id, songId } = req.params;

    const playlist = await Playlist.findOne({ _id: id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const originalLength = playlist.songs.length;
    playlist.songs = playlist.songs.filter(song => song.id !== songId);
    
    if (playlist.songs.length === originalLength) {
      return res.status(404).json({ message: 'Song not found in playlist' });
    }

    await playlist.save();
    res.json({ message: 'Song removed from playlist successfully', playlist });
  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Legacy endpoint for backwards compatibility
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

// Get songs from a specific playlist
router.get('/:id/songs', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.json(playlist.songs);
  } catch (error) {
    console.error('Get playlist songs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if a song exists in a playlist
router.get('/:id/songs/:songId', auth, async (req, res) => {
  try {
    const { id, songId } = req.params;
    
    const playlist = await Playlist.findOne({ _id: id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const songExists = playlist.songs.some(song => song.id === songId);
    res.json({ exists: songExists });
  } catch (error) {
    console.error('Check song in playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder songs in playlist
router.put('/:id/reorder', auth, async (req, res) => {
  try {
    const { songIds } = req.body; // Array of song IDs in new order
    
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Reorder songs based on the provided order
    const reorderedSongs = songIds.map(songId => 
      playlist.songs.find(song => song.id === songId)
    ).filter(Boolean); // Remove any undefined entries

    playlist.songs = reorderedSongs;
    await playlist.save();

    res.json({ message: 'Playlist reordered successfully', playlist });
  } catch (error) {
    console.error('Reorder playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Duplicate playlist
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    const originalPlaylist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!originalPlaylist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const duplicatedPlaylist = new Playlist({
      name: name || `${originalPlaylist.name} (Copy)`,
      description: originalPlaylist.description,
      userId: req.userId,
      songs: originalPlaylist.songs.map(song => ({
        ...song.toObject(),
        addedAt: new Date()
      })),
      isPublic: false
    });

    await duplicatedPlaylist.save();
    res.status(201).json(duplicatedPlaylist);
  } catch (error) {
    console.error('Duplicate playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;