import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Player from '../Player/Player';

const Layout: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-spotify-black">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-br from-spotify-dark-gray to-spotify-black overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
      <Player />
    </div>
  );
};

export default Layout;