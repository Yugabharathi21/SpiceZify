import React, { useState, useEffect } from 'react';
import { Play, Heart, MoreHorizontal, Clock, Eye, CheckCircle } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import recommendationService, { 
  RecommendedTrack, 
  RecommendationOptions 
} from '../../services/recommendationService';

interface RecommendationsProps {
  options?: RecommendationOptions;
  onTrackSelect?: (track: RecommendedTrack) => void;
  className?: string;
}

const Recommendations: React.FC<RecommendationsProps> = ({ 
  options = {}, 
  onTrackSelect,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<RecommendedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { currentSong, playSong, isPlaying, pauseSong, resumeSong } = usePlayer();

  // Load recommendations
  const loadRecommendations = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      
      const tracks = await recommendationService.getRecommendations({
        limit: 20,
        verifiedOnly: true,
        exploration: true,
        diversification: true,
        exploreRate: 0.15,
        ...options
      });
      
      setRecommendations(tracks);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle track play
  const handlePlay = async (track: RecommendedTrack) => {
    try {
      // Record interaction
      await recommendationService.trackPlay(track.youtube_id, undefined, 'recommendations');
      
      // Convert to player format
      const song = {
        id: track.youtube_id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration.toString(),
        youtubeId: track.youtube_id,
        channelTitle: track.artist,
        isVerified: track.is_verified
      };
      
      // Play the track
      await playSong(song);
      
      // Notify parent component
      onTrackSelect?.(track);
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  };

  // Handle like/unlike
  const handleLike = async (track: RecommendedTrack, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await recommendationService.trackLike(track.youtube_id);
      // Could update UI state here if we track likes locally
    } catch (error) {
      console.error('Failed to like track:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recommended for You</h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800 animate-pulse">
              <div className="w-12 h-12 bg-gray-700 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-400 mb-4">
          <p className="text-lg font-medium">Failed to load recommendations</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
        <button
          onClick={() => loadRecommendations()}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Recommended for You</h2>
        <button
          onClick={() => loadRecommendations(true)}
          disabled={refreshing}
          className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg">No recommendations available</p>
          <p className="text-sm">Try listening to some music to get personalized recommendations!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((track, index) => {
            const isCurrentTrack = currentSong?.youtubeId === track.youtube_id;
            const isCurrentlyPlaying = isCurrentTrack && isPlaying;

            return (
              <div
                key={track.youtube_id}
                className={`group flex items-center space-x-4 p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  isCurrentTrack 
                    ? 'bg-green-900/30 border border-green-500/30' 
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
                onClick={() => handlePlay(track)}
              >
                {/* Track Number / Play Button */}
                <div className="w-8 h-8 flex items-center justify-center">
                  {isCurrentlyPlaying ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPlaying) {
                          pauseSong();
                        } else {
                          resumeSong();
                        }
                      }}
                      className="w-6 h-6 text-green-400"
                    >
                      <div className="flex space-x-1">
                        <div className="w-1 h-4 bg-current animate-pulse"></div>
                        <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </button>
                  ) : (
                    <>
                      <span className="text-gray-400 group-hover:hidden text-sm">
                        {index + 1}
                      </span>
                      <Play className="w-4 h-4 text-white hidden group-hover:block" />
                    </>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover rounded"
                  />
                  {track.is_verified && (
                    <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-blue-400 bg-gray-900 rounded-full" />
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-medium truncate ${
                      isCurrentTrack ? 'text-green-400' : 'text-white'
                    }`}>
                      {track.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span className="truncate">{track.artist}</span>
                    {track.genres.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{track.genres.slice(0, 2).join(', ')}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Recommendation Explanation */}
                  <div className="flex items-center space-x-2 text-xs mt-1">
                    <span className={`capitalize ${getConfidenceColor(track.explanation.confidence)}`}>
                      {track.explanation.method}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500 truncate">
                      {track.explanation.reason}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className={`${getConfidenceColor(track.explanation.confidence)}`}>
                      {Math.round(track.explanation.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Track Metadata */}
                <div className="hidden md:flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{formatViewCount(track.view_count)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                  <div className="text-xs text-green-400">
                    {Math.round(track.score * 100)}/100
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleLike(track, e)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Like"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Recommendations;