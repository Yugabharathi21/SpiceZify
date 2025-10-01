import React, { useState } from 'react';
import { Settings, RefreshCw, TrendingUp, Heart } from 'lucide-react';
import Recommendations from '../components/Recommendations/Recommendations';
import recommendationService, { UserProfile } from '../services/recommendationService';

const RecommendationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'for-you' | 'trending' | 'discover'>('for-you');
  const [showSettings, setShowSettings] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load user profile
  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const userProfile = await recommendationService.getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  React.useEffect(() => {
    loadProfile();
  }, []);

  // Tab configurations
  const tabs = [
    {
      id: 'for-you' as const,
      label: 'For You',
      icon: Heart,
      description: 'Personalized recommendations based on your listening history'
    },
    {
      id: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      description: 'Popular music that\'s trending right now'
    },
    {
      id: 'discover' as const,
      label: 'Discover',
      icon: RefreshCw,
      description: 'Explore new music and expand your horizons'
    }
  ];

  const renderRecommendations = () => {
    switch (activeTab) {
      case 'for-you':
        return (
          <Recommendations
            options={{
              limit: 30,
              verifiedOnly: true,
              exploration: false,
              diversification: true,
              exploreRate: 0.1
            }}
          />
        );
      case 'trending':
        return (
          <div className="space-y-6">
            <div className="text-center text-gray-400 py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg">Trending music coming soon!</p>
              <p className="text-sm">This feature will show popular tracks based on community listening patterns.</p>
            </div>
          </div>
        );
      case 'discover':
        return (
          <Recommendations
            options={{
              limit: 25,
              verifiedOnly: false,
              exploration: true,
              diversification: true,
              exploreRate: 0.4
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderProfileSettings = () => {
    if (!profile) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Your Music Profile</h3>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Total Interactions</h4>
            <p className="text-2xl font-bold text-white">
              {profile.listening_patterns.total_interactions.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Completion Rate</h4>
            <p className="text-2xl font-bold text-white">
              {Math.round(profile.listening_patterns.average_completion_rate * 100)}%
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Followed Artists</h4>
            <p className="text-2xl font-bold text-white">
              {profile.followed_artists.length}
            </p>
          </div>
        </div>

        {/* Top Artists */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Top Artists</h4>
          <div className="flex flex-wrap gap-2">
            {profile.top_artists.slice(0, 10).map((artist) => (
              <span
                key={artist.name}
                className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm"
              >
                {artist.name} ({artist.count})
              </span>
            ))}
          </div>
        </div>

        {/* Top Genres */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Top Genres</h4>
          <div className="flex flex-wrap gap-2">
            {profile.top_genres.slice(0, 8).map((genre) => (
              <span
                key={genre.name}
                className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm"
              >
                {genre.name}
              </span>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Verified Preference</h4>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${profile.preferences.verified_preference * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round(profile.preferences.verified_preference * 100)}%
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Freshness Preference</h4>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${profile.preferences.freshness_preference * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round(profile.preferences.freshness_preference * 100)}%
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Diversity Preference</h4>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${profile.preferences.diversity_preference * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round(profile.preferences.diversity_preference * 100)}%
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Recent Activity (30 days)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {profile.recent_activity.map((activity) => (
              <div key={activity._id} className="bg-gray-700 rounded p-2">
                <p className="text-xs text-gray-400 uppercase">{activity._id}</p>
                <p className="text-lg font-semibold text-white">{activity.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Discover Music</h1>
          <p className="text-gray-400">
            AI-powered recommendations tailored to your taste
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            disabled={loadingProfile}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Settings className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      {showSettings && renderProfileSettings()}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-md transition-all flex-1 ${
                activeTab === tab.id
                  ? 'bg-white text-black font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Description */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>

      {/* Content */}
      <div className="min-h-screen">
        {renderRecommendations()}
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>Recommendations powered by advanced machine learning algorithms</p>
        <p className="mt-1">
          Your listening patterns help us discover music you'll love
        </p>
      </div>
    </div>
  );
};

export default RecommendationsPage;