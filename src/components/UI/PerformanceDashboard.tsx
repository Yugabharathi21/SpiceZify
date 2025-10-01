import React, { useState, useEffect } from 'react';
import { YouTubeService } from '../../services/youtubeService';

interface PerformanceMetrics {
  frontend: {
    cacheStats: {
      searchCache: { size: number; hitRate: string };
      detailsCache: { size: number; hitRate: string };
      relatedCache: { size: number; hitRate: string };
    };
    requestQueue: {
      active: number;
      queued: number;
      completed: number;
    };
    averageResponseTime: number;
    totalRequests: number;
  };
  backend?: {
    cache_stats: {
      search_cache: { total_entries: number; cache_hit_potential: string };
      related_cache: { total_entries: number; cache_hit_potential: string };
      video_cache: { total_entries: number; cache_hit_potential: string };
    };
    service_info: {
      uptime: number;
      version: string;
      features: string[];
    };
  };
}

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isVisible, onClose }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Get frontend metrics
      const frontendStats = YouTubeService.getPerformanceStats();
      
      // Try to get backend metrics
      let backendStats = null;
      try {
        const response = await fetch('http://localhost:5001/api/youtube/metrics');
        if (response.ok) {
          backendStats = await response.json();
        }
      } catch (error) {
        console.warn('Backend metrics unavailable:', error);
      }

      setMetrics({
        frontend: frontendStats,
        backend: backendStats
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const clearCache = async (cacheType: 'frontend' | 'backend' | 'all') => {
    try {
      if (cacheType === 'frontend' || cacheType === 'all') {
        YouTubeService.clearCache();
      }
      
      if (cacheType === 'backend' || cacheType === 'all') {
        await fetch('http://localhost:5001/api/youtube/cache/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all' })
        });
      }
      
      // Refresh metrics after clearing cache
      setTimeout(fetchMetrics, 500);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">🚀 Performance Dashboard</h2>
            <p className="text-gray-400 text-sm mt-1">
              Real-time performance metrics and optimization status
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? '⟳' : '🔄'} Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Summary */}
          {metrics && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">🎯 Performance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-mono text-lg">
                    {metrics.frontend.averageResponseTime.toFixed(0)}ms
                  </div>
                  <div className="text-blue-100">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono text-lg">
                    {metrics.frontend.totalRequests}
                  </div>
                  <div className="text-blue-100">Total Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono text-lg">
                    {metrics.frontend.cacheStats.searchCache.size + 
                     metrics.frontend.cacheStats.detailsCache.size + 
                     metrics.frontend.cacheStats.relatedCache.size}
                  </div>
                  <div className="text-blue-100">Cache Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono text-lg">
                    {metrics.backend ? '✅' : '❌'}
                  </div>
                  <div className="text-blue-100">Backend Status</div>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-400">Loading metrics...</span>
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Frontend Metrics */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  ⚡ Frontend Performance
                </h3>
                
                {/* Cache Statistics */}
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-blue-400">Cache Statistics</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Search Cache</span>
                        <span className="text-white font-mono">
                          {metrics.frontend.cacheStats.searchCache.size}
                        </span>
                      </div>
                      <div className="text-green-400 text-xs mt-1">
                        {metrics.frontend.cacheStats.searchCache.hitRate} hit rate
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Details Cache</span>
                        <span className="text-white font-mono">
                          {metrics.frontend.cacheStats.detailsCache.size}
                        </span>
                      </div>
                      <div className="text-green-400 text-xs mt-1">
                        {metrics.frontend.cacheStats.detailsCache.hitRate} hit rate
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Related Cache</span>
                        <span className="text-white font-mono">
                          {metrics.frontend.cacheStats.relatedCache.size}
                        </span>
                      </div>
                      <div className="text-green-400 text-xs mt-1">
                        {metrics.frontend.cacheStats.relatedCache.hitRate} hit rate
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => clearCache('frontend')}
                  className="mt-4 w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  🗑️ Clear Frontend Cache
                </button>
              </div>

              {/* Backend Metrics */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🔧 Backend Performance
                </h3>
                
                {metrics.backend ? (
                  <>
                    <div className="bg-gray-700 p-3 rounded mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Status</span>
                        <span className="text-green-400 font-mono">Online</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-300">Version</span>
                        <span className="text-white font-mono">{metrics.backend.service_info.version}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-300">Uptime</span>
                        <span className="text-blue-400 font-mono">
                          {formatUptime(metrics.backend.service_info.uptime)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Search Cache</span>
                          <span className="text-white">
                            {metrics.backend.cache_stats.search_cache.total_entries}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Related Cache</span>
                          <span className="text-white">
                            {metrics.backend.cache_stats.related_cache.total_entries}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Video Cache</span>
                          <span className="text-white">
                            {metrics.backend.cache_stats.video_cache.total_entries}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => clearCache('backend')}
                      className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      🗑️ Clear Backend Cache
                    </button>
                  </>
                ) : (
                  <div className="bg-gray-700 p-4 rounded text-center">
                    <div className="text-yellow-400 mb-2">⚠️ Backend Unavailable</div>
                    <div className="text-gray-400 text-sm">
                      Backend service is not responding. Check if Python service is running on port 5001.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Global Actions */}
          <div className="flex justify-center space-x-4 pt-4 border-t border-gray-700">
            <button
              onClick={() => clearCache('all')}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              🗑️ Clear All Caches
            </button>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              🔄 Refresh Metrics
            </button>
          </div>

          {lastUpdated && (
            <div className="text-center text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;