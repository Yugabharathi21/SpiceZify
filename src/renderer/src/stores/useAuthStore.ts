import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchUserPreferences, createProfile } from '../lib/database';
import { useSettingsStore } from './useSettingsStore';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
  error?: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (updates: Partial<User>) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: undefined,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          console.log('🔐 Attempting login with:', { email });
          
          // Real Supabase authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          console.log('🔐 Login response:', { data, error });

          if (error) {
            console.error('🔐 Login error details:', {
              message: error.message,
              status: error.status,
              name: error.name
            });
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
              isLoading: false,
              error: undefined
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
          console.error('🔐 Login failed:', error);
          
          // Fallback: Create a temporary local user if Supabase fails
          if (error instanceof Error && (
            error.message.includes('500') || 
            error.message.includes('Internal') ||
            error.message.includes('Database error') ||
            error.message.includes('database')
          )) {
            console.warn('🔐 Supabase unavailable (server/database issue), using temporary local auth');
            
            const tempUser = {
              id: `temp-${uuidv4()}`,
              email,
              displayName: email.split('@')[0],
              avatarUrl: undefined,
            };

            set({ 
              user: tempUser, 
              isAuthenticated: true, 
              isLoading: false,
              error: 'Using offline mode - Database service unavailable'
            });

            return;
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'Login failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      signup: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true });
        try {
          console.log('🔐 Attempting signup with:', { email, displayName });
          
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

          console.log('🔐 Signup response:', { data, error });

          if (error) {
            console.error('🔐 Signup error details:', {
              message: error.message,
              status: error.status,
              name: error.name
            });
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
              isLoading: false,
              error: undefined
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
          console.error('🔐 Signup failed:', error);
          
          // Fallback: Create a temporary local user if Supabase fails
          if (error instanceof Error && (
            error.message.includes('500') || 
            error.message.includes('Internal') ||
            error.message.includes('Database error') ||
            error.message.includes('database')
          )) {
            console.warn('🔐 Supabase unavailable (server/database issue), using temporary local auth');
            
            const tempUser = {
              id: `temp-${uuidv4()}`,
              email,
              displayName: displayName || email.split('@')[0],
              avatarUrl: undefined,
            };

            set({ 
              user: tempUser, 
              isAuthenticated: true, 
              isLoading: false,
              error: 'Using offline mode - Database service unavailable'
            });

            return;
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'Registration failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        console.log('Auth Store: Starting logout...');
        set({ isLoading: true, error: undefined });
        
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Auth Store: Supabase logout error:', error);
          }
        } catch (error) {
          console.error('Auth Store: Logout error:', error);
        } finally {
          // Always clear user data regardless of Supabase result
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: undefined
          });
          console.log('Auth Store: Logout completed');
        }
      },

      clearError: () => {
        set({ error: undefined });
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