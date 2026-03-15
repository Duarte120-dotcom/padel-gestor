// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createTournament } from '@/lib/actions'
import NewTournamentButton from '@/components/tournaments/NewTournamentButton'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:      { label: 'Borrador',    color: 'secondary' },
  configured: { label: 'Configurado', color: 'info' },
  active:     { label: 'En juego',    color: 'success' },
  finished:   { label: 'Finalizado',  color: 'secondary' },
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: false })

  return (
    <div style={{ padding: '24px', maxWidth: '960px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px' }}>Torneos</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {tournaments?.length ?? 0} torneo{tournaments?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewTournamentButton />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tournaments?.map(t => {
          const s = STATUS_LABELS[t.status] ?? STATUS_LABELS.draft
          return (
            <Link
              key={t.id}
              href={`/dashboard/tournaments/${t.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: '12px', padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}>
                <div style={{
                  width: '40px', height: '40px', background: 'var(--color-background-secondary)',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0
                }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {new Date(t.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })} · {t.venue}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '99px',
                  background: `var(--color-background-${s.color})`,
                  color: `var(--color-text-${s.color})`
                }}>
                  {s.label}
                </span>
              </div>
            </Link>
          )
        })}

        {(!tournaments || tournaments.length === 0) && (
          <div style={{
            textAlign: 'center', padding: '48px 16px',
            border: '0.5px dashed var(--color-border-secondary)',
            borderRadius: '12px', color: 'var(--color-text-tertiary)', fontSize: '14px'
          }}>
            No hay torneos todavía. Creá el primero.
          </div>
        )}
      </div>
    </div>
  )
}
