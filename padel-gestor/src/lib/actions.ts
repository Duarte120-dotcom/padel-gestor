'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { calculateGroupDistribution, distributeTeamsIntoGroups, generateRoundRobinFixture } from './tournament-logic/groups'
import { generateBracket, slotsToMatches } from './tournament-logic/bracket'

// ── GRUPOS ────────────────────────────────────────────────

export async function generateGroups(categoryId: string) {
  const supabase = createClient()

  const { data: cat } = await supabase
    .from('tournament_categories').select().eq('id', categoryId).single()
  if (!cat) throw new Error('Categoría no encontrada')
  if (cat.groups_confirmed) throw new Error('Los grupos ya fueron confirmados')

  const { data: teams } = await supabase
    .from('teams').select('id')
    .eq('tournament_category_id', categoryId).eq('status', 'confirmed')
  if (!teams || teams.length < 3) throw new Error('Se necesitan al menos 3 parejas confirmadas')

  const teamIds = teams.map(t => t.id)
  const distribution = calculateGroupDistribution(teamIds.length)
  const groupedTeams = distributeTeamsIntoGroups(teamIds, distribution)

  await supabase.from('groups').delete().eq('tournament_category_id', categoryId)

  const groupNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  for (let i = 0; i < groupedTeams.length; i++) {
    const { data: group, error: gError } = await supabase
      .from('groups')
      .insert({ tournament_category_id: categoryId, name: `Grupo ${groupNames[i]}`, draw_order: i })
      .select().single()
    if (gError || !group) throw new Error(gError?.message ?? 'Error creando grupo')

    await supabase.from('group_teams').insert(
      groupedTeams[i].map((teamId, pos) => ({ group_id: group.id, team_id: teamId, seed_position: pos + 1 }))
    )

    const fixtures = generateRoundRobinFixture(groupedTeams[i])
    await supabase.from('matches').insert(
      fixtures.map(([t1, t2]) => ({
        tournament_category_id: categoryId,
        phase_type: 'group',
        group_id: group.id,
        team1_id: t1,
        team2_id: t2,
        status: 'pending',
      }))
    )
  }

  await supabase.from('tournament_categories').update({ status: 'groups' }).eq('id', categoryId)
  revalidatePath('/dashboard')
  return { distribution, groupCount: groupedTeams.length }
}

export async function confirmGroups(categoryId: string) {
  const supabase = createClient()
  await supabase.from('tournament_categories')
    .update({ groups_confirmed: true }).eq('id', categoryId)
  revalidatePath('/dashboard')
}

// ── RESULTADOS ────────────────────────────────────────────

export async function saveMatchResult(matchId: string, data: {
  winnerId: string
  sets: [number, number][]
  isWalkover: boolean
}) {
  const supabase = createClient()

  await supabase.from('matches').update({
    winner_id: data.winnerId,
    sets_score: data.sets,
    is_walkover: data.isWalkover,
    status: data.isWalkover ? 'walkover' : 'played',
  }).eq('id', matchId)

  // Si es partido de llave, avanzar al ganador
  const { data: match } = await supabase
    .from('matches')
    .select('bracket_round, bracket_position, tournament_category_id, phase_type')
    .eq('id', matchId).single()

  if (match?.phase_type === 'bracket' && match.bracket_round && match.bracket_round > 1) {
    const nextRound = Math.floor(match.bracket_round / 2)
    const nextPosition = Math.ceil((match.bracket_position ?? 1) / 2)
    const isFirstSlot = (match.bracket_position ?? 1) % 2 !== 0
    const updateField = isFirstSlot ? 'team1_id' : 'team2_id'

    await supabase.from('matches').update({ [updateField]: data.winnerId })
      .eq('tournament_category_id', match.tournament_category_id)
      .eq('phase_type', 'bracket')
      .eq('bracket_round', nextRound)
      .eq('bracket_position', nextPosition)
  }

  revalidatePath('/dashboard')
}

// ── LLAVE ─────────────────────────────────────────────────

