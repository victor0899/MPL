import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Spinner } from '../shared/components';
import { useAuthStore } from '../app/store/useAuthStore';
import { COUNTRIES } from '../shared/utils/countries';

// Component for rendering flags
const CountryFlag = ({ countryCode, className }: { countryCode: string; className?: string }) => {
  try {
    // Using a simple approach with country-flag-icons
    return (
      <img
        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
        alt={`${countryCode} flag`}
        className={className}
        style={{ width: '24px', height: '16px' }}
      />
    );
  } catch (error) {
    return <div className={`${className} bg-gray-200`} style={{ width: '24px', height: '16px' }} />;
  }
};

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


export default function EditProfile() {
  const { profile, updateProfile } = useAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nickname: '',
    profilePicture: MARIO_CHARACTERS[0].id,
    nationality: 'MX'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (profile) {
      setFormData({
        nickname: profile.nickname || '',
        profilePicture: profile.profile_picture || MARIO_CHARACTERS[0].id,
        nationality: profile.nationality || 'MX'
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nickname.trim()) {
      toast.error('El nickname es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      const profileData = {
        nickname: formData.nickname,
        profile_picture: formData.profilePicture,
        nationality: formData.nationality
      };

      await updateProfile(profileData);
      toast.success('Perfil actualizado exitosamente');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      toast.error('Error al actualizar el perfil: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-mario text-gray-900 dark:text-gray-100 mb-2">
            Editar Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Actualiza tu información personal y preferencias
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Personaje Favorito *
                </label>
                <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {MARIO_CHARACTERS.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, profilePicture: character.id }))}
                      className={`group relative p-2 rounded-lg transition-all duration-200 ${
                        formData.profilePicture === character.id
                          ? 'bg-blue-50 ring-2 ring-blue-400 scale-105 shadow-lg'
                          : 'bg-white hover:bg-gray-50 hover:scale-105 border border-gray-200'
                      }`}
                    >
                      <div className="aspect-square overflow-hidden rounded-md">
                        <img
                          src={character.image}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1 text-center">
                        <span className={`text-xs font-medium ${
                          formData.profilePicture === character.id
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`}>
                          {character.name}
                        </span>
                      </div>
                      {formData.profilePicture === character.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Nacionalidad
                </label>
                <div className="max-h-48 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    {COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nationality: country.code }))}
                        className={`group relative p-2 rounded-lg transition-all duration-200 text-left ${
                          formData.nationality === country.code
                            ? 'bg-blue-50 ring-2 ring-blue-400 shadow-lg'
                            : 'bg-white hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <CountryFlag countryCode={country.code} />
                          <span className={`text-sm font-medium truncate ${
                            formData.nationality === country.code
                              ? 'text-blue-600'
                              : 'text-gray-600'
                          }`}>
                            {country.name}
                          </span>
                        </div>
                        {formData.nationality === country.code && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1 flex items-center justify-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner size="sm" className="border-white border-t-transparent" />}
                <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500 mt-4">
              * Campos obligatorios
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}