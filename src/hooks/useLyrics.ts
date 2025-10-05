import { useState, useCallback } from 'react';
import { YouTubeService, LyricsData, LyricsLine } from '../services/youtubeService';

interface UseLyricsResult {
  lyrics: LyricsData | null;
  lyricsLines: LyricsLine[];
  currentLine: LyricsLine | undefined;
  nextLine: LyricsLine | undefined;
  currentLineIndex: number;
  isLoading: boolean;
  error: string | null;
  fetchLyrics: (artist: string, title: string, album?: string, duration?: number) => Promise<void>;
  getCurrentLyric: (currentTime: number) => void;
}

export const useLyrics = (): UseLyricsResult => {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);
  const [currentLine, setCurrentLine] = useState<LyricsLine | undefined>();
  const [nextLine, setNextLine] = useState<LyricsLine | undefined>();
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLyrics = useCallback(async (
    artist: string, 
    title: string, 
    album?: string, 
    duration?: number
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🎵 [useLyrics] Fetching lyrics for: "${title}" by "${artist}"`);
      
      const lyricsData = await YouTubeService.fetchLyrics(artist, title, album, duration);
      
      if (lyricsData) {
        setLyrics(lyricsData);
        
        // Parse synced lyrics if available
        if (lyricsData.syncedLyrics) {
          const parsedLines = YouTubeService.parseLRC(lyricsData.syncedLyrics);
          setLyricsLines(parsedLines);
          console.log(`🎤 [useLyrics] Parsed ${parsedLines.length} synced lyrics lines`);
        } else {
          setLyricsLines([]);
          console.log(`📃 [useLyrics] Only plain lyrics available`);
        }
      } else {
        setLyrics(null);
        setLyricsLines([]);
        console.log(`❌ [useLyrics] No lyrics found`);
      }
    } catch (err) {
      console.error(`💥 [useLyrics] Error fetching lyrics:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lyrics');
      setLyrics(null);
      setLyricsLines([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCurrentLyric = useCallback((currentTime: number) => {
    if (lyricsLines.length === 0) return;
    
    const result = YouTubeService.getCurrentLyricLine(lyricsLines, currentTime);
    
    setCurrentLine(result.current);
    setNextLine(result.next);
    setCurrentLineIndex(result.index);
  }, [lyricsLines]);

  return {
    lyrics,
    lyricsLines,
    currentLine,
    nextLine,
    currentLineIndex,
    isLoading,
    error,
    fetchLyrics,
    getCurrentLyric
  };
};

export default useLyrics;