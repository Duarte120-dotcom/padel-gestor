'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', date: '', venue: '', description: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tournaments')
      .insert({ ...form, status: 'draft', created_by: user?.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/tournaments/${data.id}`)
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: '14px',
    border: '1px solid #ddd', borderRadius: '8px', outline: 'none',
    fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px', fontWeight: 500 as const }

  return (
    <div style={{ padding: '28px', maxWidth: '560px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
          ← Volver
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Nuevo torneo</h1>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nombre del torneo *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Apertura 2026" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Sede *</label>
              <input style={inputStyle} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Club Ciudad" required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descripción (opcional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Detalles del torneo..."
            />
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: '8px', fontSize: '13px', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={() => router.back()}
              style={{ flex: 1, padding: '10px', background: 'white', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '10px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creando...' : 'Crear torneo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
