import React, { useEffect, useRef } from 'react';
import { useLyrics } from '../../hooks/useLyrics';
import { LyricsLine } from '../../services/youtubeService';

interface LyricsDisplayProps {
  artist: string;
  title: string;
  currentTime: number; // Current playback time in seconds
  album?: string;
  duration?: number;
  className?: string;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  artist,
  title,
  currentTime,
  album,
  duration,
  className = ''
}) => {
  const {
    lyrics,
    lyricsLines,
    currentLineIndex,
    isLoading,
    error,
    fetchLyrics,
    getCurrentLyric
  } = useLyrics();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentLineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineRef.current && scrollContainerRef.current) {
      currentLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLineIndex]);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (artist && title) {
      fetchLyrics(artist, title, album, duration);
    }
  }, [artist, title, album, duration, fetchLyrics]);

  // Update current lyric line based on playback time
  useEffect(() => {
    getCurrentLyric(currentTime);
  }, [currentTime, getCurrentLyric]);

  if (isLoading) {
    return (
      <div className={`lyrics-display ${className}`}>
        <div className="lyrics-loading">
          <div className="animate-pulse">
            <div className="text-center text-spotify-text-gray">
              🎵 Loading lyrics...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`lyrics-display ${className}`}>
        <div className="lyrics-error">
          <div className="text-center text-red-400">
            ❌ {error}
          </div>
        </div>
      </div>
    );
  }

  if (!lyrics) {
    return (
      <div className={`lyrics-display ${className}`}>
        <div className="lyrics-not-found">
          <div className="text-center text-spotify-text-gray">
            📃 No lyrics available for "{title}" by {artist}
          </div>
        </div>
      </div>
    );
  }

  // Render synced lyrics (karaoke style)
  if (lyricsLines.length > 0) {
    return (
      <div className={`lyrics-display synced-lyrics ${className}`}>
        <div ref={scrollContainerRef} className="lyrics-content max-h-80 overflow-y-auto space-y-1 lyrics-scrollbar pr-2">
          {lyricsLines.map((line: LyricsLine, index: number) => {
            const isCurrent = index === currentLineIndex;
            const isPast = index < currentLineIndex;
            const isNext = index === currentLineIndex + 1;
            
            return (
              <div
                key={index}
                ref={isCurrent ? currentLineRef : null}
                className={`lyrics-line transition-all duration-500 px-3 py-2 rounded-md ${
                  isCurrent
                    ? 'bg-spotify-green/20 text-spotify-green font-semibold text-base shadow-sm border-l-3 border-spotify-green scale-[1.02]'
                    : isPast
                    ? 'text-spotify-text-gray/40 text-sm opacity-60'
                    : isNext
                    ? 'text-spotify-text-light font-medium text-sm opacity-80'
                    : 'text-spotify-text-gray text-sm opacity-70'
                }`}
                style={{
                  scrollMargin: '40px'
                }}
              >
                <span className="time-stamp text-xs text-spotify-text-gray/40 mr-2 font-mono">
                  {formatTime(line.time)}
                </span>
                <span className="lyrics-text">{line.text}</span>
              </div>
            );
          })}
        </div>
        
        <div className="lyrics-footer mt-4 text-xs text-spotify-text-gray text-center">
          Powered by LRCLIB • {lyricsLines.length} lines
        </div>
      </div>
    );
  }

  // Render plain lyrics
  if (lyrics.plainLyrics) {
    return (
      <div className={`lyrics-display plain-lyrics ${className}`}>
        <div ref={scrollContainerRef} className="lyrics-content max-h-80 overflow-y-auto lyrics-scrollbar pr-2">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-spotify-text-light px-2">
            {lyrics.plainLyrics}
          </pre>
        </div>
        
        <div className="lyrics-footer mt-4 text-xs text-spotify-text-gray text-center">
          Powered by LRCLIB • Plain text lyrics
        </div>
      </div>
    );
  }

  return null;
};

// Helper function to format time from seconds to MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default LyricsDisplay;