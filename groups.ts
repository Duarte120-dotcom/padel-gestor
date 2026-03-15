// src/lib/tournament-logic/groups.ts
// Algoritmo de distribución aleatoria de grupos

export interface GroupDistribution {
  numGroups: number
  groupSizes: number[]   // ej: [3, 3, 4]
  groupsOf3: number
  groupsOf4: number
}

/**
 * Calcula cómo distribuir N parejas en grupos de 3 (prioritario) y 4.
 * Regla: minimizar grupos de 4, nunca grupos de 2.
 */
export function calculateGroupDistribution(numTeams: number): GroupDistribution {
  if (numTeams < 3) throw new Error('Se necesitan al menos 3 parejas para generar grupos')

  let groupsOf3 = 0
  let groupsOf4 = 0

  // Encontrar la combinación óptima: maximizar grupos de 3
  // numTeams = 3*a + 4*b → minimizar b
  for (let b = 0; b <= Math.floor(numTeams / 4); b++) {
    const remainder = numTeams - 4 * b
    if (remainder >= 0 && remainder % 3 === 0) {
      groupsOf3 = remainder / 3
      groupsOf4 = b
      break
    }
  }

  // Si no encontramos solución exacta, ajustamos
  if (groupsOf3 + groupsOf4 === 0) {
    // Fallback: un solo grupo con todos
    groupsOf3 = 0
    groupsOf4 = 1
  }

  const numGroups = groupsOf3 + groupsOf4
  const groupSizes: number[] = [
    ...Array(groupsOf3).fill(3),
    ...Array(groupsOf4).fill(4),
  ]

  return { numGroups, groupSizes, groupsOf3, groupsOf4 }
}

/**
 * Distribuye las parejas aleatoriamente en grupos.
 * Devuelve un array de arrays, cada uno con los IDs de las parejas del grupo.
 */
export function distributeTeamsIntoGroups(
  teamIds: string[],
  distribution: GroupDistribution
): string[][] {
  // Mezclar aleatoriamente (Fisher-Yates)
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

/**
 * Genera todos los partidos round-robin para un grupo.
 * Para N parejas → N*(N-1)/2 partidos.
 */
export function generateRoundRobinFixture(teamIds: string[]): Array<[string, string]> {
  const matches: Array<[string, string]> = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push([teamIds[i], teamIds[j]])
    }
  }
  return matches
}

/**
 * Recomendador inteligente: dado N parejas, sugiere la configuración óptima.
 */
export interface ConfigRecommendation {
  distribution: GroupDistribution
  qualifiersPerGroup: number
  totalQualifiers: number
  bracketSize: number   // próxima potencia de 2
  byesNeeded: number
  isBalanced: boolean
  description: string
}

export function recommendConfig(numTeams: number): ConfigRecommendation {
  const dist = calculateGroupDistribution(numTeams)
  const numGroups = dist.numGroups

  // Elegir clasificados por grupo que genere el bracket más limpio
  let bestQ = 1
  let bestScore = Infinity

  for (let q = 1; q <= 2; q++) {
    const totalQ = numGroups * q
    const bracketSize = nextPowerOf2(totalQ)
    const byes = bracketSize - totalQ
    // Penalizar: muchos BYEs o bracket muy grande
    const score = byes + Math.abs(bracketSize - totalQ * 1.5)
    if (score < bestScore) {
      bestScore = score
      bestQ = q
    }
  }

  const totalQualifiers = numGroups * bestQ
  const bracketSize = nextPowerOf2(totalQualifiers)
  const byesNeeded = bracketSize - totalQualifiers

  const description = buildDescription(dist, bestQ, totalQualifiers, bracketSize, byesNeeded)

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
  if (n <= 1) return 2
  let p = 2
  while (p < n) p *= 2
  return p
}

function buildDescription(
  dist: GroupDistribution,
  q: number,
  totalQ: number,
  bracketSize: number,
  byes: number
): string {
  const parts: string[] = []
  parts.push(`Con ${dist.groupsOf3} grupo${dist.groupsOf3 !== 1 ? 's' : ''} de 3` +
    (dist.groupsOf4 > 0 ? ` y ${dist.groupsOf4} de 4` : '') +
    `, clasifican ${q} por grupo → ${totalQ} clasificados.`)

  if (byes === 0) {
    parts.push(`Llave de ${bracketSize} parejas perfecta, sin BYEs.`)
  } else {
    parts.push(`Llave de ${bracketSize} con ${byes} BYE${byes > 1 ? 's' : ''}.`)
  }

  return parts.join(' ')
}
