import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { confirmBracket } from '@/lib/actions'
import { getRoundName } from '@/lib/tournament-logic/bracket'

export default async function BracketPage({ params }: { params: { id: string; catId: string } }) {
  const supabase = createClient()

  const { data: cat } = await supabase
    .from('tournament_categories').select().eq('id', params.catId).single()
  if (!cat) notFound()

  const { data: rawMatches } = await supabase
    .from('matches')
    .select('*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)')
    .eq('tournament_category_id', params.catId)
    .eq('phase_type', 'bracket')
    .order('bracket_round', { ascending: false })
    .order('bracket_position')

  if (!rawMatches || rawMatches.length === 0) {
    return (
      <div style={{ padding: '28px' }}>
        <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Volver</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '8px 0 24px' }}>Llave — {cat.name}</h1>
        <div style={{ textAlign: 'center', padding: '48px', color: '#aaa', border: '1px dashed #e5e5e0', borderRadius: '12px', fontSize: '14px' }}>
          La llave no fue generada todavía. Terminá la fase de grupos primero.
        </div>
      </div>
    )
  }

  // Agrupar por ronda
  const rounds: Record<number, typeof rawMatches> = {}
  for (const m of rawMatches) {
    const r = m.bracket_round ?? 0
    if (!rounds[r]) rounds[r] = []
    rounds[r].push(m)
  }
  const sortedRounds = Object.keys(rounds).map(Number).sort((a, b) => b - a)

  return (
    <div style={{ padding: '28px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Volver</Link>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '8px 0 4px' }}>Llave — {cat.name}</h1>
        </div>
        {!cat.bracket_confirmed && (
          <form action={async () => { 'use server'; await confirmBracket(params.catId) }}>
            <button type="submit" style={{ padding: '8px 16px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              ✓ Confirmar llave
            </button>
          </form>
        )}
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', minWidth: `${sortedRounds.length * 160}px` }}>
          {sortedRounds.map((round, ri) => (
            <div key={round} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e5e5e0' }}>
                {getRoundName(round)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: '8px' }}>
                {rounds[round].map(m => {
                  const t1 = m.team1 as any
                  const t2 = m.team2 as any
                  const w = m.winner as any
                  const sets = (m.sets_score as [number, number][]) ?? []
                  const isBye = m.status === 'bye'

                  return (
                    <div key={m.id} style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '10px', overflow: 'hidden' }}>
                      {[t1, t2].map((team, ti) => {
                        const isWinner = w && team && w.id === team.id
                        const score = sets.length > 0
                          ? sets.reduce((acc, s) => acc + s[ti], 0)
                          : null
                        return (
                          <div key={ti} style={{
                            display: 'flex', alignItems: 'center', padding: '7px 10px', gap: '6px',
                            borderTop: ti === 1 ? '1px solid #f0f0ec' : 'none',
                            background: isWinner ? '#f0fdf4' : 'white',
                          }}>
                            <div style={{ flex: 1, fontSize: '11px', fontWeight: isWinner ? 600 : 400, color: isWinner ? '#16a34a' : team ? '#111' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isBye ? (ti === 0 ? (t1?.name ?? 'TBD') : 'BYE') : (team?.name ?? 'Por definir')}
                            </div>
                            {score !== null && (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: isWinner ? '#16a34a' : '#888', flexShrink: 0 }}>
                                {sets.map(s => s[ti]).join('-')}
                              </span>
                            )}
                            {m.is_walkover && ti === (t1?.id === w?.id ? 1 : 0) && (
                              <span style={{ fontSize: '9px', color: '#aaa' }}>W.O.</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cargar resultados de llave */}
      <div style={{ marginTop: '24px' }}>
        <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}/bracket/matches`} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '8px 16px', background: 'white', color: '#333', border: '1px solid #e5e5e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            🎾 Cargar resultados de llave
          </button>
        </Link>
      </div>
    </div>
  )
}
