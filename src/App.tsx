import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { PlaylistProvider } from './contexts/PlaylistContext';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import Playlist from './pages/Playlist';
import Login from './pages/Login';
import Register from './pages/Register';
import LikedSongs from './pages/LikedSongs';
import ListenTogether from './pages/ListenTogether';
import Recommendations from './pages/Recommendations';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <PlaylistProvider>
        <PlayerProvider>
          <Router>
          <div className="h-screen bg-spotify-black text-spotify-white overflow-hidden">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Home />} />
                <Route path="search" element={<Search />} />
                <Route path="library" element={<Library />} />
                <Route path="playlist/:id" element={<Playlist />} />
                <Route path="liked" element={<LikedSongs />} />
                <Route path="recommendations" element={<Recommendations />} />
                <Route path="listen-together" element={<ListenTogether />} />
              </Route>
            </Routes>
          </div>
          </Router>
        </PlayerProvider>
      </PlaylistProvider>
    </AuthProvider>
  );
}

export default App;