// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background-tertiary)'
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px'
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 500, marginBottom: '6px' }}>PádelGestor</div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Panel de administración</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              required
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '5px' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', background: 'var(--color-background-danger)',
              borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-danger)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px', padding: '10px', background: 'var(--color-text-primary)',
              color: 'var(--color-background-primary)', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
