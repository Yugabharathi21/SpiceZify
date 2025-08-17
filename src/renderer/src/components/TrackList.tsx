import { Play, Clock, MoreHorizontal, Heart } from 'lucide-react';
import { Track } from '../stores/usePlayerStore';
import AlbumCover from './AlbumCover';

interface TrackListProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  showCover?: boolean;
  showIndex?: boolean;
  showAlbum?: boolean;
  showDuration?: boolean;
  showAddedDate?: boolean;
}

export default function TrackList({
  tracks,
  onPlayTrack,
  showCover = false,
  showIndex = false,
  showAlbum = false,
  showDuration = false,
  showAddedDate = false
}: TrackListProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground border-b border-border mb-2">
        <div className="col-span-1 flex items-center">
          {showIndex && '#'}
        </div>
        <div className={`${showCover ? 'col-span-6' : 'col-span-7'} flex items-center`}>
          Title
        </div>
        {showAlbum && (
          <div className="col-span-3 hidden md:flex items-center">
            Album
          </div>
        )}
        {showAddedDate && (
          <div className="col-span-2 hidden lg:flex items-center">
            Date added
          </div>
        )}
        <div className="col-span-1 flex items-center justify-end">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Tracks */}
      {tracks.map((track, index) => (
        <div
          key={track.id}
          className="track-item grid grid-cols-12 gap-4 px-4 py-2"
          onClick={() => onPlayTrack(track)}
        >
          <div className="col-span-1 flex items-center text-muted-foreground">
            {showIndex ? (
              <span className="group-hover:hidden">{index + 1}</span>
            ) : null}
            <Play className={`w-4 h-4 ${showIndex ? 'hidden group-hover:block' : ''}`} />
          </div>

          <div className={`${showCover ? 'col-span-6' : 'col-span-7'} flex items-center gap-3 min-w-0`}>
            {showCover && (
              <AlbumCover 
                trackId={track.id}
                size="small"
                className="flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{track.title}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {track.artist_name || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {showAlbum && (
            <div className="col-span-3 hidden md:flex items-center min-w-0">
              <span className="text-sm text-muted-foreground truncate">
                {track.album_name || 'Unknown Album'}
              </span>
            </div>
          )}

          {showAddedDate && (
            <div className="col-span-2 hidden lg:flex items-center">
              <span className="text-sm text-muted-foreground">
                3 days ago
              </span>
            </div>
          )}

          <div className="col-span-1 flex items-center justify-end gap-2">
            <div className="track-actions flex items-center gap-1">
              <button className="p-1 hover:bg-muted/50 rounded">
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-muted/50 rounded">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            {showDuration && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatDuration(track.duration_ms)}
              </span>
            )}
          </div>
        </div>
      ))}

      {tracks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tracks found</p>
        </div>
      )}
    </div>
  );
}