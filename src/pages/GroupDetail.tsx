import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, CheckCircle, XCircle, Clock, Goal, Eye, Gamepad2, ChartLine } from 'lucide-react';
import { ResponsiveBar } from '@nivo/bar';
import toast from 'react-hot-toast';
import { Button, GameApprovalModal, AddCPUModal, ConfirmModal } from '../shared/components';
import { WarioLoader, CountryFlag } from '../shared/components/ui';
import { supabaseAPI } from '../shared/services/supabase';
import { useAuthStore } from '../app/store/useAuthStore';
import { formatGameDate } from '../shared/utils/dateFormat';
import { getCharacterImage } from '../shared/utils/characters';
import { DEFAULT_COUNTRY } from '../shared/utils/countries';
import type { Group, Game, LeaderboardEntry, GroupMember } from '../shared/types/api';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCPUModal, setShowAddCPUModal] = useState(false);
  const [isAddingCPU, setIsAddingCPU] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'statistics'>('leaderboard');
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

                  <div className="px-6 py-4 bg-gray-50 border-t">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-green-600">
                          {group?.games?.filter(g => g.status === 'approved').length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Partidas Aprobadas</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-yellow-600">
                          {leaderboard.reduce((sum, entry) => sum + entry.total_stars, 0)}
                        </div>
                        <div className="text-xs text-gray-600">Estrellas Totales</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Statistics Tab */}
              {activeTab === 'statistics' && (
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* Row 1 - Victory Statistics */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <span className="text-2xl mr-2">🏆</span>
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

                    <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                      <div className="mb-3">
                        <span className="text-3xl">🎯</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Estadística 2
                      </h4>
                      <p className="text-sm text-gray-600">
                        Placeholder para estadística
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                      <div className="mb-3">
                        <span className="text-3xl">🏆</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Estadística 3
                      </h4>
                      <p className="text-sm text-gray-600">
                        Placeholder para estadística
                      </p>
                    </div>

                    {/* Row 2 */}
                    <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                      <div className="mb-3">
                        <span className="text-3xl">⭐</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Estadística 4
                      </h4>
                      <p className="text-sm text-gray-600">
                        Placeholder para estadística
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                      <div className="mb-3">
                        <span className="text-3xl">🎮</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Estadística 5
                      </h4>
                      <p className="text-sm text-gray-600">
                        Placeholder para estadística
                      </p>
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