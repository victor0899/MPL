import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, CheckCircle, XCircle, Clock, Goal, Eye, Gamepad2, ChartLine, Trophy, TrendingUpDown, Target, Coins, User, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveBump } from '@nivo/bump';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import toast from 'react-hot-toast';
import { Button, GameApprovalModal, AddCPUModal, ConfirmModal } from '../shared/components';
import { WarioLoader, CountryFlag } from '../shared/components/ui';
import { supabaseAPI } from '../shared/services/supabase';
import { useAuthStore } from '../app/store/useAuthStore';
import { formatGameDate } from '../shared/utils/dateFormat';
import { getCharacterImage } from '../shared/utils/characters';
import { DEFAULT_COUNTRY } from '../shared/utils/countries';
import { getMapImageUrl, getMapInfo } from '../shared/utils/maps';
import type { Group, Game, LeaderboardEntry, GroupMember } from '../shared/types/api';

// Component for live countdown timer
function LastVictoryCounter({ lastVictoryDate, mapName, mapInfo }: { lastVictoryDate: string; mapName: string; mapInfo: any }) {
  const [timeElapsed, setTimeElapsed] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const victoryTime = new Date(lastVictoryDate).getTime();
      const diff = now - victoryTime;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeElapsed(`${days}|${hours}|${minutes}|${seconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastVictoryDate]);

  const [days, hours, minutes, seconds] = timeElapsed.split('|');

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-2">
      {/* Map Info Above */}
      <div className="mb-4 text-center">
        <p className="text-xs text-gray-500">{mapName}</p>
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 w-full max-w-md">
        {/* Top Left: Días */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 shadow-sm">
          <div className="text-5xl font-bold text-red-600">{days}</div>
          <div className="text-sm text-gray-600 mt-2">Días</div>
        </div>

        {/* Top Right: Horas */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 shadow-sm">
          <div className="text-5xl font-bold text-orange-600">{hours}</div>
          <div className="text-sm text-gray-600 mt-2">Horas</div>
        </div>

        {/* Bottom Left: Minutos */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 shadow-sm">
          <div className="text-5xl font-bold text-yellow-600">{minutes}</div>
          <div className="text-sm text-gray-600 mt-2">Minutos</div>
        </div>

        {/* Bottom Right: Segundos */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 shadow-sm">
          <div className="text-5xl font-bold text-green-600">{seconds}</div>
          <div className="text-sm text-gray-600 mt-2">Segundos</div>
        </div>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCPUModal, setShowAddCPUModal] = useState(false);
  const [isAddingCPU, setIsAddingCPU] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [approvedGamesWithResults, setApprovedGamesWithResults] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'statistics'>('leaderboard');
  const [statsMode, setStatsMode] = useState<'general' | 'personal'>('general');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showCloseLeagueModal, setShowCloseLeagueModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();



  const calculateLeaderboard = (members: GroupMember[], games: Game[]): LeaderboardEntry[] => {
    const playerStats: { [playerId: string]: LeaderboardEntry } = {};

    members.forEach(member => {
      playerStats[member.id] = {
        player_id: member.id,
        player_name: member.is_cpu ? member.cpu_name! : (member.profile?.nickname || 'Usuario sin nombre'),
        is_cpu: member.is_cpu,
        profile_picture: member.is_cpu ? member.cpu_avatar : member.profile?.profile_picture || undefined,
        total_league_points: 0,
        games_won: 0,
        games_played: 0,
        total_stars: 0,
        total_coins: 0,
        total_minigames_won: 0,
        total_showdown_wins: 0,
        total_items_bought: 0,
        total_items_used: 0,
        total_spaces_traveled: 0,
        total_reactions_used: 0,
        total_blue_spaces: 0,
        total_red_spaces: 0,
        total_lucky_spaces: 0,
        total_unlucky_spaces: 0,
        total_item_spaces: 0,
        total_bowser_spaces: 0,
        total_event_spaces: 0,
        total_vs_spaces: 0,
      };
    });

    games.forEach(game => {
      if (game.results) {
        game.results.forEach(result => {
          const stats = playerStats[result.player_id];
          if (stats) {
            // Use league_points calculated by backend
            stats.total_league_points += result.league_points;

            if (result.position === 1) {
              stats.games_won += 1;
            }

            stats.games_played += 1;

            stats.total_stars += result.stars;
            stats.total_coins += result.coins;
            stats.total_minigames_won += result.minigames_won;
            stats.total_showdown_wins += result.showdown_wins;
            stats.total_items_bought += result.items_bought || 0;
            stats.total_items_used += result.items_used || 0;
            stats.total_spaces_traveled += result.spaces_traveled || 0;
            stats.total_reactions_used += result.reactions_used || 0;
            stats.total_blue_spaces += result.blue_spaces || 0;
            stats.total_red_spaces += result.red_spaces || 0;
            stats.total_lucky_spaces += result.lucky_spaces || 0;
            stats.total_unlucky_spaces += result.unlucky_spaces || 0;
            stats.total_item_spaces += result.item_spaces || 0;
            stats.total_bowser_spaces += result.bowser_spaces || 0;
            stats.total_event_spaces += result.event_spaces || 0;
            stats.total_vs_spaces += result.vs_spaces || 0;
          }
        });
      }
    });

    const leaderboard = Object.values(playerStats)
      .filter(stats => stats.games_played > 0)
      .sort((a, b) => {
        if (a.total_league_points !== b.total_league_points) {
          return b.total_league_points - a.total_league_points;
        }
        if (a.total_stars !== b.total_stars) {
          return b.total_stars - a.total_stars;
        }
        if (a.total_coins !== b.total_coins) {
          return b.total_coins - a.total_coins;
        }
        if (a.total_minigames_won !== b.total_minigames_won) {
          return b.total_minigames_won - a.total_minigames_won;
        }
        return b.total_showdown_wins - a.total_showdown_wins;
      });

    return leaderboard;
  };

  const isAutoApproved = (game: Game): boolean => {
    if (!group || game.status !== 'approved') return false;
    const humanMembers = group.members.filter(m => !m.is_cpu && m.status === 'active');
    return humanMembers.length === 1;
  };


  useEffect(() => {
    if (id) {
      loadGroup();
    }
  }, [id]);

  const loadGroup = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const groupData = await supabaseAPI.getGroup(id);
      setGroup(groupData);

      const approvedGames = await supabaseAPI.getGroupGames(id, 'approved');
      const bonuses = await supabaseAPI.getLeagueBonuses(id);

      // Store approved games with results for charts
      setApprovedGamesWithResults(approvedGames);

      const leaderboardData = calculateLeaderboard(groupData.members, approvedGames);

      // Add bonuses to leaderboard if league is finalized
      if (groupData.league_status === 'finalized' && bonuses.length > 0) {
        bonuses.forEach((bonus: any) => {
          const playerStats = leaderboardData.find(p => p.player_id === bonus.player_id);
          if (playerStats) {
            playerStats.total_league_points += bonus.bonus_points;
          }
        });

        // Re-sort after adding bonuses
        leaderboardData.sort((a, b) => {
          if (a.total_league_points !== b.total_league_points) {
            return b.total_league_points - a.total_league_points;
          }
          if (a.total_stars !== b.total_stars) {
            return b.total_stars - a.total_stars;
          }
          return b.total_coins - a.total_coins;
        });
      }

      setLeaderboard(leaderboardData);
    } catch (error: any) {
      console.error('Error al cargar grupo:', error);
      toast.error('Error al cargar el grupo');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const addCPUMember = async (cpuName: string, cpuAvatar: string) => {
    if (!id || !cpuName.trim()) return;

    setIsAddingCPU(true);
    try {
      await supabaseAPI.addCPUMember({
        group_id: id,
        cpu_name: cpuName.trim(),
        cpu_avatar: cpuAvatar,
      });

      toast.success(`CPU "${cpuName}" agregado exitosamente`);
      setShowAddCPUModal(false);
      loadGroup();
    } catch (error: any) {
      console.error('Error al agregar CPU:', error);
      toast.error('Error al agregar CPU: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsAddingCPU(false);
    }
  };

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.invite_code);
      toast.success(`Código de invitación copiado: ${group.invite_code}`);
    }
  };

  const copyInviteLink = () => {
    if (group) {
      const inviteLink = `${window.location.origin}/groups/join/${group.invite_code}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success('Enlace de invitación copiado al portapapeles');
    }
  };

  const handleGameClick = async (game: Game) => {
    try {
      const fullGame = await supabaseAPI.getGameDetails(game.id);
      setSelectedGame(fullGame);
      setShowApprovalModal(true);
    } catch (error) {
      console.error('Error al cargar detalles del juego:', error);
      toast.error('Error al cargar los detalles de la partida');
    }
  };

  const handleModalClose = () => {
    setShowApprovalModal(false);
    setSelectedGame(null);
  };

  const handleVoteSubmitted = () => {
    setTimeout(() => {
      loadGroup();
    }, 500);
  };

  const handleCloseLeague = async () => {
    if (!group || !id) return;

    const isProBonus = group.rule_set === 'pro_bonus';

    setIsFinalizing(true);
    try {
      const result = await supabaseAPI.closeLeague(id);

      if (isProBonus && Array.isArray(result)) {
        // Resultado de ProBonus con bonos
        let message = '¡Liga finalizada! Bonos otorgados:\n';
        result.forEach((bonus: any) => {
          const bonusName = bonus.b_type === 'king_of_victories' ? 'Rey de Victorias' :
                           bonus.b_type === 'king_of_stars' ? 'Rey de Estrellas' : 'Rey de Monedas';
          message += `\n${bonusName}: ${bonus.p_name} (+${bonus.b_points} pts)`;
        });
        toast.success(message);
      } else {
        // Resultado de liga clásica
        toast.success('¡Liga cerrada exitosamente! No se podrán agregar más partidas.');
      }

      await loadGroup(); // Recargar para ver el nuevo estado
      setShowCloseLeagueModal(false);
    } catch (error: any) {
      console.error('Error al cerrar liga:', error);
      toast.error(error.message || 'Error al cerrar la liga');
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!user) {
    return <WarioLoader text="Cargando..." size="md" fullScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <WarioLoader text="Cargando grupo..." size="md" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Grupo no encontrado</h2>
            <Link to="/groups">
              <Button variant="primary">Volver a Mis Grupos</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isGroupFull = (group.members?.length || 0) >= group.max_members;
  const humanMembers = group.members?.filter(m => !m.is_cpu) || [];
  const cpuMembers = group.members?.filter(m => m.is_cpu) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
        </div>

        {/* Group Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div>
            <h1 className="text-2xl font-mario text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-600 mt-1">{group.description}</p>
            )}
            <div className="mt-2">
              {group.rule_set === 'pro_bonus' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  🏆 ProBonus
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  ⭐ Clásico
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">
                Inicio: {new Date(group.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            <div className="bg-white rounded-lg shadow-md p-6 flex-1 flex flex-col">
              <h2 className="text-xl font-mario text-gray-800 mb-4">
                Miembros ({group.members?.length || 0}/{group.max_members})
              </h2>

              <div className="space-y-3">
                {humanMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                      {member.profile?.profile_picture ? (
                        <img
                          src={getCharacterImage(member.profile.profile_picture)}
                          alt={member.profile.nickname || 'Usuario'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {member.profile?.nickname || 'Usuario sin nombre'}
                        </span>
                        <div className="flex items-center">
                          <CountryFlag
                            countryCode={member.profile?.nationality || DEFAULT_COUNTRY.code}
                            size="profile"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {cpuMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center">
                      {member.cpu_avatar ? (
                        <img
                          src={getCharacterImage(member.cpu_avatar)}
                          alt={member.cpu_name || 'CPU'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white">🤖</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{member.cpu_name}</span>
                        <div className="flex items-center">
                          <CountryFlag
                            countryCode={DEFAULT_COUNTRY.code}
                            size="profile"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-purple-600">CPU Player</div>
                    </div>
                  </div>
                ))}

                {Array.from({ length: group.max_members - (group.members?.length || 0) }).map((_, index) => (
                  <div key={`empty-${index}`} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-500">
                      ?
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-gray-500">Slot disponible</div>
                    </div>
                  </div>
                ))}
              </div>

              {!isGroupFull && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAddCPUModal(true)}
                  >
                    🤖 Agregar CPU
                  </Button>
                </div>
              )}
            </div>

            {!isGroupFull && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-mario text-gray-800 mb-4">
                  Invitar Jugadores
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Invitación
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-lg font-mono bg-gray-100 px-3 py-2 rounded border">
                        {group.invite_code}
                      </code>
                      <button
                        onClick={copyInviteCode}
                        className="text-blue-600 hover:text-blue-700 p-2"
                        title="Copiar código"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={copyInviteLink}
                    >
                      📤 Copiar Enlace de Invitación
                    </Button>

                    <div className="text-xs text-gray-500 text-center">
                      Comparte este enlace con tus amigos para que se unan
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[400px] flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <h2 className="text-xl font-mario text-gray-800">
                  Partidas Recientes
                </h2>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Botón Finalizar Liga - Solo visible en desktop */}
                  {group.league_status === 'active' && user?.id === group.creator_id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowCloseLeagueModal(true)}
                      className="hidden sm:flex items-center justify-center space-x-2"
                    >
                      <Goal className="w-4 h-4" />
                      <span>{group.rule_set === 'pro_bonus' ? 'Finalizar Liga' : 'Cerrar Liga'}</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/games/new?group=${group.id}`)}
                    disabled={!isGroupFull || group.league_status === 'finalized'}
                    className="flex items-center justify-center space-x-2"
                  >
                    <span>+</span>
                    <span>Nueva Partida</span>
                  </Button>
                </div>
              </div>

              {group.league_status === 'finalized' && (
                <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded">
                  <p className="text-sm text-yellow-700">
                    <strong>Liga finalizada.</strong> No se pueden agregar más partidas.
                  </p>
                </div>
              )}

              {!group.games || group.games.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 flex justify-center">
                      <img
                        src="/images/others/wawa1.webp"
                        alt="Wawa"
                        className="w-64 h-64 object-contain"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                      No hay partidas registradas
                    </h3>
                    <p className="text-gray-600">
                      {!isGroupFull
                        ? `Necesitas ${group.max_members - (group.members?.length || 0)} jugador(es) más para empezar a jugar`
                        : 'Las partidas aparecerán aquí una vez que se registren'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                  {group.games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleGameClick(game)}
                    >
                      <div>
                        <div className="font-medium text-gray-800 flex items-center gap-1.5">
                          <Gamepad2 className="w-4 h-4" />
                          <span>Partida {game.id?.slice(0, 8)}</span>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatGameDate(game.played_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`p-2 rounded-full ${
                            game.status === 'approved' ? 'bg-green-100 text-green-800' :
                            game.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                          title={
                            game.status === 'approved'
                              ? (isAutoApproved(game) ? 'Auto-aprobada por ser el único jugador humano en el grupo' : 'Aprobada')
                              : game.status === 'rejected'
                              ? 'Rechazada'
                              : 'Pendiente'
                          }
                        >
                          {game.status === 'approved' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : game.status === 'rejected' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          {game.status === 'pending' ? (
                            'Haz clic para votar'
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Ver detalles</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón Finalizar Liga - Solo visible en móvil, debajo de la tabla */}
              {group.league_status === 'active' && user?.id === group.creator_id && (
                <div className="mt-4 sm:hidden">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCloseLeagueModal(true)}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Goal className="w-4 h-4" />
                    <span>{group.rule_set === 'pro_bonus' ? 'Finalizar Liga' : 'Cerrar Liga'}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {leaderboard.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'leaderboard'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Tabla de Posiciones</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('statistics')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'statistics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <ChartLine className="w-4 h-4" />
                      <span>Estadísticas</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'leaderboard' && (
                <>
                  <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jugador
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Puntos
                      </th>
                      {group?.rule_set !== 'pro_bonus' && (
                        <>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Victorias
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-center space-x-1">
                              <img src="/images/others/MPS_Star.webp" alt="Estrella" className="w-4 h-4" />
                              <span>Estrellas</span>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-center space-x-1">
                              <img src="/images/others/NSMBDS_Coin_Artwork.webp" alt="Moneda" className="w-4 h-4" />
                              <span>Monedas</span>
                            </div>
                          </th>
                        </>
                      )}
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partidas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.player_id} className={`
                        ${index === 0 ? 'bg-yellow-50' : ''}
                        ${index === 1 ? 'bg-gray-50' : ''}
                        ${index === 2 ? 'bg-orange-50' : ''}
                        hover:bg-blue-50 transition-colors
                      `}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <span className="text-4xl font-mario text-gray-800">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs overflow-hidden ${
                                entry.is_cpu ? 'bg-purple-500' : 'bg-blue-500'
                              }`}>
                                {entry.profile_picture ? (
                                  <img
                                    src={getCharacterImage(entry.profile_picture)}
                                    alt={entry.player_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : entry.is_cpu ? (
                                  <span className="text-white">🤖</span>
                                ) : (
                                  index + 1
                                )}
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {entry.player_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {entry.is_cpu ? 'CPU Player' : 'Jugador'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {entry.total_league_points}
                          </div>
                        </td>
                        {group?.rule_set !== 'pro_bonus' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">
                                {entry.games_won}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">
                                {entry.total_stars}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">
                                {entry.total_coins}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {entry.games_played}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </>
              )}

              {/* Statistics Tab */}
              {activeTab === 'statistics' && (
                <div className="p-6">
                  {/* Stats Mode Navigation */}
                  <div className="mb-6 flex items-center justify-between">
                    <button
                      onClick={() => setStatsMode('general')}
                      disabled={statsMode === 'general'}
                      className={`p-2 rounded-full transition-colors ${
                        statsMode === 'general'
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3">
                      {statsMode === 'general' ? (
                        <>
                          <ChartLine className="w-6 h-6 text-blue-600" />
                          <h3 className="text-2xl font-bold text-gray-800">Estadísticas Generales</h3>
                        </>
                      ) : (
                        <>
                          <User className="w-6 h-6 text-purple-600" />
                          <h3 className="text-2xl font-bold text-gray-800">Estadísticas Personales</h3>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setStatsMode('personal')}
                      disabled={statsMode === 'personal'}
                      className={`p-2 rounded-full transition-colors ${
                        statsMode === 'personal'
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  {/* General Statistics */}
                  {statsMode === 'general' && (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Row 1 - Victory Statistics */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                        <h4 className="text-lg font-semibold text-gray-800">
                          Victorias
                        </h4>
                      </div>

                      {/* Nivo Bar Chart */}
                      <div className="h-64">
                        {leaderboard.length > 0 ? (() => {
                          const chartData = leaderboard.slice(0, 6).map((entry, index) => ({
                            player: entry.player_name.length > 10
                              ? entry.player_name.substring(0, 10) + '...'
                              : entry.player_name,
                            fullName: entry.player_name,
                            victories: entry.games_won,
                            position: index + 1
                          }));

                          const maxVictories = Math.max(...chartData.map(d => d.victories));
                          const tickValues = Array.from({ length: maxVictories + 1 }, (_, i) => i);

                          return (
                            <ResponsiveBar
                              data={chartData}
                              keys={['victories']}
                              indexBy="player"
                              margin={{ top: 20, right: 20, bottom: 50, left: 40 }}
                              padding={0.4}
                              valueScale={{ type: 'linear' }}
                              colors={({ data }) => {
                                const pos = data.position as number;
                                return pos === 1 ? '#eab308' :
                                       pos === 2 ? '#9ca3af' :
                                       pos === 3 ? '#ea580c' :
                                       '#3b82f6';
                              }}
                              borderRadius={4}
                              axisTop={null}
                              axisRight={null}
                              axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: -45,
                                legend: '',
                                legendPosition: 'middle',
                                legendOffset: 32
                              }}
                              axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Victorias',
                                legendPosition: 'middle',
                                legendOffset: -35,
                                tickValues: tickValues
                              }}
                              labelSkipWidth={12}
                              labelSkipHeight={12}
                              labelTextColor="#ffffff"
                              legends={[]}
                              tooltip={({ data }) => (
                                <div className="bg-white px-3 py-2 shadow-lg rounded border border-gray-200">
                                  <strong className="text-gray-800">{data.fullName}</strong>
                                  <div className="text-sm text-gray-600">
                                    Victorias: <strong>{data.victories}</strong>
                                  </div>
                                </div>
                              )}
                              animate={true}
                              motionConfig="gentle"
                            />
                          );
                        })() : null}
                        {leaderboard.length === 0 && (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <span className="text-4xl block mb-2">📊</span>
                              <p className="text-sm">No hay datos disponibles</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Bump Chart - Evolución de Posiciones */}
                    <div className="col-span-2 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <TrendingUpDown className="w-6 h-6 mr-2 text-blue-500" />
                        <h4 className="text-lg font-semibold text-gray-800">
                          Evolución de Posiciones
                        </h4>
                      </div>

                      <div className="h-64">
                        {(() => {
                          // Use approved games with results from state
                          const approvedGames = approvedGamesWithResults
                            .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

                          if (approvedGames.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <TrendingUpDown className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">No hay suficientes partidas para mostrar evolución</p>
                                </div>
                              </div>
                            );
                          }

                          // Process data for bump chart
                          const playerData: { [key: string]: { name: string; positions: number[] } } = {};

                          // Initialize all players
                          leaderboard.forEach(entry => {
                            playerData[entry.player_id] = {
                              name: entry.player_name,
                              positions: []
                            };
                          });

                          // Fill positions for each game
                          approvedGames.forEach(game => {
                            const gameResults = game.results?.sort((a, b) => a.position - b.position) || [];
                            gameResults.forEach(result => {
                              if (playerData[result.player_id]) {
                                playerData[result.player_id].positions.push(result.position);
                              }
                            });
                          });

                          // Convert to Nivo Bump format
                          const bumpData = Object.entries(playerData)
                            .filter(([_, data]) => data.positions.length > 0)
                            .map(([_playerId, data]) => ({
                              id: data.name.length > 12 ? data.name.substring(0, 12) + '...' : data.name,
                              data: data.positions.map((position, index) => ({
                                x: index + 1,
                                y: position
                              }))
                            }));

                          if (bumpData.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <TrendingUpDown className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">No hay datos disponibles</p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <ResponsiveBump
                              data={bumpData}
                              margin={{ top: 40, right: 120, bottom: 40, left: 60 }}
                              colors={{ scheme: 'category10' }}
                              lineWidth={3}
                              activeLineWidth={6}
                              inactiveLineWidth={3}
                              inactiveOpacity={0.15}
                              pointSize={10}
                              activePointSize={16}
                              inactivePointSize={0}
                              pointColor={{ theme: 'background' }}
                              pointBorderWidth={3}
                              activePointBorderWidth={3}
                              pointBorderColor={{ from: 'serie.color' }}
                              axisTop={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: '',
                                legendPosition: 'middle',
                                legendOffset: -36
                              }}
                              axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Partida',
                                legendPosition: 'middle',
                                legendOffset: 32
                              }}
                              axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Posición',
                                legendPosition: 'middle',
                                legendOffset: -40
                              }}
                              axisRight={null}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Row 2 - Average Minigames for Bonus */}
                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                      <div className="flex items-center justify-center mb-3">
                        <Target className="w-6 h-6 mr-2 text-green-500" />
                        <h4 className="text-lg font-semibold text-gray-800">
                          Bono de Minijuegos
                        </h4>
                      </div>
                      {(() => {
                        const gamesWithResults = approvedGamesWithResults.filter(g => g.results && g.results.length > 0);

                        if (gamesWithResults.length === 0) {
                          return (
                            <div className="text-center">
                              <div className="text-3xl text-gray-400 mb-2">--</div>
                              <p className="text-xs text-gray-500">Sin datos</p>
                            </div>
                          );
                        }

                        // Calculate max minigames won in each game
                        const maxMinigamesPerGame = gamesWithResults.map(game => {
                          const maxMinigames = Math.max(...(game.results?.map(r => r.minigames_won) || [0]));
                          return maxMinigames;
                        }).filter(max => max > 0);

                        if (maxMinigamesPerGame.length === 0) {
                          return (
                            <div className="text-center">
                              <div className="text-3xl text-gray-400 mb-2">--</div>
                              <p className="text-xs text-gray-500">Sin datos</p>
                            </div>
                          );
                        }

                        const average = maxMinigamesPerGame.reduce((sum, val) => sum + val, 0) / maxMinigamesPerGame.length;

                        return (
                          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                            <div className="text-8xl font-bold text-green-600 mb-6">
                              {average.toFixed(1)}
                            </div>
                            <p className="text-sm text-gray-600 text-center px-4 max-w-xs">
                              Promedio de minijuegos necesarios para ganar el bono
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Total Coins Earned per Game */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <Coins className="w-6 h-6 mr-2 text-yellow-500" />
                        <h4 className="text-lg font-semibold text-gray-800">
                          Monedas Obtenidas por Partida
                        </h4>
                      </div>

                      <div className="h-64">
                        {(() => {
                          const gamesWithResults = approvedGamesWithResults
                            .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

                          if (gamesWithResults.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <Coins className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">No hay datos disponibles</p>
                                </div>
                              </div>
                            );
                          }

                          // Calculate total coins earned per game (sum of all 4 players)
                          const lineData = [{
                            id: 'Monedas Totales',
                            data: gamesWithResults.map((game, index) => {
                              const totalCoinsEarned = game.results?.reduce((sum, result) => {
                                return sum + (result.total_coins_earned || 0);
                              }, 0) || 0;

                              return {
                                x: `P${index + 1}`,
                                y: totalCoinsEarned
                              };
                            })
                          }];

                          return (
                            <ResponsiveLine
                              data={lineData}
                              margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                              xScale={{ type: 'point' }}
                              yScale={{
                                type: 'linear',
                                min: 0,
                                max: 'auto'
                              }}
                              curve="linear"
                              axisTop={null}
                              axisRight={null}
                              axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Partida',
                                legendOffset: 36,
                                legendPosition: 'middle'
                              }}
                              axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Monedas Totales',
                                legendOffset: -50,
                                legendPosition: 'middle',
                                format: (value) => Math.floor(value)
                              }}
                              colors={{ scheme: 'category10' }}
                              pointSize={10}
                              pointColor={{ theme: 'background' }}
                              pointBorderWidth={2}
                              pointBorderColor={{ from: 'serieColor' }}
                              useMesh={true}
                              enableArea={true}
                              areaOpacity={0.2}
                              legends={[]}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                      <div className="mb-3">
                        <span className="text-3xl">🏅</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Estadística 6
                      </h4>
                      <p className="text-sm text-gray-600">
                        Placeholder para estadística
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Personal Statistics */}
                  {statsMode === 'personal' && (
                    <div className="grid grid-cols-3 gap-6">
                      {/* Row 1 - Personal Coins Chart */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <div className="flex items-center mb-4">
                          <Coins className="w-6 h-6 mr-2 text-yellow-500" />
                          <h4 className="text-lg font-semibold text-gray-800">
                            Mis Monedas por Partida
                          </h4>
                        </div>

                        <div className="h-64">
                          {(() => {
                            // Get user's member ID
                            const userMember = group?.members?.find(m => m.user_id === user?.id);
                            if (!userMember) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Coins className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No eres miembro de este grupo</p>
                                  </div>
                                </div>
                              );
                            }

                            const gamesWithResults = approvedGamesWithResults
                              .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

                            if (gamesWithResults.length === 0) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Coins className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No hay datos disponibles</p>
                                  </div>
                                </div>
                              );
                            }

                            // Filter results for current user
                            const userCoinsData = {
                              earned: [] as Array<{ x: string; y: number }>,
                              final: [] as Array<{ x: string; y: number }>
                            };

                            gamesWithResults.forEach((game, index) => {
                              const userResult = game.results?.find(r => r.player_id === userMember.id);
                              if (userResult) {
                                userCoinsData.earned.push({
                                  x: `P${index + 1}`,
                                  y: userResult.total_coins_earned || 0
                                });
                                userCoinsData.final.push({
                                  x: `P${index + 1}`,
                                  y: userResult.coins || 0
                                });
                              }
                            });

                            if (userCoinsData.earned.length === 0) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Coins className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No has participado en partidas</p>
                                  </div>
                                </div>
                              );
                            }

                            const lineData = [
                              {
                                id: 'Obtenidas',
                                data: userCoinsData.earned
                              },
                              {
                                id: 'Finales',
                                data: userCoinsData.final
                              }
                            ];

                            return (
                              <ResponsiveLine
                                data={lineData}
                                margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
                                xScale={{ type: 'point' }}
                                yScale={{
                                  type: 'linear',
                                  min: 0,
                                  max: 'auto'
                                }}
                                curve="monotoneX"
                                axisTop={null}
                                axisRight={null}
                                axisBottom={{
                                  tickSize: 5,
                                  tickPadding: 5,
                                  tickRotation: 0,
                                  legend: 'Partida',
                                  legendOffset: 36,
                                  legendPosition: 'middle'
                                }}
                                axisLeft={{
                                  tickSize: 5,
                                  tickPadding: 5,
                                  tickRotation: 0,
                                  legend: 'Monedas',
                                  legendOffset: -50,
                                  legendPosition: 'middle',
                                  format: (value) => Math.floor(value)
                                }}
                                colors={['#f59e0b', '#10b981']}
                                pointSize={8}
                                pointColor={{ theme: 'background' }}
                                pointBorderWidth={2}
                                pointBorderColor={{ from: 'serieColor' }}
                                useMesh={true}
                                legends={[
                                  {
                                    anchor: 'bottom-right',
                                    direction: 'column',
                                    justify: false,
                                    translateX: 100,
                                    translateY: 0,
                                    itemsSpacing: 0,
                                    itemDirection: 'left-to-right',
                                    itemWidth: 80,
                                    itemHeight: 20,
                                    itemOpacity: 0.75,
                                    symbolSize: 12,
                                    symbolShape: 'circle',
                                    symbolBorderColor: 'rgba(0, 0, 0, .5)',
                                    effects: [
                                      {
                                        on: 'hover',
                                        style: {
                                          itemBackground: 'rgba(0, 0, 0, .03)',
                                          itemOpacity: 1
                                        }
                                      }
                                    ]
                                  }
                                ]}
                              />
                            );
                          })()}
                        </div>
                      </div>

                      {/* Personal Stars Chart */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <div className="flex items-center mb-4">
                          <Star className="w-6 h-6 mr-2 text-yellow-500" />
                          <h4 className="text-lg font-semibold text-gray-800">
                            Mis Estrellas por Partida
                          </h4>
                        </div>

                        <div className="h-64">
                          {(() => {
                            // Get user's member ID
                            const userMember = group?.members?.find(m => m.user_id === user?.id);
                            if (!userMember) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Star className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No eres miembro de este grupo</p>
                                  </div>
                                </div>
                              );
                            }

                            const gamesWithResults = approvedGamesWithResults
                              .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

                            if (gamesWithResults.length === 0) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Star className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No hay datos disponibles</p>
                                  </div>
                                </div>
                              );
                            }

                            // Filter results for current user
                            const userStarsData = {
                              earned: [] as Array<{ x: string; y: number }>,
                              final: [] as Array<{ x: string; y: number }>
                            };

                            gamesWithResults.forEach((game, index) => {
                              const userResult = game.results?.find(r => r.player_id === userMember.id);
                              if (userResult) {
                                userStarsData.earned.push({
                                  x: `P${index + 1}`,
                                  y: userResult.total_stars_earned || 0
                                });
                                userStarsData.final.push({
                                  x: `P${index + 1}`,
                                  y: userResult.stars || 0
                                });
                              }
                            });

                            if (userStarsData.earned.length === 0) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Star className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No has participado en partidas</p>
                                  </div>
                                </div>
                              );
                            }

                            const lineData = [
                              {
                                id: 'Obtenidas',
                                data: userStarsData.earned
                              },
                              {
                                id: 'Finales',
                                data: userStarsData.final
                              }
                            ];

                            return (
                              <ResponsiveLine
                                data={lineData}
                                margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
                                xScale={{ type: 'point' }}
                                yScale={{
                                  type: 'linear',
                                  min: 0,
                                  max: 'auto'
                                }}
                                curve="monotoneX"
                                axisTop={null}
                                axisRight={null}
                                axisBottom={{
                                  tickSize: 5,
                                  tickPadding: 5,
                                  tickRotation: 0,
                                  legend: 'Partida',
                                  legendOffset: 36,
                                  legendPosition: 'middle'
                                }}
                                axisLeft={{
                                  tickSize: 5,
                                  tickPadding: 5,
                                  tickRotation: 0,
                                  legend: 'Estrellas',
                                  legendOffset: -50,
                                  legendPosition: 'middle',
                                  format: (value) => Math.floor(value)
                                }}
                                colors={['#fbbf24', '#ef4444']}
                                pointSize={8}
                                pointColor={{ theme: 'background' }}
                                pointBorderWidth={2}
                                pointBorderColor={{ from: 'serieColor' }}
                                useMesh={true}
                                legends={[
                                  {
                                    anchor: 'bottom-right',
                                    direction: 'column',
                                    justify: false,
                                    translateX: 100,
                                    translateY: 0,
                                    itemsSpacing: 0,
                                    itemDirection: 'left-to-right',
                                    itemWidth: 80,
                                    itemHeight: 20,
                                    itemOpacity: 0.75,
                                    symbolSize: 12,
                                    symbolShape: 'circle',
                                    symbolBorderColor: 'rgba(0, 0, 0, .5)',
                                    effects: [
                                      {
                                        on: 'hover',
                                        style: {
                                          itemBackground: 'rgba(0, 0, 0, .03)',
                                          itemOpacity: 1
                                        }
                                      }
                                    ]
                                  }
                                ]}
                              />
                            );
                          })()}
                        </div>
                      </div>

                      {/* Position Distribution Pie Chart */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <div className="flex items-center mb-4">
                          <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                          <h4 className="text-lg font-semibold text-gray-800">
                            Distribución de Posiciones
                          </h4>
                        </div>

                        <div className="h-64">
                          {(() => {
                            // Get user's member ID
                            const userMember = group?.members?.find(m => m.user_id === user?.id);
                            if (!userMember) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Trophy className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No eres miembro de este grupo</p>
                                  </div>
                                </div>
                              );
                            }

                            const gamesWithResults = approvedGamesWithResults
                              .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

                            if (gamesWithResults.length === 0) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Trophy className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No hay datos disponibles</p>
                                  </div>
                                </div>
                              );
                            }

                            // Count positions
                            const positionCount = {
                              1: 0,
                              2: 0,
                              3: 0,
                              4: 0
                            };

                            gamesWithResults.forEach((game) => {
                              const userResult = game.results?.find(r => r.player_id === userMember.id);
                              if (userResult && userResult.position >= 1 && userResult.position <= 4) {
                                positionCount[userResult.position as 1 | 2 | 3 | 4]++;
                              }
                            });

                            const totalGames = Object.values(positionCount).reduce((a, b) => a + b, 0);

                            if (totalGames === 0) {
                              return (
                                <div className="h-full flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <Trophy className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No has participado en partidas</p>
                                  </div>
                                </div>
                              );
                            }

                            const pieData = [
                              {
                                id: '1° Lugar',
                                label: '1° Lugar',
                                value: positionCount[1],
                                color: '#eab308'
                              },
                              {
                                id: '2° Lugar',
                                label: '2° Lugar',
                                value: positionCount[2],
                                color: '#9ca3af'
                              },
                              {
                                id: '3° Lugar',
                                label: '3° Lugar',
                                value: positionCount[3],
                                color: '#ea580c'
                              },
                              {
                                id: '4° Lugar',
                                label: '4° Lugar',
                                value: positionCount[4],
                                color: '#6b7280'
                              }
                            ].filter(item => item.value > 0);

                            return (
                              <ResponsivePie
                                data={pieData}
                                margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
                                innerRadius={0.5}
                                padAngle={0.7}
                                cornerRadius={3}
                                activeOuterRadiusOffset={8}
                                colors={{ datum: 'data.color' }}
                                borderWidth={1}
                                borderColor={{
                                  from: 'color',
                                  modifiers: [['darker', 0.2]]
                                }}
                                arcLinkLabelsSkipAngle={10}
                                arcLinkLabelsTextColor="#333333"
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsColor={{ from: 'color' }}
                                arcLabelsSkipAngle={10}
                                arcLabelsTextColor={{
                                  from: 'color',
                                  modifiers: [['darker', 2]]
                                }}
                                arcLabel={(d) => `${((d.value / totalGames) * 100).toFixed(0)}%`}
                                legends={[
                                  {
                                    anchor: 'bottom',
                                    direction: 'row',
                                    justify: false,
                                    translateX: 0,
                                    translateY: 40,
                                    itemsSpacing: 0,
                                    itemWidth: 70,
                                    itemHeight: 18,
                                    itemTextColor: '#999',
                                    itemDirection: 'left-to-right',
                                    itemOpacity: 1,
                                    symbolSize: 12,
                                    symbolShape: 'circle',
                                    effects: [
                                      {
                                        on: 'hover',
                                        style: {
                                          itemTextColor: '#000'
                                        }
                                      }
                                    ]
                                  }
                                ]}
                              />
                            );
                          })()}
                        </div>
                      </div>

                      {/* Row 2 - Personal Minigame Bonus */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-center mb-3">
                          <Target className="w-6 h-6 mr-2 text-green-500" />
                          <h4 className="text-lg font-semibold text-gray-800">
                            Mi Bono de Minijuegos
                          </h4>
                        </div>
                        {(() => {
                          // Get user's member ID
                          const userMember = group?.members?.find(m => m.user_id === user?.id);
                          if (!userMember) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                <div className="text-8xl font-bold text-gray-400 mb-6">--</div>
                                <p className="text-sm text-gray-600 text-center px-4 max-w-xs">No eres miembro del grupo</p>
                              </div>
                            );
                          }

                          const gamesWithResults = approvedGamesWithResults.filter(g => g.results && g.results.length > 0);

                          if (gamesWithResults.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                <div className="text-8xl font-bold text-gray-400 mb-6">--</div>
                                <p className="text-sm text-gray-600 text-center px-4 max-w-xs">Sin datos</p>
                              </div>
                            );
                          }

                          // Find games where user won the most minigames
                          const userMinigameWins: number[] = [];

                          gamesWithResults.forEach(game => {
                            const maxMinigames = Math.max(...(game.results?.map(r => r.minigames_won) || [0]));
                            const userResult = game.results?.find(r => r.player_id === userMember.id);

                            if (userResult && maxMinigames > 0 && userResult.minigames_won === maxMinigames) {
                              userMinigameWins.push(userResult.minigames_won);
                            }
                          });

                          if (userMinigameWins.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                <div className="text-8xl font-bold text-gray-400 mb-6">0</div>
                                <p className="text-sm text-gray-600 text-center px-4 max-w-xs">Veces que has ganado el bono</p>
                              </div>
                            );
                          }

                          const average = userMinigameWins.reduce((sum, val) => sum + val, 0) / userMinigameWins.length;

                          return (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                              <div className="text-8xl font-bold text-green-600 mb-6">
                                {average.toFixed(1)}
                              </div>
                              <p className="text-sm text-gray-600 text-center px-4 max-w-xs">
                                Promedio de minijuegos cuando gané el bono
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Last Victory Timer */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-center mb-3">
                          <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                          <h4 className="text-lg font-semibold text-gray-800">
                            Última Victoria
                          </h4>
                        </div>
                        {(() => {
                          // Get user's member ID
                          const userMember = group?.members?.find(m => m.user_id === user?.id);
                          if (!userMember) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                <div className="text-8xl font-bold text-gray-400 mb-6">--</div>
                                <p className="text-sm text-gray-600 text-center px-4 max-w-xs">No eres miembro del grupo</p>
                              </div>
                            );
                          }

                          const gamesWithResults = approvedGamesWithResults.filter(g => g.results && g.results.length > 0);

                          if (gamesWithResults.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                <div className="text-4xl text-gray-400 mb-2">🏆</div>
                                <p className="text-sm text-gray-600 text-center px-4 max-w-xs">Sin datos</p>
                              </div>
                            );
                          }

                          // Find last victory
                          const victories = gamesWithResults
                            .filter(game => {
                              const userResult = game.results?.find(r => r.player_id === userMember.id);
                              return userResult && userResult.position === 1;
                            })
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                          if (victories.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                <div className="text-8xl font-bold text-red-400 mb-6">∞</div>
                                <p className="text-sm text-gray-600 text-center px-4 max-w-xs">Aún no tienes victorias</p>
                              </div>
                            );
                          }

                          const lastVictory = victories[0];
                          const mapInfo = lastVictory.map?.name ? getMapInfo(lastVictory.map.name) : null;

                          return (
                            <LastVictoryCounter
                              lastVictoryDate={lastVictory.created_at}
                              mapName={lastVictory.map?.name || 'Mapa desconocido'}
                              mapInfo={mapInfo}
                            />
                          );
                        })()}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                        <div className="mb-3">
                          <span className="text-3xl">🏅</span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Estadística Personal 6
                        </h4>
                        <p className="text-sm text-gray-600">
                          Placeholder para estadística
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <GameApprovalModal
        game={selectedGame}
        isOpen={showApprovalModal}
        onClose={handleModalClose}
        onVoteSubmitted={handleVoteSubmitted}
        group={group || undefined}
      />

      <AddCPUModal
        isOpen={showAddCPUModal}
        onClose={() => setShowAddCPUModal(false)}
        onAdd={addCPUMember}
        isLoading={isAddingCPU}
      />

      <ConfirmModal
        isOpen={showCloseLeagueModal}
        onClose={() => setShowCloseLeagueModal(false)}
        onConfirm={handleCloseLeague}
        title={group?.rule_set === 'pro_bonus' ? 'Finalizar Liga' : 'Cerrar Liga'}
        message={
          group?.rule_set === 'pro_bonus'
            ? `¿Estás seguro de que quieres finalizar la liga "${group?.name}"?\n\nSe calcularán los bonos finales:\n- Rey de Victorias: +3 pts\n- Rey de Estrellas: +1 pt\n- Rey de Monedas: +1 pt\n\nEsta acción no se puede deshacer.`
            : `¿Estás seguro de que quieres cerrar la liga "${group?.name}"?\n\nNo se podrán agregar más partidas después de cerrar la liga.\n\nEsta acción no se puede deshacer.`
        }
        confirmText={group?.rule_set === 'pro_bonus' ? 'Finalizar Liga' : 'Cerrar Liga'}
        cancelText="Cancelar"
        isLoading={isFinalizing}
        type="warning"
      />
    </div>
  );
}