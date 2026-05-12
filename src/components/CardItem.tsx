'use client'

import { Star } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { getElement, getInitials } from '@/lib/elements'
import { Sparkline } from './charts/Sparkline'

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

export function CardItem({
  card,
  onOpen,
  onToggleFav,
  showSpark = true,
  density = 'cozy',
}: {
  card: CollectionCardWithPrice
  onOpen: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
  showSpark?: boolean
  density?: 'compact' | 'cozy' | 'roomy'
}) {
  const el = getElement(card.element)
  const initials = getInitials(card.name)
  const histValues = card.price_history.map(s => s.price_eur)
  const last30 = histValues.length >= 30 ? histValues.slice(-30) : histValues
  const change30 = last30.length >= 2
    ? ((last30[last30.length - 1] - last30[0]) / last30[0]) * 100
    : 0
  const hasImage = !!card.image_url

  return (
    <div
      className={`card is-${density}`}
      style={{ '--art-a': el.color, '--art-b': el.glow } as React.CSSProperties}
      onClick={() => onOpen(card)}
    >
      <div className="card__art">
        {hasImage ? (
          <>
            <div className="card__art-bg" />
            <div className="card__art-grid" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.image_url!} alt={card.name} className="card__img" referrerPolicy="no-referrer" />
          </>
        ) : (
          <>
            <div className="card__art-bg" />
            <div className="card__art-grid" />
            <div className="card__art-frame" />
            <div className="card__art-monogram">{initials}</div>
            <div className="card__glyph">{el.glyph}</div>
          </>
        )}

        <div className="card__top">
          <div className="card__elem">{el.glyph}</div>
          {card.rarity && <div className="card__rarity">{card.rarity}</div>}
          <button
            className={'card__star' + (card.is_favorite ? ' is-fav' : '')}
            onClick={e => { e.stopPropagation(); onToggleFav(card.id) }}
          >
            <Star size={13} fill={card.is_favorite ? 'currentColor' : 'none'} strokeWidth={1.5} />
          </button>
        </div>

        <div className="card__hover">
          <div className="card__hover-row">
            <span>Grado</span><span>{card.condition}</span>
          </div>
          <div className="card__hover-row">
            <span>Acquistata</span><span>{fmtDate(card.acquired_date)}</span>
          </div>
        </div>
      </div>

      <div className="card__body">
        <h3 className="card__name">{card.name}</h3>
        <div className="card__set">
          <span className="card__setcode">{card.set_code || card.set_id.toUpperCase()}</span>
          <span>{card.set_name}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>{card.card_number}</span>
        </div>
        <div className="card__price-row">
          <div className="card__price">{fmtMoney(card.market_price)}</div>
          {last30.length >= 2 && (
            <div className={'card__delta ' + (change30 >= 0 ? 'pos' : 'neg')}>
              {fmtPct(change30)} 30g
            </div>
          )}
        </div>
        {showSpark && last30.length >= 2 && (
          <div className="card__spark">
            <Sparkline values={last30} />
          </div>
        )}
      </div>
    </div>
  )
}
