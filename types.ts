// src/lib/supabase/types.ts
// Tipos TypeScript que reflejan el schema de la base de datos

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; role: 'admin' | 'collaborator'; created_at: string }
        Insert: { id: string; full_name: string; role?: 'admin' | 'collaborator' }
        Update: { full_name?: string; role?: 'admin' | 'collaborator' }
      }
      tournaments: {
        Row: {
          id: string; name: string; date: string; venue: string
          description: string | null; status: TournamentStatus
          created_by: string | null; created_at: string; updated_at: string
        }
        Insert: { name: string; date: string; venue: string; description?: string; status?: TournamentStatus; created_by?: string }
        Update: { name?: string; date?: string; venue?: string; description?: string; status?: TournamentStatus }
      }
      tournament_categories: {
        Row: {
          id: string; tournament_id: string; name: string
          status: CategoryStatus; preferred_group_size: number
          qualifiers_per_group: number; sets_per_match: number
          has_super_tiebreak: boolean; groups_confirmed: boolean
          bracket_confirmed: boolean; created_at: string
        }
        Insert: { tournament_id: string; name: string; preferred_group_size?: number; qualifiers_per_group?: number; sets_per_match?: number; has_super_tiebreak?: boolean }
        Update: { name?: string; status?: CategoryStatus; qualifiers_per_group?: number; sets_per_match?: number; has_super_tiebreak?: boolean; groups_confirmed?: boolean; bracket_confirmed?: boolean }
      }
      players: {
        Row: { id: string; first_name: string; last_name: string; phone: string | null; notes: string | null; created_at: string }
        Insert: { first_name: string; last_name: string; phone?: string; notes?: string }
        Update: { first_name?: string; last_name?: string; phone?: string; notes?: string }
      }
      teams: {
        Row: { id: string; tournament_category_id: string; player1_id: string; player2_id: string; name: string | null; status: TeamStatus; created_at: string }
        Insert: { tournament_category_id: string; player1_id: string; player2_id: string; name?: string; status?: TeamStatus }
        Update: { name?: string; status?: TeamStatus }
      }
      groups: {
        Row: { id: string; tournament_category_id: string; name: string; draw_order: number; created_at: string }
        Insert: { tournament_category_id: string; name: string; draw_order?: number }
        Update: { name?: string; draw_order?: number }
      }
      group_teams: {
        Row: { id: string; group_id: string; team_id: string; seed_position: number | null }
        Insert: { group_id: string; team_id: string; seed_position?: number }
        Update: { seed_position?: number }
      }
      matches: {
        Row: {
          id: string; tournament_category_id: string; phase_type: PhaseType
          group_id: string | null; bracket_round: number | null; bracket_position: number | null
          source_match1_id: string | null; source_match2_id: string | null
          team1_id: string | null; team2_id: string | null; winner_id: string | null
          sets_score: Json; is_walkover: boolean; status: MatchStatus
          created_at: string; updated_at: string
        }
        Insert: {
          tournament_category_id: string; phase_type: PhaseType
          group_id?: string; bracket_round?: number; bracket_position?: number
          source_match1_id?: string; source_match2_id?: string
          team1_id?: string; team2_id?: string
          status?: MatchStatus
        }
        Update: {
          team1_id?: string; team2_id?: string; winner_id?: string
          sets_score?: Json; is_walkover?: boolean; status?: MatchStatus
        }
      }
    }
    Views: {
      group_standings: {
        Row: {
          group_id: string; team_id: string; team_name: string
          tournament_category_id: string
          played: number; won: number; lost: number
          games_for: number; games_against: number; points: number
        }
      }
    }
    Functions: {
      is_admin: { Returns: boolean }
      is_authenticated: { Returns: boolean }
    }
  }
}

export type TournamentStatus = 'draft' | 'configured' | 'active' | 'finished'
export type CategoryStatus = 'setup' | 'groups' | 'bracket' | 'finished'
export type TeamStatus = 'confirmed' | 'pending' | 'withdrawn'
export type PhaseType = 'group' | 'bracket'
export type MatchStatus = 'pending' | 'played' | 'walkover' | 'suspended' | 'bye'

// Tipos derivados útiles
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type TournamentCategory = Database['public']['Tables']['tournament_categories']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupTeam = Database['public']['Tables']['group_teams']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type GroupStanding = Database['public']['Views']['group_standings']['Row']

export type SetScore = [number, number]
