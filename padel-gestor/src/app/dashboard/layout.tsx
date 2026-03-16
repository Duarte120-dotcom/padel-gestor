import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single()

  async function handleSignOut() {
    'use server'
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f2f2ed' }}>
      {/* Sidebar */}
      <div style={{
        width: '210px', background: 'white', borderRight: '1px solid #e5e5e0',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e0' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>🏆 PádelGestor</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Panel de administración</div>
        </div>

        <nav style={{ padding: '8px', flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#aaa', padding: '8px 6px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            General
          </div>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', fontSize: '13px', color: '#333', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              🏆 Torneos
            </div>
          </Link>
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e5e0' }}>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px', fontWeight: 500 }}>
            {profile?.full_name ?? user.email}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
            {profile?.role === 'admin' ? 'Administrador' : 'Colaborador'}
          </div>
          <form action={handleSignOut}>
            <button type="submit" style={{
              fontSize: '11px', color: '#888', background: 'none',
              border: '1px solid #e5e5e0', borderRadius: '6px',
              padding: '4px 10px', cursor: 'pointer',
            }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
