import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
  id: number;
  path: string;
  title: string;
  artist_name?: string;
  album_name?: string;
  duration_ms: number;
  track_no?: number;
  year?: number;
  genre?: string;
  cover?: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  playbackRate: number;
}

interface PlayerActions {
  // Playback control
  play: (track?: Track) => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (time: number) => void;
  
  // Queue management
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (tracks: Track | Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  
  // Controls
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  setRepeat: (mode: 'none' | 'one' | 'all') => void;
  
  // Time updates
  updateCurrentTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  
  // State updates
  setPlaybackRate: (rate: number) => void;
}

type PlayerStore = PlaybackState & PlayerActions;

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      shuffle: false,
      repeat: 'none',
      playbackRate: 1,

      // Actions
      play: (track?: Track) => {
        const state = get();
        
        if (track) {
          // Play specific track
          set({
            currentTrack: track,
            isPlaying: true,
            currentTime: 0,
          });
        } else if (state.currentTrack) {
          // Resume current track
          set({ isPlaying: true });
        } else if (state.queue.length > 0) {
          // Play first track in queue
          const firstTrack = state.queue[0];
          set({
            currentTrack: firstTrack,
            queueIndex: 0,
            isPlaying: true,
            currentTime: 0,
          });
        }
      },

      pause: () => set({ isPlaying: false }),

      stop: () => set({ 
        isPlaying: false, 
        currentTime: 0 
      }),

      next: () => {
        const state = get();
        const { queue, queueIndex, shuffle, repeat } = state;
        
        if (queue.length === 0) return;

        let nextIndex: number;

        if (shuffle) {
          // Random next track (avoiding current)
          do {
            nextIndex = Math.floor(Math.random() * queue.length);
          } while (nextIndex === queueIndex && queue.length > 1);
        } else {
          nextIndex = queueIndex + 1;
          
          // Handle repeat modes
          if (nextIndex >= queue.length) {
            if (repeat === 'all') {
              nextIndex = 0;
            } else {
              return; // End of queue
            }
          }
        }

        const nextTrack = queue[nextIndex];
        set({
          currentTrack: nextTrack,
          queueIndex: nextIndex,
          currentTime: 0,
          isPlaying: true,
        });
      },

      previous: () => {
        const state = get();
        const { queue, queueIndex, currentTime } = state;
        
        if (queue.length === 0) return;

        // If more than 3 seconds into track, restart current track
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        let prevIndex = queueIndex - 1;
        
        if (prevIndex < 0) {
          if (state.repeat === 'all') {
            prevIndex = queue.length - 1;
          } else {
            prevIndex = 0; // Stay at first track
          }
        }

        const prevTrack = queue[prevIndex];
        set({
          currentTrack: prevTrack,
          queueIndex: prevIndex,
          currentTime: 0,
          isPlaying: true,
        });
      },

      seekTo: (time: number) => {
        set({ currentTime: time });
      },

      setQueue: (tracks: Track[], startIndex = 0) => {
        const track = tracks[startIndex];
        set({
          queue: tracks,
          queueIndex: startIndex,
          currentTrack: track || null,
          currentTime: 0,
        });
      },

      addToQueue: (tracks: Track | Track[]) => {
        const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
        set(state => ({
          queue: [...state.queue, ...tracksArray]
        }));
      },

      removeFromQueue: (index: number) => {
        set(state => {
          const newQueue = [...state.queue];
          newQueue.splice(index, 1);
          
          let newIndex = state.queueIndex;
          if (index < state.queueIndex) {
            newIndex = state.queueIndex - 1;
          } else if (index === state.queueIndex) {
            // Current track removed
            newIndex = Math.min(newIndex, newQueue.length - 1);
          }

          return {
            queue: newQueue,
            queueIndex: newIndex,
            currentTrack: newQueue[newIndex] || null,
          };
        });
      },

      clearQueue: () => set({
        queue: [],
        queueIndex: -1,
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
      }),

      setVolume: (volume: number) => {
        set({ 
          volume: Math.max(0, Math.min(1, volume)),
          isMuted: false 
        });
      },

      toggleMute: () => {
        set(state => ({ isMuted: !state.isMuted }));
      },

      toggleShuffle: () => {
        set(state => ({ shuffle: !state.shuffle }));
      },

      setRepeat: (mode: 'none' | 'one' | 'all') => {
        set({ repeat: mode });
      },

      updateCurrentTime: (time: number) => {
        set({ currentTime: time });
      },

      updateDuration: (duration: number) => {
        set({ duration });
      },

      setPlaybackRate: (rate: number) => {
        set({ playbackRate: rate });
      },
    }),
    {
      name: 'spicezify-player',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        shuffle: state.shuffle,
        repeat: state.repeat,
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTrack: state.currentTrack,
      }),
    }
  )
);