import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MusicalNoteIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/solid';
import { PencilIcon } from '@heroicons/react/24/outline';
import SongCard from '../components/UI/SongCard';
import { usePlayer } from '../contexts/PlayerContext';

interface PlaylistData {
  _id: string;
  name: string;
  description: string;
  songs: any[];
  createdAt: string;
}

const Playlist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const { playQueue } = usePlayer();

  useEffect(() => {
    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/playlists/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylist(data);
        setEditName(data.name);
        setEditDescription(data.description || '');
      } else {
        navigate('/library');
      }
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  const updatePlaylist = async () => {
    if (!playlist) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/playlists/${playlist._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim()
        })
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        setPlaylist(updatedPlaylist);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update playlist:', error);
    }
  };

  const removeSong = async (songId: string) => {
    if (!playlist) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/playlists/${playlist._id}/remove/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        setPlaylist(updatedPlaylist);
      }
    } catch (error) {
      console.error('Failed to remove song:', error);
    }
  };

  const playPlaylist = () => {
    if (playlist && playlist.songs.length > 0) {
      playQueue(playlist.songs, 0);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-60 h-60 bg-spotify-gray animate-pulse" style={{ borderRadius: '4px' }}></div>
          <div className="space-y-4">
            <div className="h-4 bg-spotify-gray w-20 animate-pulse" style={{ borderRadius: '2px' }}></div>
            <div className="h-12 bg-spotify-gray w-64 animate-pulse" style={{ borderRadius: '2px' }}></div>
            <div className="h-4 bg-spotify-gray w-32 animate-pulse" style={{ borderRadius: '2px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-spotify-white">Playlist not found</h1>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center space-x-6 mb-8">
        <div className="w-60 h-60 bg-spotify-gray flex items-center justify-center" style={{ borderRadius: '4px' }}>
          <MusicalNoteIcon className="w-20 h-20 text-spotify-text-gray" />
        </div>
        <div className="flex-1">
          <p className="text-spotify-text-gray text-sm uppercase tracking-wide mb-2">Playlist</p>
          
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-5xl font-bold bg-transparent border-b-2 border-spotify-green text-spotify-white focus:outline-none"
                maxLength={100}
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-transparent border border-spotify-border text-spotify-text-gray focus:outline-none focus:ring-1 focus:ring-spotify-green p-2 resize-none"
                style={{ borderRadius: '3px' }}
                placeholder="Add a description"
                rows={2}
                maxLength={500}
              />
              <div className="flex space-x-3">
                <button onClick={updatePlaylist} className="btn-primary text-sm">Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-4 mb-4">
                <h1 className="text-5xl font-bold text-spotify-white">{playlist.name}</h1>
                <button
                  onClick={() => setEditing(true)}
                  className="text-spotify-text-gray hover:text-spotify-white transition-colors duration-150 p-2"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
              {playlist.description && (
                <p className="text-spotify-text-gray mb-4">{playlist.description}</p>
              )}
              <p className="text-spotify-text-gray">{playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}</p>
            </>
          )}
        </div>
      </div>

      {playlist.songs.length > 0 && (
        <div className="mb-6">
          <button
            onClick={playPlaylist}
            className="btn-primary flex items-center space-x-2"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Play</span>
          </button>
        </div>
      )}

      {playlist.songs.length > 0 ? (
        <div className="space-y-2">
          {playlist.songs.map((song, index) => (
            <div key={`${song.id}-${index}`} className="group flex items-center space-x-4 p-3 hover:bg-spotify-medium-gray transition-colors duration-150" style={{ borderRadius: '3px' }}>
              <span className="text-spotify-text-gray text-sm w-8 text-center">{index + 1}</span>
              <div className="flex-1">
                <SongCard song={song} layout="list" />
              </div>
              <button
                onClick={() => removeSong(song.id)}
                className="text-spotify-text-gray hover:text-spotify-error transition-colors duration-150 opacity-0 group-hover:opacity-100 p-1"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <MusicalNoteIcon className="w-16 h-16 text-spotify-text-gray mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-spotify-white mb-2">This playlist is empty</h2>
          <p className="text-spotify-text-gray">Search for songs and add them to this playlist.</p>
        </div>
      )}
    </div>
  );
};

export default Playlist;