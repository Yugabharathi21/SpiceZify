import { io, Socket } from 'socket.io-client';
import { ChatMessage, Room } from './chatService';

interface SongData {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
}

export interface SocketEvents {
  // Room events
  roomState: (state: Room) => void;
  userJoined: (data: { username: string; userId: string; memberCount: number }) => void;
  userLeft: (data: { username: string; userId: string; memberCount: number }) => void;
  hostChanged: (data: { newHostId: string; newHostName: string }) => void;
  roomClosed: () => void;
  
  // Music sync events
  syncPlay: (data: { song: SongData; currentTime: number; startedBy: string; timestamp: number }) => void;
  syncPause: (data: { currentTime: number; pausedBy: string; timestamp: number }) => void;
  syncSeek: (data: { currentTime: number; seekedBy: string; timestamp: number }) => void;
  songChanged: (data: { song: SongData; startedBy: string }) => void;
  
  // Chat events
  messageReceived: (message: ChatMessage) => void;
  userTyping: (data: { userId: string; username: string; isTyping: boolean }) => void;
  
  // System events
  error: (data: { message: string }) => void;
  disconnect: () => void;
  connect: () => void;
  reconnect: () => void;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isConnecting = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor() {
    this.setupEventMap();
  }

  private setupEventMap() {
    // Initialize event listener map
    const events = ['roomState', 'userJoined', 'userLeft', 'hostChanged', 'roomClosed', 
                   'syncPlay', 'syncPause', 'syncSeek', 'songChanged', 'messageReceived', 
                   'userTyping', 'error', 'disconnect', 'connect', 'reconnect'];
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  connect(serverUrl: string = 'http://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = io(serverUrl, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval,
          timeout: 10000,
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket?.id);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connect');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected:', reason);
          this.emit('disconnect');
          
          if (reason === 'io server disconnect') {
            // Server disconnected, reconnect manually
            this.reconnect();
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
          this.reconnectAttempts = 0;
          this.emit('reconnect');
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('Reconnection error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.isConnecting = false;
            reject(new Error('Failed to connect after maximum attempts'));
          }
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
          this.emit('error', { message: error.message || 'Socket connection error' });
        });

        // Set up all event listeners
        this.setupEventListeners();

      } catch (error) {
        this.isConnecting = false;
        console.error('Socket connection error:', error);
        reject(error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Room events
    this.socket.on('roomState', (state) => this.emit('roomState', state));
    this.socket.on('userJoined', (data) => this.emit('userJoined', data));
    this.socket.on('userLeft', (data) => this.emit('userLeft', data));
    this.socket.on('hostChanged', (data) => this.emit('hostChanged', data));
    this.socket.on('roomClosed', () => this.emit('roomClosed'));

    // Music sync events
    this.socket.on('syncPlay', (data) => this.emit('syncPlay', data));
    this.socket.on('syncPause', (data) => this.emit('syncPause', data));
    this.socket.on('syncSeek', (data) => this.emit('syncSeek', data));
    this.socket.on('songChanged', (data) => this.emit('songChanged', data));

    // Chat events
    this.socket.on('messageReceived', (message) => this.emit('messageReceived', message));
    this.socket.on('userTyping', (data) => this.emit('userTyping', data));
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.clearAllListeners();
  }

  reconnect() {
    if (this.socket && !this.socket.connected && !this.isConnecting) {
      console.log('🔄 Attempting to reconnect...');
      this.socket.connect();
    }
  }

  // Event listener management
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in socket event handler for ${event}:`, error);
        }
      });
    }
  }

  private clearAllListeners() {
    this.eventListeners.clear();
    this.setupEventMap();
  }

  // Room actions
  joinRoom(roomCode: string, userId: string, username: string) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('joinRoom', {
      roomCode: roomCode.toUpperCase(),
      userId,
      username
    });
  }

  leaveRoom(roomCode: string, userId: string, username: string) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('leaveRoom', {
      roomCode,
      userId,
      username
    });
  }

  // Music control actions (host only)
  playSong(roomCode: string, song: SongData, currentTime: number, userId: string) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('playSong', {
      roomCode,
      song,
      currentTime,
      userId
    });
  }

  pauseSong(roomCode: string, currentTime: number, userId: string) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('pauseSong', {
      roomCode,
      currentTime,
      userId
    });
  }

  seekSong(roomCode: string, currentTime: number, userId: string) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('seekSong', {
      roomCode,
      currentTime,
      userId
    });
  }

  // Chat actions
  sendMessage(roomCode: string, message: string, userId: string) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('sendMessage', {
      roomCode,
      message: message.trim(),
      userId
    });
  }

  sendTypingStatus(roomCode: string, userId: string, username: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('userTyping', {
      roomCode,
      userId,
      username,
      isTyping
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  getConnectionState(): 'connected' | 'disconnected' | 'connecting' | 'reconnecting' {
    if (this.isConnecting) return 'connecting';
    if (this.socket?.connected) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default SocketService;