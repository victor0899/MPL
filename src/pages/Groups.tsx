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
      loadGroups();
    } catch (error: any) {
      console.error('Error al eliminar grupo:', error);
      toast.error('Error al eliminar el grupo: ' + (error.message || 'Error desconocido'));
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-gray-800 dark:text-gray-100">Cargando...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Cargando grupos...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              No tienes grupos todavía
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
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
              <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
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

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Miembros:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {group.members?.length || 0}/{group.max_members}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Partidas:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {group.games?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Código de Invitación
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
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

      </div>
    </div>
  );
}