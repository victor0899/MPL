import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../app/store/useAuthStore';

export default function Navbar() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false);
      setIsLoggingOut(true);

      // Toast inicial con delay para simular procesamiento
      toast.loading('Cerrando sesión...', { id: 'logout' });
      await new Promise(resolve => setTimeout(resolve, 800));

      // Logout real
      await signOut();

      // Toast de éxito inmediatamente después del logout
      toast.success('Sesión cerrada exitosamente', { id: 'logout' });

      // Pequeño delay antes de redirigir para mostrar el éxito
      await new Promise(resolve => setTimeout(resolve, 1200));

      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión', { id: 'logout' });
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/auth');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getCharacterImage = (characterId: string) => {
    const characterMap: { [key: string]: string } = {
      'mario': '/images/characters/SMP_Icon_Mario.webp',
      'luigi': '/images/characters/SMP_Icon_Luigi.webp',
      'peach': '/images/characters/SMP_Icon_Peach.webp',
      'bowser': '/images/characters/SMP_Icon_Bowser.webp',
      'yoshi': '/images/characters/SMPJ_Icon_Yoshi.webp',
      'toad': '/images/characters/SMPJ_Icon_Toad.webp',
      'wario': '/images/characters/SMP_Icon_Wario.webp',
      'waluigi': '/images/characters/SMP_Icon_Waluigi.webp',
      'rosalina': '/images/characters/SMP_Icon_Rosalina.webp',
      'bowser-jr': '/images/characters/SMP_Icon_Jr.webp',
      'toadette': '/images/characters/SMPJ_Icon_Toadette.webp',
      'daisy': '/images/characters/MPS_Daisy_icon.webp',
      'shy-guy': '/images/characters/SMP_Icon_Shy_Guy.webp',
      'koopa': '/images/characters/SMP_Icon_Koopa.webp',
      'goomba': '/images/characters/SMP_Icon_Goomba.webp',
      'boo': '/images/characters/SMP_Icon_Boo.webp',
      'dk': '/images/characters/SMP_Icon_DK.webp',
      'birdo': '/images/characters/MPS_Birdo_icon.webp',
      'pauline': '/images/characters/SMPJ_Icon_Pauline.webp',
      'ninji': '/images/characters/SMPJ_Icon_Ninji.webp',
      'spike': '/images/characters/SMPJ_Icon_Spike.webp',
      'monty-mole': '/images/characters/SMP_Icon_Monty_Mole.webp'
    };

    return characterMap[characterId] || '/images/characters/SMP_Icon_Mario.webp';
  };

  const selectedCharacter = getCharacterImage(profile?.profile_picture || 'mario');

  return (
    <nav className={`bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 transition-opacity duration-500 ${isLoggingOut ? 'opacity-50' : 'opacity-100'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <h1 className="text-2xl font-mario text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Mario Party League
            </h1>
          </Link>


          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                <img
                  src={selectedCharacter}
                  alt={profile?.nickname || 'Usuario'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="hidden sm:block text-left max-w-32">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {profile?.nickname || 'Usuario'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </div>
              </div>

              <svg
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {profile?.nickname || 'Usuario'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user?.email}>
                    {user?.email}
                  </div>
                </div>

                <Link
                  to="/edit-profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <svg className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Editar Perfil
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <div className="w-4 h-4 mr-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}