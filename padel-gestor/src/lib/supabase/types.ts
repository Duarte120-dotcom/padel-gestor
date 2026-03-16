export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TournamentStatus = 'draft' | 'configured' | 'active' | 'finished'
export type CategoryStatus = 'setup' | 'groups' | 'bracket' | 'finished'
export type TeamStatus = 'confirmed' | 'pending' | 'withdrawn'
export type PhaseType = 'group' | 'bracket'
export type MatchStatus = 'pending' | 'played' | 'walkover' | 'suspended' | 'bye'
export type SetScore = [number, number]

export interface Tournament {
  id: string
  name: string
  date: string
  venue: string
  description: string | null
  status: TournamentStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TournamentCategory {
  id: string
  tournament_id: string
  name: string
  status: CategoryStatus
  preferred_group_size: number
  qualifiers_per_group: number
  sets_per_match: number
  has_super_tiebreak: boolean
  groups_confirmed: boolean
  bracket_confirmed: boolean
  created_at: string
}

export interface Player {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  notes: string | null
  created_at: string
}

export interface Team {
  id: string
  tournament_category_id: string
  player1_id: string
  player2_id: string
  name: string | null
  status: TeamStatus
  created_at: string
}

export interface Group {
  id: string
  tournament_category_id: string
  name: string
  draw_order: number
  created_at: string
}

export interface GroupTeam {
  id: string
  group_id: string
  team_id: string
  seed_position: number | null
}

export interface Match {
  id: string
  tournament_category_id: string
  phase_type: PhaseType
  group_id: string | null
  bracket_round: number | null
  bracket_position: number | null
  source_match1_id: string | null
  source_match2_id: string | null
  team1_id: string | null
  team2_id: string | null
  winner_id: string | null
  sets_score: Json
  is_walkover: boolean
  status: MatchStatus
  created_at: string
  updated_at: string
}

export interface GroupStanding {
  group_id: string
  team_id: string
  team_name: string
  tournament_category_id: string
  played: number
  won: number
  lost: number
  games_for: number
  games_against: number
  points: number
}
