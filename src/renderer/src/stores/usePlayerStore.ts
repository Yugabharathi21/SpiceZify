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
  originalQueue: Track[]; // Store original order for shuffle toggle
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
      originalQueue: [],
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
          // In shuffle mode, just go to next in shuffled queue
          nextIndex = queueIndex + 1;
          
          if (nextIndex >= queue.length) {
            if (repeat === 'all') {
              nextIndex = 0;
            } else {
              console.log('🔀 End of shuffled queue');
              return; // End of shuffled queue
            }
          }
        } else {
          nextIndex = queueIndex + 1;
          
          // Handle repeat modes
          if (nextIndex >= queue.length) {
            if (repeat === 'all') {
              nextIndex = 0;
            } else {
              console.log('⏭️ End of queue');
              return; // End of queue
            }
          }
        }

        const nextTrack = queue[nextIndex];
        console.log('⏭️ Next track:', nextTrack?.title, 'at index:', nextIndex);
        
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
          console.log('⏮️ Restarting current track (>3s played)');
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
        console.log('⏮️ Previous track:', prevTrack?.title, 'at index:', prevIndex);
        
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
          originalQueue: [...tracks], // Store original order
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
        originalQueue: [],
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
        set(state => {
          const newShuffle = !state.shuffle;
          console.log('🔀 Shuffle toggled:', newShuffle);

          if (newShuffle) {
            // Enable shuffle: create shuffled version of queue
            const currentTrack = state.currentTrack;
            if (!currentTrack || state.queue.length <= 1) {
              return { shuffle: newShuffle };
            }

            // Create shuffled queue with current track first
            const otherTracks = state.originalQueue.filter(track => track.id !== currentTrack.id);
            const shuffledOthers = [...otherTracks].sort(() => Math.random() - 0.5);
            const shuffledQueue = [currentTrack, ...shuffledOthers];

            console.log('🔀 Created shuffled queue with', shuffledQueue.length, 'tracks, current track first');
            
            return {
              shuffle: newShuffle,
              queue: shuffledQueue,
              queueIndex: 0, // Current track is now at index 0
            };
          } else {
            // Disable shuffle: restore original order
            const currentTrack = state.currentTrack;
            if (!currentTrack || state.originalQueue.length === 0) {
              return { shuffle: newShuffle, queue: state.originalQueue };
            }

            // Find current track in original queue
            const originalIndex = state.originalQueue.findIndex(track => track.id === currentTrack.id);
            
            console.log('🔀 Restored original queue, current track at index:', originalIndex);
            
            return {
              shuffle: newShuffle,
              queue: state.originalQueue,
              queueIndex: originalIndex >= 0 ? originalIndex : 0,
            };
          }
        });
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
        originalQueue: state.originalQueue,
        queueIndex: state.queueIndex,
        currentTrack: state.currentTrack,
      }),
    }
  )
);