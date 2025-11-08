import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../app/store/useAuthStore';
import { supabase } from '../shared/lib/supabase';

const MARIO_CHARACTERS = [
  { id: 'mario', name: 'Mario', image: '/images/characters/SMP_Icon_Mario.webp' },
  { id: 'luigi', name: 'Luigi', image: '/images/characters/SMP_Icon_Luigi.webp' },
  { id: 'peach', name: 'Peach', image: '/images/characters/SMP_Icon_Peach.webp' },
  { id: 'bowser', name: 'Bowser', image: '/images/characters/SMP_Icon_Bowser.webp' },
  { id: 'yoshi', name: 'Yoshi', image: '/images/characters/SMPJ_Icon_Yoshi.webp' },
  { id: 'toad', name: 'Toad', image: '/images/characters/SMPJ_Icon_Toad.webp' },
  { id: 'wario', name: 'Wario', image: '/images/characters/SMP_Icon_Wario.webp' },
  { id: 'waluigi', name: 'Waluigi', image: '/images/characters/SMP_Icon_Waluigi.webp' },
  { id: 'rosalina', name: 'Rosalina', image: '/images/characters/SMP_Icon_Rosalina.webp' },
  { id: 'bowser-jr', name: 'Bowser Jr.', image: '/images/characters/SMP_Icon_Jr.webp' },
  { id: 'toadette', name: 'Toadette', image: '/images/characters/SMPJ_Icon_Toadette.webp' },
  { id: 'daisy', name: 'Daisy', image: '/images/characters/MPS_Daisy_icon.webp' },
  { id: 'shy-guy', name: 'Shy Guy', image: '/images/characters/SMP_Icon_Shy_Guy.webp' },
  { id: 'koopa', name: 'Koopa Troopa', image: '/images/characters/SMP_Icon_Koopa.webp' },
  { id: 'goomba', name: 'Goomba', image: '/images/characters/SMP_Icon_Goomba.webp' },
  { id: 'boo', name: 'Boo', image: '/images/characters/SMP_Icon_Boo.webp' },
  { id: 'dk', name: 'Donkey Kong', image: '/images/characters/SMP_Icon_DK.webp' },
  { id: 'birdo', name: 'Birdo', image: '/images/characters/MPS_Birdo_icon.webp' },
  { id: 'pauline', name: 'Pauline', image: '/images/characters/SMPJ_Icon_Pauline.webp' },
  { id: 'ninji', name: 'Ninji', image: '/images/characters/SMPJ_Icon_Ninji.webp' },
  { id: 'spike', name: 'Spike', image: '/images/characters/SMPJ_Icon_Spike.webp' },
  { id: 'monty-mole', name: 'Monty Mole', image: '/images/characters/SMP_Icon_Monty_Mole.webp' }
];


export default function CompleteProfile() {
  const { updateProfile } = useAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nickname: '',
    profilePicture: MARIO_CHARACTERS[0].id
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');


  useEffect(() => {
    if (!formData.nickname.trim() || formData.nickname.length < 3) {
      setNicknameStatus('idle');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setNicknameStatus('checking');

      try {

        const { data, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('nickname', formData.nickname)
          .maybeSingle();


        if (error) {
          console.error('Supabase error details:', error);


          if (error.code === 'PGRST116' || error.message.includes('RLS')) {
            setNicknameStatus('available');
            return;
          }
          throw error;
        }

        if (data) {
          setNicknameStatus('taken');
        } else {
          setNicknameStatus('available');
        }
      } catch (error) {
        console.error('Error checking nickname:', error);
        setNicknameStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [formData.nickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nickname.trim()) {
      toast.error('El nickname es obligatorio');
      return;
    }

    if (formData.nickname.length < 3) {
      toast.error('El nickname debe tener al menos 3 caracteres');
      return;
    }

    if (nicknameStatus === 'taken') {
      toast.error('Este nickname no está disponible');
      return;
    }

    if (nicknameStatus === 'checking') {
      toast.error('Esperando verificación del nickname...');
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData = {
        nickname: formData.nickname,
        profile_picture: formData.profilePicture
      };

      await updateProfile(profileData);
      toast.success('¡Perfil completado exitosamente!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error al completar perfil:', error);
      toast.error('Error al guardar el perfil: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-mario text-gray-900 dark:text-gray-100 mb-2">
            Completa tu Perfil
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            ¡Bienvenido! Para continuar, necesitamos que completes tu perfil
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nickname
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Tu nickname único"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
                {formData.nickname.length >= 3 && (
                  <div className="mt-2 flex items-center gap-2">
                    {nicknameStatus === 'checking' && (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-600">Verificando disponibilidad...</span>
                      </>
                    )}
                    {nicknameStatus === 'available' && (
                      <>
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-green-600">¡Nickname disponible!</span>
                      </>
                    )}
                    {nicknameStatus === 'taken' && (
                      <>
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-red-600">Nickname no disponible</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Selección de Foto de Perfil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Elige tu Personaje de Mario Party
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {MARIO_CHARACTERS.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, profilePicture: character.id }))}
                      className={`relative rounded-lg overflow-hidden transition-all duration-200 ${
                        formData.profilePicture === character.id
                          ? 'ring-4 ring-blue-500 dark:ring-blue-400 scale-105 shadow-lg'
                          : 'ring-2 ring-gray-200 dark:ring-gray-600 hover:ring-blue-300 hover:scale-102'
                      }`}
                      title={character.name}
                    >
                      <img
                        src={character.image}
                        alt={character.name}
                        className="w-full h-full object-cover aspect-square"
                        loading="lazy"
                      />
                      {formData.profilePicture === character.id && (
                        <div className="absolute bottom-1 right-1">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-lg font-mario text-gray-700">
                  {MARIO_CHARACTERS.find(c => c.id === formData.profilePicture)?.name}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || nicknameStatus !== 'available'}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : 'Completar Perfil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};