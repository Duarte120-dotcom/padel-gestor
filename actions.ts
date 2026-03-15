// src/lib/actions.ts
// Server Actions: toda la lógica que toca la base de datos
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { calculateGroupDistribution, distributeTeamsIntoGroups, generateRoundRobinFixture } from './tournament-logic/groups'
import { generateBracket, slotsToMatches } from './tournament-logic/bracket'
import type { SetScore } from './supabase/types'

// =============================================
// TORNEOS
// =============================================

export async function createTournament(data: {
  name: string; date: string; venue: string; description?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({ ...data, created_by: user.id, status: 'draft' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  return tournament
}

export async function updateTournamentStatus(id: string, status: string) {
  const supabase = createClient()
  const { error } = await supabase.from('tournaments').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments/${id}`)
}

// =============================================
// CATEGORÍAS
// =============================================

export async function createCategory(data: {
  tournament_id: string; name: string
  preferred_group_size?: number; qualifiers_per_group?: number
  sets_per_match?: number; has_super_tiebreak?: boolean
}) {
  const supabase = createClient()
  const { data: category, error } = await supabase
    .from('tournament_categories')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments/${data.tournament_id}`)
  return category
}

export async function updateCategory(id: string, data: Partial<{
  name: string; qualifiers_per_group: number
  sets_per_match: number; has_super_tiebreak: boolean
}>) {
  const supabase = createClient()
  const { data: cat, error } = await supabase
    .from('tournament_categories')
    .update(data)
    .eq('id', id)
    .select('tournament_id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments/${cat.tournament_id}/categories/${id}`)
}

// =============================================
// JUGADORES Y PAREJAS
// =============================================

export async function createOrFindPlayer(data: {
  first_name: string; last_name: string; phone?: string; notes?: string
}) {
  const supabase = createClient()

  // Buscar si ya existe (mismo nombre y apellido)
  const { data: existing } = await supabase
    .from('players')
    .select()
    .ilike('first_name', data.first_name)
    .ilike('last_name', data.last_name)
    .maybeSingle()

  if (existing) return existing

  const { data: player, error } = await supabase.from('players').insert(data).select().single()
  if (error) throw new Error(error.message)
  return player
}

export async function createTeam(data: {
  tournament_category_id: string
  player1_first: string; player1_last: string
  player2_first: string; player2_last: string
  player1_phone?: string; player2_phone?: string
}) {
  const supabase = createClient()

  const p1 = await createOrFindPlayer({
    first_name: data.player1_first, last_name: data.player1_last, phone: data.player1_phone
  })
  const p2 = await createOrFindPlayer({
    first_name: data.player2_first, last_name: data.player2_last, phone: data.player2_phone
  })

  // Validar que no exista la misma pareja en esta categoría
  const { data: existing } = await supabase
    .from('teams')
    .select()
    .eq('tournament_category_id', data.tournament_category_id)
    .or(`and(player1_id.eq.${p1.id},player2_id.eq.${p2.id}),and(player1_id.eq.${p2.id},player2_id.eq.${p1.id})`)
    .maybeSingle()

  if (existing) throw new Error('Esta pareja ya está inscripta en la categoría')

  const teamName = `${data.player1_last} / ${data.player2_last}`

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ tournament_category_id: data.tournament_category_id, player1_id: p1.id, player2_id: p2.id, name: teamName })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments`)
  return team
}

export async function deleteTeam(teamId: string, categoryId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments`)
}

// =============================================
// GENERACIÓN DE GRUPOS
// =============================================

export async function generateGroups(categoryId: string) {
  const supabase = createClient()

  // Verificar que no haya grupos confirmados
  const { data: cat } = await supabase
    .from('tournament_categories')
    .select()
    .eq('id', categoryId)
    .single()

  if (!cat) throw new Error('Categoría no encontrada')
  if (cat.groups_confirmed) throw new Error('Los grupos ya fueron confirmados')

  // Obtener todas las parejas de la categoría
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_category_id', categoryId)
    .eq('status', 'confirmed')

  if (!teams || teams.length < 3) throw new Error('Se necesitan al menos 3 parejas confirmadas')

  const teamIds = teams.map(t => t.id)
  const distribution = calculateGroupDistribution(teamIds.length)
  const groupedTeams = distributeTeamsIntoGroups(teamIds, distribution)

  // Eliminar grupos anteriores (si existían sin confirmar)
  await supabase.from('groups').delete().eq('tournament_category_id', categoryId)

  // Crear grupos y partidos
  const groupNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  for (let i = 0; i < groupedTeams.length; i++) {
    // Crear el grupo
    const { data: group, error: gError } = await supabase
      .from('groups')
      .insert({ tournament_category_id: categoryId, name: `Grupo ${groupNames[i]}`, draw_order: i })
      .select()
      .single()

    if (gError || !group) throw new Error(gError?.message ?? 'Error creando grupo')

    // Asignar parejas al grupo
    await supabase.from('group_teams').insert(
      groupedTeams[i].map((teamId, pos) => ({
        group_id: group.id,
        team_id: teamId,
        seed_position: pos + 1,
      }))
    )

    // Generar fixture round-robin
    const fixtures = generateRoundRobinFixture(groupedTeams[i])
    await supabase.from('matches').insert(
      fixtures.map(([t1, t2]) => ({
        tournament_category_id: categoryId,
        phase_type: 'group' as const,
        group_id: group.id,
        team1_id: t1,
        team2_id: t2,
        status: 'pending' as const,
      }))
    )
  }

  // Actualizar estado de la categoría
  await supabase.from('tournament_categories').update({ status: 'groups' }).eq('id', categoryId)

  revalidatePath(`/dashboard/tournaments`)
  return { distribution, groupCount: groupedTeams.length }
}

