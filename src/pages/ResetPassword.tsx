import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm';
import { WarioLoader } from '../shared/components/ui';

export default function ResetPassword() {
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the URL hash contains recovery type
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');

    console.log('Hash params:', Object.fromEntries(hashParams.entries()));
    console.log('Recovery type:', type);

    if (type === 'recovery') {
      setIsRecovery(true);
      setLoading(false);
    } else {
      // If not a recovery flow, redirect to auth page
      console.log('Not a recovery flow, redirecting to auth');
      navigate('/auth');
    }
  }, [navigate]);

  if (loading) {
    return <WarioLoader text="Verificando..." size="lg" fullScreen />;
  }

  if (!isRecovery) {
    return null;
  }

  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
