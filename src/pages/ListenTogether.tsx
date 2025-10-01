import React, { useState, useEffect, useCallback, useRef } from 'react';import React, { useState, useEffect, useCallback, useRef } from 'react';

import { UsersIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';import { UsersIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, StarIcon } from '@heroicons/react/24/solid';import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, StarIcon } from '@heroicons/react/24/solid';

import { useAuth } from '../contexts/AuthContext';import { useAuth } from '../contexts/AuthContext';

import { usePlayer } from '../contexts/PlayerContext';import { usePlayer } from '../contexts/PlayerContext';

import { chatService, ChatMessage, Room } from '../services/chatService';import { chatService, ChatMessage, Room } from '../services/chatService';

import { socketService } from '../services/socketService';import { socketService } from '../services/socketService';



const ListenTogether: React.FC = () => {const ListenTogether: React.FC = () => {

  const { user } = useAuth();  const { user } = useAuth();

  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, nextSong, previousSong } = usePlayer();  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, nextSong, previousSong } = usePlayer();

    

  const chatEndRef = useRef<HTMLDivElement>(null);  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const typingTimeoutRef = useRef<number | null>(null);  const [messages, setMessages] = useState<ChatMessage[]>([]);

    const [roomCode, setRoomCode] = useState(() => localStorage.getItem('roomCode') || '');

  // State management  const [isInRoom, setIsInRoom] = useState(() => localStorage.getItem('isInRoom') === 'true');

  const [messages, setMessages] = useState<ChatMessage[]>([]);  const [room, setRoom] = useState<Room | null>(null);

  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('roomCode') || '');  const [newMessage, setNewMessage] = useState('');

  const [isInRoom, setIsInRoom] = useState(() => localStorage.getItem('isInRoom') === 'true');  const [socket, setSocket] = useState<Socket | null>(null);

  const [room, setRoom] = useState<Room | null>(null);  const [isHost, setIsHost] = useState(false);

  const [newMessage, setNewMessage] = useState('');  const [loading, setLoading] = useState(false);

  const [isHost, setIsHost] = useState(false);  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');  // Auto-scroll chat to latest message

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('disconnected');  useEffect(() => {

  const [typingUsers, setTypingUsers] = useState<string[]>([]);    if (chatEndRef.current) {

      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });

  // Auto-scroll chat to latest message    }

  useEffect(() => {  }, [messages]);

    if (chatEndRef.current) {  

      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });  // Persist roomCode and isInRoom to localStorage

    }  useEffect(() => {

  }, [messages]);    localStorage.setItem('roomCode', roomCode);

      localStorage.setItem('isInRoom', isInRoom.toString());

  // Persist roomCode and isInRoom to localStorage  }, [roomCode, isInRoom]);

  useEffect(() => {  

    localStorage.setItem('roomCode', roomCode);  // Restore room state on refresh

    localStorage.setItem('isInRoom', isInRoom.toString());  useEffect(() => {

  }, [roomCode, isInRoom]);    const fetchRoomData = async (code: string) => {

      try {

  // Socket event handlers        const response = await fetch(`http://localhost:3001/api/rooms/${code}`, {

  const handleRoomState = useCallback((state: Room) => {          headers: {

    setRoom(state);            'Authorization': `Bearer ${localStorage.getItem('token')}`

    setIsHost(state.hostId === user?.id);          }

    if (state.currentSong && state.isPlaying) {        });

      playSong(state.currentSong);        if (response.ok) {

    }          const roomData = await response.json();

  }, [user?.id, playSong]);          setRoom(roomData);

          setIsInRoom(true);

  const handleUserJoined = useCallback((data: { username: string; userId: string; memberCount: number }) => {          setIsHost(roomData.hostId === user?.id);

    const systemMessage = chatService.createSystemMessage('join', { username: data.username });        } else {

    setMessages(prev => [...prev, systemMessage]);          setIsInRoom(false);

  }, []);          setRoom(null);

        }

  const handleUserLeft = useCallback((data: { username: string; userId: string; memberCount: number }) => {      } catch {

    const systemMessage = chatService.createSystemMessage('leave', { username: data.username });        setIsInRoom(false);

    setMessages(prev => [...prev, systemMessage]);        setRoom(null);

  }, []);      }

    };

  const handleHostChanged = useCallback((data: { newHostId: string; newHostName: string }) => {    

    const systemMessage = chatService.createSystemMessage('host_change', { newHostName: data.newHostName });    const storedRoomCode = localStorage.getItem('roomCode');

    setMessages(prev => [...prev, systemMessage]);    if (storedRoomCode) {

    setIsHost(data.newHostId === user?.id);      fetchRoomData(storedRoomCode);

  }, [user?.id]);    }

  }, [user?.id]);

  const handleSyncPlay = useCallback((data: { song: { id: string; title: string; artist: string; thumbnail: string; duration: string; youtubeId: string }; currentTime: number; startedBy: string; timestamp: number }) => {

    playSong(data.song);  useEffect(() => {

  }, [playSong]);    // Initialize socket connection

    const newSocket = io('http://localhost:3001');

  const handleSyncPause = useCallback(() => {    setSocket(newSocket);

    pauseSong();

  }, [pauseSong]);    // Socket event listeners

    newSocket.on('roomState', (state) => {

  const handleSyncSeek = useCallback(() => {      setRoom(state);

    // Handle seek synchronization      setIsHost(state.hostId === user?.id);

  }, []);      if (state.currentSong && state.isPlaying) {

        playSong(state.currentSong);

  const handleMessageReceived = useCallback((message: ChatMessage) => {      }

    setMessages(prev => [...prev, message]);    });

  }, []);

    newSocket.on('userJoined', ({ username }) => {

  const handleUserTyping = useCallback((data: { userId: string; username: string; isTyping: boolean }) => {      setMessages(prev => [...prev, {

    if (data.userId === user?.id) return; // Don't show own typing status        id: Date.now().toString(),

            user: 'System',

    setTypingUsers(prev => {        message: `${username} joined the room`,

      if (data.isTyping) {        timestamp: new Date(),

        return prev.includes(data.username) ? prev : [...prev, data.username];        userId: 'system',

      } else {        isHost: false

        return prev.filter(username => username !== data.username);      }]);

      }    });

    });

  }, [user?.id]);    newSocket.on('userLeft', ({ username }) => {

      setMessages(prev => [...prev, {

  const handleRoomClosed = useCallback(() => {        id: Date.now().toString(),

    setIsInRoom(false);        user: 'System',

    setRoom(null);        message: `${username} left the room`,

    setMessages([]);        timestamp: new Date(),

    setError('Room was closed by the host');        userId: 'system',

  }, []);        isHost: false

      }]);

  const handleSocketError = useCallback((data: { message: string }) => {    });

    setError(data.message);

  }, []);    newSocket.on('hostChanged', ({ newHostName }) => {

      setMessages(prev => [...prev, {

  // Socket connection and event handling        id: Date.now().toString(),

  useEffect(() => {        user: 'System',

    const initializeSocket = async () => {        message: `${newHostName} is now the host`,

      try {        timestamp: new Date(),

        setConnectionStatus('connecting');        userId: 'system',

        await socketService.connect();        isHost: false

        setConnectionStatus('connected');      }]);

            });

        // Set up event listeners

        socketService.on('roomState', handleRoomState);    newSocket.on('syncPlay', ({ song }) => {

        socketService.on('userJoined', handleUserJoined);      playSong(song);

        socketService.on('userLeft', handleUserLeft);    });

        socketService.on('hostChanged', handleHostChanged);

        socketService.on('syncPlay', handleSyncPlay);    newSocket.on('syncPause', () => {

        socketService.on('syncPause', handleSyncPause);      pauseSong();

        socketService.on('syncSeek', handleSyncSeek);    });

        socketService.on('messageReceived', handleMessageReceived);

        socketService.on('userTyping', handleUserTyping);    newSocket.on('syncSeek', () => {

        socketService.on('roomClosed', handleRoomClosed);      // Handle seek synchronization

        socketService.on('error', handleSocketError);    });

        socketService.on('disconnect', () => setConnectionStatus('disconnected'));

        socketService.on('reconnect', () => setConnectionStatus('connected'));    newSocket.on('messageReceived', (message) => {

      setMessages(prev => [...prev, message]);

      } catch (error) {    });

        console.error('Socket connection failed:', error);

        setConnectionStatus('disconnected');    newSocket.on('roomClosed', () => {

        setError('Failed to connect to server');      setIsInRoom(false);

      }      setRoom(null);

    };      setMessages([]);

      setError('Room was closed by the host');

    if (isInRoom && user) {    });

      initializeSocket();

    }    newSocket.on('error', ({ message }) => {

      setError(message);

    return () => {    });

      // Clean up event listeners

      if (socketService.isConnected()) {    return () => {

        socketService.off('roomState', handleRoomState);      newSocket.disconnect();

        socketService.off('userJoined', handleUserJoined);    };

        socketService.off('userLeft', handleUserLeft);  }, [user?.id, playSong, pauseSong]);

        socketService.off('hostChanged', handleHostChanged);

        socketService.off('syncPlay', handleSyncPlay);  const createRoom = async () => {

        socketService.off('syncPause', handleSyncPause);    setLoading(true);

        socketService.off('syncSeek', handleSyncSeek);    setError('');

        socketService.off('messageReceived', handleMessageReceived);    

        socketService.off('userTyping', handleUserTyping);    try {

        socketService.off('roomClosed', handleRoomClosed);      const response = await fetch('http://localhost:3001/api/rooms/create', {

        socketService.off('error', handleSocketError);        method: 'POST',

        socketService.off('disconnect', () => setConnectionStatus('disconnected'));        headers: {

        socketService.off('reconnect', () => setConnectionStatus('connected'));          'Content-Type': 'application/json',

      }          'Authorization': `Bearer ${localStorage.getItem('token')}`

    };        },

  }, [isInRoom, user, handleRoomState, handleUserJoined, handleUserLeft, handleHostChanged, handleSyncPlay, handleSyncPause, handleSyncSeek, handleMessageReceived, handleUserTyping, handleRoomClosed, handleSocketError]);        body: JSON.stringify({ name: `${user?.username}'s Room` })

      });

  // Room management functions

  const createRoom = async () => {      if (response.ok) {

    if (!user) return;        const newRoom = await response.json();

            setRoomCode(newRoom.code);

    setLoading(true);        setRoom(newRoom);

    setError('');        setIsInRoom(true);

            setIsHost(true);

    try {        

      const newRoom = await chatService.createRoom(`${user.username}'s Room`);        socket?.emit('joinRoom', {

      if (newRoom) {          roomCode: newRoom.code,

        setRoomCode(newRoom.code);          userId: user?.id,

        setRoom(newRoom);          username: user?.username

        setIsInRoom(true);        });

        setIsHost(true);      } else {

                setError('Failed to create room');

        if (socketService.isConnected()) {      }

          socketService.joinRoom(newRoom.code, user.id, user.username);    } catch (err) {

        }      console.error('Error creating room:', err);

      } else {      setError('Failed to create room');

        setError('Failed to create room');    }

      }    

    } catch (err) {    setLoading(false);

      console.error('Error creating room:', err);  };

      setError('Failed to create room');

    }  const joinRoom = async () => {

        if (!roomCode.trim()) return;

    setLoading(false);    

  };    setLoading(true);

    setError('');

  const joinRoom = async () => {    

    if (!roomCode.trim() || !user) return;    try {

          const response = await fetch('http://localhost:3001/api/rooms/join', {

    setLoading(true);        method: 'POST',

    setError('');        headers: {

              'Content-Type': 'application/json',

    try {          'Authorization': `Bearer ${localStorage.getItem('token')}`

      const roomData = await chatService.joinRoom(roomCode);        },

      if (roomData) {        body: JSON.stringify({ code: roomCode.toUpperCase() })

        setRoom(roomData);      });

        setIsInRoom(true);

        setIsHost(roomData.hostId === user.id);      if (response.ok) {

                const roomData = await response.json();

        if (socketService.isConnected()) {        setRoom(roomData);

          socketService.joinRoom(roomCode.toUpperCase(), user.id, user.username);        setIsInRoom(true);

        }        setIsHost(roomData.hostId === user?.id);

                

        // Load chat history        socket?.emit('joinRoom', {

        const history = await chatService.getMessages(roomCode.toUpperCase());          roomCode: roomCode.toUpperCase(),

        setMessages(history);          userId: user?.id,

      } else {          username: user?.username

        setError('Room not found');        });

      }      } else {

    } catch (err) {        setError('Room not found');

      console.error('Error joining room:', err);      }

      setError('Failed to join room');    } catch (err) {

    }      console.error('Error joining room:', err);

          setError('Failed to join room');

    setLoading(false);    }

  };    

    setLoading(false);

  const leaveRoom = async () => {  };

    if (!room || !user) return;

      const leaveRoom = () => {

    if (socketService.isConnected()) {    if (socket && room) {

      socketService.leaveRoom(room.code, user.id, user.username);      socket.emit('leaveRoom', {

    }        roomCode: room.code,

            userId: user?.id,

    await chatService.leaveRoom(room.code);        username: user?.username

          });

    setIsInRoom(false);    }

    setRoom(null);    

    setMessages([]);    setIsInRoom(false);

    setRoomCode('');    setRoom(null);

    setIsHost(false);    setMessages([]);

    setTypingUsers([]);    setRoomCode('');

  };    setIsHost(false);

  };

  // Chat functions

  const sendMessage = async () => {  const sendMessage = () => {

    if (!newMessage.trim() || !room || !user) return;    if (!newMessage.trim() || !socket || !room) return;



    const validation = chatService.validateMessage(newMessage);    socket.emit('sendMessage', {

    if (!validation.isValid) {      roomCode: room.code,

      setError(validation.error || 'Invalid message');      message: newMessage.trim(),

      return;      userId: user?.id

    }    });

    

    try {    setNewMessage('');

      if (socketService.isConnected()) {  };

        socketService.sendMessage(room.code, newMessage, user.id);

      }  const handleHostControl = (action: string) => {

      setNewMessage('');    if (!isHost || !socket || !room) return;

      setError('');

    } catch (error) {    switch (action) {

      console.error('Error sending message:', error);      case 'play':

      setError('Failed to send message');        if (currentSong) {

    }          socket.emit('playSong', {

  };            roomCode: room.code,

            song: currentSong,

  const handleTyping = (isTyping: boolean) => {            currentTime: 0,

    if (!room || !user || !socketService.isConnected()) return;            userId: user?.id

              });

    socketService.sendTypingStatus(room.code, user.id, user.username, isTyping);          resumeSong();

  };        }

        break;

  const handleMessageInput = (value: string) => {      case 'pause':

    setNewMessage(value);        socket.emit('pauseSong', {

              roomCode: room.code,

    // Handle typing indicators          currentTime: 0,

    if (value.trim() && !typingTimeoutRef.current) {          userId: user?.id

      handleTyping(true);        });

    }        pauseSong();

            break;

    // Clear existing timeout      case 'next':

    if (typingTimeoutRef.current) {        nextSong();

      clearTimeout(typingTimeoutRef.current);        break;

    }      case 'previous':

            previousSong();

    // Set new timeout to stop typing indicator        break;

    typingTimeoutRef.current = setTimeout(() => {    }

      handleTyping(false);  };

      typingTimeoutRef.current = null;

    }, 1000);  if (!isInRoom) {

  };    return (

      <div className="p-8 max-w-md mx-auto mt-20">

  // Music control functions (host only)        <div className="text-center mb-8">

  const handleHostControl = (action: string) => {          <div className="w-16 h-16 bg-spotify-green mx-auto mb-4 flex items-center justify-center" style={{ borderRadius: '4px' }}>

    if (!isHost || !room || !user || !socketService.isConnected()) return;            <UsersIcon className="w-8 h-8 text-spotify-black" />

          </div>

    switch (action) {          <h1 className="text-3xl font-bold text-spotify-white mb-2">Listen Together</h1>

      case 'play':          <p className="text-spotify-text-gray">Join friends and listen to music together in real-time</p>

        if (currentSong) {        </div>

          socketService.playSong(room.code, currentSong, 0, user.id);

          resumeSong();        {error && (

        }          <div className="bg-spotify-error/20 border border-spotify-error text-spotify-error p-3 mb-4 text-sm" style={{ borderRadius: '3px' }}>

        break;            {error}

      case 'pause':          </div>

        socketService.pauseSong(room.code, 0, user.id);        )}

        pauseSong();

        break;        <div className="space-y-6">

      case 'next':          <div>

        nextSong();            <input

        break;              type="text"

      case 'previous':              value={roomCode}

        previousSong();              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}

        break;              className="w-full px-4 py-3 bg-spotify-medium-gray border border-spotify-border text-spotify-white placeholder-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green focus:border-spotify-green transition-all duration-150"

    }              style={{ borderRadius: '3px' }}

  };              placeholder="Enter room code"

              maxLength={6}

  // Render room entry screen            />

  if (!isInRoom) {            <button

    return (              onClick={joinRoom}

      <div className="p-8 max-w-md mx-auto mt-20">              disabled={loading || !roomCode.trim()}

        <div className="text-center mb-8">              className="w-full mt-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"

          <div className="w-16 h-16 bg-green-600 mx-auto mb-4 flex items-center justify-center rounded-lg">            >

            <UsersIcon className="w-8 h-8 text-white" />              {loading ? 'Joining...' : 'Join Room'}

          </div>            </button>

          <h1 className="text-3xl font-bold text-white mb-2">Listen Together</h1>          </div>

          <p className="text-gray-400">Join friends and listen to music together in real-time</p>

        </div>          <div className="text-center">

            <span className="text-spotify-text-gray text-sm">or</span>

        {error && (          </div>

          <div className="bg-red-900/20 border border-red-500 text-red-400 p-3 mb-4 text-sm rounded">

            {error}          <button

          </div>            onClick={createRoom}

        )}            disabled={loading}

            className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"

        <div className="space-y-6">          >

          <div>            {loading ? 'Creating...' : 'Create New Room'}

            <input          </button>

              type="text"        </div>

              value={roomCode}

              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}        {/* Fallback if room data fails to load */}

              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded"        {roomCode && !loading && !room && (

              placeholder="Enter room code"          <div className="mt-6 text-center text-spotify-error">

              maxLength={6}            <p>Could not load room. Please check the code or try again.</p>

            />            <button

            <button              className="mt-2 px-4 py-2 bg-spotify-green text-spotify-black rounded"

              onClick={joinRoom}              onClick={() => { setRoomCode(''); localStorage.removeItem('roomCode'); }}

              disabled={loading || !roomCode.trim()}            >

              className="w-full mt-3 bg-green-600 text-white py-3 rounded font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"              Reset Room Code

            >            </button>

              {loading ? 'Joining...' : 'Join Room'}          </div>

            </button>        )}

          </div>      </div>

    );

          <div className="text-center">  }

            <span className="text-gray-400 text-sm">or</span>

          </div>  return (

    <div className="p-8 h-full flex flex-col">

          <button      <div className="flex items-center justify-between mb-6">

            onClick={createRoom}        <div className="flex items-center space-x-4">

            disabled={loading}          <div className="w-12 h-12 bg-spotify-green flex items-center justify-center" style={{ borderRadius: '4px' }}>

            className="w-full bg-gray-700 text-white py-3 rounded font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"            <UsersIcon className="w-6 h-6 text-spotify-black" />

          >          </div>

            {loading ? 'Creating...' : 'Create New Room'}          <div>

          </button>            <div className="flex items-center space-x-2 mb-2">

        </div>              <h1 className="text-2xl font-bold text-spotify-white">Room Code:</h1>

              <span className="text-xl font-mono bg-spotify-medium-gray px-3 py-1 rounded text-spotify-green">{room?.code}</span>

        {/* Connection status */}              <button

        <div className="mt-6 text-center">                className="ml-2 px-2 py-1 bg-spotify-green text-spotify-black rounded text-sm hover:bg-spotify-green-light"

          <div className={`inline-flex items-center gap-2 text-sm ${                onClick={() => {

            connectionStatus === 'connected' ? 'text-green-400' :                   if (room?.code) {

            connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'                    // Create share link

          }`}>                    const shareLink = window.location.origin + '/room/' + room.code;

            <div className={`w-2 h-2 rounded-full ${                    

              connectionStatus === 'connected' ? 'bg-green-400' :                     // Copy to clipboard

              connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'                    navigator.clipboard.writeText(shareLink)

            }`}></div>                      .then(() => {

            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}                        // You could add a toast notification here if you have a toast system

          </div>                        alert('Room link copied to clipboard!');

        </div>                      })

      </div>                      .catch(err => {

    );                        console.error('Failed to copy link: ', err);

  }                      });

                  }

  // Render main room interface                }}

  return (              >

    <div className="p-8 h-full flex flex-col">                Share

      {/* Room header */}              </button>

      <div className="flex items-center justify-between mb-6">            </div>

        <div className="flex items-center space-x-4">            <p className="text-spotify-text-gray flex items-center space-x-2">

          <div className="w-12 h-12 bg-green-600 flex items-center justify-center rounded-lg">              <span>{room?.members.length} people listening</span>

            <UsersIcon className="w-6 h-6 text-white" />              {isHost && (

          </div>                <>

          <div>                  <span>•</span>

            <div className="flex items-center space-x-2 mb-2">                  <span className="flex items-center space-x-1 text-spotify-green">

              <h1 className="text-2xl font-bold text-white">Room Code:</h1>                    <StarIcon className="w-3 h-3" />

              <span className="text-xl font-mono bg-gray-800 px-3 py-1 rounded text-green-400">{room?.code}</span>                    <span>Host</span>

              <button                  </span>

                className="ml-2 px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"                </>

                onClick={() => {              )}

                  if (room?.code) {            </p>

                    const shareLink = `${window.location.origin}/room/${room.code}`;          </div>

                    navigator.clipboard.writeText(shareLink)        </div>

                      .then(() => alert('Room link copied to clipboard!'))        <button

                      .catch(err => console.error('Failed to copy link:', err));          onClick={leaveRoom}

                  }          className="bg-spotify-error text-white px-4 py-2 font-medium hover:bg-red-700 transition-colors duration-150"

                }}          style={{ borderRadius: '3px' }}

              >        >

                Share          Leave Room

              </button>        </button>

            </div>      </div>

            <p className="text-gray-400 flex items-center space-x-2">

              <span>{room?.members.length} people listening</span>      <div className="flex flex-1 space-x-6 min-h-0">

              {isHost && (        {/* Now Playing Area */}

                <>        <div className="flex-1 flex flex-col space-y-6">

                  <span>•</span>          <div className="card p-6">

                  <span className="flex items-center space-x-1 text-green-400">            <div className="flex items-center justify-between mb-4">

                    <StarIcon className="w-3 h-3" />              <h2 className="text-xl font-semibold text-spotify-white">Now Playing</h2>

                    <span>Host</span>              {isHost && (

                  </span>                <div className="flex items-center space-x-2">

                </>                  <button

              )}                    onClick={() => handleHostControl('previous')}

              <span>•</span>                    className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"

              <span className={`${                    style={{ borderRadius: '3px' }}

                connectionStatus === 'connected' ? 'text-green-400' :                   >

                connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'                    <BackwardIcon className="w-4 h-4" />

              }`}>                  </button>

                {connectionStatus}                  <button

              </span>                    onClick={() => handleHostControl(isPlaying ? 'pause' : 'play')}

            </p>                    className="bg-spotify-green text-spotify-black p-2 hover:scale-105 transition-transform duration-150"

          </div>                    style={{ borderRadius: '3px' }}

        </div>                  >

        <button                    {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}

          onClick={leaveRoom}                  </button>

          className="bg-red-600 text-white px-4 py-2 font-medium hover:bg-red-700 transition-colors rounded"                  <button

        >                    onClick={() => handleHostControl('next')}

          Leave Room                    className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2 hover:bg-spotify-medium-gray"

        </button>                    style={{ borderRadius: '3px' }}

      </div>                  >

                    <ForwardIcon className="w-4 h-4" />

      {error && (                  </button>

        <div className="bg-red-900/20 border border-red-500 text-red-400 p-3 mb-4 text-sm rounded">                </div>

          {error}              )}

        </div>            </div>

      )}            

            {currentSong ? (

      <div className="flex flex-1 space-x-6 min-h-0">              <div className="flex items-center space-x-4">

        {/* Now Playing Area */}                <img

        <div className="flex-1 flex flex-col space-y-6">                  src={currentSong.thumbnail}

          <div className="bg-gray-800 p-6 rounded-lg">                  alt={currentSong.title}

            <div className="flex items-center justify-between mb-4">                  className="w-20 h-20 object-cover"

              <h2 className="text-xl font-semibold text-white">Now Playing</h2>                  style={{ borderRadius: '3px' }}

              {isHost && (                />

                <div className="flex items-center space-x-2">                <div className="flex-1 min-w-0">

                  <button                  <h3 className="text-spotify-white font-medium text-lg truncate">{currentSong.title}</h3>

                    onClick={() => handleHostControl('previous')}                  <p className="text-spotify-text-gray truncate">{currentSong.artist}</p>

                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded"                  <p className="text-spotify-text-gray text-sm">{currentSong.duration}</p>

                  >                </div>

                    <BackwardIcon className="w-4 h-4" />              </div>

                  </button>            ) : (

                  <button              <div className="flex items-center space-x-4">

                    onClick={() => handleHostControl(isPlaying ? 'pause' : 'play')}                <div className="w-20 h-20 bg-spotify-gray flex items-center justify-center" style={{ borderRadius: '3px' }}>

                    className="bg-green-600 text-white p-2 hover:bg-green-700 transition-colors rounded"                  <PlayIcon className="w-8 h-8 text-spotify-text-gray" />

                  >                </div>

                    {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}                <div>

                  </button>                  <h3 className="text-spotify-white font-medium">No song playing</h3>

                  <button                  <p className="text-spotify-text-gray text-sm">

                    onClick={() => handleHostControl('next')}                    {isHost ? 'Start playing music to share with the room' : 'Waiting for host to play music'}

                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded"                  </p>

                  >                </div>

                    <ForwardIcon className="w-4 h-4" />              </div>

                  </button>            )}

                </div>          </div>

              )}

            </div>          {/* Room Members */}

                      <div className="card p-6">

            {currentSong ? (            <h2 className="text-xl font-semibold text-spotify-white mb-4">Room Members</h2>

              <div className="flex items-center space-x-4">            <div className="space-y-3">

                <img              {room?.members.map((member) => (

                  src={currentSong.thumbnail}                <div key={member.userId} className="flex items-center space-x-3">

                  alt={currentSong.title}                  <div className="w-8 h-8 bg-spotify-green flex items-center justify-center text-spotify-black font-medium text-sm" style={{ borderRadius: '3px' }}>

                  className="w-20 h-20 object-cover rounded"                    {member.username.charAt(0).toUpperCase()}

                />                  </div>

                <div className="flex-1 min-w-0">                  <span className="text-spotify-white font-medium">{member.username}</span>

                  <h3 className="text-white font-medium text-lg truncate">{currentSong.title}</h3>                  {member.userId === room.hostId && (

                  <p className="text-gray-400 truncate">{currentSong.artist}</p>                    <StarIcon className="w-4 h-4 text-spotify-green" />

                  <p className="text-gray-400 text-sm">{currentSong.duration}</p>                  )}

                </div>                </div>

              </div>              ))}

            ) : (            </div>

              <div className="flex items-center space-x-4">          </div>

                <div className="w-20 h-20 bg-gray-700 flex items-center justify-center rounded">        </div>

                  <PlayIcon className="w-8 h-8 text-gray-400" />

                </div>        {/* Chat Area */}

                <div>        <div className="w-80 card p-6 flex flex-col">

                  <h3 className="text-white font-medium">No song playing</h3>          <div className="flex items-center justify-between mb-4">

                  <p className="text-gray-400 text-sm">            <div className="flex items-center space-x-2">

                    {isHost ? 'Start playing music to share with the room' : 'Waiting for host to play music'}              <ChatBubbleLeftIcon className="w-5 h-5 text-spotify-green" />

                  </p>              <h2 className="text-xl font-semibold text-spotify-white">Chat</h2>

                </div>            </div>

              </div>            <div className="bg-spotify-green text-spotify-black text-xs px-2 py-1 rounded-full">

            )}              {messages.filter(m => m.userId !== 'system').length} messages

          </div>            </div>

          </div>

          {/* Room Members */}

          <div className="bg-gray-800 p-6 rounded-lg">          <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar bg-spotify-black bg-opacity-20 p-3 rounded" style={{ maxHeight: '400px', minHeight: '250px' }}>

            <h2 className="text-xl font-semibold text-white mb-4">Room Members</h2>            {messages.length === 0 ? (

            <div className="space-y-3">              <div className="h-full flex items-center justify-center text-spotify-text-gray text-sm italic">

              {room?.members.map((member) => (                No messages yet. Start the conversation!

                <div key={member.userId} className="flex items-center space-x-3">              </div>

                  <div className="w-8 h-8 bg-green-600 flex items-center justify-center text-white font-medium text-sm rounded">            ) : (

                    {member.username.charAt(0).toUpperCase()}              messages.map((msg) => (

                  </div>                <div key={msg.id} className={`text-sm flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>

                  <span className="text-white font-medium">{member.username}</span>                  <div className="flex items-center space-x-2 mb-1">

                  {member.userId === room.hostId && (                    {msg.userId !== user?.id && (

                    <StarIcon className="w-4 h-4 text-green-400" />                      <span className={`font-medium ${msg.userId === 'system' ? 'text-spotify-text-gray' : msg.isHost ? 'text-spotify-green' : 'text-spotify-white'}`}>

                  )}                        {msg.user}

                  <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></div>                      </span>

                </div>                    )}

              ))}                    {msg.isHost && msg.userId !== 'system' && (

            </div>                      <StarIcon className="w-3 h-3 text-spotify-green" />

          </div>                    )}

        </div>                    <span className="text-spotify-text-gray text-xs">

                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

        {/* Chat Area */}                    </span>

        <div className="w-80 bg-gray-800 p-6 rounded-lg flex flex-col">                  </div>

          <div className="flex items-center justify-between mb-4">                  <div className={`inline-block px-3 py-2 rounded-lg ${

            <div className="flex items-center space-x-2">                    msg.userId === 'system' 

              <ChatBubbleLeftIcon className="w-5 h-5 text-green-400" />                      ? 'bg-spotify-black bg-opacity-30 text-spotify-text-gray italic' 

              <h2 className="text-xl font-semibold text-white">Chat</h2>                      : msg.userId === user?.id 

            </div>                        ? 'bg-spotify-green text-spotify-black' 

            <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">                        : 'bg-spotify-medium-gray text-spotify-white'

              {messages.filter(m => m.userId !== 'system').length}                  }`} style={{ maxWidth: '80%' }}>

            </div>                    {msg.message}

          </div>                  </div>

                </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-gray-900 p-3 rounded max-h-96 min-h-64">              ))

            {messages.length === 0 ? (            )}

              <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">            <div ref={chatEndRef} />

                No messages yet. Start the conversation!          </div>

              </div>

            ) : (          <div className="flex space-x-2">

              messages.map((msg) => (            <input

                <div key={msg.id} className={`text-sm flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>              type="text"

                  <div className="flex items-center space-x-2 mb-1">              value={newMessage}

                    {msg.userId !== user?.id && (              onChange={(e) => setNewMessage(e.target.value)}

                      <span className={`font-medium ${              onKeyDown={(e) => {

                        msg.userId === 'system' ? 'text-gray-400' :                 if (e.key === 'Enter' && !e.shiftKey) {

                        msg.isHost ? 'text-green-400' : 'text-white'                  e.preventDefault();

                      }`}>                  sendMessage();

                        {msg.user}                }

                      </span>              }}

                    )}              className="flex-1 px-3 py-2 bg-spotify-medium-gray border border-spotify-border text-spotify-white placeholder-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green focus:border-spotify-green text-sm transition-all duration-150"

                    {msg.isHost && msg.userId !== 'system' && (              style={{ borderRadius: '3px' }}

                      <StarIcon className="w-3 h-3 text-green-400" />              placeholder="Type a message..."

                    )}              maxLength={500}

                    <span className="text-gray-400 text-xs">              autoFocus

                      {chatService.formatMessageTime(msg.timestamp)}            />

                    </span>            <button

                  </div>              onClick={sendMessage}

                  <div className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${              disabled={!newMessage.trim()}

                    msg.userId === 'system'               className="bg-spotify-green text-spotify-black px-4 py-2 font-medium hover:bg-spotify-green-light transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"

                      ? 'bg-gray-800 text-gray-400 italic'               style={{ borderRadius: '3px' }}

                      : msg.userId === user?.id             >

                        ? 'bg-green-600 text-white'               Send

                        : 'bg-gray-700 text-white'            </button>

                  }`}>          </div>

                    {msg.message}        </div>

                  </div>      </div>

                </div>    </div>

              ))  );

            )}};

            

            {/* Typing indicators */}export default ListenTogether;
            {typingUsers.length > 0 && (
              <div className="text-xs text-gray-400 italic">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => handleMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm rounded"
              placeholder="Type a message..."
              maxLength={500}
              autoFocus
              disabled={!socketService.isConnected()}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !socketService.isConnected()}
              className="bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded"
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