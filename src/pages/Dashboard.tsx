import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../app/store/useAuthStore';
import { useGroupsStore } from '../app/store/useGroupsStore';
import { WarioLoader, MemberAvatars } from '../shared/components/ui';
import { supabaseAPI } from '../shared/services/supabase';

export default function Dashboard() {
  const { session, user } = useAuthStore();
  const { groups, isLoading, error, loadGroups, removeGroup } = useGroupsStore();
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'finalized'>('active');

  const isAuthenticated = !!session && !!user;

  const getLastGameDate = (games: any[]) => {
    if (!games || games.length === 0) return null;
    const sortedGames = games
      .filter(game => game.status === 'approved')
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
    return sortedGames.length > 0 ? sortedGames[0].played_at : null;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const gameDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - gameDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      if (diffInHours < 1) return 'hace menos de 1h';
      return `hace ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return 'hace 1 día';
      if (diffInDays < 7) return `hace ${diffInDays} días`;
      if (diffInDays < 30) return `hace ${Math.floor(diffInDays / 7)} sem`;
      return `hace ${Math.floor(diffInDays / 30)} mes`;
    }
  };

  const deleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el grupo "${groupName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await supabaseAPI.deleteGroup(groupId);
      removeGroup(groupId);
      toast.success('Grupo eliminado exitosamente');
    } catch (error: any) {
      console.error('Error al eliminar grupo:', error);
      toast.error('Error al eliminar el grupo: ' + (error.message || 'Error desconocido'));
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadGroups();
    }
  }, [isAuthenticated, user, loadGroups]);

  useEffect(() => {
    if (error && (error.includes('auth') || error.includes('JWT') || error.includes('session'))) {
      console.log('🔄 Auth error detected, redirecting to login');
      toast.error('Sesión expirada. Redirigiendo...');
      navigate('/auth');
      return;
    }

    if (error) {
      toast.error('Error al cargar los grupos: ' + error);
    }
  }, [error, navigate]);


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-mario text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
        </div>
        <Link
          to="/groups/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 sm:w-auto"
        >
          <span className="text-lg">+</span>
          <span>Crear Nuevo Grupo</span>
        </Link>
      </div>

      <div>

        {isLoading ? (
          <WarioLoader text="Cargando grupos..." size="md" />
        ) : groups.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="mb-4 flex justify-center">
              <img
                src="/images/others/boo.webp"
                alt="Boo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              No tienes grupos todavía
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Crea tu primera Mario Party League para empezar a competir
            </p>
          </div>
        ) : (
          <div>
            {(() => {
              const activeGroups = groups.filter(g => g.league_status !== 'finalized');
              const finalizedGroups = groups.filter(g => g.league_status === 'finalized');
              const displayGroups = activeTab === 'active' ? activeGroups : finalizedGroups;

              const renderGroupCard = (group: typeof groups[0]) => {
                const lastGameDate = getLastGameDate(group.games || []);
                const isGroupFull = (group.members?.length || 0) >= group.max_members;
                const approvedGamesCount = group.games?.filter(g => g.status === 'approved').length || 0;

                return (
                  <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="p-6 text-center">
                      {/* Header with title, badge and menu */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-mario text-gray-900 dark:text-gray-100 flex-1">
                          {group.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {group.rule_set === 'pro_bonus' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              ProBonus
                            </span>
                          )}
                          {group.league_status === 'finalized' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Finalizada
                            </span>
                          )}
                          {isGroupFull && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {group.members?.length}/{group.max_members}
                            </span>
                          )}

                          {/* Menu de tres puntos */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === group.id ? null : group.id);
                              }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {openMenuId === group.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      deleteGroup(group.id, group.name);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Eliminar grupo</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Logo centrado */}
                      <div className="flex justify-center mb-4">
                        <img
                          src="/images/others/mpj.webp"
                          alt="Mario Party"
                          className="w-36 h-36 object-contain"
                        />
                      </div>

                      {/* Descripción centrada */}
                      {group.description && (
                        <div className="mb-4">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {group.description}
                          </p>
                        </div>
                      )}

                      {/* Activity indicator */}
                      {lastGameDate && (
                        <div className="mb-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            🎮 Última partida {formatTimeAgo(lastGameDate)}
                          </span>
                        </div>
                      )}

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Miembros:</span>
                          <div className="flex items-center space-x-2">
                            {group.members && group.members.length > 0 ? (
                              <MemberAvatars members={group.members} maxDisplay={4} size="sm" />
                            ) : (
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                0/{group.max_members}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Partidas:</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
                            {approvedGamesCount}
                          </span>
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                        >
                          Ver Grupo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div>
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                      onClick={() => setActiveTab('active')}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'active'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      Activas ({activeGroups.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('finalized')}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'finalized'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      Finalizadas ({finalizedGroups.length})
                    </button>
                  </div>

                  {/* Content */}
                  {displayGroups.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                      <div className="mb-4 flex justify-center">
                        <img
                          src="/images/others/boo.webp"
                          alt="Boo"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        No hay ligas {activeTab === 'active' ? 'activas' : 'finalizadas'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {activeTab === 'active'
                          ? 'Crea una nueva liga o únete a una existente'
                          : 'Aún no has finalizado ninguna liga'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayGroups.map(renderGroupCard)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}