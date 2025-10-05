import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  RectangleStackIcon,
  HeartIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  MusicalNoteIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: HomeIcon, label: 'Home', path: '/' },
    { icon: MagnifyingGlassIcon, label: 'Search', path: '/search' },
    { icon: SparklesIcon, label: 'Discover', path: '/recommendations' },
    { icon: RectangleStackIcon, label: 'Your Library', path: '/library' },
  ];

  const playlistItems = [
    { icon: HeartIcon, label: 'Liked Songs', path: '/liked' },
    { icon: UsersIcon, label: 'Listen Together', path: '/listen-together' },
  ];

  return (
    <div className="w-64 bg-spotify-black h-full flex flex-col border-r border-spotify-border">
      {/* Logo */}
      <div className="p-6 border-b border-spotify-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-spotify-green flex items-center justify-center" style={{ borderRadius: '3px' }}>
            <MusicalNoteIcon className="w-5 h-5 text-spotify-black" />
          </div>
          <h1 className="text-xl font-bold text-spotify-white tracking-tight">Spicezify</h1>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1 mb-6">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-4 p-3 transition-all duration-150 ${
                    isActive
                      ? 'bg-spotify-gray text-spotify-white border-r-2 border-spotify-green'
                      : 'text-spotify-text-gray hover:text-spotify-white hover:bg-spotify-medium-gray'
                  }`
                }
                style={{ borderRadius: '3px' }}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="border-t border-spotify-border pt-4">
          <p className="text-xs font-medium text-spotify-text-gray uppercase tracking-wide mb-3 px-3">
            Playlists
          </p>
          <ul className="space-y-1">
            {playlistItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-4 p-3 transition-all duration-150 ${
                      isActive
                        ? 'bg-spotify-gray text-spotify-white border-r-2 border-spotify-green'
                        : 'text-spotify-text-gray hover:text-spotify-white hover:bg-spotify-medium-gray'
                    }`
                  }
                  style={{ borderRadius: '3px' }}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* User Actions */}
      <div className="border-t border-spotify-border p-4">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-4 p-3 w-full text-spotify-text-gray hover:text-spotify-white hover:bg-spotify-medium-gray transition-all duration-150"
          style={{ borderRadius: '3px' }}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;