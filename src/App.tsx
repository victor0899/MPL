import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './app/store/useAuthStore';
import { useStoreInitialization } from './shared/hooks/useStoreInitialization';
import AppLayout from './shared/components/layout/AppLayout';
import { ProfileGuard } from './shared/components';
import { WarioLoader } from './shared/components/ui';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateGroup from './pages/CreateGroup';
import GroupDetail from './pages/GroupDetail';
import JoinGroup from './pages/JoinGroup';
import CreateGame from './pages/CreateGame';
import Leaderboard from './pages/Leaderboard';
import CompleteProfile from './pages/CompleteProfile';
import EditProfile from './pages/EditProfile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function AuthRedirectHandler() {
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuthStore();
  const location = useLocation();

  const isAuthenticated = !!session && !!user;
  const hasOAuthHash = location.hash.includes('access_token');

  if (loading) {
    return <WarioLoader text="Cargando..." size="lg" fullScreen />;
  }

  if (hasOAuthHash && !isAuthenticated) {
    return <WarioLoader text="Procesando autenticación..." size="lg" fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return (
    <ProfileGuard>
      {children}
    </ProfileGuard>
  );
}

function App() {
  // Initialize all stores
  useStoreInitialization();

  return (
    <Router>
      <AuthRedirectHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth" replace />} />

        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <EditProfile />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/groups" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/groups/new"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CreateGroup />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <GroupDetail />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/join"
          element={
            <ProtectedRoute>
              <AppLayout>
                <JoinGroup />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/join/:inviteCode"
          element={
            <ProtectedRoute>
              <AppLayout>
                <JoinGroup />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/games/new"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CreateGame />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/:id/leaderboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Leaderboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </Router>
  );
}

export default App;
