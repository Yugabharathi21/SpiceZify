import express from 'express';
import { nanoid } from 'nanoid';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create room
router.post('/create', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate unique room code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = nanoid(6).toUpperCase();
      const existingRoom = await Room.findOne({ code });
      if (!existingRoom) {
        isUnique = true;
      }
    }

    const room = new Room({
      code,
      name: name || `${user.username}'s Room`,
      hostId: req.userId,
      members: [{
        userId: req.userId,
        username: user.username
      }]
    });

    await room.save();
    res.status(201).json(room);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join room
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const room = await Room.findOne({ code });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is already in room
    const isMember = room.members.some(member => member.userId.toString() === req.userId);
    if (!isMember) {
      room.members.push({
        userId: req.userId,
        username: user.username
      });
      await room.save();
    }

    res.json(room);
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room details
router.get('/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    
    const room = await Room.findOne({ code }).populate('hostId', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave room
router.post('/:code/leave', auth, async (req, res) => {
  try {
    const { code } = req.params;
    
    const room = await Room.findOne({ code });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.members = room.members.filter(member => member.userId.toString() !== req.userId);
    
    // If host leaves, transfer to another member or delete room
    if (room.hostId.toString() === req.userId) {
      if (room.members.length > 0) {
        room.hostId = room.members[0].userId;
      } else {
        await Room.findByIdAndDelete(room._id);
        return res.json({ message: 'Room deleted' });
      }
    }
    
    await room.save();
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room messages
router.get('/:code/messages', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await Message.find({ roomCode: code })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'username');
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:code/messages', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { message } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const room = await Room.findOne({ code });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const newMessage = new Message({
      roomCode: code,
      userId: req.userId,
      username: user.username,
      message
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;