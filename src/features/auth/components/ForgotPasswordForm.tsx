import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../../shared/components';
import { authService } from '../services/authService';
import { passwordResetSchema } from '../schemas/auth.schema';

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateEmail = (): boolean => {
    try {
      passwordResetSchema.validateSync({ email });
      setError('');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) return;

    setIsLoading(true);

    try {
      const loadingToast = toast.loading('Enviando email de recuperación...');
      const { error } = await authService.resetPasswordForEmail(email);
      toast.dismiss(loadingToast);

      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success('¡Email enviado! Revisa tu bandeja de entrada.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl mb-4">📧</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          ¡Email Enviado!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Hemos enviado un enlace de recuperación a <strong>{email}</strong>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
          Si no ves el email, revisa tu carpeta de spam.
        </p>
        <div className="space-y-3 pt-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            Volver a Iniciar Sesión
          </Button>
          <button
            type="button"
            onClick={() => setEmailSent(false)}
            className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ¿No recibiste el email? Reenviar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ¿Olvidaste tu contraseña?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        size="lg"
        error={error}
      />

      <div className="space-y-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!email || isLoading}
        >
          {isLoading ? 'Enviando...' : 'Enviar Email de Recuperación'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/auth')}
          disabled={isLoading}
        >
          Volver a Iniciar Sesión
        </Button>
      </div>
    </form>
  );
};
