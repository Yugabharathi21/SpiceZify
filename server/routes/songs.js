import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();

// Search songs via YouTube API
router.get('/search', auth, async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }


    // YouTube API search is now handled on the frontend
    // This endpoint can be used for server-side search if needed
    res.json({ 
      message: 'Search is handled on frontend via YouTube API',
      query,
      maxResults 
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get song details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    

    // Song details are now handled on frontend via YouTube API
    res.json({ 
      message: 'Song details handled on frontend via YouTube API',
      id 
    });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;