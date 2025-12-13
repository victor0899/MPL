import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input } from '../shared/components';
import { WarioLoader } from '../shared/components/ui';
import { supabaseAPI } from '../shared/services/supabase';
import { useAuthStore } from '../app/store/useAuthStore';
import { withTimeout, TIMEOUTS } from '../shared/utils/timeout';
import { getMapImageUrl } from '../shared/utils/maps';
import { getRuleSetInfo } from '../shared/utils/rules';
import type { Group, Map, CreateGameResultRequest } from '../shared/types/api';

interface PlayerResult extends CreateGameResultRequest {
  playerId: string;
  playerName: string;
  calculatedPosition: number;
}

export default function CreateGame() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group');
  const navigate = useNavigate();
  const { session, user } = useAuthStore();
  const isAuthenticated = !!session && !!user;

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

  const [group, setGroup] = useState<Group | null>(null);
  const [maps, setMaps] = useState<Map[]>([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapSelected, setMapSelected] = useState(false);

  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [groupId]);

  useEffect(() => {
    if (group?.members) {
      initializePlayerResults();
    }
  }, [group]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (mapSelected) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateMap('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateMap('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMapIndex, maps.length, mapSelected]);

  const loadInitialData = async () => {
    if (!groupId) {
      toast.error('ID de grupo requerido');
      navigate('/dashboard');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Debes estar autenticado');
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      const [groupData, mapsData] = await withTimeout(
        Promise.all([
          supabaseAPI.getGroup(groupId),
          supabaseAPI.getMaps()
        ]),
        TIMEOUTS.DATA_LOAD,
        'Carga de datos demorada'
      );

      setGroup(groupData);

      const mapOrder = [
        'Mega Wiggler\'s Tree Party',
        'Roll \'em Raceway',
        'Rainbow Galleria',
        'Goomba Lagoon',
        'Western Land',
        'Mario\'s Rainbow Castle',
        'King Bowser\'s Keep'
      ];

      const sortedMaps = [...mapsData].sort((a, b) => {
        const indexA = mapOrder.indexOf(a.name);
        const indexB = mapOrder.indexOf(b.name);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });

      setMaps(sortedMaps);
      if (sortedMaps.length > 0) {
        setSelectedMapId(sortedMaps[0].id);
        setSelectedMapIndex(0);
      }
    } catch (error: any) {
      console.error('Error al cargar datos:', error);

      let errorMessage = 'Error al cargar los datos';

      if (error.message?.includes('Timeout')) {
        errorMessage = 'Carga de datos demorada. Int\u00e9ntalo de nuevo.';
      } else if (error.message?.includes('auth')) {
        errorMessage = 'Sesi\u00f3n expirada. Redirigiendo...';
        navigate('/auth');
        return;
      }

      toast.error(errorMessage);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };


  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());

  const handleImageError = (mapId: string) => {
    setImageErrors(prev => new Set(prev).add(mapId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(mapId);
      return newSet;
    });
  };

  const handleImageLoad = (mapId: string) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(mapId);
      return newSet;
    });
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(mapId);
      return newSet;
    });
  };

  const handleImageLoadStart = (mapId: string) => {
    setImageLoading(prev => new Set(prev).add(mapId));
  };

  const navigateMap = (direction: 'prev' | 'next') => {
    if (maps.length === 0) return;

    let newIndex = selectedMapIndex;
    if (direction === 'next') {
      newIndex = (selectedMapIndex + 1) % maps.length;
    } else {
      newIndex = selectedMapIndex === 0 ? maps.length - 1 : selectedMapIndex - 1;
    }

    setSelectedMapIndex(newIndex);
    setSelectedMapId(maps[newIndex].id);
    setMapSelected(false);
  };

  const selectMapByIndex = (index: number) => {
    if (index >= 0 && index < maps.length) {
      setSelectedMapIndex(index);
      setSelectedMapId(maps[index].id);
      setMapSelected(false);
    }
  };

  const handleMapSelection = () => {
    setMapSelected(!mapSelected);
  };

  const calculatePositions = (results: PlayerResult[]): PlayerResult[] => {
    const sorted = [...results].sort((a, b) => {
      if (a.stars !== b.stars) return b.stars - a.stars;

      if (a.coins !== b.coins) return b.coins - a.coins;

      return 0;
    });

    return results.map(player => {
      const sortedIndex = sorted.findIndex(p => p.playerId === player.playerId);
      return {
        ...player,
        position: sortedIndex + 1,
        calculatedPosition: sortedIndex + 1,
      };
    });
  };

  const initializePlayerResults = () => {
    if (!group?.members) return;

    const activeMembers = group.members.filter(m => m.status === 'active');

    const sortedMembers = [...activeMembers].sort((a, b) => {
      if (a.is_cpu && !b.is_cpu) return 1;
      if (!a.is_cpu && b.is_cpu) return -1;

      const nameA = a.is_cpu ? a.cpu_name! : (a.profile?.nickname || 'Usuario sin nombre');
      const nameB = b.is_cpu ? b.cpu_name! : (b.profile?.nickname || 'Usuario sin nombre');
      return nameA.localeCompare(nameB);
    });

    const results: PlayerResult[] = sortedMembers.map((member) => ({
      player_id: member.id,
      playerId: member.id,
      playerName: member.is_cpu
        ? member.cpu_name!
        : (member.profile?.nickname || 'Usuario sin nombre'),
      position: 1,
      calculatedPosition: 1,

      stars: 0,
      coins: 0,
      minigames_won: 0,
      showdown_wins: 0,

      total_stars_earned: 0,
      total_coins_earned: 0,
      minigame_bonus: 0,

      items_bought: 0,
      items_used: 0,
      spaces_traveled: 0,
      reactions_used: 0,
      blue_spaces: 0,
      red_spaces: 0,
      lucky_spaces: 0,
      unlucky_spaces: 0,
      item_spaces: 0,
      bowser_spaces: 0,
      event_spaces: 0,
      vs_spaces: 0,
    }));

    setPlayerResults(calculatePositions(results));
  };

  const updatePlayerResult = (playerId: string, field: keyof PlayerResult, value: string) => {
    setPlayerResults(prev => {
      const updated = prev.map(player => {
        if (player.playerId === playerId) {
          const numericValue = value === '' ? 0 : (Number(value) || 0);
          return { ...player, [field]: numericValue };
        }
        return player;
      });

      return calculatePositions(updated);
    });
  };

  const validateForm = (): boolean => {
    if (!selectedMapId || !mapSelected) {
      toast.error('Por favor selecciona un mapa usando el botón "Seleccionar este Mapa"');
      return false;
    }

    if (!playedAt) {
      toast.error('Selecciona la fecha de la partida');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!group) {
      toast.error('Grupo no encontrado');
      return;
    }

    if (!user || !isAuthenticated) {
      toast.error('Debes estar autenticado para crear una partida');
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate minigame king bonus for ProBonus groups
      let gameResults = playerResults.map(player => ({
        player_id: player.player_id,
        position: player.position,
        stars: player.stars,
        coins: player.coins,
        minigames_won: player.minigames_won,
        showdown_wins: player.showdown_wins,
        items_bought: player.items_bought,
        items_used: player.items_used,
        spaces_traveled: player.spaces_traveled,
        reactions_used: player.reactions_used,
        total_stars_earned: player.total_stars_earned || 0,
        total_coins_earned: player.total_coins_earned || 0,
        blue_spaces: player.blue_spaces,
        red_spaces: player.red_spaces,
        lucky_spaces: player.lucky_spaces,
        unlucky_spaces: player.unlucky_spaces,
        item_spaces: player.item_spaces,
        bowser_spaces: player.bowser_spaces,
        event_spaces: player.event_spaces,
        vs_spaces: player.vs_spaces,
        minigame_bonus: 0, // Track bonus separately
      }));

      // Apply minigame king bonus for ProBonus groups
      if (group?.rule_set === 'pro_bonus') {
        const maxMinigames = Math.max(...gameResults.map(r => r.minigames_won));
        if (maxMinigames > 0) {
          gameResults = gameResults.map(result => ({
            ...result,
            minigame_bonus: result.minigames_won === maxMinigames ? 1 : 0
          }));
        }
      }

      await withTimeout(
        supabaseAPI.createGame({
          group_id: group.id,
          map_id: selectedMapId,
          played_at: playedAt + "T00:00:00Z",
          results: gameResults,
        }),
        TIMEOUTS.SUBMIT,
        'La operación tomó demasiado tiempo'
      );

      toast.success('¡Partida registrada exitosamente! Ahora está pendiente de aprobación por otros miembros.');
      navigate(`/groups/${group.id}`);
    } catch (error: any) {
      console.error('❌ Error al registrar partida:', error);

      let errorMessage = 'Error desconocido';

      if (error.message?.includes('Timeout')) {
        errorMessage = 'La operación tomó demasiado tiempo. Inténtalo de nuevo.';
      } else if (error.message?.includes('auth')) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        setTimeout(() => navigate('/auth'), 2000);
      } else if (error.message?.includes('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
      } else {
        errorMessage = error.message || 'Error al registrar la partida';
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <WarioLoader text="Cargando..." size="md" fullScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-8 px-4">
          <WarioLoader text="Cargando..." size="md" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Grupo no encontrado</h2>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Volver a Mis Grupos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-mario text-gray-800 dark:text-white mb-6">Información de la Partida</h2>

            <div className="mb-6">
              <Input
                type="date"
                label="Fecha de la Partida"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Mapa Jugado
                </label>

                {maps.length > 0 ? (
                  <div className="relative">
                    <div className="relative rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 bg-gray-100">
                      {(() => {
                        const currentMap = maps[selectedMapIndex];
                        const imageUrl = getMapImageUrl(currentMap?.name);
                        const hasImageError = imageErrors.has(currentMap?.id);
                        const isLoading = imageLoading.has(currentMap?.id);

                        if (imageUrl && !hasImageError) {
                          return (
                            <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
                              {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
                                  <img src="/images/others/MPS_Star.webp" alt="Loading" className="w-8 h-8 animate-spin" />
                                </div>
                              )}
                              <img
                                src={imageUrl}
                                alt={currentMap?.name}
                                className={`w-full h-48 object-cover object-center transition-all duration-500 ${
                                  mapSelected ? 'blur-[1px] brightness-110 contrast-75 saturate-50' : ''
                                }`}
                                loading="lazy"
                                onLoadStart={() => handleImageLoadStart(currentMap?.id)}
                                onError={() => handleImageError(currentMap?.id)}
                                onLoad={() => handleImageLoad(currentMap?.id)}
                                style={{ opacity: isLoading ? 0 : 1 }}
                              />
                              <div className={`absolute inset-0 transition-all duration-500 ${
                                mapSelected
                                  ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent'
                                  : 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'
                              }`}></div>

                              {mapSelected && (
                                <div className="absolute inset-0 bg-white bg-opacity-10 backdrop-blur-[0.5px]"></div>
                              )}

                            </div>
                          );
                        } else {
                          return (
                            <div className={`h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative transition-all duration-500 ${
                              mapSelected ? 'blur-[1px] brightness-110 contrast-75 saturate-50' : ''
                            }`}>
                              <div className={`absolute inset-0 transition-all duration-500 ${
                                mapSelected ? 'bg-black bg-opacity-40' : 'bg-black bg-opacity-20'
                              }`}></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-6xl opacity-40">🗺️</div>
                              </div>
                              <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                Sin imagen
                              </div>

                              {mapSelected && (
                                <div className="absolute inset-0 bg-white bg-opacity-10 backdrop-blur-[0.5px]"></div>
                              )}
                            </div>
                          );
                        }
                      })()}

                      <div className="absolute inset-0 flex items-end p-4">
                        <div className="text-white w-full">
                          <div className="text-xl font-bold mb-1 transition-all duration-300 drop-shadow-lg">
                            {maps[selectedMapIndex]?.name}
                          </div>
                          <div className="text-sm opacity-90 mb-2 drop-shadow">
                            {maps[selectedMapIndex]?.game_version}
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs bg-white bg-opacity-25 backdrop-blur-sm px-2 py-1 rounded">
                              {selectedMapIndex + 1} de {maps.length}
                            </div>
                            <div className="flex items-center space-x-2">
                              {mapSelected && (
                                <div className="text-xs bg-gray-800 bg-opacity-90 text-white px-3 py-1 rounded font-bold shadow-lg border border-gray-600 backdrop-blur-sm">
                                  ✓ SELECCIONADO
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <button
                        type="button"
                        onClick={() => navigateMap('prev')}
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 shadow-md ${
                          mapSelected || maps.length <= 1
                            ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900 border-2 border-blue-200 dark:border-blue-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg'
                        }`}
                        disabled={mapSelected || maps.length <= 1}
                        title={mapSelected ? "Deselecciona el mapa para navegar" : "Mapa anterior (← tecla izquierda)"}
                      >
                        <span className={`text-lg font-bold ${mapSelected ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>‹</span>
                      </button>

                      <div className="flex space-x-2">
                        {maps.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectMapByIndex(index)}
                            disabled={mapSelected}
                            className={`w-4 h-4 rounded-full transition-all duration-200 ${
                              mapSelected
                                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                                : index === selectedMapIndex
                                ? 'bg-blue-500 dark:bg-blue-400 shadow-md transform scale-110'
                                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 hover:transform hover:scale-105'
                            }`}
                            title={mapSelected ? "Deselecciona el mapa para navegar" : `${maps[index]?.name}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateMap('next')}
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 shadow-md ${
                          mapSelected || maps.length <= 1
                            ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900 border-2 border-blue-200 dark:border-blue-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg'
                        }`}
                        disabled={mapSelected || maps.length <= 1}
                        title={mapSelected ? "Deselecciona el mapa para navegar" : "Siguiente mapa (→ tecla derecha)"}
                      >
                        <span className={`text-lg font-bold ${mapSelected ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>›</span>
                      </button>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleMapSelection}
                        className={`w-full py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-300 ${
                          mapSelected
                            ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                            : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                      >
                        {mapSelected ? 'Deseleccionar Mapa' : 'Seleccionar este Mapa'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">🗺️</div>
                    <div>No hay mapas disponibles</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Resultados por Jugador</h2>
            {group && group.rule_set && (() => {
              const ruleInfo = getRuleSetInfo(group.rule_set);
              return (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-700 dark:text-gray-300">
                    {ruleInfo.positions.map((pos, idx) => (
                      <span key={idx}>
                        {pos.emoji} {pos.label}: {pos.points} punto{pos.points !== 1 ? 's' : ''}
                      </span>
                    ))}
                  </div>
                  {ruleInfo.bonuses && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      + Bonos: {ruleInfo.bonuses.map((bonus, idx) => (
                        <span key={idx}>
                          {bonus.name} (+{bonus.points}pt {bonus.timing === 'per_game' ? 'cada partida' : 'al final'})
                          {idx < ruleInfo.bonuses!.length - 1 ? ' • ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {playerResults.map((player) => (
                <div key={player.playerId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-700/50">
                  <div className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full p-1 ${
                          player.calculatedPosition === 1 ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600' :
                          player.calculatedPosition === 2 ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500' :
                          player.calculatedPosition === 3 ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700' :
                          'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600'
                        }`}>
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
                            {(() => {
                              const member = group?.members?.find(m => m.id === player.player_id);
                              if (member?.is_cpu) {
                                if (member.cpu_avatar) {
                                  return (
                                    <img
                                      src={getCharacterImage(member.cpu_avatar)}
                                      alt={player.playerName}
                                      className="w-full h-full object-cover"
                                    />
                                  );
                                } else {
                                  return <span className="text-2xl">🤖</span>;
                                }
                              } else if (member?.profile?.profile_picture) {
                                return (
                                  <img
                                    src={getCharacterImage(member.profile.profile_picture)}
                                    alt={player.playerName}
                                    className="w-full h-full object-cover"
                                  />
                                );
                              } else {
                                return <span className="text-gray-500 text-xl">👤</span>;
                              }
                            })()}
                          </div>
                        </div>

                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white ${
                          player.calculatedPosition === 1 ? 'bg-yellow-600' :
                          player.calculatedPosition === 2 ? 'bg-gray-500' :
                          player.calculatedPosition === 3 ? 'bg-orange-700' :
                          'bg-gray-600'
                        }`}>
                          {player.calculatedPosition}
                        </div>
                      </div>

                      <h3 className="font-semibold text-sm mt-2 text-center text-gray-900 dark:text-white">{player.playerName}</h3>
                    </div>

                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-4 divide-x divide-gray-200 dark:divide-gray-600">
                        {/* Columna 1: Resultados Finales */}
                        <div className="pr-4">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Finales</div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <img src="/images/others/MPS_Star.webp" alt="Estrellas" className="w-5 h-5" />
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={player.stars === 0 ? '' : player.stars}
                                placeholder="0"
                                onChange={(e) => updatePlayerResult(player.playerId, 'stars', e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <img src="/images/others/NSMBDS_Coin_Artwork.webp" alt="Monedas" className="w-5 h-5" />
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={player.coins === 0 ? '' : player.coins}
                                placeholder="0"
                                onChange={(e) => updatePlayerResult(player.playerId, 'coins', e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-xl">🎮</span>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={player.minigames_won === 0 ? '' : player.minigames_won}
                                placeholder="0"
                                onChange={(e) => updatePlayerResult(player.playerId, 'minigames_won', e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Columna 2: Estadísticas Ganadas (solo ProBonus) */}
                        {group?.rule_set === 'pro_bonus' && (
                          <div className="pl-4">
                            <div className="text-xs font-semibold text-purple-600 mb-2">Obtenidas</div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">⭐</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={player.total_stars_earned === 0 ? '' : player.total_stars_earned}
                                  placeholder="0"
                                  onChange={(e) => updatePlayerResult(player.playerId, 'total_stars_earned', e.target.value)}
                                  className="w-20 px-2 py-1 border border-purple-300 dark:border-purple-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🪙</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={player.total_coins_earned === 0 ? '' : player.total_coins_earned}
                                  placeholder="0"
                                  onChange={(e) => updatePlayerResult(player.playerId, 'total_coins_earned', e.target.value)}
                                  className="w-20 px-2 py-1 border border-purple-300 dark:border-purple-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-4 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/groups/${group.id}`)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Partida'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}