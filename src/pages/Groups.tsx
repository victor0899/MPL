import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../shared/components';
import { supabaseAPI } from '../shared/services/supabase';
import { useAuthStore } from '../app/store/useAuthStore';
import type { Group } from '../shared/types/api';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const userGroups = await supabaseAPI.getUserGroups();
      setGroups(userGroups);
    } catch (error: any) {
      console.error('Error al cargar grupos:', error);
      toast.error('Error al cargar los grupos');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código de invitación copiado: ${code}`);
  };

  const deleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el grupo "${groupName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await supabaseAPI.deleteGroup(groupId);
      toast.success('Grupo eliminado exitosamente');
      loadGroups(); // Reload the groups list
    } catch (error: any) {
      console.error('Error al eliminar grupo:', error);
      toast.error('Error al eliminar el grupo: ' + (error.message || 'Error desconocido'));
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Cargando...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Mis Grupos</h1>
          <div className="flex items-center space-x-4">
            <Link to="/groups/new">
              <Button variant="primary" size="sm">
                Crear Nuevo Grupo
              </Button>
            </Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Cargando grupos...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No tienes grupos todavía
            </h2>
            <p className="text-gray-600 mb-6">
              Crea tu primera Mario Party League para empezar a competir
            </p>
            <Link to="/groups/new">
              <Button variant="primary" size="lg">
                Crear Mi Primera Liga
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Group Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-1">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-gray-600 text-sm">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {group.is_public ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🌐 Público
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          🔒 Privado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Group Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Miembros:</span>
                      <span className="font-medium">
                        {group.members?.length || 0}/{group.max_members}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Partidas:</span>
                      <span className="font-medium">
                        {group.games?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Invite Code */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Código de Invitación
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm font-mono bg-gray-100 px-3 py-2 rounded border">
                        {group.invite_code}
                      </code>
                      <button
                        onClick={() => copyInviteCode(group.invite_code)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        title="Copiar código"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/groups/${group.id}`)}
                    >
                      Ver Grupo
                    </Button>

                    {group.members && group.members.length < group.max_members && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const inviteLink = `${window.location.origin}/groups/join/${group.invite_code}`;
                          navigator.clipboard.writeText(inviteLink);
                          toast.success('Enlace de invitación copiado al portapapeles');
                        }}
                      >
                        Compartir Invitación
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => deleteGroup(group.id, group.name)}
                    >
                      🗑️ Eliminar Grupo
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {groups.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/groups/join">
                <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <h3 className="font-medium text-gray-800">Buscar Grupos</h3>
                  <p className="text-sm text-gray-600">Encuentra grupos públicos</p>
                </div>
              </Link>

              <Link to="/games/new">
                <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                  <div className="text-2xl mb-2">🎮</div>
                  <h3 className="font-medium text-gray-800">Nueva Partida</h3>
                  <p className="text-sm text-gray-600">Registrar resultados</p>
                </div>
              </Link>

              <Link to="/groups/new">
                <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                  <div className="text-2xl mb-2">➕</div>
                  <h3 className="font-medium text-gray-800">Crear Liga</h3>
                  <p className="text-sm text-gray-600">Nueva competencia</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}