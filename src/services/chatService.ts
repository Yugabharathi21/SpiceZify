export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  userId: string;
  isHost: boolean;
  type: 'message' | 'system' | 'song_change';
  reactions?: {
    emoji: string;
    users: string[];
  }[];
}

export interface RoomMember {
  userId: string;
  username: string;
  joinedAt: Date;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  addedBy: string;
  addedAt: Date;
}

export interface Room {
  code: string;
  name: string;
  hostId: string;
  members: RoomMember[];
  currentSong?: {
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    youtubeId: string;
    startTime?: Date;
    currentTime?: number;
  };
  isPlaying: boolean;
  queue: QueueItem[];
  settings: {
    allowGuestControl: boolean;
    maxMembers: number;
  };
  createdAt: Date;
}

interface MessageResponse {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  userId: string;
  isHost: boolean;
  type: 'message' | 'system' | 'song_change';
}

interface SystemMessageData {
  username?: string;
  newHostName?: string;
  title?: string;
  artist?: string;
}

class ChatService {
  private baseUrl = 'http://localhost:3001';

  async getMessages(roomCode: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomCode}/messages?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messages: MessageResponse[] = await response.json();
      return messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async sendMessage(roomCode: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomCode}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  async createRoom(name?: string): Promise<Room | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }

  async joinRoom(code: string): Promise<Room | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: code.toUpperCase() })
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      return await response.json();
    } catch (error) {
      console.error('Error joining room:', error);
      return null;
    }
  }

  async getRoomDetails(code: string): Promise<Room | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${code}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get room details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting room details:', error);
      return null;
    }
  }

  async leaveRoom(code: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${code}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  formatMessageTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Message filtering and search
  filterMessages(messages: ChatMessage[], filter: 'all' | 'system' | 'user'): ChatMessage[] {
    switch (filter) {
      case 'system':
        return messages.filter(msg => msg.type === 'system' || msg.userId === 'system');
      case 'user':
        return messages.filter(msg => msg.type === 'message' && msg.userId !== 'system');
      default:
        return messages;
    }
  }

  searchMessages(messages: ChatMessage[], query: string): ChatMessage[] {
    if (!query.trim()) return messages;
    
    const lowercaseQuery = query.toLowerCase();
    return messages.filter(msg => 
      msg.message.toLowerCase().includes(lowercaseQuery) ||
      msg.user.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Message validation
  validateMessage(message: string): { isValid: boolean; error?: string } {
    if (!message.trim()) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 500) {
      return { isValid: false, error: 'Message too long (max 500 characters)' };
    }
    
    // Check for spam (repeated characters)
    const repeatedChar = /(.)\1{10,}/;
    if (repeatedChar.test(message)) {
      return { isValid: false, error: 'Message contains too many repeated characters' };
    }
    
    return { isValid: true };
  }

  // Generate system messages
  createSystemMessage(type: 'join' | 'leave' | 'host_change' | 'song_change', data: SystemMessageData): ChatMessage {
    const id = Date.now().toString();
    const timestamp = new Date();
    
    switch (type) {
      case 'join':
        return {
          id,
          user: 'System',
          message: `${data.username} joined the room`,
          timestamp,
          userId: 'system',
          isHost: false,
          type: 'system'
        };
      
      case 'leave':
        return {
          id,
          user: 'System',
          message: `${data.username} left the room`,
          timestamp,
          userId: 'system',
          isHost: false,
          type: 'system'
        };
      
      case 'host_change':
        return {
          id,
          user: 'System',
          message: `${data.newHostName} is now the host`,
          timestamp,
          userId: 'system',
          isHost: false,
          type: 'system'
        };
      
      case 'song_change':
        return {
          id,
          user: 'System',
          message: `Now playing: ${data.title} by ${data.artist}`,
          timestamp,
          userId: 'system',
          isHost: false,
          type: 'song_change'
        };
      
      default:
        return {
          id,
          user: 'System',
          message: 'Room activity',
          timestamp,
          userId: 'system',
          isHost: false,
          type: 'system'
        };
    }
  }
}

export const chatService = new ChatService();
export default ChatService;