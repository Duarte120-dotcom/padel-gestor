'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    preferred_group_size: 3,
    qualifiers_per_group: 1,
    sets_per_match: 2,
    has_super_tiebreak: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('tournament_categories')
      .insert({ ...form, tournament_id: params.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/tournaments/${params.id}/categories/${data.id}`)
  }

  const inputStyle = { width: '100%', padding: '9px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }
  const labelStyle = { fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px', fontWeight: 500 as const }

  return (
    <div style={{ padding: '28px', maxWidth: '560px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
          ← Volver
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Nueva categoría</h1>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masculino, Femenino, Mixto..." required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Tamaño de grupo</label>
              <select style={inputStyle} value={form.preferred_group_size} onChange={e => setForm({ ...form, preferred_group_size: Number(e.target.value) })}>
                <option value={3}>3 parejas</option>
                <option value={4}>4 parejas</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Clasifican por grupo</label>
              <select style={inputStyle} value={form.qualifiers_per_group} onChange={e => setForm({ ...form, qualifiers_per_group: Number(e.target.value) })}>
                <option value={1}>1 pareja</option>
                <option value={2}>2 parejas</option>
                <option value={3}>3 parejas</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sets por partido</label>
              <select style={inputStyle} value={form.sets_per_match} onChange={e => setForm({ ...form, sets_per_match: Number(e.target.value) })}>
                <option value={1}>1 set</option>
                <option value={2}>2 sets</option>
                <option value={3}>3 sets</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.has_super_tiebreak} onChange={e => setForm({ ...form, has_super_tiebreak: e.target.checked })} />
              Habilitar super tiebreak
            </label>
          </div>

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
              {loading ? 'Creando...' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
