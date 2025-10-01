import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UsersIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, StarIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../hooks/usePlayer';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
}

interface Room {
  id: string;
  name: string;
  host: string;
  users: string[];
  currentSong?: any;
  isPlaying: boolean;
}

const ListenTogether: React.FC = () => {
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, nextSong, previousSong } = usePlayer();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: user.uid,
      username: user.displayName || user.email || 'Anonymous',
      message: newMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleCreateRoom = () => {
    if (!user) return;
    
    const newRoom: Room = {
      id: Date.now().toString(),
      name: `${user.displayName || 'User'}'s Room`,
      host: user.uid,
      users: [user.uid],
      currentSong,
      isPlaying
    };
    
    setRoom(newRoom);
    setIsConnected(true);
  };

  const handleJoinRoom = (roomId: string) => {
    // In a real implementation, this would connect to an existing room
    setIsConnected(true);
  };

  const handleLeaveRoom = () => {
    setRoom(null);
    setIsConnected(false);
    setMessages([]);
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to use Listen Together</h2>
          <p className="text-spotify-lightgray">You need to be logged in to create or join listening rooms.</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Listen Together</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-spotify-darkgray rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Create a Room</h2>
              <p className="text-spotify-lightgray mb-6">
                Start a new listening session and invite friends to join you.
              </p>
              <button
                onClick={handleCreateRoom}
                className="bg-spotify-green text-black font-bold py-3 px-6 rounded-full hover:bg-green-400 transition-colors w-full"
              >
                Create Room
              </button>
            </div>

            <div className="bg-spotify-darkgray rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Join a Room</h2>
              <p className="text-spotify-lightgray mb-6">
                Enter a room code to join an existing listening session.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter room code..."
                  className="w-full bg-spotify-black text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-spotify-green"
                />
                <button
                  onClick={() => handleJoinRoom('demo')}
                  className="bg-spotify-green text-black font-bold py-3 px-6 rounded-full hover:bg-green-400 transition-colors w-full"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-spotify-darkgray rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-spotify-green w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-black font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create or Join</h3>
                <p className="text-spotify-lightgray text-sm">Start a new room or join an existing one with friends</p>
              </div>
              <div className="text-center">
                <div className="bg-spotify-green w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-black font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Listen Together</h3>
                <p className="text-spotify-lightgray text-sm">Everyone hears the same music at the same time</p>
              </div>
              <div className="text-center">
                <div className="bg-spotify-green w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-black font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Chat & Enjoy</h3>
                <p className="text-spotify-lightgray text-sm">Chat with friends while discovering new music</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Main Listening Area */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Room Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <UsersIcon className="w-8 h-8 text-spotify-green" />
              <div>
                <h1 className="text-2xl font-bold">{room?.name || 'Listening Room'}</h1>
                <p className="text-spotify-lightgray">
                  {room?.users.length || 1} listener{(room?.users.length || 1) > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLeaveRoom}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Leave Room
            </button>
          </div>

          {/* Now Playing */}
          {currentSong && (
            <div className="bg-spotify-darkgray rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-6">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">{currentSong.title}</h2>
                  <p className="text-spotify-lightgray mb-4">{currentSong.artist}</p>
                  
                  {/* Playback Controls */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={previousSong}
                      className="p-2 hover:bg-spotify-lightgray hover:bg-opacity-20 rounded-full transition-colors"
                    >
                      <BackwardIcon className="w-6 h-6" />
                    </button>
                    
                    <button
                      onClick={isPlaying ? pauseSong : resumeSong}
                      className="bg-spotify-green text-black p-3 rounded-full hover:bg-green-400 transition-colors"
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-6 h-6" />
                      ) : (
                        <PlayIcon className="w-6 h-6" />
                      )}
                    </button>
                    
                    <button
                      onClick={nextSong}
                      className="p-2 hover:bg-spotify-lightgray hover:bg-opacity-20 rounded-full transition-colors"
                    >
                      <ForwardIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Queue/Recommendations could go here */}
          <div className="bg-spotify-darkgray rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Queue</h3>
            <p className="text-spotify-lightgray text-center py-8">
              Queue is empty. Add some songs to get the party started!
            </p>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-80 bg-spotify-darkgray border-l border-spotify-lightgray border-opacity-20">
        <div className="p-4 border-b border-spotify-lightgray border-opacity-20">
          <div className="flex items-center space-x-2">
            <ChatBubbleLeftIcon className="w-5 h-5 text-spotify-green" />
            <h3 className="font-bold">Room Chat</h3>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 h-96 lg:h-[calc(100vh-16rem)]">
          {messages.length === 0 ? (
            <p className="text-spotify-lightgray text-center text-sm">
              No messages yet. Say hello! 👋
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="text-sm">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-spotify-green">
                      {message.username}
                    </span>
                    <span className="text-xs text-spotify-lightgray">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <p className="text-white">{message.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-spotify-lightgray border-opacity-20">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-spotify-black text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-spotify-green"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-spotify-green text-black px-4 py-2 rounded font-semibold text-sm hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ListenTogether;