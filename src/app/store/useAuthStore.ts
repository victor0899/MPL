import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as AuthUser, Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';
import { useGroupsStore } from './useGroupsStore';

interface Profile {
  id: string;
  nickname: string;
  profile_picture: string;
  birth_date: string;
  nationality: string;
  favorite_minigame: string;
  bio: string;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  // State
  session: Session | null;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  _authSubscription: any;

  // Actions
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => Promise<void>;

  // Internal actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: (userId: string, showLoading?: boolean) => Promise<void>;
  initialize: () => Promise<void>;
  cleanup: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      user: null,
      profile: null,
      loading: false,
      error: null,
      initialized: false,

      // Store auth listener subscription for cleanup
      _authSubscription: null as any,

      // Internal setters
      setSession: (session) => {
        set({
          session,
          user: session?.user ?? null,
          error: null
        });
      },

      setProfile: (profile) => set({ profile }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      // Async actions
      signUp: async (email: string, password: string, name: string) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name }
            }
          });
          if (error) throw error;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Sign up failed' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Sign in failed' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      signInWithGoogle: async () => {
        set({ loading: true, error: null });
        try {
          const baseUrl = import.meta.env.PROD
            ? window.location.origin
            : 'http://localhost:5173';

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${baseUrl}/dashboard`,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            }
          });
          if (error) throw error;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Google sign in failed' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          // State will be cleared by auth listener
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Sign out failed' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateProfile: async (profileData: Partial<Profile>) => {
        const { user } = get();
        if (!user) throw new Error('No authenticated user');

        set({ loading: true, error: null });
        try {
          const dataToUpsert = {
            id: user.id,
            ...profileData,
            profile_completed: true,
            updated_at: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('profiles')
            .upsert(dataToUpsert)
            .select()
            .single();

          if (error) throw error;
          set({ profile: data });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Profile update failed' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async (userId: string, showLoading: boolean = true) => {
        if (showLoading) {
          set({ loading: true, error: null });
        } else {
          set({ error: null });
        }

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // No profile found - create empty profile indicating completion needed
              set({
                profile: {
                  id: userId,
                  nickname: '',
                  profile_picture: '',
                  birth_date: '',
                  nationality: '',
                  favorite_minigame: '',
                  bio: '',
                  profile_completed: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              });
            } else {
              throw error;
            }
          } else {
            set({ profile: data });
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Profile fetch failed' });
        } finally {
          if (showLoading) {
            set({ loading: false });
          }
        }
      },

      initialize: async () => {
        if (get().initialized) return;

        console.log('Initializing auth...');
        set({ initialized: true, loading: true });

        try {
          // Get initial session
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (session) {
            get().setSession(session);
            await get().fetchProfile(session.user.id);
          }

          // Set up auth listener and store subscription for cleanup
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);

            if (event === 'SIGNED_OUT' || !session) {
              set({
                session: null,
                user: null,
                profile: null
              });
              // Clear groups store when user signs out
              useGroupsStore.getState().clearGroups();
            } else if (event === 'PASSWORD_RECOVERY') {
              // Handle password recovery - user is authenticated but should reset password
              console.log('Password recovery event detected');
              get().setSession(session);
              // Don't fetch profile or redirect, let the reset password page handle it
            } else if (event === 'SIGNED_IN' && session) {
              get().setSession(session);
              // Use setTimeout to avoid deadlock with Supabase async operations
              setTimeout(async () => {
                // Don't show loading for automatic session verification
                await get().fetchProfile(session.user.id, false);
              }, 0);
            }
          });

          // Store subscription for cleanup
          set({ _authSubscription: subscription });

        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ error: error instanceof Error ? error.message : 'Initialization failed' });
        } finally {
          set({ loading: false });
        }
      },

      cleanup: () => {
        const { _authSubscription } = get();
        if (_authSubscription) {
          _authSubscription.unsubscribe();
          set({ _authSubscription: null });
        }
      }
    }),
    {
      name: 'mario-party-auth',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile
      })
    }
  )
);