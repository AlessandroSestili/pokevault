'use client'

import { Star } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { getElement } from '@/lib/elements'
import { PokemonTypeIcon } from './ui/PokemonTypeIcon'
import { fmtMoney } from '@/lib/fmt'

function gradeColor(g: number): string {
  if (g >= 9.5) return '#2DD881'
  if (g >= 8)   return '#FFCB2E'
  if (g >= 6)   return '#FF9A3B'
  if (g >= 4)   return '#FF5B47'
  return '#B07BFF'
}

function fmtPct(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'
}

export function CardItem({
  card,
  onOpen,
  onToggleFav,
}: {
  card: CollectionCardWithPrice
  onOpen: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
  showSpark?: boolean
  density?: string
}) {
  const el = getElement(card.element)
  const histValues = card.price_history.map(s => s.price_eur)
  const last30 = histValues.slice(-30)
  const change30 = last30.length >= 2
    ? ((last30[last30.length - 1] - last30[0]) / last30[0]) * 100
    : null
  const gColor = gradeColor(card.condition)

  return (
    <div
      onClick={() => onOpen(card)}
      style={{
        background: 'var(--bg-1)', borderRadius: 14,
        border: '1px solid var(--line)',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease',
        position: 'relative',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--line-2)'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 8px 32px rgba(0,0,0,.4)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--line)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Card image */}
      <div style={{ position: 'relative', aspectRatio: '5/7', background: 'var(--bg-2)', overflow: 'hidden' }}>
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.name}
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `radial-gradient(circle at 40% 35%, ${el.color}22 0%, var(--bg-2) 70%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, color: el.color, opacity: 0.5,
          }}>
            {el.glyph}
          </div>
        )}

        {/* Rarity badge */}
        {card.rarity && (
          <div style={{
            position: 'absolute', top: 7, left: 7,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            padding: '2px 7px', borderRadius: 6, fontSize: 9,
            fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.04em',
            maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {card.rarity}
          </div>
        )}

        {/* Fav button */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFav(card.id) }}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            border: 'none', borderRadius: 8, padding: '5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Star
            size={13} strokeWidth={1.5}
            style={{
              color: card.is_favorite ? '#FFCB2E' : 'rgba(255,255,255,0.55)',
              fill: card.is_favorite ? '#FFCB2E' : 'none',
            }}
          />
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontWeight: 600, fontSize: 13, color: 'var(--ink-0)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {card.name}
        </div>

        <div style={{
          fontSize: 11, color: 'var(--ink-3)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 8,
        }}>
          {card.set_code || card.set_id.toUpperCase()} · #{card.card_number}
        </div>

        {/* Element pip + grade + price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Element pip */}
          <PokemonTypeIcon type={card.element} size={18} />

          {/* Grade */}
          <span style={{
            fontSize: 10, fontWeight: 700, color: gColor,
            background: gColor + '1A', padding: '1px 6px', borderRadius: 5,
          }}>
            {card.condition}
          </span>

          {/* Language */}
          <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500 }}>
            {card.language}
          </span>

          {/* Delta */}
          {change30 !== null && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: change30 >= 0 ? '#2DD881' : '#FF5B47',
              marginLeft: 'auto',
            }}>
              {fmtPct(change30)}
            </span>
          )}

          {/* Price */}
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--ink-0)',
            fontVariantNumeric: 'tabular-nums',
            marginLeft: change30 !== null ? 0 : 'auto',
          }}>
            {fmtMoney(card.market_price)}
          </span>
        </div>
      </div>
    </div>
  )
}
