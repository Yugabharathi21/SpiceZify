import { useEffect } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import recommendationService from '../services/recommendationService';

// Track user interactions for recommendations
let currentTrackStartTime: number | null = null;
let currentSessionId: string | null = null;

// Generate a session ID for tracking related listening
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useRecommendationTracking = () => {
  const { currentSong, isPlaying } = usePlayer();

  // Generate session ID on mount
  useEffect(() => {
    currentSessionId = generateSessionId();
  }, []);

  // Track when a song starts playing
  useEffect(() => {
    if (currentSong && isPlaying && !currentTrackStartTime) {
      currentTrackStartTime = Date.now();
      
      // Record play interaction
      recommendationService.trackPlay(
        currentSong.youtubeId, 
        currentSessionId || undefined, 
        'player'
      ).catch(err => console.warn('Failed to track play:', err));
    }
  }, [currentSong, isPlaying]);

  // Track when playback stops or song changes
  useEffect(() => {
    return () => {
      if (currentTrackStartTime && currentSong) {
        const durationPlayed = (Date.now() - currentTrackStartTime) / 1000;
        const trackDuration = parseInt(currentSong.duration) || 0;
        
        // Only track if played for more than 5 seconds
        if (durationPlayed > 5) {
          const completionRatio = trackDuration > 0 ? durationPlayed / trackDuration : 0;
          
          // Determine if this was a finish or skip
          if (completionRatio > 0.8) {
            // Track as finish
            recommendationService.trackFinish(
              currentSong.youtubeId,
              durationPlayed,
              trackDuration,
              currentSessionId || undefined
            ).catch(err => console.warn('Failed to track finish:', err));
          } else if (durationPlayed > 10) {
            // Track as skip if played for more than 10 seconds
            recommendationService.trackSkip(
              currentSong.youtubeId,
              Math.round(durationPlayed),
              durationPlayed,
              currentSessionId || undefined
            ).catch(err => console.warn('Failed to track skip:', err));
          }
        }
        
        currentTrackStartTime = null;
      }
    };
  }, [currentSong]);

  // Reset tracking when song changes
  useEffect(() => {
    currentTrackStartTime = null;
  }, [currentSong?.youtubeId]);

  // Provide utility functions for manual tracking
  const trackLike = (trackId: string) => {
    return recommendationService.trackLike(trackId, currentSessionId || undefined);
  };

  const trackDislike = (trackId: string) => {
    return recommendationService.trackDislike(trackId, currentSessionId || undefined);
  };

  const trackAddToPlaylist = (trackId: string, playlistId: string) => {
    return recommendationService.trackAddToPlaylist(
      trackId, 
      playlistId, 
      currentSessionId || undefined
    );
  };

  const trackSearch = (searchQuery: string) => {
    return recommendationService.trackSearch(searchQuery, currentSessionId || undefined);
  };

  return {
    trackLike,
    trackDislike,
    trackAddToPlaylist,
    trackSearch,
    currentSessionId
  };
};