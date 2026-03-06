import { getCharacterImage } from '../../utils/characters';

interface PlayerAvatarProps {
  profilePicture?: string;
  playerName: string;
  isCPU?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  fallbackContent?: React.ReactNode;
  bgColor?: string;
}

const sizeClasses = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-10 h-10 lg:w-14 lg:h-14',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  custom: '', // permite usar className completamente personalizado
};

const fallbackTextSize = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base lg:text-lg',
  lg: 'text-xl',
  xl: 'text-3xl',
  custom: 'text-base',
};

export default function PlayerAvatar({
  profilePicture,
  playerName,
  isCPU = false,
  size = 'md',
  className = '',
  fallbackContent,
  bgColor,
}: PlayerAvatarProps) {
  const sizeClass = sizeClasses[size];
  const defaultBgColor = bgColor || (isCPU ? 'bg-purple-500 dark:bg-purple-600' : 'bg-blue-500 dark:bg-blue-600');

  const containerClasses = `${sizeClass} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${defaultBgColor} ${className}`;

  // Si tiene foto de perfil, mostrarla
  if (profilePicture) {
    return (
      <div className={containerClasses}>
        <img
          src={getCharacterImage(profilePicture)}
          alt={playerName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Si hay contenido fallback personalizado
  if (fallbackContent !== undefined) {
    return (
      <div className={containerClasses}>
        {fallbackContent}
      </div>
    );
  }

  // Fallback por defecto: primera letra del nombre
  return (
    <div className={containerClasses}>
      <span className={`text-white font-semibold ${fallbackTextSize[size]}`}>
        {playerName ? playerName[0].toUpperCase() : '?'}
      </span>
    </div>
  );
}
