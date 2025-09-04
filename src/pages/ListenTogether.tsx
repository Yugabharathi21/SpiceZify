import React, { useState, useEffect } from 'react';
import { UsersIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, StarIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import io, { Socket } from 'socket.io-client';

interface RoomMember {
  userId: string;
  username: string;
  joinedAt: Date;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  userId: string;
  isHost: boolean;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  youtubeId: string;
}

interface Room {
  code: string;
  name: string;
  hostId: string;
  members: RoomMember[];
  currentSong?: Song;
  isPlaying: boolean;
}

const ListenTogether: React.FC = () => {
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, nextSong, previousSong } = usePlayer();
  
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('roomCode') || '');
  const [isInRoom, setIsInRoom] = useState(() => localStorage.getItem('isInRoom') === 'true');
  const [room, setRoom] = useState<Room | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Persist roomCode and isInRoom to localStorage
  useEffect(() => {
    localStorage.setItem('roomCode', roomCode);
    localStorage.setItem('isInRoom', isInRoom.toString());
  }, [roomCode, isInRoom]);
  
  // Restore room state on refresh
  useEffect(() => {
    const fetchRoomData = async (code: string) => {
      try {
        const response = await fetch(`http://localhost:3001/api/rooms/${code}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const roomData = await response.json();
          setRoom(roomData);
          setIsInRoom(true);
          setIsHost(roomData.hostId === user?.id);
        } else {
          setIsInRoom(false);
          setRoom(null);
        }
      } catch {
        setIsInRoom(false);
        setRoom(null);
      }
    };
    
    const storedRoomCode = localStorage.getItem('roomCode');
    if (storedRoomCode) {
      fetchRoomData(storedRoomCode);
    }
  }, [user?.id]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('roomState', (state) => {
      setRoom(state);
      setIsHost(state.hostId === user?.id);
      if (state.currentSong && state.isPlaying) {
        playSong(state.currentSong);
      }
    });

    newSocket.on('userJoined', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: 'System',
        message: `${username} joined the room`,
        timestamp: new Date(),
        userId: 'system',
        isHost: false
      }]);
    });

    newSocket.on('userLeft', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: 'System',
        message: `${username} left the room`,
        timestamp: new Date(),
        userId: 'system',
        isHost: false
      }]);
    });

    newSocket.on('hostChanged', ({ newHostName }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: 'System',
        message: `${newHostName} is now the host`,
        timestamp: new Date(),
        userId: 'system',
        isHost: false
      }]);
    });

    newSocket.on('syncPlay', ({ song }) => {
      playSong(song);
    });

    newSocket.on('syncPause', () => {
      pauseSong();
    });

    newSocket.on('syncSeek', () => {
      // Handle seek synchronization
    });

    newSocket.on('messageReceived', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('roomClosed', () => {
      setIsInRoom(false);
      setRoom(null);
      setMessages([]);
      setError('Room was closed by the host');
    });

    newSocket.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, playSong, pauseSong]);

  const createRoom = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: `${user?.username}'s Room` })
      });

      if (response.ok) {
        const newRoom = await response.json();
        setRoomCode(newRoom.code);
        setRoom(newRoom);
        setIsInRoom(true);
        setIsHost(true);
        
        socket?.emit('joinRoom', {
          roomCode: newRoom.code,
          userId: user?.id,
          username: user?.username
        });
      } else {
        setError('Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room');
    }
    
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: roomCode.toUpperCase() })
      });

      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
        setIsInRoom(true);
        setIsHost(roomData.hostId === user?.id);
        
        socket?.emit('joinRoom', {
          roomCode: roomCode.toUpperCase(),
          userId: user?.id,
          username: user?.username
        });
      } else {
        setError('Room not found');
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room');
    }
    
    setLoading(false);
  };

  const leaveRoom = () => {
    if (socket && room) {
      socket.emit('leaveRoom', {
        roomCode: room.code,
        userId: user?.id,
        username: user?.username
      });
    }
    
    setIsInRoom(false);
    setRoom(null);
    setMessages([]);
    setRoomCode('');
    setIsHost(false);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !room) return;

    socket.emit('sendMessage', {
      roomCode: room.code,
      message: newMessage.trim(),
      userId: user?.id
    });
    
    setNewMessage('');
  };

  const handleHostControl = (action: string) => {
    if (!isHost || !socket || !room) return;

    switch (action) {
      case 'play':
        if (currentSong) {
          socket.emit('playSong', {
            roomCode: room.code,
            song: currentSong,
            currentTime: 0,
            userId: user?.id
          });
          resumeSong();
        }
        break;
      case 'pause':
        socket.emit('pauseSong', {
          roomCode: room.code,
          currentTime: 0,
          userId: user?.id
        });
        pauseSong();
        break;
      case 'next':
        nextSong();
        break;
      case 'previous':
        previousSong();
        break;
    }
  };

  if (!isInRoom) {
    return (
      <div className="p-8 max-w-md mx-auto mt-20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-spotify-green mx-auto mb-4 flex items-center justify-center" style={{ borderRadius: '4px' }}>
            <UsersIcon className="w-8 h-8 text-spotify-black" />
          </div>
          <h1 className="text-3xl font-bold text-spotify-white mb-2">Listen Together</h1>
          <p className="text-spotify-text-gray">Join friends and listen to music together in real-time</p>
        </div>

        {error && (
          <div className="bg-spotify-error/20 border border-spotify-error text-spotify-error p-3 mb-4 text-sm" style={{ borderRadius: '3px' }}>
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-spotify-medium-gray border border-spotify-border text-spotify-white placeholder-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green focus:border-spotify-green transition-all duration-150"
              style={{ borderRadius: '3px' }}
              placeholder="Enter room code"
              maxLength={6}
            />
            <button
              onClick={joinRoom}
              disabled={loading || !roomCode.trim()}
              className="w-full mt-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-spotify-text-gray text-sm">or</span>
          </div>

          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create New Room'}
          </button>
        </div>

        {/* Fallback if room data fails to load */}
        {roomCode && !loading && !room && (
          <div className="mt-6 text-center text-spotify-error">
            <p>Could not load room. Please check the code or try again.</p>
            <button
              className="mt-2 px-4 py-2 bg-spotify-green text-spotify-black rounded"
              onClick={() => { setRoomCode(''); localStorage.removeItem('roomCode'); }}
            >
              Reset Room Code
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-spotify-green flex items-center justify-center" style={{ borderRadius: '4px' }}>
            <UsersIcon className="w-6 h-6 text-spotify-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-spotify-white">Room Code:</h1>
              <span className="text-xl font-mono bg-spotify-medium-gray px-3 py-1 rounded text-spotify-green">{room?.code}</span>
              <button
                className="ml-2 px-2 py-1 bg-spotify-green text-spotify-black rounded text-sm hover:bg-spotify-green-light"
                onClick={() => {
                  if (room?.code) {
                    // Create share link
                    const shareLink = window.location.origin + '/room/' + room.code;
                    
                    // Copy to clipboard
                    navigator.clipboard.writeText(shareLink)
                      .then(() => {
                        // You could add a toast notification here if you have a toast system
                        alert('Room link copied to clipboard!');
                      })
                      .catch(err => {
                        console.error('Failed to copy link: ', err);
                      });
                  }
                }}
              >
                Share
              </button>
            </div>
            <p className="text-spotify-text-gray flex items-center space-x-2">
              <span>{room?.members.length} people listening</span>
              {isHost && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1 text-spotify-green">
                    <StarIcon className="w-3 h-3" />
                    <span>Host</span>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={leaveRoom}
          className="bg-spotify-error text-white px-4 py-2 font-medium hover:bg-red-700 transition-colors duration-150"
          style={{ borderRadius: '3px' }}
        >
          Leave Room
        </button>
      </div>

      <div className="flex flex-1 space-x-6 min-h-0">
        {/* Now Playing Area */}
        <div className="flex-1 flex flex-col space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-spotify-white">Now Playing</h2>
              {isHost && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleHostControl('previous')}
                    className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                    style={{ borderRadius: '3px' }}
                  >
                    <BackwardIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleHostControl(isPlaying ? 'pause' : 'play')}
                    className="bg-spotify-green text-spotify-black p-2 hover:scale-105 transition-transform duration-150"
                    style={{ borderRadius: '3px' }}
                  >
                    {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleHostControl('next')}
                    className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"
                    style={{ borderRadius: '3px' }}
                  >
                    <ForwardIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {currentSong ? (
              <div className="flex items-center space-x-4">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-20 h-20 object-cover"
                  style={{ borderRadius: '3px' }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-spotify-white font-medium text-lg truncate">{currentSong.title}</h3>
                  <p className="text-spotify-text-gray truncate">{currentSong.artist}</p>
                  <p className="text-spotify-text-gray text-sm">{currentSong.duration}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-spotify-gray flex items-center justify-center" style={{ borderRadius: '3px' }}>
                  <PlayIcon className="w-8 h-8 text-spotify-text-gray" />
                </div>
                <div>
                  <h3 className="text-spotify-white font-medium">No song playing</h3>
                  <p className="text-spotify-text-gray text-sm">
                    {isHost ? 'Start playing music to share with the room' : 'Waiting for host to play music'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Room Members */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-spotify-white mb-4">Room Members</h2>
            <div className="space-y-3">
              {room?.members.map((member) => (
                <div key={member.userId} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-spotify-green flex items-center justify-center text-spotify-black font-medium text-sm" style={{ borderRadius: '3px' }}>
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-spotify-white font-medium">{member.username}</span>
                  {member.userId === room.hostId && (
                    <StarIcon className="w-4 h-4 text-spotify-green" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-80 card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftIcon className="w-5 h-5 text-spotify-green" />
              <h2 className="text-xl font-semibold text-spotify-white">Chat</h2>
            </div>
            <div className="bg-spotify-green text-spotify-black text-xs px-2 py-1 rounded-full">
              {messages.filter(m => m.userId !== 'system').length} messages
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar bg-spotify-black bg-opacity-20 p-3 rounded" style={{ maxHeight: '400px', minHeight: '250px' }}>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-spotify-text-gray text-sm italic">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`text-sm flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    {msg.userId !== user?.id && (
                      <span className={`font-medium ${msg.userId === 'system' ? 'text-spotify-text-gray' : msg.isHost ? 'text-spotify-green' : 'text-spotify-white'}`}>
                        {msg.user}
                      </span>
                    )}
                    {msg.isHost && msg.userId !== 'system' && (
                      <StarIcon className="w-3 h-3 text-spotify-green" />
                    )}
                    <span className="text-spotify-text-gray text-xs">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`inline-block px-3 py-2 rounded-lg ${
                    msg.userId === 'system' 
                      ? 'bg-spotify-black bg-opacity-30 text-spotify-text-gray italic' 
                      : msg.userId === user?.id 
                        ? 'bg-spotify-green text-spotify-black' 
                        : 'bg-spotify-medium-gray text-spotify-white'
                  }`} style={{ maxWidth: '80%' }}>
                    {msg.message}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 px-3 py-2 bg-spotify-medium-gray border border-spotify-border text-spotify-white placeholder-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green focus:border-spotify-green text-sm transition-all duration-150"
              style={{ borderRadius: '3px' }}
              placeholder="Type a message..."
              maxLength={500}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-spotify-green text-spotify-black px-4 py-2 font-medium hover:bg-spotify-green-light transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{ borderRadius: '3px' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListenTogether;