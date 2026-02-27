export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;


  nickname?: string;
  profilePicture?: string;
  birthDate?: string;
  nationality?: string;
  favoriteMinigame?: string;
  bio?: string;
  profileCompleted?: boolean;
}


export interface Map {
  id: string;
  name: string;
  game_version: string;
  is_active: boolean;
  created_at: string;
}

export type RuleSet = 'classic' | 'pro_bonus';
export type LeagueStatus = 'active' | 'finalized';

export interface Group {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  invite_code: string;
  is_public: boolean;
  max_members: number;
  rule_set?: RuleSet;
  league_status?: LeagueStatus;
  created_at: string;
  updated_at: string;
  creator?: User;
  members: GroupMember[];
  games: Game[];
}

export interface LeagueBonus {
  id: string;
  group_id: string;
  player_id: string;
  bonus_type: 'king_of_victories' | 'king_of_stars' | 'king_of_coins';
  bonus_points: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id?: string;
  is_cpu: boolean;
  cpu_name?: string;
  cpu_avatar?: string;
  joined_at: string;
  status: 'active' | 'pending' | 'left';
  user?: User;
  profile?: {
    nickname?: string;
    profile_picture?: string;
    nationality?: string;
  };
}

export interface Game {
  id: string;
  group_id: string;
  map_id: string;
  played_at: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  game_number: number;
  created_at: string;
  updated_at: string;
  map?: Map;
  results: GameResult[];
  approvals: GameApproval[];
}

export interface GameResult {
  id: string;
  game_id: string;
  player_id: string;
  position: number;
  league_points: number;


  stars: number;
  coins: number;
  minigames_won: number;
  showdown_wins: number;
  items_bought: number;
  items_used: number;
  spaces_traveled: number;
  reactions_used: number;

  // ProBonus tracking - total earned during game
  total_stars_earned: number;
  total_coins_earned: number;

  blue_spaces: number;
  red_spaces: number;
  lucky_spaces: number;
  unlucky_spaces: number;
  item_spaces: number;
  bowser_spaces: number;
  event_spaces: number;
  vs_spaces: number;

  created_at: string;
  player?: GroupMember;
}

export interface GameApproval {
  id: string;
  game_id: string;
  voter_id: string;
  vote: 'approve' | 'reject';
  voted_at: string;
  voter?: GroupMember;
}


export interface Score {
  id: string;
  gameId: string;
  userId: string;
  points: number;
  winner: boolean;
  user: User;
  game: Game;
}

export interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  is_cpu: boolean;
  profile_picture?: string;


  total_league_points: number;
  games_won: number;
  games_played: number;


  total_stars: number;
  total_coins: number;
  total_minigames_won: number;
  total_showdown_wins: number;
  total_items_bought: number;
  total_items_used: number;
  total_spaces_traveled: number;
  total_reactions_used: number;
  total_blue_spaces: number;
  total_red_spaces: number;
  total_lucky_spaces: number;
  total_unlucky_spaces: number;
  total_item_spaces: number;
  total_bowser_spaces: number;
  total_event_spaces: number;
  total_vs_spaces: number;
}


export interface CreateGroupRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  max_members?: number;
  rule_set?: RuleSet;
}

export interface JoinGroupRequest {
  invite_code: string;
}

export interface AddCPUMemberRequest {
  group_id: string;
  cpu_name: string;
  cpu_avatar?: string;
}

export interface CreateGameRequest {
  group_id: string;
  map_id: string;
  played_at: string;
  results: CreateGameResultRequest[];
}

export interface CreateGameResultRequest {
  player_id: string;
  position: number;
  stars: number;
  coins: number;
  minigames_won: number;
  showdown_wins: number;
  items_bought: number;
  items_used: number;
  spaces_traveled: number;
  reactions_used: number;
  total_stars_earned: number;
  total_coins_earned: number;
  minigame_bonus: number;
  blue_spaces: number;
  red_spaces: number;
  lucky_spaces: number;
  unlucky_spaces: number;
  item_spaces: number;
  bowser_spaces: number;
  event_spaces: number;
  vs_spaces: number;
}

export interface VoteGameRequest {
  game_id: string;
  vote: 'approve' | 'reject';
}


export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface AddMemberRequest {
  userId: string;
}

export interface CreateScoreRequest {
  gameId: string;
  userId: string;
  points: number;
  winner?: boolean;
}