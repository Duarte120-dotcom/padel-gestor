export interface QualifiedTeam {
  teamId: string
  groupId: string
  groupName: string
  rank: number
}

export interface BracketSlot {
  position: number
  teamId: string | null
  isBye: boolean
  sourceGroupId?: string
  groupRank?: number
}

export function generateBracket(qualified: QualifiedTeam[]): BracketSlot[] {
  const total = qualified.length
  const bracketSize = nextPowerOf2(total)
  const byesNeeded = bracketSize - total

  const byRank: Record<number, QualifiedTeam[]> = {}
  for (const t of qualified) {
    if (!byRank[t.rank]) byRank[t.rank] = []
    byRank[t.rank].push(t)
  }

  const firstSeeds = shuffle([...(byRank[1] || [])])
  const secondSeeds = shuffle([...(byRank[2] || [])])
  const otherSeeds = shuffle(
    Object.entries(byRank)
      .filter(([rank]) => parseInt(rank) > 2)
      .flatMap(([, teams]) => teams)
  )

  const result: (QualifiedTeam | null)[] = new Array(bracketSize).fill(null)
  const numPairs = bracketSize / 2

  for (let pair = 0; pair < numPairs; pair++) {
    const topPos = pair * 2
    const botPos = pair * 2 + 1
    const isByePair = pair >= numPairs - byesNeeded

    const topTeam = firstSeeds[pair] ?? secondSeeds[pair] ?? otherSeeds.shift() ?? null
    if (topTeam) result[topPos] = topTeam

    if (isByePair) {
      result[botPos] = null
    } else {
      const idx = secondSeeds.findIndex(t => t.groupId !== topTeam?.groupId)
      if (idx !== -1) {
        result[botPos] = secondSeeds.splice(idx, 1)[0]
      } else if (secondSeeds.length > 0) {
        result[botPos] = secondSeeds.shift()!
      } else {
        result[botPos] = otherSeeds.shift() ?? null
      }
    }
  }

  return result.map((team, i) => ({
    position: i + 1,
    teamId: team ? team.teamId : null,
    isBye: !team,
    sourceGroupId: team?.groupId,
    groupRank: team?.rank,
  }))
}

export function slotsToMatches(slots: BracketSlot[], categoryId: string) {
  const matches = []
  const bracketSize = slots.length

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

  // Rondas siguientes (vacías)
  for (let round = bracketSize / 4; round >= 1; round = Math.floor(round / 2)) {
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
    if (round === 1) break
  }

  return matches
}

export function getRoundName(round: number): string {
  if (round === 1) return 'Final'
  if (round === 2) return 'Semifinales'
  if (round === 4) return 'Cuartos de final'
  if (round === 8) return 'Octavos de final'
  return `Ronda de ${round * 2}`
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
