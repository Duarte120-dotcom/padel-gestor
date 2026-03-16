'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTeam } from '@/lib/actions'

export default function NewTeamPage({ params }: { params: { id: string; catId: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    player1_first: '', player1_last: '', player1_phone: '',
    player2_first: '', player2_last: '', player2_phone: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createTeam({ tournament_category_id: params.catId, ...form })
      router.push(`/dashboard/tournaments/${params.id}/categories/${params.catId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }
  const labelStyle = { fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px', fontWeight: 500 as const }

  const PlayerSection = ({ num, prefix }: { num: number; prefix: 'player1' | 'player2' }) => (
    <div style={{ background: '#fafaf8', border: '1px solid #e5e5e0', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#555' }}>Jugador {num}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={labelStyle}>Nombre *</label>
          <input style={inputStyle} value={form[`${prefix}_first`]} onChange={e => setForm({ ...form, [`${prefix}_first`]: e.target.value })} placeholder="Carlos" required />
        </div>
        <div>
          <label style={labelStyle}>Apellido *</label>
          <input style={inputStyle} value={form[`${prefix}_last`]} onChange={e => setForm({ ...form, [`${prefix}_last`]: e.target.value })} placeholder="García" required />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Teléfono (opcional)</label>
        <input style={inputStyle} value={form[`${prefix}_phone`]} onChange={e => setForm({ ...form, [`${prefix}_phone`]: e.target.value })} placeholder="+54 11 ..." />
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px', maxWidth: '560px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
          ← Volver
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Agregar pareja</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <PlayerSection num={1} prefix="player1" />
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px' }}>+</div>
        <PlayerSection num={2} prefix="player2" />

        {error && (
          <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: '8px', fontSize: '13px', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button type="button" onClick={() => router.back()} style={{ flex: 1, padding: '10px', background: 'white', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Guardando...' : 'Confirmar pareja'}
          </button>
        </div>
      </form>
    </div>
  )
}