export async function generateBracketForCategory(categoryId: string) {
  const supabase = createClient()

  const { data: cat } = await supabase
    .from('tournament_categories').select().eq('id', categoryId).single()
  if (!cat) throw new Error('Categoría no encontrada')
  if (cat.bracket_confirmed) throw new Error('La llave ya fue confirmada')

  const { data: groups } = await supabase
    .from('groups').select('id, name')
    .eq('tournament_category_id', categoryId).order('draw_order')
  if (!groups || groups.length === 0) throw new Error('No hay grupos generados')

  // Obtener standings manualmente (sin vista)
  const qualified = []
  for (const group of groups) {
    const { data: groupTeams } = await supabase
      .from('group_teams').select('team_id').eq('group_id', group.id)
    if (!groupTeams) continue

    const teamStats: Record<string, { won: number; gamesFor: number; gamesAgainst: number }> = {}
    for (const gt of groupTeams) {
      teamStats[gt.team_id] = { won: 0, gamesFor: 0, gamesAgainst: 0 }
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('team1_id, team2_id, winner_id, sets_score')
      .eq('group_id', group.id)
      .eq('status', 'played')

    for (const m of matches ?? []) {
      if (m.winner_id && teamStats[m.winner_id]) teamStats[m.winner_id].won++
      const sets = (m.sets_score as [number, number][]) ?? []
      for (const [s1, s2] of sets) {
        if (m.team1_id && teamStats[m.team1_id]) {
          teamStats[m.team1_id].gamesFor += s1
          teamStats[m.team1_id].gamesAgainst += s2
        }
        if (m.team2_id && teamStats[m.team2_id]) {
          teamStats[m.team2_id].gamesFor += s2
          teamStats[m.team2_id].gamesAgainst += s1
        }
      }
    }

    const sorted = Object.entries(teamStats).sort(([, a], [, b]) => {
      if (b.won !== a.won) return b.won - a.won
      const diffA = a.gamesFor - a.gamesAgainst
      const diffB = b.gamesFor - b.gamesAgainst
      if (diffB !== diffA) return diffB - diffA
      return b.gamesFor - a.gamesFor
    })

    for (let rank = 0; rank < cat.qualifiers_per_group; rank++) {
      if (sorted[rank]) {
        qualified.push({ teamId: sorted[rank][0], groupId: group.id, groupName: group.name, rank: rank + 1 })
      }
    }
  }

  if (qualified.length < 2) throw new Error('Se necesitan al menos 2 clasificados')

  await supabase.from('matches').delete()
    .eq('tournament_category_id', categoryId).eq('phase_type', 'bracket')

  const slots = generateBracket(qualified)
  const matchesToInsert = slotsToMatches(slots, categoryId)
  await supabase.from('matches').insert(matchesToInsert)

  await supabase.from('tournament_categories')
    .update({ status: 'bracket' }).eq('id', categoryId)

  revalidatePath('/dashboard')
  return { totalQualified: qualified.length }
}

export async function confirmBracket(categoryId: string) {
  const supabase = createClient()
  await supabase.from('tournament_categories')
    .update({ bracket_confirmed: true }).eq('id', categoryId)
  revalidatePath('/dashboard')
}

// ── PAREJAS ───────────────────────────────────────────────

export async function createTeam(data: {
  tournament_category_id: string
  player1_first: string; player1_last: string; player1_phone?: string
  player2_first: string; player2_last: string; player2_phone?: string
}) {
  const supabase = createClient()

  async function findOrCreate(first: string, last: string, phone?: string) {
    const { data: existing } = await supabase
      .from('players').select().ilike('first_name', first).ilike('last_name', last).maybeSingle()
    if (existing) return existing
    const { data: player, error } = await supabase
      .from('players').insert({ first_name: first, last_name: last, phone: phone ?? null }).select().single()
    if (error) throw new Error(error.message)
    return player
  }

  const p1 = await findOrCreate(data.player1_first, data.player1_last, data.player1_phone)
  const p2 = await findOrCreate(data.player2_first, data.player2_last, data.player2_phone)

  const { data: existing } = await supabase.from('teams').select()
    .eq('tournament_category_id', data.tournament_category_id)
    .or(`and(player1_id.eq.${p1.id},player2_id.eq.${p2.id}),and(player1_id.eq.${p2.id},player2_id.eq.${p1.id})`)
    .maybeSingle()
  if (existing) throw new Error('Esta pareja ya está inscripta en la categoría')

  const { data: team, error } = await supabase.from('teams').insert({
    tournament_category_id: data.tournament_category_id,
    player1_id: p1.id, player2_id: p2.id,
    name: `${data.player1_last} / ${data.player2_last}`,
  }).select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  return team
}

export async function deleteTeam(teamId: string) {
  const supabase = createClient()
  await supabase.from('teams').delete().eq('id', teamId)
  revalidatePath('/dashboard')
}
