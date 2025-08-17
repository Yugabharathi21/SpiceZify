import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Library, 
  Plus, 
  Heart,
  Music,
  Users,
  Settings
} from 'lucide-react';
import { useLibraryStore } from '../stores/useLibraryStore';

export default function Sidebar() {
  const { playlists } = useLibraryStore();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/library', icon: Library, label: 'Your Library' },
  ];

  const libraryItems = [
    { to: '/play-together', icon: Users, label: 'Play Together' },
    { to: '/liked', icon: Heart, label: 'Liked Songs' },
  ];

  return (
  <div className="w-72 bg-[linear-gradient(180deg,#0b1116,#051014)] border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shadow-sm">
            <Music className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">SPiceZify</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
  <div className="p-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="px-4 py-2">
          <div className="h-px bg-border" />
        </div>

        <div className="p-4 space-y-2">
          {libraryItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}

          <button className="sidebar-item w-full">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Create Playlist</span>
          </button>
        </div>

        {/* Playlists */}
        {playlists.length > 0 && (
          <>
            <div className="px-4 py-2">
              <div className="h-px bg-border" />
            </div>
            <div className="p-4 space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Playlists
              </h3>
              {playlists.slice(0, 10).map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'active' : ''}`
                  }
                >
                  <div className="w-5 h-5 bg-muted rounded flex items-center justify-center">
                    <Music className="w-3 h-3" />
                  </div>
                  <span className="font-medium truncate">{playlist.name}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'active' : ''}`
          }
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </NavLink>
      </div>
    </div>
  );
}