import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { inputVariants } from '../../../design-system/variants';
import { cn } from '../../utils/cn';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: keyof typeof inputVariants.size;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, size = 'md', id, showPasswordToggle = false, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordInput = type === 'password';
    const shouldShowToggle = showPasswordToggle && isPasswordInput;
    const inputType = shouldShowToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
            {label}
            {props.required && <span className="text-red-400 dark:text-red-300 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants.base,
              inputVariants.size[size],
              error ? inputVariants.state.error : inputVariants.state.default,
              shouldShowToggle && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {shouldShowToggle && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';