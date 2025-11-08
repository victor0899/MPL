import { useState } from 'react';
import { Clock, Minus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/Button';
import { supabaseAPI } from '../services/supabase';
import { useAuthStore } from '../../app/store/useAuthStore';
import { formatGameDate } from '../utils/dateFormat';
import { getCharacterImage } from '../utils/characters';
import { getMapImageUrl, getMapInfo, renderDifficultyStars } from '../utils/maps';
import type { Game, Group } from '../types/api';


interface GameApprovalModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onVoteSubmitted: () => void;
  group?: Group;
}

export default function GameApprovalModal({
  game,
  isOpen,
  onClose,
  onVoteSubmitted,
  group
}: GameApprovalModalProps) {
  const [isVoting, setIsVoting] = useState(false);
  const { user } = useAuthStore();

  if (!isOpen || !game) return null;

  // Verificar si el usuario actual ya votó
  const currentUserVote = game.approvals?.find(approval => approval.voter?.user_id === user?.id);
  const hasUserVoted = !!currentUserVote;

  const handleVote = async (vote: 'approve' | 'reject') => {
    setIsVoting(true);
    try {
      await supabaseAPI.voteOnGame({
        game_id: game.id,
        vote: vote
      });

      onVoteSubmitted();
      onClose();
    } catch (error: any) {
      console.error('Error al votar:', error);
      toast.error('Error al enviar el voto: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsVoting(false);
    }
  };

  const sortedResults = game.results ?
    [...game.results].sort((a, b) => a.position - b.position) : [];

  const isProBonus = group?.rule_set === 'pro_bonus';

  // Find the player(s) with most minigames won (Minigame King)
  const maxMinigames = Math.max(...(game.results?.map(r => r.minigames_won) || [0]));
  const hasMinigameKing = maxMinigames > 0;

  // Get map information
  const mapInfo = game.map?.name ? getMapInfo(game.map.name) : null;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Partida {game.id?.slice(0, 8)}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
              disabled={isVoting}
            >
              ×
            </button>
          </div>

        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Left Column - Map Image (35%) */}
            <div className="lg:w-[35%] flex flex-col items-center flex-shrink-0">
              <div className="w-full">
                {game.map?.name && getMapImageUrl(game.map.name) ? (
                  <div className="relative">
                    <img
                      src={getMapImageUrl(game.map.name)!}
                      alt={game.map.name}
                      className="w-full h-64 object-cover object-center rounded-lg shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg"></div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">{game.map?.name || 'Mapa'}</span>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <h3 className="text-2xl font-mario text-gray-800 mb-2">{game.map?.name}</h3>

                  {mapInfo && (
                    <>
                      <div className="flex items-center justify-center mb-3">
                        <span className="text-yellow-500 text-xl font-semibold" title={`Dificultad: ${mapInfo.difficulty}/5`}>
                          {renderDifficultyStars(mapInfo.difficulty)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 italic px-2 mb-3">
                        {mapInfo.description}
                      </p>
                    </>
                  )}

                  <p className="text-sm text-gray-500 font-medium">{formatGameDate(game.played_at)}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Results Table (65%) */}
            <div className="lg:w-[65%] flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-xl font-mario text-gray-800">Resultados de la Partida</h3>
                {game.status !== 'pending' && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    game.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {game.status === 'approved' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Aprobada</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Rechazada</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                {sortedResults.map((result) => (
                  <div key={result.player_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      {/* Avatar and Position */}
                      <div className="flex-shrink-0 w-12">
                        <div className="relative w-12 h-12">
                          <div className={`w-12 h-12 rounded-full p-0.5 ${
                            result.position === 1 ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600' :
                            result.position === 2 ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500' :
                            result.position === 3 ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700' :
                            'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600'
                          }`}>
                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
                              {result.player?.is_cpu ? (
                                result.player.cpu_avatar ? (
                                  <img
                                    src={getCharacterImage(result.player.cpu_avatar)}
                                    alt={result.player.cpu_name || 'CPU'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg">🤖</span>
                                )
                              ) : result.player?.profile?.profile_picture ? (
                                <img
                                  src={getCharacterImage(result.player.profile.profile_picture)}
                                  alt={result.player?.profile?.nickname || 'Usuario'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-500 text-sm">👤</span>
                              )}
                            </div>
                          </div>

                          {/* Position indicator */}
                          <div className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white ${
                            result.position === 1 ? 'bg-yellow-600' :
                            result.position === 2 ? 'bg-gray-500' :
                            result.position === 3 ? 'bg-orange-700' :
                            'bg-gray-600'
                          }`}>
                            {result.position}
                          </div>

                          {/* Vote status indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white ${
                            result.player?.is_cpu
                              ? 'bg-purple-500'
                              : (() => {
                                  const userVote = game.approvals?.find(approval => approval.voter_id === result.player_id);
                                  if (!userVote) return 'bg-gray-400';
                                  return userVote.vote === 'approve' ? 'bg-green-500' : 'bg-red-500';
                                })()
                          }`}>
                            {result.player?.is_cpu
                              ? <Minus className="w-3 h-3" />
                              : (() => {
                                  const userVote = game.approvals?.find(approval => approval.voter_id === result.player_id);
                                  if (!userVote) return <Clock className="w-3 h-3" />;
                                  return userVote.vote === 'approve' ? '✓' : '✗';
                                })()
                            }
                          </div>
                        </div>

                        {/* Player Name */}
                        <h3 className="font-semibold text-sm mt-2 text-center">
                          {result.player?.is_cpu
                            ? result.player.cpu_name
                            : (result.player?.profile?.nickname || 'Usuario sin nombre')
                          }
                        </h3>
                      </div>

                      {/* Stats */}
                      <div className="flex-1">
                        <div className={`grid ${isProBonus ? 'grid-cols-2 divide-x' : 'grid-cols-1'} divide-gray-200`}>
                          {/* Columna 1: Resultados Finales */}
                          <div className={isProBonus ? 'pr-4' : ''}>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Finales</div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <img src="/images/others/MPS_Star.webp" alt="Estrellas" className="w-4 h-4" />
                                  <span className="text-xs text-gray-500">Estrellas</span>
                                </div>
                                <span className="font-bold text-sm">{result.stars}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <img src="/images/others/NSMBDS_Coin_Artwork.webp" alt="Monedas" className="w-4 h-4" />
                                  <span className="text-xs text-gray-500">Monedas</span>
                                </div>
                                <span className="font-bold text-sm">{result.coins}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-base">🎮</span>
                                  <span className="text-xs text-gray-500">Minijuegos</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {isProBonus && hasMinigameKing && result.minigames_won === maxMinigames && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                      +1 pt
                                    </span>
                                  )}
                                  <span className="font-bold text-sm">{result.minigames_won}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-base">🏆</span>
                                  <span className="text-xs text-gray-500">Puntos</span>
                                </div>
                                <span className="font-bold text-sm text-blue-600">{result.league_points}</span>
                              </div>
                            </div>
                          </div>

                          {/* Columna 2: Estadísticas Ganadas (solo ProBonus) */}
                          {isProBonus && (
                            <div className="pl-4">
                              <div className="text-xs font-semibold text-purple-600 mb-2">Obtenidas</div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <img src="/images/others/MPS_Star.webp" alt="Estrellas" className="w-4 h-4" />
                                    <span className="text-xs text-gray-500">Estrellas</span>
                                  </div>
                                  <span className="font-bold text-sm text-purple-600">{result.total_stars_earned || 0}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <img src="/images/others/NSMBDS_Coin_Artwork.webp" alt="Monedas" className="w-4 h-4" />
                                    <span className="text-xs text-gray-500">Monedas</span>
                                  </div>
                                  <span className="font-bold text-sm text-purple-600">{result.total_coins_earned || 0}</span>
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
          </div>
        </div>

        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-lg">
          {game.status === 'pending' ? (
            <>
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isVoting}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleVote('reject')}
                  disabled={isVoting || hasUserVoted}
                  className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isVoting ? (
                    'Votando...'
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Rechazar</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleVote('approve')}
                  disabled={isVoting || hasUserVoted}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isVoting ? (
                    'Votando...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Aprobar</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-3 text-center text-sm text-gray-500">
                Se necesitan 2 votos para aprobar o rechazar una partida
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="primary"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}