export interface GroupDistribution {
  numGroups: number
  groupSizes: number[]
  groupsOf3: number
  groupsOf4: number
}

export function calculateGroupDistribution(numTeams: number): GroupDistribution {
  if (numTeams < 3) throw new Error('Se necesitan al menos 3 parejas')

  let groupsOf3 = 0
  let groupsOf4 = 0

  for (let b = 0; b <= Math.floor(numTeams / 4); b++) {
    const remainder = numTeams - 4 * b
    if (remainder >= 0 && remainder % 3 === 0) {
      groupsOf3 = remainder / 3
      groupsOf4 = b
      break
    }
  }

  if (groupsOf3 + groupsOf4 === 0) {
    groupsOf4 = 1
  }

  const numGroups = groupsOf3 + groupsOf4
  const groupSizes = [
    ...Array(groupsOf3).fill(3),
    ...Array(groupsOf4).fill(4),
  ]

  return { numGroups, groupSizes, groupsOf3, groupsOf4 }
}

export function distributeTeamsIntoGroups(
  teamIds: string[],
  distribution: GroupDistribution
): string[][] {
  const shuffled = [...teamIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const groups: string[][] = []
  let cursor = 0
  for (const size of distribution.groupSizes) {
    groups.push(shuffled.slice(cursor, cursor + size))
    cursor += size
  }
  return groups
}

export function generateRoundRobinFixture(teamIds: string[]): Array<[string, string]> {
  const matches: Array<[string, string]> = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push([teamIds[i], teamIds[j]])
    }
  }
  return matches
}

export interface ConfigRecommendation {
  distribution: GroupDistribution
  qualifiersPerGroup: number
  totalQualifiers: number
  bracketSize: number
  byesNeeded: number
  isBalanced: boolean
  description: string
}

export function recommendConfig(numTeams: number): ConfigRecommendation {
  const dist = calculateGroupDistribution(numTeams)
  const numGroups = dist.numGroups

  let bestQ = 1
  let bestScore = Infinity

  for (let q = 1; q <= 2; q++) {
    const totalQ = numGroups * q
    const bracketSize = nextPowerOf2(totalQ)
    const byes = bracketSize - totalQ
    const score = byes + Math.abs(bracketSize - totalQ * 1.5)
    if (score < bestScore) {
      bestScore = score
      bestQ = q
    }
  }

  const totalQualifiers = numGroups * bestQ
  const bracketSize = nextPowerOf2(totalQualifiers)
  const byesNeeded = bracketSize - totalQualifiers

  const description =
    `Con ${dist.groupsOf3} grupo${dist.groupsOf3 !== 1 ? 's' : ''} de 3` +
    (dist.groupsOf4 > 0 ? ` y ${dist.groupsOf4} de 4` : '') +
    `, clasifican ${bestQ} por grupo → ${totalQualifiers} clasificados. ` +
    (byesNeeded === 0
      ? `Llave de ${bracketSize} parejas sin BYEs.`
      : `Llave de ${bracketSize} con ${byesNeeded} BYE${byesNeeded > 1 ? 's' : ''}.`)

  return {
    distribution: dist,
    qualifiersPerGroup: bestQ,
    totalQualifiers,
    bracketSize,
    byesNeeded,
    isBalanced: byesNeeded === 0,
    description,
  }
}

function nextPowerOf2(n: number): number {
  if (n <= 2) return 2
  let p = 2
  while (p < n) p *= 2
  return p
}
