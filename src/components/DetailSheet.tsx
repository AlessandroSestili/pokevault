'use client'

import { useState, useTransition } from 'react'
import { X, Star, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import type { CollectionCardWithPrice, Language, Source } from '@/types'
import { getElement, getInitials } from '@/lib/elements'
import { AreaChart } from './charts/AreaChart'
import { deleteCardAction, editCardAction } from '@/lib/actions'

const LANGUAGES: Language[] = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES: Source[] = ['Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro']

function fmtMoney(v: number | null) {
  if (v == null) return '—'
  return '€' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'
}
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

  if (!card) {
    return (
      <>
        <div className={'scrim' + (open ? ' is-open' : '')} onClick={onClose} />
        <div className="sheet" />
      </>
    )
  }

  const el = getElement(card.element)
  const initials = getInitials(card.name)
  const pl = (card.market_price ?? 0) - card.cost_basis
  const plPct = card.cost_basis > 0 ? (pl / card.cost_basis) * 100 : 0

  const allHistory = card.price_history.map(s => s.price_eur)
  const chartValues =
    range === '7d'  ? allHistory.slice(-7) :
    range === '30d' ? allHistory.slice(-30) :
    range === '90d' ? allHistory.slice(-90) :
    allHistory

  const chartValues2 = chartValues.length === 0
    ? [card.market_price ?? card.cost_basis]
    : chartValues

  const chartChange = chartValues2.length >= 2
    ? ((chartValues2[chartValues2.length - 1] - chartValues2[0]) / chartValues2[0]) * 100
    : 0

  function openEdit() {
    setCondition(String(card!.condition))
    setLanguage(card!.language as Language)
    setSource(card!.source as Source)
    setAcquiredDate(card!.acquired_date)
    setNotes(card!.notes ?? '')
    setEditError(null)
    setEditing(true)
  }

  function handleDelete() {
    const id = card!.id
    startTransition(async () => {
      await deleteCardAction(id)
      onClose()
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const conditionNum = parseFloat(condition)
    if (isNaN(conditionNum) || conditionNum < 1 || conditionNum > 10) {
      setEditError('Condizione non valida (1–10)')
      return
    }
    const id = card!.id
    startTransition(async () => {
      const ok = await editCardAction(id, {
        condition: conditionNum,
        language,
        source,
        acquired_date: acquiredDate,
        notes: notes.trim() || null,
      })
      if (ok) setEditing(false)
      else setEditError('Errore durante il salvataggio')
    })
  }

  return (
    <>
      <div className={'scrim' + (open ? ' is-open' : '')} onClick={() => { setEditing(false); onClose() }} />
      <aside className={'sheet' + (open ? ' is-open' : '')}>
        <div className="sheet__head">
          <h3>{editing ? 'Modifica carta' : 'Dettaglio carta'}</h3>
          {!editing && (
            <button
              className={'card__star' + (card.is_favorite ? ' is-fav' : '')}
              style={{ width: 30, height: 30, background: 'var(--bg-2)', border: '1px solid var(--line)', margin: 0 }}
              onClick={() => onToggleFav(card.id)}
            >
              <Star size={14} fill={card.is_favorite ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
          )}
          <button className="sheet__close" onClick={() => { setEditing(false); onClose() }}><X size={14} /></button>
        </div>

        {editing ? (
          <div className="sheet__body">
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ChevronLeft size={13} /> Indietro
            </button>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Condizione (PSA)', node: (
                  <input type="number" min="1" max="10" step="0.5" value={condition} onChange={e => setCondition(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-0)', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-jetbrains)', fontSize: 13 }} required />
                )},
                { label: 'Lingua', node: (
                  <select value={language} onChange={e => setLanguage(e.target.value as Language)}
                    style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-0)', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-jetbrains)', fontSize: 13 }}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                )},
                { label: 'Fonte', node: (
                  <select value={source} onChange={e => setSource(e.target.value as Source)}
                    style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-0)', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-jetbrains)', fontSize: 13 }}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                )},
                { label: 'Data acquisto', node: (
                  <input type="date" value={acquiredDate} onChange={e => setAcquiredDate(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-0)', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-jetbrains)', fontSize: 13 }} required />
                )},
                { label: 'Note (opzionale)', node: (
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-0)', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-jetbrains)', fontSize: 13, resize: 'none' }} />
                )},
              ].map(({ label, node }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>{label}</div>
                  {node}
                </div>
              ))}
              {editError && <p style={{ color: 'var(--neg)', fontFamily: 'var(--font-jetbrains)', fontSize: 12, textAlign: 'center', margin: 0 }}>{editError}</p>}
              <button type="submit" disabled={isPending} className="btn btn--primary" style={{ width: '100%', justifyContent: 'center', opacity: isPending ? 0.5 : 1 }}>
                {isPending ? 'Salvo...' : 'Salva modifiche'}
              </button>
            </form>
          </div>
        ) : (
        <div className="sheet__body">
          <div className="sheet__hero">
            <div className="sheet__art" style={{ '--art-a': el.color, '--art-b': el.glow } as React.CSSProperties}>
              <div className="card__art-grid" />
              <div className="card__art-frame" />
              {card.image_url
                ? <img src={card.image_url} alt={card.name} />
                : <>
                    <div className="card__glyph" style={{ fontSize: 96, bottom: -12, right: -4 }}>{el.glyph}</div>
                    <div className="sheet__art-mono">{initials}</div>
                  </>
              }
            </div>

            <div className="sheet__heroinfo">
              <div className="badge-row">
                <span className="badge badge--elem" style={{ '--art-a': el.color } as React.CSSProperties}>
                  <span className="dot" /> {el.label}
                </span>
                {card.rarity && <span className="badge">{card.rarity}</span>}
                <span className="badge">{card.language}</span>
              </div>
              <h2>{card.name}</h2>
              <div className="sub">{card.set_name} · {card.card_number}</div>
              <div className="sheet__bigprice">{fmtMoney(card.market_price)}</div>
            </div>
          </div>

          <div className="sheet__chartblock">
            <div className="sheet__chart-head">
              <h4>Andamento prezzo</h4>
              <div className="range-toggle">
                {(['7d', '30d', '90d', '1y'] as Range[]).map(r => (
                  <button key={r} className={range === r ? 'is-active' : ''} onClick={() => setRange(r)}>{r}</button>
                ))}
              </div>
            </div>
            <AreaChart values={chartValues2} color={el.color} height={180} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 4px 8px', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-jetbrains)' }}>
              <span>Min {fmtMoney(Math.min(...chartValues2))}</span>
              <span style={{ color: chartChange >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmtPct(chartChange)} nel periodo</span>
              <span>Max {fmtMoney(Math.max(...chartValues2))}</span>
            </div>
          </div>

          <div className="specs">
            <div className="spec"><div className="spec__label">Set</div><div className="spec__value">{card.set_code} — {card.set_name}</div></div>
            <div className="spec"><div className="spec__label">Numero</div><div className="spec__value">{card.card_number}</div></div>
            <div className="spec"><div className="spec__label">Rarità</div><div className="spec__value">{card.rarity ?? '—'}</div></div>
            <div className="spec"><div className="spec__label">Grado</div><div className="spec__value">{card.condition} / 10</div></div>
            <div className="spec"><div className="spec__label">Lingua</div><div className="spec__value">{card.language}</div></div>
            <div className="spec"><div className="spec__label">Acquisita</div><div className="spec__value">{fmtDate(card.acquired_date)}</div></div>
            <div className="spec"><div className="spec__label">Provenienza</div><div className="spec__value">{card.source}</div></div>
          </div>

          {card.notes && (
            <div className="notes">
              <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>Note</div>
              {card.notes}
            </div>
          )}

          <div className="sheet__actions">
            <button className="btn" onClick={openEdit} disabled={isPending}><Pencil size={13} /> Modifica</button>
            <button className="btn btn--ghost" style={{ marginLeft: 'auto', color: 'var(--neg)' }} onClick={handleDelete} disabled={isPending}>
              <Trash2 size={13} /> Rimuovi
            </button>
          </div>
        </div>
        )}
      </aside>
    </>
  )
}
