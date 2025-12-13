import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../../shared/components';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { useAuthForm } from '../hooks/useAuthForm';
import { PasswordRequirements } from './PasswordRequirements';

interface AuthFormProps {
  isLogin: boolean;
  onToggleMode: () => void;
  onSuccess?: () => void;
}

export const AuthForm = ({ isLogin, onToggleMode, onSuccess }: AuthFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn } = useAuthStore();
  const {
    email,
    password,
    name,
    setEmail,
    setPassword,
    setName,
    errors,
    passwordValidation,
    isFormValid,
    validateForm,
    resetForm
  } = useAuthForm(isLogin);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const loadingToast = toast.loading('Iniciando sesión...');
        await signIn(email, password);
        toast.dismiss(loadingToast);
        toast.success('¡Bienvenido de vuelta!');
        onSuccess?.();
      } else {
        const loadingToast = toast.loading('Creando cuenta...');
        await signUp(email, password, name);
        toast.dismiss(loadingToast);
        toast.success('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.');
        resetForm();
        onToggleMode();
        onSuccess?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isLogin && (
        <Input
          type="text"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
          size="lg"
          error={errors.name}
        />
      )}

      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        size="lg"
        error={errors.email}
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Contraseña
          </label>
          {isLogin && (
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isLogin ? "Tu contraseña" : "Crea una contraseña segura"}
          required
          size="lg"
          error={errors.password}
          showPasswordToggle={true}
        />

        {!isLogin && password && (
          <PasswordRequirements requirements={passwordValidation.requirements} />
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
      </Button>

    </form>
  );
};