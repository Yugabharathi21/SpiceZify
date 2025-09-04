import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MusicalNoteIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

interface Playlist {
  _id: string;
  name: string;
  description: string;
  songs: any[];
  createdAt: string;
}

const Library: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const cached = localStorage.getItem('playlists');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/playlists', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
        localStorage.setItem('playlists', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    setCreating(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim()
        })
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setPlaylists(prev => [newPlaylist, ...prev]);
        setShowCreateModal(false);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setCreating(false);
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setPlaylists(prev => prev.filter(p => p._id !== playlistId));
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-spotify-white">Your Library</h1>
          <div className="w-32 h-10 bg-spotify-gray animate-pulse" style={{ borderRadius: '3px' }}></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-spotify-gray animate-pulse" style={{ borderRadius: '4px' }}>
              <div className="w-16 h-16 bg-spotify-medium-gray" style={{ borderRadius: '3px' }}></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-spotify-medium-gray w-1/3" style={{ borderRadius: '2px' }}></div>
                <div className="h-3 bg-spotify-medium-gray w-1/4" style={{ borderRadius: '2px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-spotify-white">Your Library</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <MusicalNoteIcon className="w-16 h-16 text-spotify-text-gray mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-spotify-white mb-2">Create your first playlist</h2>
          <p className="text-spotify-text-gray mb-6">It's easy, we'll help you</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map((playlist) => (
            <div key={playlist._id} className="card p-4 group">
              <Link to={`/playlist/${playlist._id}`} className="block">
                <div className="w-full aspect-square bg-spotify-gray mb-4 flex items-center justify-center" style={{ borderRadius: '3px' }}>
                  <MusicalNoteIcon className="w-12 h-12 text-spotify-text-gray" />
                </div>
                <h3 className="text-spotify-white font-medium text-sm truncate mb-1">{playlist.name}</h3>
                <p className="text-spotify-text-gray text-xs truncate mb-1">
                  {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
                </p>
                {playlist.description && (
                  <p className="text-spotify-text-gray text-xs truncate">{playlist.description}</p>
                )}
              </Link>
              
              <div className="flex items-center space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-1">
                  <PencilIcon className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => deletePlaylist(playlist._id)}
                  className="text-spotify-text-gray hover:text-spotify-error transition-colors duration-150 p-1"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-spotify-dark-gray p-6 w-full max-w-md border border-spotify-border" style={{ borderRadius: '4px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-spotify-white">Create Playlist</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-spotify-white mb-2">Name</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full px-3 py-2 bg-spotify-medium-gray border border-spotify-border text-spotify-white placeholder-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green focus:border-spotify-green transition-all duration-150"
                  style={{ borderRadius: '3px' }}
                  placeholder="My Playlist #1"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-spotify-white mb-2">Description (optional)</label>
                <textarea
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-spotify-medium-gray border border-spotify-border text-spotify-white placeholder-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green focus:border-spotify-green transition-all duration-150 resize-none"
                  style={{ borderRadius: '3px' }}
                  placeholder="Add an optional description"
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createPlaylist}
                disabled={creating || !newPlaylistName.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;