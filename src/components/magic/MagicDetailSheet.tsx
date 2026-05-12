'use client'

import { useState, useTransition } from 'react'
import { X, Star, Pencil, Trash2, FlipHorizontal } from 'lucide-react'
import type { MagicCardWithPrice, MagicColor, MagicCondition } from '@/types'
import { editMagicCardAction, deleteMagicCardAction } from '@/lib/actions-magic'

const COLOR_MAP: Record<MagicColor, { bg: string; label: string }> = {
  W: { bg: '#E8DDB5', label: 'W' },
  U: { bg: '#3B9DFF', label: 'U' },
  B: { bg: '#6B7280', label: 'B' },
  R: { bg: '#FF5B47', label: 'R' },
  G: { bg: '#37C26B', label: 'G' },
}

const CONDITIONS: MagicCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
const CONDITION_LABEL: Record<MagicCondition, string> = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
}
const CONDITION_COLOR: Record<MagicCondition, string> = {
  NM: '#2DD881', LP: '#FFCB2E', MP: '#FF9A3B', HP: '#FF5B47', DMG: '#B07BFF',
}

function fmtMoney(v: number | null) {
  if (v == null) return '—'
  return '€' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  const d = new Date(iso)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function MagicDetailSheet({
  card,
  open,
  onClose,
  onToggleFav,
}: {
  card: MagicCardWithPrice | null
  open: boolean
  onClose: () => void
  onToggleFav?: (id: string) => void
}) {
  const [showBack, setShowBack] = useState(false)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [condition, setCondition] = useState<MagicCondition>('NM')
  const [costBasis, setCostBasis] = useState('')
  const [notes, setNotes] = useState('')

  const hasBack = !!card?.image_url_back

  function startEdit() {
    if (!card) return
    setCondition(card.condition)
    setCostBasis(card.cost_basis.toString())
    setNotes(card.notes ?? '')
    setEditing(true)
  }

  function saveEdit() {
    if (!card) return
    startTransition(async () => {
      await editMagicCardAction(card.id, {
        condition,
        cost_basis: parseFloat(costBasis) || 0,
        notes: notes || null,
      })
      setEditing(false)
      onClose()
    })
  }

  function doDelete() {
    if (!card) return
    if (!confirm(`Eliminare "${card.name}"?`)) return
    startTransition(async () => {
      await deleteMagicCardAction(card.id)
      onClose()
    })
  }

  const colors = card?.colors ?? []
  const pl = card ? (card.market_price ?? card.cost_basis) - card.cost_basis : 0
  const plPct = card?.cost_basis ? (pl / card.cost_basis) * 100 : 0

  return (
    <>
      <div
        className={'scrim' + (open ? ' is-open' : '')}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0)', zIndex: 90, pointerEvents: open ? 'auto' : 'none', transition: 'background 0.25s' }}
        ref={el => { if (el) el.style.background = open ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)' }}
      />
      <div
        className="sheet"
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 440, background: 'var(--bg-1)',
          borderLeft: '1px solid var(--line)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(.2,.8,.2,1)',
          zIndex: 91, display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {card && (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '18px 20px 14px',
              borderBottom: '1px solid var(--line)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink-0)', lineHeight: 1.2, marginBottom: 4 }}>
                  {card.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {card.set_name} · #{card.collector_number} · {card.language}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {onToggleFav && (
                  <button onClick={() => onToggleFav(card.id)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}>
                    <Star size={16} strokeWidth={1.5}
                      style={{ color: card.is_favorite ? '#FFCB2E' : 'var(--ink-3)', fill: card.is_favorite ? '#FFCB2E' : 'none' }}
                    />
                  </button>
                )}
                <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}>
                  <X size={16} style={{ color: 'var(--ink-3)' }} />
                </button>
              </div>
            </div>

            {/* Card image */}
            <div style={{ padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', width: 130, flexShrink: 0 }}>
                <div style={{ aspectRatio: '5/7', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-2)' }}>
                  {(showBack ? card.image_url_back : card.image_url) ? (
                    <img
                      src={showBack && card.image_url_back ? card.image_url_back : (card.image_url ?? '')}
                      alt={card.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 40, color: 'var(--ink-3)',
                    }}>✦</div>
                  )}
                </div>
                {hasBack && (
                  <button
                    onClick={() => setShowBack(b => !b)}
                    style={{
                      position: 'absolute', bottom: 6, right: 6,
                      background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 7, padding: '5px',
                      cursor: 'pointer', display: 'flex',
                    }}
                    title="Mostra altro lato"
                  >
                    <FlipHorizontal size={13} style={{ color: 'var(--ink-1)' }} />
                  </button>
                )}
              </div>

              {/* Card meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {card.mana_cost && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Costo di mana</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-1)' }}>{card.mana_cost}</div>
                  </div>
                )}
                {card.type_line && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Tipo</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-1)' }}>{card.type_line}</div>
                  </div>
                )}
                {/* Colors */}
                {colors.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Colori</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {colors.map(c => (
                        <div key={c} title={COLOR_MAP[c]?.label} style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: COLOR_MAP[c]?.bg ?? '#8B92A1',
                          border: '2px solid rgba(0,0,0,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: c === 'W' ? '#3B3209' : '#fff',
                        }}>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Rarity */}
                {card.rarity && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Rarità</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-1)', textTransform: 'capitalize' }}>{card.rarity}</div>
                  </div>
                )}
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
                {
                  label: 'P&L',
                  value: `${pl >= 0 ? '+' : '−'}${fmtMoney(Math.abs(pl))}`,
                  sub: `${plPct >= 0 ? '+' : ''}${plPct.toFixed(1)}%`,
                  color: pl >= 0 ? '#2DD881' : '#FF5B47',
                },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-2)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: item.color ?? 'var(--ink-0)' }}>{item.value}</div>
                  {item.sub && <div style={{ fontSize: 10, color: item.color }}>{item.sub}</div>}
                </div>
              ))}
            </div>

            {/* Details / Edit section */}
            <div style={{ padding: '18px 20px', flex: 1 }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Label>Condizione</Label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CONDITIONS.map(c => (
                      <button
                        key={c}
                        onClick={() => setCondition(c)}
                        style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: condition === c ? CONDITION_COLOR[c] + '22' : 'var(--bg-2)',
                          border: `1px solid ${condition === c ? CONDITION_COLOR[c] : 'var(--line)'}`,
                          color: condition === c ? CONDITION_COLOR[c] : 'var(--ink-2)',
                          cursor: 'pointer',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <Label>Costo acquisto (€)</Label>
                  <input
                    type="number" value={costBasis} onChange={e => setCostBasis(e.target.value)}
                    style={{
                      background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10,
                      padding: '9px 12px', color: 'var(--ink-0)', fontSize: 13, outline: 'none',
                    }}
                  />

                  <Label>Note</Label>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Nessuna nota..."
                    style={{
                      background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10,
                      padding: '9px 12px', color: 'var(--ink-0)', fontSize: 13, outline: 'none',
                      resize: 'vertical',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={saveEdit} disabled={isPending}
                      style={{
                        flex: 1, padding: '10px', background: 'var(--accent)', border: 'none',
                        borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#000',
                      }}
                    >
                      {isPending ? 'Salvataggio…' : 'Salva'}
                    </button>
                    <button onClick={() => setEditing(false)}
                      style={{
                        padding: '10px 18px', background: 'var(--bg-2)', border: '1px solid var(--line)',
                        borderRadius: 10, fontSize: 13, cursor: 'pointer', color: 'var(--ink-1)',
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row label="Condizione">
                    <span style={{
                      color: CONDITION_COLOR[card.condition] ?? 'var(--ink-1)',
                      fontWeight: 600, fontSize: 13,
                    }}>
                      {card.condition} — {CONDITION_LABEL[card.condition]}
                    </span>
                  </Row>
                  <Row label="Foil">{card.foil ? 'Sì ✦' : 'No'}</Row>
                  <Row label="Lingua">{card.language}</Row>
                  {card.format && <Row label="Formato">{card.format}</Row>}
                  <Row label="Acquistato">{fmtDate(card.acquired_date)}</Row>
                  <Row label="Fonte">{card.source}</Row>
                  {card.notes && (
                    <Row label="Note">
                      <span style={{ whiteSpace: 'pre-wrap' }}>{card.notes}</span>
                    </Row>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {!editing && (
              <div style={{
                display: 'flex', gap: 8, padding: '14px 20px',
                borderTop: '1px solid var(--line)',
              }}>
                <button onClick={startEdit} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px', background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 10, fontSize: 13, cursor: 'pointer', color: 'var(--ink-1)',
                }}>
                  <Pencil size={14} /> Modifica
                </button>
                <button onClick={doDelete} disabled={isPending} style={{
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--ink-1)', textAlign: 'right' }}>{children}</span>
    </div>
  )
}
