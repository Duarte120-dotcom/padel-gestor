import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { generateGroups, confirmGroups, generateBracketForCategory } from '@/lib/actions'

export default async function CategoryPage({ params }: { params: { id: string; catId: string } }) {
  const supabase = createClient()

  const { data: cat } = await supabase
    .from('tournament_categories').select().eq('id', params.catId).single()
  if (!cat) notFound()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, status, player1_id, player2_id')
    .eq('tournament_category_id', params.catId)
    .order('created_at')

  const { data: groups } = await supabase
    .from('groups').select('id, name, draw_order')
    .eq('tournament_category_id', params.catId).order('draw_order')

  const pendingMatches = groups ? await Promise.all(
    groups.map(async g => {
      const { count } = await supabase.from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', g.id).eq('status', 'pending')
      return count ?? 0
    })
  ) : []

  const totalPending = pendingMatches.reduce((a, b) => a + b, 0)

  const btnStyle = (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => ({
    padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
    cursor: 'pointer', border: 'none',
    background: variant === 'primary' ? '#111' : variant === 'danger' ? '#dc2626' : '#f5f5f0',
    color: variant === 'primary' || variant === 'danger' ? 'white' : '#333',
  })

  return (
    <div style={{ padding: '28px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href={`/dashboard/tournaments/${params.id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>
          ← Volver al torneo
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '8px 0 4px' }}>{cat.name}</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          Grupos de {cat.preferred_group_size} · Clasifican {cat.qualifiers_per_group} por grupo · {cat.sets_per_match} sets
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Parejas */}
        <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e5e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafaf8' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Parejas</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{teams?.length ?? 0} inscriptas</div>
            </div>
            <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}/teams/new`} style={{ textDecoration: 'none' }}>
              <button style={btnStyle('primary')}>+ Agregar</button>
            </Link>
          </div>
          <div style={{ padding: '8px 0', maxHeight: '320px', overflowY: 'auto' }}>
            {teams?.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '10px', borderBottom: i < (teams?.length ?? 0) - 1 ? '1px solid #f0f0ec' : 'none' }}>
                <div style={{ width: '24px', height: '24px', background: '#f0f0ec', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#888', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>{t.name ?? 'Sin nombre'}</div>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: t.status === 'confirmed' ? '#f0fdf4' : '#fefce8', color: t.status === 'confirmed' ? '#16a34a' : '#ca8a04' }}>
                  {t.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                </span>
              </div>
            ))}
            {(!teams || teams.length === 0) && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Sin parejas aún</div>
            )}
          </div>
        </div>

        {/* Grupos y acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Acciones */}
          <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Acciones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!cat.groups_confirmed && (
                <form action={async () => { 'use server'; await generateGroups(params.catId) }}>
                  <button type="submit" style={{ ...btnStyle('primary'), width: '100%' }}>
                    {groups && groups.length > 0 ? 'Regenerar grupos' : 'Generar grupos'}
                  </button>
                </form>
              )}
              {groups && groups.length > 0 && !cat.groups_confirmed && (
                <form action={async () => { 'use server'; await confirmGroups(params.catId) }}>
                  <button type="submit" style={{ ...btnStyle('secondary'), width: '100%' }}>
                    ✓ Confirmar grupos
                  </button>
                </form>
              )}
              {cat.groups_confirmed && !cat.bracket_confirmed && (
                <form action={async () => { 'use server'; await generateBracketForCategory(params.catId) }}>
                  <button type="submit" style={{ ...btnStyle('primary'), width: '100%' }}>
                    Generar llave eliminatoria
                  </button>
                </form>
              )}
              <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}/matches`} style={{ textDecoration: 'none' }}>
                <button style={{ ...btnStyle('secondary'), width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  🎾 Cargar resultados
                  {totalPending > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '1px 6px', borderRadius: '99px' }}>
                      {totalPending}
                    </span>
                  )}
                </button>
              </Link>
              {cat.status === 'bracket' && (
                <Link href={`/dashboard/tournaments/${params.id}/categories/${params.catId}/bracket`} style={{ textDecoration: 'none' }}>
                  <button style={{ ...btnStyle('secondary'), width: '100%' }}>🏅 Ver llave</button>
                </Link>
              )}
            </div>
          </div>

          {/* Grupos generados */}
          {groups && groups.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5e0', background: '#fafaf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Grupos generados</div>
                {cat.groups_confirmed && <span style={{ fontSize: '10px', background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '99px', fontWeight: 500 }}>Confirmados</span>}
              </div>
              {groups.map((g, i) => (
                <div key={g.id} style={{ padding: '8px 16px', fontSize: '13px', borderBottom: i < groups.length - 1 ? '1px solid #f0f0ec' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>{g.name}</span>
                  <span style={{ color: pendingMatches[i] > 0 ? '#ca8a04' : '#16a34a', fontSize: '11px' }}>
                    {pendingMatches[i] > 0 ? `${pendingMatches[i]} pendientes` : 'Completo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