export async function confirmGroups(categoryId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tournament_categories')
    .update({ groups_confirmed: true })
    .eq('id', categoryId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments`)
}

// =============================================
// RESULTADOS
// =============================================

export async function saveMatchResult(matchId: string, data: {
  winnerId: string
  sets: SetScore[]
  isWalkover: boolean
}) {
  const supabase = createClient()

  const { error } = await supabase
    .from('matches')
    .update({
      winner_id: data.winnerId,
      sets_score: data.sets as any,
      is_walkover: data.isWalkover,
      status: data.isWalkover ? 'walkover' : 'played',
    })
    .eq('id', matchId)

  if (error) throw new Error(error.message)

  // Si es partido de llave, actualizar el siguiente partido
  const { data: match } = await supabase
    .from('matches')
    .select('bracket_round, bracket_position, tournament_category_id, phase_type')
    .eq('id', matchId)
    .single()

  if (match?.phase_type === 'bracket' && match.bracket_round && match.bracket_round > 1) {
    const nextRound = match.bracket_round / 2
    const nextPosition = Math.ceil(match.bracket_position! / 2)
    const isFirstSlot = match.bracket_position! % 2 !== 0

    const updateField = isFirstSlot ? 'team1_id' : 'team2_id'

    await supabase
      .from('matches')
      .update({ [updateField]: data.winnerId })
      .eq('tournament_category_id', match.tournament_category_id)
      .eq('phase_type', 'bracket')
      .eq('bracket_round', nextRound)
      .eq('bracket_position', nextPosition)
  }

  revalidatePath(`/dashboard/tournaments`)
}

// =============================================
// GENERACIÓN DE LLAVE
// =============================================

export async function generateBracketForCategory(categoryId: string) {
  const supabase = createClient()

  const { data: cat } = await supabase
    .from('tournament_categories')
    .select()
    .eq('id', categoryId)
    .single()

  if (!cat) throw new Error('Categoría no encontrada')
  if (cat.bracket_confirmed) throw new Error('La llave ya fue confirmada')

  // Obtener standings de todos los grupos
  const { data: standings } = await supabase
    .from('group_standings')
    .select('*, groups!inner(tournament_category_id)')
    .eq('groups.tournament_category_id', categoryId)
    .order('points', { ascending: false })
    .order('games_for', { ascending: false })

  if (!standings) throw new Error('No hay resultados cargados')

  // Obtener grupos de esta categoría
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('tournament_category_id', categoryId)
    .order('draw_order')

  if (!groups) throw new Error('No hay grupos generados')

  // Construir lista de clasificados ordenados por rank dentro de cada grupo
  const qualified = []
  for (const group of groups) {
    const groupStandings = standings
      .filter(s => s.group_id === group.id)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        const diffA = a.games_for - a.games_against
        const diffB = b.games_for - b.games_against
        if (diffB !== diffA) return diffB - diffA
        return b.games_for - a.games_for
      })

    for (let rank = 0; rank < cat.qualifiers_per_group; rank++) {
      if (groupStandings[rank]) {
        qualified.push({
          teamId: groupStandings[rank].team_id,
          groupId: group.id,
          groupName: group.name,
          rank: rank + 1,
        })
      }
    }
  }

  if (qualified.length < 2) throw new Error('Se necesitan al menos 2 clasificados')

  // Eliminar partidos de llave anteriores si los hay
  await supabase
    .from('matches')
    .delete()
    .eq('tournament_category_id', categoryId)
    .eq('phase_type', 'bracket')

  // Generar llave
  const slots = generateBracket(qualified)
  const matchesToInsert = slotsToMatches(slots, categoryId)

  const { error } = await supabase.from('matches').insert(matchesToInsert)
  if (error) throw new Error(error.message)

  // Actualizar estado
  await supabase
    .from('tournament_categories')
    .update({ status: 'bracket' })
    .eq('id', categoryId)

  revalidatePath(`/dashboard/tournaments`)
  return { totalQualified: qualified.length, slotsGenerated: slots.length }
}

export async function confirmBracket(categoryId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tournament_categories')
    .update({ bracket_confirmed: true })
    .eq('id', categoryId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments`)
}
