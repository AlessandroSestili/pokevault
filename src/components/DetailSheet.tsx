'use client'

import { useState } from 'react'
import { X, Star, Pencil, Trash2 } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { getElement, getInitials } from '@/lib/elements'
import { AreaChart } from './charts/AreaChart'

function fmtMoney(v: number | null) {
  if (v == null) return '—'
  return '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  return (
    <>
      <div className={'scrim' + (open ? ' is-open' : '')} onClick={onClose} />
      <aside className={'sheet' + (open ? ' is-open' : '')}>
        <div className="sheet__head">
          <h3>Dettaglio carta</h3>
          <button
            className={'card__star' + (card.is_favorite ? ' is-fav' : '')}
            style={{ width: 30, height: 30, background: 'var(--bg-2)', border: '1px solid var(--line)', margin: 0 }}
            onClick={() => onToggleFav(card.id)}
          >
            <Star size={14} fill={card.is_favorite ? 'currentColor' : 'none'} strokeWidth={1.5} />
          </button>
          <button className="sheet__close" onClick={onClose}><X size={14} /></button>
        </div>

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
            <button className="btn"><Pencil size={13} /> Modifica</button>
            <button className="btn btn--ghost" style={{ marginLeft: 'auto', color: 'var(--neg)' }}>
              <Trash2 size={13} /> Rimuovi
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
