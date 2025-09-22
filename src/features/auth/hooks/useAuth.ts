import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type AuthCredentials } from '../services/authService';
import { useAuthStore } from '../../../app/store/useAuthStore';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const signUp = async ({ email, password, name }: AuthCredentials) => {
    setIsLoading(true);
    try {
      const { user, error } = await authService.signUp({ email, password, name });

      if (error) throw error;

      if (user) {
        setUser(user);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async ({ email, password }: AuthCredentials) => {
    setIsLoading(true);
    try {
      const { user, error } = await authService.signIn({ email, password });

      if (error) throw error;

      if (user) {
        setUser(user);
        navigate('/dashboard');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    console.log('🟡 useAuth.signInWithGoogle called');
    setIsLoading(true);
    try {
      console.log('🟡 Calling authService.signInWithGoogle...');
      const result = await authService.signInWithGoogle();

      console.log('🟡 authService result:', result);

      if (result.error) {
        console.error('🔴 useAuth error:', result.error);
        throw result.error;
      }

      // Google OAuth will redirect, so we don't handle user state here
      console.log('🟢 useAuth returning success');
      return { success: true };
    } catch (error) {
      console.error('🔴 useAuth catch error:', error);
      return { success: false, error: error as Error };
    } finally {
      setIsLoading(false);
      console.log('🟡 useAuth setIsLoading(false)');
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await authService.signOut();

      if (error) throw error;

      setUser(null);
      navigate('/auth');

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  };
};