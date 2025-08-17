import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchUserPreferences, createProfile, getProfile } from '../lib/database';
import { useSettingsStore } from './useSettingsStore';
import { supabase } from '../lib/supabase';

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
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  initializeAuth: () => void;
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
          // Real Supabase authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            const user = {
              id: data.user.id,
              email: data.user.email || email,
              displayName: data.user.user_metadata?.display_name || email.split('@')[0],
              avatarUrl: data.user.user_metadata?.avatar_url,
            };

            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false 
            });

            // load user prefs from Supabase
            try {
              const res = await fetchUserPreferences(user.id);
              if (res.data) {
                const s = useSettingsStore.getState();
                const prefs = res.data as Record<string, unknown>;
                if (typeof prefs.audioQuality === 'string') s.setAudioQuality(prefs.audioQuality as 'low' | 'normal' | 'high');
                if (typeof prefs.crossfade === 'boolean') s.setCrossfade(prefs.crossfade ? 4 : 0);
                if (typeof prefs.normalizeVolume === 'boolean') s.setNormalizeVolume(prefs.normalizeVolume);
              }
            } catch (e) {
              console.warn('Failed to load user preferences:', e);
            }
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true });
        try {
          // Real Supabase authentication
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName || email.split('@')[0],
              }
            }
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            const user = {
              id: data.user.id,
              email: data.user.email || email,
              displayName: displayName || data.user.user_metadata?.display_name || email.split('@')[0],
              avatarUrl: data.user.user_metadata?.avatar_url,
            };

            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false 
            });

            // Create user profile in database
            try {
              const profileData = {
                email: user.email,
                display_name: user.displayName,
                avatar_url: user.avatarUrl || null,
              };
              await createProfile(user.id, profileData);
            } catch (e) {
              console.warn('Failed to create user profile:', e);
            }
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false 
          });
        }
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ 
            user: { ...currentUser, ...updates } 
          });
        }
      },

      initializeAuth: () => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            const user = {
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '',
              avatarUrl: session.user.user_metadata?.avatar_url,
            };
            set({ user, isAuthenticated: true });
          }
        });

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const user = {
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '',
              avatarUrl: session.user.user_metadata?.avatar_url,
            };
            set({ user, isAuthenticated: true });
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false });
          }
        });
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