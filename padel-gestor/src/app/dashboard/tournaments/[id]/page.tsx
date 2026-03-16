import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function TournamentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!tournament) notFound()

  const { data: categories } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('tournament_id', params.id)
    .order('created_at')

  const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    setup:    { label: 'Configurando', bg: '#eff6ff', color: '#1d4ed8' },
    groups:   { label: 'Fase grupos',  bg: '#fefce8', color: '#ca8a04' },
    bracket:  { label: 'Eliminatoria', bg: '#fdf4ff', color: '#9333ea' },
    finished: { label: 'Finalizado',   bg: '#f0fdf4', color: '#16a34a' },
  }

  return (
    <div style={{ padding: '28px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Torneos</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '8px 0 4px' }}>{tournament.name}</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          {new Date(tournament.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })} · {tournament.venue}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Categorías</h2>
        <Link href={`/dashboard/tournaments/${params.id}/categories/new`} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '7px 14px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            + Nueva categoría
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {categories?.map(cat => {
          const s = STATUS_LABELS[cat.status] ?? STATUS_LABELS.setup
          return (
            <Link key={cat.id} href={`/dashboard/tournaments/${params.id}/categories/${cat.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', background: '#f5f5f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  🎾
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{cat.name}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    Grupos de {cat.preferred_group_size} · Clasifican {cat.qualifiers_per_group} por grupo · {cat.sets_per_match} set{cat.sets_per_match !== 1 ? 's' : ''}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '99px', background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>
            </Link>
          )
        })}

        {(!categories || categories.length === 0) && (
          <div style={{ textAlign: 'center', padding: '48px 16px', border: '1px dashed #ddd', borderRadius: '12px', color: '#aaa', fontSize: '14px' }}>
            No hay categorías todavía. Agregá la primera.
          </div>
        )}
      </div>
    </div>
  )
}
