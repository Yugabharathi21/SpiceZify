import React, { useState } from 'react';
import { Users, Plus, Music, MessageCircle, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlayTogether() {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');

  const activeRooms = [
    {
      id: '1',
      name: 'Chill Vibes Only',
      host: 'Alex',
      members: 4,
      currentTrack: 'Midnight City - M83',
      isPlaying: true
    },
    {
      id: '2',
      name: 'Rock Classics',
      host: 'Sam',
      members: 2,
      currentTrack: 'Bohemian Rhapsody - Queen',
      isPlaying: false
    }
  ];

  const handleCreateRoom = () => {
    if (roomName.trim()) {
      // TODO: Implement room creation
      console.log('Creating room:', roomName);
      setRoomName('');
      setShowCreateRoom(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-primary" />
            Play Together
          </h1>
          <p className="text-muted-foreground text-lg">
            Listen to music with friends in real-time
          </p>
        </motion.div>

        {/* Create Room */}
        <section>
          {!showCreateRoom ? (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setShowCreateRoom(true)}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground p-6 rounded-2xl transition-all duration-200 group"
            >
              <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Create a Room
              </div>
              <p className="text-primary-foreground/80 text-sm mt-2">
                Start a synchronized listening session with your friends
              </p>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold mb-4">Create a New Room</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter a catchy room name..."
                    className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateRoom}
                    disabled={!roomName.trim()}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </section>

        {/* Active Rooms */}
        {activeRooms.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Active Rooms</h2>
            <div className="grid gap-4">
              {activeRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card/30 hover:bg-card/50 border border-border rounded-2xl p-6 cursor-pointer group transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{room.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Crown className="w-4 h-4" />
                          {room.host}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {room.members} member{room.members !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          <Music className="w-4 h-4" />
                          {room.currentTrack}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        room.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                      }`} />
                      <button className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                        Join Room
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Room Features */}
        <section>
          <h2 className="text-2xl font-bold mb-6">How it Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/20 rounded-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create or Join</h3>
              <p className="text-muted-foreground text-sm">
                Start a new room or join an existing one with friends
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/20 rounded-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sync Playback</h3>
              <p className="text-muted-foreground text-sm">
                Everyone hears the same music at exactly the same time
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/20 rounded-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Chat Together</h3>
              <p className="text-muted-foreground text-sm">
                Share thoughts and reactions with real-time chat
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}