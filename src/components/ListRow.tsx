'use client'

import { Star } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { getElement } from '@/lib/elements'

function fmtMoney(v: number | null) {
  if (v == null) return '—'
  return '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'
}

export function ListRow({
  card,
  onOpen,
  onToggleFav,
}: {
  card: CollectionCardWithPrice
  onOpen: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
}) {
  const el = getElement(card.element)
  const pl = (card.market_price ?? 0) - card.cost_basis
  const plPct = card.cost_basis > 0 ? (pl / card.cost_basis) * 100 : 0

  return (
    <div
      className="list__row"
      style={{ '--art-a': el.color } as React.CSSProperties}
      onClick={() => onOpen(card)}
    >
      <div className="list__thumb">
        {card.image_url
          ? <img src={card.image_url} alt={card.name} />
          : el.glyph
        }
      </div>
      <div>
        <div className="list__name">{card.name}</div>
        <div className="list__sub">{(card.set_code || card.set_id.toUpperCase())} · {card.card_number} · {card.language}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: el.color, display: 'inline-block' }} />
        <span style={{ fontSize: 12.5 }}>{el.label}</span>
      </div>
      <div style={{ fontSize: 12 }}>{card.rarity ?? '—'}</div>
      <div className="list__cell-grade">{card.condition}</div>
      <div className="list__money">{fmtMoney(card.cost_basis)}</div>
      <div className="list__money">{fmtMoney(card.market_price)}</div>
      <div className={'list__pl ' + (pl >= 0 ? 'pos' : 'neg')}>{fmtPct(plPct)}</div>
      <button
        className={'card__star' + (card.is_favorite ? ' is-fav' : '')}
        style={{ margin: 0 }}
        onClick={e => { e.stopPropagation(); onToggleFav(card.id) }}
      >
        <Star size={13} fill={card.is_favorite ? 'currentColor' : 'none'} strokeWidth={1.5} />
      </button>
    </div>
  )
}
