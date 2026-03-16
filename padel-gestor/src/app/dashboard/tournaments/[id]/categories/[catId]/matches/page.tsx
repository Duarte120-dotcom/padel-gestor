import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MatchResultsClient from './MatchResultsClient'

export default async function MatchesPage({ params }: { params: { id: string; catId: string } }) {
  const supabase = createClient()

  const { data: cat } = await supabase
    .from('tournament_categories').select().eq('id', params.catId).single()
  if (!cat) notFound()

  const { data: groups } = await supabase
    .from('groups').select('id, name')
    .eq('tournament_category_id', params.catId)

  const groupMap: Record<string, string> = {}
  for (const g of groups ?? []) groupMap[g.id] = g.name

  const { data: rawMatches } = await supabase
    .from('matches')
    .select('*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)')
    .eq('tournament_category_id', params.catId)
    .eq('phase_type', 'group')
    .order('created_at')

  const matches = (rawMatches ?? []).map(m => ({
    ...m,
    groupName: m.group_id ? groupMap[m.group_id] : undefined,
  }))

  return (
    <div style={{ padding: '28px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>
          ← Volver a {cat.name}
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '8px 0 4px' }}>Resultados — {cat.name}</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Fase de grupos</p>
      </div>

      <MatchResultsClient matches={matches as any} categoryId={params.catId} />
    </div>
  )
}
