'use client'

import { useState } from 'react'
import { saveMatchResult } from '@/lib/actions'
import type { Match, Team } from '@/lib/supabase/types'

interface Props {
  matches: (Match & { team1: Team | null; team2: Team | null; winner: Team | null; groupName?: string })[]
  categoryId: string
}

export default function MatchResultsClient({ matches, categoryId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [sets, setSets] = useState<[number | null, number | null][]>([[null, null], [null, null]])
  const [walkover, setWalkover] = useState(false)
  const [superTB, setSuperTB] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const pending = matches.filter(m => m.status === 'pending' || m.status === 'walkover' && editMode)
  const played = matches.filter(m => m.status === 'played' || m.status === 'walkover')
  const selected = matches.find(m => m.id === selectedId)

  function selectMatch(m: typeof matches[0], isEdit = false) {
    setSelectedId(m.id)
    setEditMode(isEdit)
    if (isEdit && m.status !== 'pending') {
      const existingSets = (m.sets_score as [number, number][]) ?? []
      setSets(existingSets.length > 0 ? existingSets.map(s => [s[0], s[1]]) : [[null, null], [null, null]])
      setWinner(m.winner_id)
      setWalkover(m.is_walkover)
    } else {
      setSets([[null, null], [null, null]])
      setWinner(null)
      setWalkover(false)
      setSuperTB(false)
    }
  }

  function updateSet(i: number, team: 0 | 1, val: string) {
    const v = val === '' ? null : parseInt(val)
    setSets(prev => {
      const next = [...prev] as typeof prev
      next[i] = [...next[i]] as [number | null, number | null]
      next[i][team] = isNaN(v as number) ? null : v
      return next
    })
  }

  const canConfirm = winner !== null && (
    walkover || sets.every(s => s[0] !== null && s[1] !== null && s[0] !== s[1])
  )

  async function handleConfirm() {
    if (!selected || !winner || !canConfirm) return
    setSaving(true)
    try {
      await saveMatchResult(selected.id, {
        winnerId: winner,
        sets: walkover ? [] : sets.filter(s => s[0] !== null) as [number, number][],
        isWalkover: walkover,
      })
      setSelectedId(null)
      setEditMode(false)
    } catch (e) {
      alert('Error al guardar')
    }
    setSaving(false)
  }

  const inp = (i: number, team: 0 | 1, isSuper = false) => (
    <input
      type="number" min={0} max={isSuper ? 20 : 7}
      value={sets[i][team] ?? ''}
      onChange={e => updateSet(i, team, e.target.value)}
      style={{
        width: '44px', height: '36px', textAlign: 'center', fontSize: '15px', fontWeight: 500,
        border: `1px solid ${sets[i][0] !== null && sets[i][1] !== null && sets[i][team] > sets[i][1 - team] ? '#16a34a' : '#ddd'}`,
        background: sets[i][0] !== null && sets[i][1] !== null && sets[i][team] > sets[i][1 - team] ? '#f0fdf4' : '#fafaf8',
        borderRadius: '8px', outline: 'none', fontFamily: 'inherit',
        color: sets[i][0] !== null && sets[i][1] !== null && sets[i][team] > sets[i][1 - team] ? '#16a34a' : '#111',
      }}
    />
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
      {/* Lista de partidos */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Pendientes ({pending.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {pending.map(m => (
            <div key={m.id} onClick={() => selectMatch(m)}
              style={{ background: 'white', border: `${selectedId === m.id && !editMode ? '2px solid #3b82f6' : '1px solid #e5e5e0'}`, borderRadius: '10px', padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: selectedId === m.id && !editMode ? '#eff6ff' : 'white' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.team1?.name ?? 'TBD'}</div>
                <div style={{ fontSize: '10px', color: '#aaa', margin: '1px 0' }}>vs</div>
                <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.team2?.name ?? 'TBD'}</div>
              </div>
              {m.groupName && <span style={{ fontSize: '10px', background: '#f5f5f0', color: '#888', padding: '2px 7px', borderRadius: '99px', flexShrink: 0 }}>{m.groupName}</span>}
              <span style={{ color: '#aaa', fontSize: '14px' }}>›</span>
            </div>
          ))}
          {pending.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: '#aaa', fontSize: '13px', border: '1px dashed #e5e5e0', borderRadius: '10px' }}>Sin partidos pendientes</div>}
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Jugados ({played.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {played.map(m => {
            const sets = (m.sets_score as [number, number][]) ?? []
            const scoreStr = m.is_walkover ? 'W.O.' : sets.map(s => `${s[0]}-${s[1]}`).join(' / ')
            return (
              <div key={m.id} onClick={() => selectMatch(m, true)}
                style={{ background: '#fafaf8', border: `${selectedId === m.id && editMode ? '2px solid #3b82f6' : '1px solid #e5e5e0'}`, borderRadius: '10px', padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.winner_id === m.team1_id ? m.team1?.name : m.team2?.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#aaa', margin: '1px 0' }}>vs</div>
                  <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.winner_id === m.team1_id ? m.team2?.name : m.team1?.name}
                  </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#555', flexShrink: 0 }}>{scoreStr}</div>
                <span style={{ color: '#aaa', fontSize: '14px' }}>›</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Formulario */}
      <div>
        {!selected ? (
          <div style={{ border: '1px dashed #e5e5e0', borderRadius: '12px', padding: '40px 16px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
            Seleccioná un partido para cargar el resultado
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e5e5e0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #e5e5e0', background: '#fafaf8' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{editMode ? 'Editar resultado' : 'Cargar resultado'}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{selected.team1?.name} vs {selected.team2?.name}</div>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Ganador */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Pareja ganadora</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[selected.team1, selected.team2].map((team, i) => team && (
                    <div key={team.id} onClick={() => setWinner(team.id)}
                      style={{ border: `${winner === team.id ? '2px solid #16a34a' : '1px solid #e5e5e0'}`, borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', background: winner === team.id ? '#f0fdf4' : 'white' }}>
                      <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '3px' }}>Pareja {i + 1}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: winner === team.id ? '#16a34a' : '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {team.name}
                        {winner === team.id && <span style={{ color: '#16a34a' }}>✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sets */}
              {!walkover && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Sets</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <td style={{ fontSize: '11px', color: '#aaa', paddingBottom: '6px', width: '30%' }}></td>
                        <td style={{ fontSize: '11px', color: '#555', fontWeight: 500, textAlign: 'center', paddingBottom: '6px' }}>{selected.team1?.name?.split('/')[0]?.trim()}</td>
                        <td style={{ fontSize: '11px', color: '#555', fontWeight: 500, textAlign: 'center', paddingBottom: '6px' }}>{selected.team2?.name?.split('/')[0]?.trim()}</td>
                        <td></td>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((_, i) => {
                        const isSuper = superTB && i === sets.length - 1
                        return (
                          <tr key={i}>
                            <td style={{ fontSize: '12px', color: '#888', paddingRight: '8px', paddingBottom: '6px' }}>
                              {isSuper ? 'S. Tiebreak' : `Set ${i + 1}`}
                            </td>
                            <td style={{ textAlign: 'center', paddingBottom: '6px', paddingRight: '4px' }}>{inp(i, 0, isSuper)}</td>
                            <td style={{ textAlign: 'center', paddingBottom: '6px' }}>{inp(i, 1, isSuper)}</td>
                            <td style={{ paddingLeft: '6px', paddingBottom: '6px' }}>
                              {i === sets.length - 1 && sets.length > 2 && (
                                <button onClick={() => setSets(s => s.slice(0, -1))} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '16px', padding: 0 }}>×</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {sets.length < 3 && (
                    <button onClick={() => setSets(s => [...s, [null, null]])} style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                      + Agregar set
                    </button>
                  )}
                  {sets.length === 3 && (
                    <label style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={superTB} onChange={e => setSuperTB(e.target.checked)} />
                      Super tiebreak (en lugar de 3er set)
                    </label>
                  )}
                </div>
              )}

              {/* Walkover */}
              <label style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={walkover} onChange={e => setWalkover(e.target.checked)} />
                Walkover (W.O.)
              </label>

              {/* Resumen */}
              {canConfirm && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#166534' }}>
                  <span style={{ fontWeight: 600 }}>Ganador: {matches.find(m => m.id === selectedId && (m.team1_id === winner || m.team2_id === winner))?.team1_id === winner ? selected.team1?.name : selected.team2?.name}</span>
                  {!walkover && ' · ' + sets.filter(s => s[0] !== null).map(s => `${s[0]}-${s[1]}`).join(' / ')}
                  {walkover && ' · W.O.'}
                </div>
              )}
            </div>

            <div style={{ padding: '13px 16px', borderTop: '1px solid #e5e5e0', background: '#fafaf8', display: 'flex', gap: '8px' }}>
              {editMode && (
                <button onClick={() => { setSelectedId(null); setEditMode(false) }}
                  style={{ padding: '7px 14px', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
              <button onClick={handleConfirm} disabled={!canConfirm || saving}
                style={{ flex: 1, padding: '8px', background: canConfirm ? '#16a34a' : '#e5e5e0', color: canConfirm ? 'white' : '#aaa', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Guardando...' : editMode ? 'Guardar cambios' : 'Confirmar resultado'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
