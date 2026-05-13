'use client'

import { useState, useTransition } from 'react'
import { X, Star, Pencil, Trash2 } from 'lucide-react'
import type { CollectionCardWithPrice, Language, Source } from '@/types'
import { getElement } from '@/lib/elements'
import { PokemonTypeIcon } from './ui/PokemonTypeIcon'
import { AreaChart } from './charts/AreaChart'
import { deleteCardAction, editCardAction } from '@/lib/actions'
import { fmtMoney, fmtPct } from '@/lib/fmt'

const LANGUAGES: Language[] = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES: Source[] = ['Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro']
function fmtDate(iso: string) {
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  const d = new Date(iso)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

type Range = '7d' | '30d' | '90d' | '1y'

export function DetailSheet({
  card,
  open,
  onClose,
  onToggleFav,
}: {
  card: CollectionCardWithPrice | null
  open: boolean
  onClose: () => void
  onToggleFav: (id: string) => void
}) {
  const [range, setRange] = useState<Range>('30d')
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [condition, setCondition] = useState('')
  const [language, setLanguage] = useState<Language>('EN')
  const [source, setSource] = useState<Source>('Cardmarket')
  const [acquiredDate, setAcquiredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const el = card ? getElement(card.element) : null
  const pl = card ? (card.market_price ?? 0) - card.cost_basis : 0
  const plPct = card?.cost_basis ? (pl / card.cost_basis) * 100 : 0

  const allHistory = card?.price_history.map(s => s.price_eur) ?? []
  const chartValues = range === '7d' ? allHistory.slice(-7)
    : range === '30d' ? allHistory.slice(-30)
    : range === '90d' ? allHistory.slice(-90)
    : allHistory
  const chartValues2 = chartValues.length === 0
    ? [card?.market_price ?? card?.cost_basis ?? 0]
    : chartValues
  const chartChange = chartValues2.length >= 2
    ? ((chartValues2[chartValues2.length - 1] - chartValues2[0]) / chartValues2[0]) * 100
    : 0

  function openEdit() {
    if (!card) return
    setCondition(String(card.condition))
    setLanguage(card.language as Language)
    setSource(card.source as Source)
    setAcquiredDate(card.acquired_date)
    setNotes(card.notes ?? '')
    setEditError(null)
    setEditing(true)
  }

  function handleDelete() {
    if (!card) return
    startTransition(async () => { await deleteCardAction(card.id); onClose() })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!card) return
    const condNum = parseFloat(condition)
    if (isNaN(condNum) || condNum < 1 || condNum > 10) { setEditError('Condizione non valida (1–10)'); return }
    startTransition(async () => {
      const ok = await editCardAction(card.id, { condition: condNum, language, source, acquired_date: acquiredDate, notes: notes.trim() || null })
      if (ok) setEditing(false)
      else setEditError('Errore durante il salvataggio')
    })
  }

  return (
    <>
      {/* Scrim */}
      <div
        onClick={() => { setEditing(false); onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 90, pointerEvents: open ? 'auto' : 'none',
          background: open ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
          transition: 'background 0.25s',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 440, background: 'var(--bg-1)',
        borderLeft: '1px solid var(--line)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(.2,.8,.2,1)',
        zIndex: 91, display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {card && el && (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '18px 20px 14px', borderBottom: '1px solid var(--line)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink-0)', lineHeight: 1.2, marginBottom: 4 }}>
                  {card.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {card.set_code} — {card.set_name} · #{card.card_number} · {card.language}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => onToggleFav(card.id)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}>
                  <Star size={16} strokeWidth={1.5}
                    style={{ color: card.is_favorite ? '#FFCB2E' : 'var(--ink-3)', fill: card.is_favorite ? '#FFCB2E' : 'none' }}
                  />
                </button>
                <button onClick={() => { setEditing(false); onClose() }} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}>
                  <X size={16} style={{ color: 'var(--ink-3)' }} />
                </button>
              </div>
            </div>

            {/* Card image + meta */}
            <div style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 130, flexShrink: 0, aspectRatio: '5/7', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-2)' }}>
                {card.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: el.color, opacity: 0.4 }}>
                    {el.glyph}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Element */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Tipo</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PokemonTypeIcon type={card.element} size={22} />
                    <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{el.label}</span>
                  </div>
                </div>
                {/* Rarity */}
                {card.rarity && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Rarità</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{card.rarity}</div>
                  </div>
                )}
                {/* Grade */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Grado PSA</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-0)' }}>
                    {card.condition}<span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 400 }}>/10</span>
                  </div>
                </div>
              </div>
            </div>

            {/* P&L strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1, background: 'var(--line)', margin: '0 20px',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {[
                { label: 'Prezzo mercato', value: fmtMoney(card.market_price) },
                { label: 'Costo acquisto', value: fmtMoney(card.cost_basis) },
                { label: 'P&L', value: `${pl >= 0 ? '+' : '−'}${fmtMoney(Math.abs(pl))}`, sub: `${fmtPct(plPct)}`, color: pl >= 0 ? '#2DD881' : '#FF5B47' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-2)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: item.color ?? 'var(--ink-0)' }}>{item.value}</div>
                  {item.sub && <div style={{ fontSize: 10, color: item.color }}>{item.sub}</div>}
                </div>
              ))}
            </div>

            {/* Price chart */}
            {allHistory.length >= 2 && (
              <div style={{ padding: '18px 20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Andamento prezzo
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['7d', '30d', '90d', '1y'] as Range[]).map(r => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: range === r ? el.color + '22' : 'var(--bg-2)',
                        color: range === r ? el.color : 'var(--ink-3)',
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <AreaChart values={chartValues2} color={el.color} height={120} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 2px 0', fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  <span>Min {fmtMoney(Math.min(...chartValues2))}</span>
                  <span style={{ color: chartChange >= 0 ? '#2DD881' : '#FF5B47' }}>{fmtPct(chartChange)}</span>
                  <span>Max {fmtMoney(Math.max(...chartValues2))}</span>
                </div>
              </div>
            )}

            {/* Details / Edit */}
            <div style={{ padding: '18px 20px', flex: 1 }}>
              {editing ? (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FieldLabel>Condizione (PSA 1–10)</FieldLabel>
                  <input type="number" min="1" max="10" step="0.5" value={condition}
                    onChange={e => setCondition(e.target.value)} required
                    style={inputStyle} />

                  <FieldLabel>Lingua</FieldLabel>
                  <select value={language} onChange={e => setLanguage(e.target.value as Language)} style={inputStyle}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>

                  <FieldLabel>Fonte</FieldLabel>
                  <select value={source} onChange={e => setSource(e.target.value as Source)} style={inputStyle}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>

                  <FieldLabel>Data acquisto</FieldLabel>
                  <input type="date" value={acquiredDate} onChange={e => setAcquiredDate(e.target.value)} required style={inputStyle} />

                  <FieldLabel>Note (opzionale)</FieldLabel>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }} />

                  {editError && <div style={{ color: '#FF5B47', fontSize: 12, background: 'rgba(255,91,71,0.1)', padding: '8px 12px', borderRadius: 8 }}>{editError}</div>}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={isPending} style={{
                      flex: 1, padding: '10px', background: 'var(--accent)', border: 'none',
                      borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#1a1500',
                    }}>
                      {isPending ? 'Salvo…' : 'Salva'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} style={{
                      padding: '10px 18px', background: 'var(--bg-2)', border: '1px solid var(--line)',
                      borderRadius: 10, fontSize: 13, cursor: 'pointer', color: 'var(--ink-1)',
                    }}>Annulla</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row label="Acquisita">{fmtDate(card.acquired_date)}</Row>
                  <Row label="Fonte">{card.source}</Row>
                  <Row label="Lingua">{card.language}</Row>
                  {card.notes && <Row label="Note"><span style={{ whiteSpace: 'pre-wrap' }}>{card.notes}</span></Row>}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {!editing && (
              <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
                <button onClick={openEdit} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px', background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 10, fontSize: 13, cursor: 'pointer', color: 'var(--ink-1)',
                }}>
                  <Pencil size={14} /> Modifica
                </button>
                <button onClick={handleDelete} disabled={isPending} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px 16px', background: 'rgba(255,91,71,0.1)', border: '1px solid rgba(255,91,71,0.25)',
                  borderRadius: 10, fontSize: 13, cursor: 'pointer', color: '#FF5B47',
                }}>
                  <Trash2 size={14} /> Elimina
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-2)', border: '1px solid var(--line)',
  borderRadius: 10, color: 'var(--ink-0)', fontSize: 13, outline: 'none',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</div>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--ink-1)', textAlign: 'right' }}>{children}</span>
    </div>
  )
}
