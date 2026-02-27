import { supabase } from '../lib/supabase';
import type {
  Group,
  GroupMember,
  Game,
  GameApproval,
  Map,
  LeaderboardEntry,
  CreateGroupRequest,
  JoinGroupRequest,
  AddCPUMemberRequest,
  CreateGameRequest,
  VoteGameRequest,
} from '../types/api';

export class SupabaseAPI {

  async createGroup(data: CreateGroupRequest): Promise<Group> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');


    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        description: data.description,
        is_public: data.is_public ?? false,
        max_members: data.max_members ?? 4,
        rule_set: data.rule_set ?? 'classic',
        creator_id: user.id,
      })
      .select('*')
      .single();

    if (error) throw error;


    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        is_cpu: false,
        status: 'active',
      });

    if (memberError) {
      throw memberError;
    }

    // Fetch the complete group with members and games
    const { data: completeGroup, error: fetchError } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(*),
        games(id, status, played_at)
      `)
      .eq('id', group.id)
      .single();

    if (fetchError) throw fetchError;

    return completeGroup;
  }

  async deleteGroup(groupId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');


    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
      .eq('creator_id', user.id);

    if (error) throw error;
  }

  async getGroup(id: string): Promise<Group> {
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(*),
        games(
          id,
          game_number,
          status,
          played_at,
          map_id,
          approvals:game_approvals(
            vote
          )
        )
      `)
      .eq('id', id)
      .order('game_number', { ascending: false, referencedTable: 'games' })
      .single();

    if (error) {
      console.error('Error in getGroup query:', error);
      throw error;
    }

    // Get profile data for human members (including nationality)
    if (group.members && group.members.length > 0) {
      const humanMemberUserIds = group.members
        .filter((member: any) => !member.is_cpu && member.user_id)
        .map((member: any) => member.user_id);

      if (humanMemberUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nickname, profile_picture, nationality')
          .in('id', humanMemberUserIds);

        if (!profilesError && profiles) {
          group.members = group.members.map((member: any) => {
            if (!member.is_cpu && member.user_id) {
              const profile = profiles.find((p: any) => p.id === member.user_id);
              if (profile) {
                member.profile = {
                  nickname: profile.nickname,
                  profile_picture: profile.profile_picture,
                  nationality: profile.nationality
                };
              }
            }
            return member;
          });
        }
      }
    }

    // Update game statuses based on approvals
    if (group.games && group.games.length > 0) {
      const humanMembers = group.members.filter((m: any) => !m.is_cpu && m.status === 'active');
      const totalHumanMembers = humanMembers.length;

      for (const game of group.games) {
        if (game.status === 'pending' && game.approvals) {
          let newStatus: string | null = null;

          if (totalHumanMembers === 1) {
            newStatus = 'approved';
          } else {
            const approveVotes = game.approvals.filter((a: any) => a.vote === 'approve').length;
            const rejectVotes = game.approvals.filter((a: any) => a.vote === 'reject').length;

            if (approveVotes === 2) {
              newStatus = 'approved';
            } else if (rejectVotes === 2) {
              newStatus = 'rejected';
            }
          }

          // Update the game status in the database if needed
          if (newStatus && game.status !== newStatus) {
            const { error: updateError } = await supabase
              .from('games')
              .update({ status: newStatus })
              .eq('id', game.id);

            if (!updateError) {
              game.status = newStatus; // Update the local object too
            }
          }
        }
      }
    }

    return group;
  }

  async getGroupByInviteCode(inviteCode: string): Promise<Group> {
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(*)
      `)
      .eq('invite_code', inviteCode)
      .single();

    if (error) throw error;
    if (!group) throw new Error('Grupo no encontrado');
    return group;
  }

  async joinGroup(data: JoinGroupRequest): Promise<GroupMember> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');


    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', data.invite_code)
      .single();

    if (groupError) throw groupError;


    const { data: member, error } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        is_cpu: false,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;
    return member;
  }

  async addCPUMember(data: AddCPUMemberRequest): Promise<GroupMember> {
    const { data: member, error } = await supabase
      .from('group_members')
      .insert({
        group_id: data.group_id,
        is_cpu: true,
        cpu_name: data.cpu_name,
        cpu_avatar: data.cpu_avatar,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;
    return member;
  }

  async getUserGroups(): Promise<Group[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');


    const { data: groupMemberships, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (membershipError) throw membershipError;

    if (!groupMemberships || groupMemberships.length === 0) {
      return [];
    }

    const groupIds = groupMemberships.map(membership => membership.group_id);


    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(*),
        games(id, status, played_at)
      `)
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (error) throw error;


    if (groups && groups.length > 0) {
      for (const group of groups) {
        if (group.members && group.members.length > 0) {
          const humanMemberUserIds = group.members
            .filter((member: any) => !member.is_cpu && member.user_id)
            .map((member: any) => member.user_id);

          if (humanMemberUserIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, nickname, profile_picture')
              .in('id', humanMemberUserIds);

            if (!profilesError && profiles) {

              group.members = group.members.map((member: any) => {
                if (!member.is_cpu && member.user_id) {
                  const profile = profiles.find((p: any) => p.id === member.user_id);
                  if (profile) {
                    member.profile = {
                      nickname: profile.nickname,
                      profile_picture: profile.profile_picture
                    };
                  }
                }
                return member;
              });
            }
          }
        }
      }
    }

    return groups || [];
  }


  async getMaps(): Promise<Map[]> {
    const { data: maps, error } = await supabase
      .from('maps')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return maps;
  }


  async createGame(data: CreateGameRequest): Promise<Game> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');


    const { data: groupMembers, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', data.group_id)
      .eq('status', 'active');

    if (membersError) throw membersError;

    const humanMembers = groupMembers.filter(m => !m.is_cpu);
    const isOnlyHumanPlayer = humanMembers.length === 1;


    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        group_id: data.group_id,
        map_id: data.map_id,
        played_at: data.played_at,
        status: isOnlyHumanPlayer ? 'approved' : 'pending',
        submitted_by: user.id,
      })
      .select('*')
      .single();

    if (gameError) throw gameError;


    const gameResults = data.results.map(result => ({
      ...result,
      game_id: game.id,
    }));

    const { error: resultsError } = await supabase
      .from('game_results')
      .insert(gameResults);

    if (resultsError) throw resultsError;


    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', data.group_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError) throw memberError;


    const { error: approvalError } = await supabase
      .from('game_approvals')
      .insert({
        game_id: game.id,
        voter_id: member.id,
        vote: 'approve',
      });

    if (approvalError) throw approvalError;



    return game;
  }

  async voteOnGame(data: VoteGameRequest): Promise<GameApproval> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');


    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('group_id')
      .eq('id', data.game_id)
      .single();

    if (gameError) throw gameError;

    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', game.group_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError) throw memberError;


    const { data: approval, error } = await supabase
      .from('game_approvals')
      .upsert({
        game_id: data.game_id,
        voter_id: member.id,
        vote: data.vote,
      })
      .select('*')
      .single();

    if (error) throw error;


    await this.checkAndUpdateGameStatus(data.game_id);


    return approval;
  }

  private async checkAndUpdateGameStatus(gameId: string): Promise<void> {

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        group_id,
        approvals:game_approvals(*),
        group:group_id(
          members:group_members!inner(*)
        )
      `)
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;


    const humanMembers = game.group.members.filter((m: any) => !m.is_cpu && m.status === 'active');
    const totalHumanMembers = humanMembers.length;

    let newStatus: string | null = null;


    if (totalHumanMembers === 1) {
      newStatus = 'approved';
    } else {

      const approveVotes = game.approvals.filter((a: any) => a.vote === 'approve').length;
      const rejectVotes = game.approvals.filter((a: any) => a.vote === 'reject').length;





      if (approveVotes === 2) {
        newStatus = 'approved';
      } else if (rejectVotes === 2) {
        newStatus = 'rejected';
      }
    }


    if (newStatus && game.status !== newStatus) {
      const { error: updateError } = await supabase
        .from('games')
        .update({ status: newStatus })
        .eq('id', gameId)
        .select();

      if (updateError) {
        throw updateError;
      }
    } else {
    }
  }

  async getGameDetails(gameId: string): Promise<Game> {
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        map:map_id(*),
        results:game_results(
          *,
          player:player_id(*)
        ),
        approvals:game_approvals(
          *,
          voter:voter_id(*)
        )
      `)
      .eq('id', gameId)
      .single();

    if (error) throw error;


    if (game.results && game.results.length > 0) {
      const humanPlayerIds = game.results
        .filter((result: any) => result.player && !result.player.is_cpu && result.player.user_id)
        .map((result: any) => result.player.user_id);

      if (humanPlayerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nickname, profile_picture')
          .in('id', humanPlayerIds);

        if (!profilesError && profiles) {

          game.results = game.results.map((result: any) => {
            if (result.player && !result.player.is_cpu && result.player.user_id) {
              const profile = profiles.find((p: any) => p.id === result.player.user_id);
              if (profile) {
                result.player.profile = {
                  nickname: profile.nickname,
                  profile_picture: profile.profile_picture
                };
              }
            }
            return result;
          });
        }
      }
    }


    if (game.approvals && game.approvals.length > 0) {
      const humanVoterIds = game.approvals
        .filter((approval: any) => approval.voter && !approval.voter.is_cpu && approval.voter.user_id)
        .map((approval: any) => approval.voter.user_id);

      if (humanVoterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nickname, profile_picture')
          .in('id', humanVoterIds);

        if (!profilesError && profiles) {

          game.approvals = game.approvals.map((approval: any) => {
            if (approval.voter && !approval.voter.is_cpu && approval.voter.user_id) {
              const profile = profiles.find((p: any) => p.id === approval.voter.user_id);
              if (profile) {
                approval.voter.profile = {
                  nickname: profile.nickname,
                  profile_picture: profile.profile_picture
                };
              }
            }
            return approval;
          });
        }
      }
    }

    return game;
  }

  async getGroupGames(groupId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<Game[]> {
    let query = supabase
      .from('games')
      .select(`
        *,
        map:map_id(*),
        results:game_results(
          *,
          player:player_id(*)
        ),
        approvals:game_approvals(
          *,
          voter:voter_id(*)
        )
      `)
      .eq('group_id', groupId)
      .order('played_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: games, error } = await query;

    if (error) {
      throw error;
    }


    if (games && games.length > 0) {

      const allHumanPlayerIds = new Set<string>();

      games.forEach(game => {
        if (game.results) {
          game.results.forEach((result: any) => {
            if (result.player && !result.player.is_cpu && result.player.user_id) {
              allHumanPlayerIds.add(result.player.user_id);
            }
          });
        }
        if (game.approvals) {
          game.approvals.forEach((approval: any) => {
            if (approval.voter && !approval.voter.is_cpu && approval.voter.user_id) {
              allHumanPlayerIds.add(approval.voter.user_id);
            }
          });
        }
      });

      if (allHumanPlayerIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nickname, profile_picture')
          .in('id', Array.from(allHumanPlayerIds));

        if (!profilesError && profiles) {

          games.forEach(game => {
            if (game.results) {
              game.results = game.results.map((result: any) => {
                if (result.player && !result.player.is_cpu && result.player.user_id) {
                  const profile = profiles.find((p: any) => p.id === result.player.user_id);
                  if (profile) {
                    result.player.profile = {
                      nickname: profile.nickname,
                      profile_picture: profile.profile_picture
                    };
                  }
                }
                return result;
              });
            }
            if (game.approvals) {
              game.approvals = game.approvals.map((approval: any) => {
                if (approval.voter && !approval.voter.is_cpu && approval.voter.user_id) {
                  const profile = profiles.find((p: any) => p.id === approval.voter.user_id);
                  if (profile) {
                    approval.voter.profile = {
                      nickname: profile.nickname,
                      profile_picture: profile.profile_picture
                    };
                  }
                }
                return approval;
              });
            }
          });
        }
      }
    }

    return games;
  }


  async getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {


    const { data: leaderboard, error } = await supabase
      .rpc('get_group_leaderboard', { group_id: groupId });

    if (error) throw error;
    return leaderboard;
  }


  async searchGroups(query: string): Promise<Group[]> {
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('is_public', true)
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) throw error;
    return groups;
  }

  async finalizeLeague(groupId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('finalize_league', { p_group_id: groupId });

    if (error) throw error;
    return data;
  }

  async closeLeague(groupId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('close_league', { p_group_id: groupId });

    if (error) throw error;
    return data;
  }

  async getLeagueBonuses(groupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('league_bonuses')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw error;
    return data || [];
  }
}

export const supabaseAPI = new SupabaseAPI();