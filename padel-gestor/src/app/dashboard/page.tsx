import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:      { label: 'Borrador',    bg: '#f5f5f0', color: '#666' },
  configured: { label: 'Configurado', bg: '#eff6ff', color: '#1d4ed8' },
  active:     { label: 'En juego',    bg: '#f0fdf4', color: '#16a34a' },
  finished:   { label: 'Finalizado',  bg: '#f5f5f0', color: '#888' },
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: false })

  return (
    <div style={{ padding: '28px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Torneos</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {tournaments?.length ?? 0} torneo{tournaments?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/tournaments/new" style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '8px 16px', background: '#111', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}>
            + Nuevo torneo
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tournaments?.map(t => {
          const s = STATUS_LABELS[t.status] ?? STATUS_LABELS.draft
          return (
            <Link key={t.id} href={`/dashboard/tournaments/${t.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px',
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: '40px', height: '40px', background: '#f5f5f0',
                  borderRadius: '10px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })} · {t.venue}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '99px',
                  background: s.bg, color: s.color,
                }}>
                  {s.label}
                </span>
              </div>
            </Link>
          )
        })}

        {(!tournaments || tournaments.length === 0) && (
          <div style={{
            textAlign: 'center', padding: '56px 16px',
            border: '1px dashed #ddd', borderRadius: '12px', color: '#aaa', fontSize: '14px',
          }}>
            No hay torneos todavía. Creá el primero con el botón de arriba.
          </div>
        )}
      </div>
    </div>
  )
}
