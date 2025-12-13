import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../app/store/useAuthStore';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { session, user, profile, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!session && !!user;

  useEffect(() => {
    // Don't do anything while still loading
    if (loading) {
      return;
    }

    if (isAuthenticated) {
      // If we have a user but no profile, wait for profile to load
      if (!profile) {
        return;
      }

      const profileCompleted = profile.profile_completed;

      if (!profileCompleted) {
        if (location.pathname !== '/complete-profile') {
          navigate('/complete-profile');
        }
      } else {
        if (location.pathname === '/complete-profile') {
          navigate('/dashboard');
        }
      }
    }
  }, [session, user, profile, loading, navigate, location.pathname, isAuthenticated]);


  // Show loading while authentication is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  // Show redirect message if profile is incomplete
  if (isAuthenticated && profile && !profile.profile_completed && location.pathname !== '/complete-profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <div className="text-gray-600">Redirigiendo para completar tu perfil...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}