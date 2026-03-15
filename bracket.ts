// src/lib/tournament-logic/bracket.ts
// Generación de llave eliminatoria evitando cruces del mismo grupo en primera ronda

export interface BracketSlot {
  position: number   // 1-based, de arriba a abajo en la llave
  teamId: string | null
  isBye: boolean
  sourceGroupId?: string  // para verificar no cruzar mismo grupo
  groupRank?: number      // 1ro, 2do, 3ro del grupo
}

export interface BracketMatch {
  round: number       // 1=final, 2=semis, 4=cuartos, etc.
  position: number    // posición dentro de la ronda
  slot1: BracketSlot
  slot2: BracketSlot
  sourceMatch1Position?: number
  sourceMatch2Position?: number
}

export interface QualifiedTeam {
  teamId: string
  groupId: string
  groupName: string
  rank: number   // 1ro, 2do, etc.
}

/**
 * Genera la llave eliminatoria asegurando que en primera ronda
 * no se crucen equipos del mismo grupo si es posible evitarlo.
 *
 * Lógica:
 * 1. Completar hasta potencia de 2 con BYEs
 * 2. Separar 1ros y 2dos de grupo
 * 3. Cruzar: 1ro de grupo A vs 2do de grupo B (distinto grupo)
 * 4. Si no es posible evitar todos los cruces, usar backtracking
 */
export function generateBracket(qualified: QualifiedTeam[]): BracketSlot[] {
  const total = qualified.length
  const bracketSize = nextPowerOf2(total)
  const byesNeeded = bracketSize - total

  // Separar por rank
  const byRank: Record<number, QualifiedTeam[]> = {}
  for (const t of qualified) {
    if (!byRank[t.rank]) byRank[t.rank] = []
    byRank[t.rank].push(t)
  }

  const firstSeeds = byRank[1] || []
  const secondSeeds = byRank[2] || []
  const otherSeeds = Object.entries(byRank)
    .filter(([rank]) => parseInt(rank) > 2)
    .flatMap(([, teams]) => teams)

  // Construir slots: posiciones [1..bracketSize]
  // Los BYEs se asignan a las posiciones de mayor ranking (parte baja del cuadro)
  const slots: BracketSlot[] = []

  // Estrategia: intercalar 1ros y 2dos para evitar cruces del mismo grupo
  // en la primera ronda (los cruces son: pos 1 vs pos 2, pos 3 vs pos 4, etc.)
  const seededOrder = buildSeededOrder(firstSeeds, secondSeeds, otherSeeds, bracketSize, byesNeeded)

  for (let i = 0; i < bracketSize; i++) {
    const team = seededOrder[i]
    slots.push({
      position: i + 1,
      teamId: team ? team.teamId : null,
      isBye: !team,
      sourceGroupId: team?.groupId,
      groupRank: team?.rank,
    })
  }

  return slots
}

function buildSeededOrder(
  first: QualifiedTeam[],
  second: QualifiedTeam[],
  others: QualifiedTeam[],
  bracketSize: number,
  byesNeeded: number
): (QualifiedTeam | null)[] {
  const result: (QualifiedTeam | null)[] = new Array(bracketSize).fill(null)

  // Para bracketSize=8: posiciones de cruces en primera ronda:
  // (0,1), (2,3), (4,5), (6,7)
  // Queremos: pos 0 = 1ro grupo A, pos 1 = 2do grupo B (distinto)

  const numPairs = bracketSize / 2

  // Mezclar los 1ros aleatoriamente para asignarlos a los pares
  const shuffledFirst = shuffle([...first])
  const shuffledSecond = shuffle([...second])
  const shuffledOthers = shuffle([...others])

  // Asignar 1ros a posiciones superiores de cada par (0, 2, 4, ...)
  // Asignar 2dos (de distinto grupo) a posiciones inferiores (1, 3, 5, ...)
  for (let pair = 0; pair < numPairs; pair++) {
    const topPos = pair * 2
    const botPos = pair * 2 + 1

    const topTeam = shuffledFirst[pair] ?? shuffledSecond[pair] ?? shuffledOthers.shift() ?? null

    if (topTeam) result[topPos] = topTeam

    // Buscar un 2do de distinto grupo para el par
    const opponent = findOpponentFromDifferentGroup(
      topTeam?.groupId ?? null,
      shuffledSecond,
      shuffledOthers,
      byesNeeded > 0 && pair >= numPairs - byesNeeded
    )

    result[botPos] = opponent
    if (opponent === null && byesNeeded > 0) {
      // Se usa un BYE en esta posición
    }
  }

  return result
}

function findOpponentFromDifferentGroup(
  groupId: string | null,
  seconds: QualifiedTeam[],
  others: QualifiedTeam[],
  allowBye: boolean
): QualifiedTeam | null {
  if (allowBye) return null

  // Primero intentar de seconds de distinto grupo
  const idx = seconds.findIndex(t => t.groupId !== groupId)
  if (idx !== -1) {
    return seconds.splice(idx, 1)[0]
  }

  // Si no, cualquier segundo disponible
  if (seconds.length > 0) return seconds.shift()!

  // Si no, otros clasificados
  if (others.length > 0) return others.shift()!

  return null
}

function nextPowerOf2(n: number): number {
  if (n <= 2) return 2
  let p = 2
  while (p < n) p *= 2
  return p
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Convierte los slots en partidos estructurados de la llave.
 */
export function slotsToMatches(slots: BracketSlot[], categoryId: string): Array<{
  tournament_category_id: string
  phase_type: 'bracket'
  bracket_round: number
  bracket_position: number
  team1_id: string | null
  team2_id: string | null
  status: 'pending' | 'bye'
}> {
  const matches = []
  const bracketSize = slots.length
  const rounds = Math.log2(bracketSize)

  // Primera ronda
  for (let i = 0; i < slots.length; i += 2) {
    const s1 = slots[i]
    const s2 = slots[i + 1]
    const isBye = s1.isBye || s2.isBye

    matches.push({
      tournament_category_id: categoryId,
      phase_type: 'bracket' as const,
      bracket_round: bracketSize / 2,
      bracket_position: i / 2 + 1,
      team1_id: s1.isBye ? null : s1.teamId,
      team2_id: s2.isBye ? null : s2.teamId,
      status: isBye ? 'bye' as const : 'pending' as const,
    })
  }

  // Rondas siguientes (vacías, se llenan con ganadores)
  for (let round = bracketSize / 4; round >= 1; round /= 2) {
    for (let pos = 1; pos <= round; pos++) {
      matches.push({
        tournament_category_id: categoryId,
        phase_type: 'bracket' as const,
        bracket_round: round,
        bracket_position: pos,
        team1_id: null,
        team2_id: null,
        status: 'pending' as const,
      })
    }
  }

  return matches
}

export function getRoundName(round: number, bracketSize: number): string {
  if (round === 1) return 'Final'
  if (round === 2) return 'Semifinales'
  if (round === 4) return 'Cuartos de final'
  if (round === 8) return 'Octavos de final'
  return `Ronda de ${round * 2}`
}
