import { useEffect } from 'react';
import { Play, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLibraryStore } from '../stores/useLibraryStore';
import { usePlayerStore, Track } from '../stores/usePlayerStore';
import AlbumCover from '../components/AlbumCover';

export default function Home() {
  const { tracks, albums, loadLibrary } = useLibraryStore();
  const { play, setQueue } = usePlayerStore();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const recentTracks = tracks.slice(0, 6);
  const recentAlbums = albums.slice(0, 6);

  const handlePlayTrack = (track: Track, index: number = 0) => {
    setQueue([track], index);
    play(track);
  };

  const quickPlayItems = [
    { title: 'Liked Songs', subtitle: '42 songs', color: 'from-purple-500 to-pink-500' },
    { title: 'Recently Played', subtitle: '16 songs', color: 'from-green-500 to-teal-500' },
    { title: 'Discover Weekly', subtitle: '30 songs', color: 'from-blue-500 to-indigo-500' },
    { title: 'Release Radar', subtitle: '24 songs', color: 'from-red-500 to-orange-500' },
  ];

  if (tracks.length === 0) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to SPiceZify</h2>
          <p className="text-muted-foreground mb-6">
            Start by adding your music folders to build your library
          </p>
          <button
            onClick={() => {/* TODO: Open folder selection */}}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Add Music Folders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
          </h1>
          <p className="text-muted-foreground">
            Ready to discover something new?
          </p>
        </motion.div>

        {/* Quick Play Grid */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
            {quickPlayItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl hover:from-muted/60 hover:to-muted/40 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${item.color} mb-3 flex items-center justify-center`}>
                  <div className="w-8 h-8 bg-white/20 rounded" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                <button className="absolute bottom-4 right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recently Played */}
        {recentTracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Recently Added
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentTracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="album-card group"
                  onClick={() => handlePlayTrack(track)}
                >
                  <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden relative">
                    <AlbumCover 
                      trackId={track.id}
                      className="w-full h-full"
                      size="custom"
                    />
                    <button className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-sm truncate mb-1">
                    {track.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artist_name || 'Unknown Artist'}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Popular Albums */}
        {recentAlbums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Popular Albums
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentAlbums.map((album, index) => {
                // Find a track from this album to show its cover
                const albumTrack = tracks.find(track => track.album_name === album.name);
                
                return (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="album-card group"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden relative">
                      {albumTrack ? (
                        <AlbumCover 
                          trackId={albumTrack.id}
                          className="w-full h-full"
                          size="custom"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
                        </div>
                      )}
                      <button className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm truncate mb-1">
                      {album.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {album.artist_name || 'Various Artists'}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}