import { supabase } from '../../../shared/lib/supabase';
import type { User as AuthUser } from '@supabase/supabase-js';

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error?: Error;
}

export class AuthService {
  async signUp({ email, password, name }: AuthCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          }
        }
      });

      if (error) throw error;

      return { user: data.user };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signIn({ email, password }: AuthCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {

    try {

      const baseUrl = import.meta.env.PROD
        ? window.location.origin
        : 'http://localhost:5173';

      const redirectUrl = `${baseUrl}/dashboard`;



      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });


      if (result.error) {
        throw result.error;
      }

      return { user: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signOut(): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  async getSession() {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }

  async resetPasswordForEmail(email: string): Promise<{ error?: Error }> {
    try {
      const baseUrl = import.meta.env.PROD
        ? window.location.origin
        : 'http://localhost:5173';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`,
      });

      if (error) throw error;
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }
}

export const authService = new AuthService();