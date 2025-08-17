import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchUserPreferences, createProfile, getProfile } from '../lib/database';
import { useSettingsStore } from './useSettingsStore';

interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // Simulate login - in real app, this would call Supabase
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const user = {
            id: '00000000-0000-0000-0000-000000000001',
            email,
            displayName: email.split('@')[0],
          };

          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          // load user prefs from Supabase if available
          try {
            const res = await fetchUserPreferences(user.id);
            if (res.data) {
              const s = useSettingsStore.getState();
              const prefs = res.data as any;
              if (prefs.audioQuality) s.setAudioQuality(prefs.audioQuality);
              if (typeof prefs.crossfade === 'boolean') s.setCrossfade(prefs.crossfade ? 4 : 0);
              if (typeof prefs.normalizeVolume === 'boolean') s.setNormalizeVolume(prefs.normalizeVolume);
            }
          } catch (e) {
            console.warn('Failed to load user preferences:', e);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true });
        try {
          // Simulate signup - in real app, this would call Supabase
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const user = {
            id: '00000000-0000-0000-0000-000000000001',
            email,
            displayName: displayName || email.split('@')[0],
          };

          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          // load user prefs (same as login)
          try {
            const res = await fetchUserPreferences(user.id);
            if (res.data) {
              const s = useSettingsStore.getState();
              const prefs = res.data as any;
              if (prefs.audioQuality) s.setAudioQuality(prefs.audioQuality);
              if (typeof prefs.crossfade === 'boolean') s.setCrossfade(prefs.crossfade ? 4 : 0);
              if (typeof prefs.normalizeVolume === 'boolean') s.setNormalizeVolume(prefs.normalizeVolume);
            }
          } catch (e) {
            console.warn('Failed to load user preferences:', e);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ 
            user: { ...currentUser, ...updates } 
          });
        }
      },
    }),
    {
      name: 'spicezify-auth',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);