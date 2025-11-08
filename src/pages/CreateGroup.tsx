import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input, Spinner } from '../shared/components';
import { supabaseAPI } from '../shared/services/supabase';
import { useAuthStore } from '../app/store/useAuthStore';
import { useGroupsStore } from '../app/store/useGroupsStore';
import type { RuleSet } from '../shared/types/api';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [ruleSet, setRuleSet] = useState<RuleSet>('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addGroup } = useGroupsStore();

  const ruleSets = [
    {
      id: 'classic' as RuleSet,
      title: 'Clásico',
      description: 'Sistema tradicional donde todos suman puntos',
      gradient: 'from-yellow-400 to-yellow-500',
      character: '/images/others/MPS_Toad_Artwork.webp',
      rules: [
        { position: '1º lugar', points: '+4 puntos' },
        { position: '2º lugar', points: '+3 puntos' },
        { position: '3º lugar', points: '+2 puntos' },
        { position: '4º lugar', points: '+1 punto' },
      ],
      bonuses: null,
    },
    {
      id: 'pro_bonus' as RuleSet,
      title: 'ProBonus',
      description: 'Sistema competitivo con bonos especiales',
      gradient: 'from-purple-400 to-purple-500',
      character: '/images/others/Toadette_-_Mario_Party_10.webp',
      rules: [
        { position: '1º lugar', points: '+3 puntos' },
        { position: '2º lugar', points: '+2 puntos' },
        { position: '3º lugar', points: '+1 punto' },
        { position: '4º lugar', points: '0 puntos' },
      ],
      bonuses: [
        'Rey de Minijuegos: +1pt',
        'Más Estrellas: +1pt',
        'Más Monedas: +1pt',
        'Bonos de temporada',
      ],
    },
  ];

  const handleNextCard = () => {
    const nextIndex = (currentCardIndex + 1) % ruleSets.length;
    setCurrentCardIndex(nextIndex);
    setRuleSet(ruleSets[nextIndex].id);
  };

  const handlePrevCard = () => {
    const prevIndex = (currentCardIndex - 1 + ruleSets.length) % ruleSets.length;
    setCurrentCardIndex(prevIndex);
    setRuleSet(ruleSets[prevIndex].id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const group = await supabaseAPI.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
        max_members: 4,
        rule_set: ruleSet,
      });

      // Add the new group to the store so it appears immediately
      addGroup(group);

      navigate('/dashboard', { replace: true });

      toast.success(`¡Grupo "${name}" creado exitosamente! Código de invitación: ${group.invite_code}`);

    } catch (error: any) {
      console.error('Error al crear grupo:', error);
      toast.error(error.message || 'Error al crear el grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Cargando...</div>
    </div>;
  }

  const currentRuleSet = ruleSets[currentCardIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-mario text-gray-900">
                Crea tu grupo
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna 1: Información básica (1/3) */}
                <div className="space-y-6 lg:col-span-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Básica</h3>

                  <Input
                    type="text"
                    label="Nombre de la Liga"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: MPL Temporada 1"
                    required
                    maxLength={50}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe tu liga de Mario Party..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      maxLength={200}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                      Liga pública (otros pueden encontrarla y solicitar unirse)
                    </label>
                  </div>
                </div>

                {/* Columna 2: Sistema de puntuación con carrusel (2/3) */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">Sistema de Puntuación</h3>

                  <div className="flex gap-6">
                    {/* Personaje a la izquierda (Toad o Toadette) */}
                    <div className="flex items-center justify-center">
                      <img
                        src={currentRuleSet.character}
                        alt={currentRuleSet.title}
                        className="w-48 h-48 object-contain drop-shadow-lg transition-all duration-300"
                      />
                    </div>

                    {/* Card de reglas a la derecha */}
                    <div className="flex-1">
                      <div
                        className={`rounded-2xl p-5 shadow-xl bg-gradient-to-br ${currentRuleSet.gradient} transition-all duration-300 min-h-[280px]`}
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-900 mb-1">{currentRuleSet.title}</h4>
                            <p className="text-xs text-gray-800">
                              {currentRuleSet.description}
                            </p>
                          </div>
                          <img
                            src="/images/others/bonus.png"
                            alt="Bonus"
                            className="w-12 h-12 object-contain"
                          />
                        </div>

                        <div className="border-t-2 border-gray-900/10 pt-3 mt-3">
                          {currentRuleSet.bonuses ? (
                            // Layout de 2 columnas para ProBonus
                            <div className="grid grid-cols-2 gap-4">
                              {/* Columna 1: Puntos por posición */}
                              <div className="bg-gray-900/10 rounded-lg p-3">
                                <div className="text-xs font-bold text-gray-900 mb-2">Puntos por posición:</div>
                                <div className="space-y-2">
                                  {currentRuleSet.rules.map((rule, idx) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span className="font-semibold text-gray-900">{rule.position}</span>
                                      <span className="font-bold text-gray-900">{rule.points}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Columna 2: Bonos especiales */}
                              <div className="bg-gray-900/10 rounded-lg p-3">
                                <div className="text-xs font-bold text-gray-900 mb-2">Bonos Especiales:</div>
                                <div className="space-y-2">
                                  <div>
                                    <div className="text-xs text-gray-900">• Rey de Minijuegos: +1pt</div>
                                    <div className="text-[10px] text-gray-700 ml-3">Sumados en cada partida</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-900">• Rey de Monedas: +1pt</div>
                                    <div className="text-xs text-gray-900">• Rey de Estrellas: +1pt</div>
                                    <div className="text-xs text-gray-900">• Rey de Victorias: +3pts</div>
                                    <div className="text-[10px] text-gray-700 ml-3">Sumados al final de la liga</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Layout simple para Clásico
                            <div className="space-y-2">
                              {currentRuleSet.rules.map((rule, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="font-semibold text-gray-900">{rule.position}</span>
                                  <span className="font-bold text-gray-900">{rule.points}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Flechas de navegación */}
                      <div className="flex items-center justify-between mt-4">
                        <button
                          type="button"
                          onClick={handlePrevCard}
                          className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors shadow-md"
                          aria-label="Sistema anterior"
                        >
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        {/* Indicadores de puntos */}
                        <div className="flex space-x-2">
                          {ruleSets.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCurrentCardIndex(idx);
                                setRuleSet(ruleSets[idx].id);
                              }}
                              className={`w-3 h-3 rounded-full transition-all ${
                                idx === currentCardIndex ? 'bg-gray-700 w-8' : 'bg-gray-300'
                              }`}
                              aria-label={`Ir a ${ruleSets[idx].title}`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleNextCard}
                          className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors shadow-md"
                          aria-label="Sistema siguiente"
                        >
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={!name.trim() || isLoading}
                  className="flex-1 flex items-center justify-center space-x-2"
                >
                  {isLoading && <Spinner size="sm" className="border-white border-t-transparent" />}
                  <span>{isLoading ? 'Creando...' : 'Crear Liga'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}