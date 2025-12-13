import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../../shared/components';
import { authService } from '../services/authService';
import { newPasswordSchema } from '../schemas/auth.schema';
import { PasswordRequirements } from './PasswordRequirements';

interface PasswordValidation {
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  isValid: boolean;
}

export const ResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();

  const validatePassword = (value: string): PasswordValidation => {
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    return {
      requirements: {
        minLength: value.length >= 6,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar,
      },
      isValid: value.length >= 6 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value),
    };
  };

  const passwordValidation = validatePassword(password);

  const validateForm = (): boolean => {
    try {
      newPasswordSchema.validateSync({ password, confirmPassword }, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err: any) {
      const validationErrors: { password?: string; confirmPassword?: string } = {};
      err.inner?.forEach((error: any) => {
        if (error.path) {
          validationErrors[error.path as keyof typeof validationErrors] = error.message;
        }
      });
      setErrors(validationErrors);
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const loadingToast = toast.loading('Actualizando contraseña...');
      const { error } = await authService.updatePassword(password);
      toast.dismiss(loadingToast);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('¡Contraseña actualizada exitosamente!');
        // Redirect to dashboard after successful password reset
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Crear Nueva Contraseña
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Ingresa tu nueva contraseña
        </p>
      </div>

      <div>
        <Input
          type="password"
          label="Nueva Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Crea una contraseña segura"
          required
          size="lg"
          error={errors.password}
          showPasswordToggle={true}
        />

        {password && (
          <PasswordRequirements requirements={passwordValidation.requirements} />
        )}
      </div>

      <Input
        type="password"
        label="Confirmar Contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirma tu contraseña"
        required
        size="lg"
        error={errors.confirmPassword}
        showPasswordToggle={true}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!password || !confirmPassword || !passwordValidation.isValid || isLoading}
      >
        {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
      </Button>
    </form>
  );
};
