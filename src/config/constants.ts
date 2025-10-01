// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const YOUTUBE_SERVICE_URL = import.meta.env.VITE_YOUTUBE_SERVICE_URL || 'http://localhost:5001';

// Player Configuration
export const DEFAULT_VOLUME = 0.7;
export const SEEK_INTERVAL = 10; // seconds

// Recommendation Configuration
export const DEFAULT_RECOMMENDATION_LIMIT = 20;
export const MAX_RECOMMENDATION_LIMIT = 50;
export const DEFAULT_EXPLORE_RATE = 0.15;

// UI Configuration
export const SIDEBAR_WIDTH = 280;
export const PLAYER_HEIGHT = 80;

// Search Configuration
export const SEARCH_DEBOUNCE_MS = 300;
export const MIN_SEARCH_LENGTH = 2;

// Room Configuration
export const MAX_ROOM_MEMBERS = 50;
export const ROOM_CODE_LENGTH = 6;

// Cache Configuration
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_CACHE_SIZE = 100;