import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Container } from '../shared/components';
import { WarioLoader } from '../shared/components/ui';
import { useAuthStore } from '../app/store/useAuthStore';
import { supabaseAPI } from '../shared/services/supabase';
import type { Group } from '../shared/types/api';

export default function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inviteCode && user) {
      loadGroupByInviteCode();
    }
  }, [inviteCode, user]);

  const loadGroupByInviteCode = async () => {
    if (!inviteCode) return;

    setIsLoading(true);
    setError(null);
    try {
      const groupData = await supabaseAPI.getGroupByInviteCode(inviteCode);
      setGroup(groupData);
    } catch (err: any) {
      console.error('Error al cargar grupo:', err);
      setError(err.message || 'No se pudo encontrar el grupo con este código de invitación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!group || !inviteCode) return;

    setIsJoining(true);
    try {
      await supabaseAPI.joinGroup({ invite_code: inviteCode });
      toast.success(`¡Te has unido al grupo "${group.name}"!`);
      navigate(`/groups/${group.id}`);
    } catch (err: any) {
      console.error('Error al unirse al grupo:', err);
      toast.error(err.message || 'Error al unirse al grupo');
    } finally {
      setIsJoining(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Container maxWidth="sm" className="py-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Unirse a Grupo
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Necesitas iniciar sesión para unirte a un grupo
            </p>
            <div className="space-y-3">
              <Link to="/auth">
                <Button variant="primary" size="lg" className="w-full">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Container maxWidth="sm" className="py-16">
          <WarioLoader text="Cargando grupo..." size="md" />
        </Container>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Container maxWidth="sm" className="py-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="mb-4 flex justify-center">
              <img
                src="/images/others/boo.webp"
                alt="Boo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Grupo no encontrado
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {error || 'No se pudo encontrar el grupo con este código de invitación'}
            </p>
            <Link to="/dashboard">
              <Button variant="primary" size="lg" className="w-full">
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const isGroupFull = (group.members?.length || 0) >= group.max_members;
  const isMember = group.members?.some(m => m.user_id === user.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Container maxWidth="sm" className="py-16">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <img
                src="/images/others/mpj.webp"
                alt="Mario Party"
                className="w-32 h-32 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {group.description}
              </p>
            )}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <span>👥</span>
                <span>{group.members?.length || 0}/{group.max_members} miembros</span>
              </div>
              {group.rule_set === 'pro_bonus' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  ProBonus
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            {isMember ? (
              <div className="text-center">
                <p className="text-green-600 mb-4">
                  ✓ Ya eres miembro de este grupo
                </p>
                <Link to={`/groups/${group.id}`}>
                  <Button variant="primary" size="lg" className="w-full">
                    Ver Grupo
                  </Button>
                </Link>
              </div>
            ) : isGroupFull ? (
              <div className="text-center">
                <p className="text-red-600 mb-4">
                  Este grupo está lleno
                </p>
                <Link to="/dashboard">
                  <Button variant="secondary" size="lg" className="w-full">
                    Volver al Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleJoinGroup}
                  isLoading={isJoining}
                  disabled={isJoining}
                  className="w-full"
                >
                  {isJoining ? 'Uniéndose...' : 'Unirse al Grupo'}
                </Button>
                <Link to="/dashboard" className="block">
                  <Button variant="secondary" size="lg" className="w-full">
                    Cancelar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};