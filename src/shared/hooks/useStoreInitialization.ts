import { useEffect } from 'react';
import { useAuthStore } from '../../app/store/useAuthStore';

/**
 * Hook to initialize auth store properly
 * Should be called once at the app level
 */
export const useStoreInitialization = () => {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);
};