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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f2f2ed',
    }}>
      <div style={{
        background: 'white',
        border: '1px solid #e5e5e0',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '380px',
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
          <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>PádelGestor</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Panel de administración</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              required
              style={{
                width: '100%', padding: '9px 12px', fontSize: '14px',
                border: '1px solid #ddd', borderRadius: '8px', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '9px 12px', fontSize: '14px',
                border: '1px solid #ddd', borderRadius: '8px', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', background: '#fef2f2',
              borderRadius: '8px', fontSize: '13px', color: '#dc2626',
              border: '1px solid #fecaca',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px', padding: '10px',
              background: loading ? '#999' : '#111',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
