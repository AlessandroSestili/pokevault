'use client'

import { Star } from 'lucide-react'
import type { MagicCardWithPrice, MagicColor } from '@/types'
import { MagicManaIcon } from '@/components/ui/MagicManaIcon'


const CONDITION_COLOR: Record<string, string> = {
  NM:  '#2DD881',
  LP:  '#FFCB2E',
  MP:  '#FF9A3B',
  HP:  '#FF5B47',
  DMG: '#B07BFF',
}

function fmtMoney(v: number | null) {
  if (v == null) return '—'
  return '€' + v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function MagicCardItem({
  card,
  onClick,
  onToggleFav,
}: {
  card: MagicCardWithPrice
  onClick: (card: MagicCardWithPrice) => void
  onToggleFav?: (id: string) => void
}) {
  const colors = card.colors ?? []
  const condColor = CONDITION_COLOR[card.condition] ?? 'var(--ink-3)'

  return (
    <div
      onClick={() => onClick(card)}
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
          <img
            src={card.image_url}
            alt={card.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <MagicPlaceholder colors={colors} />
        )}

        {/* Foil badge */}
        {card.foil && (
          <div style={{
            position: 'absolute', top: 7, left: 7,
            background: 'linear-gradient(135deg, #FFCB2E, #B07BFF)',
            padding: '2px 7px', borderRadius: 6, fontSize: 9,
            fontWeight: 700, color: '#000', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Foil
          </div>
        )}

        {/* Fav button */}
        {onToggleFav && (
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
        )}
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

        {/* Set + collector number */}
        <div style={{
          fontSize: 11, color: 'var(--ink-3)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 8,
        }}>
          {card.set_name} · #{card.collector_number}
        </div>

        {/* Colors + condition + price row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Color pips */}
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {colors.length === 0 ? (
              <MagicManaIcon color="C" size={16} />
            ) : colors.slice(0, 5).map(c => (
              <MagicManaIcon key={c} color={c} size={16} />
            ))}
          </div>

          {/* Condition */}
          <span style={{
            fontSize: 10, fontWeight: 700, color: condColor,
            background: condColor + '1A', padding: '1px 6px', borderRadius: 5,
          }}>
            {card.condition}
          </span>

          {/* Price */}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-0)', fontVariantNumeric: 'tabular-nums' }}>
            {fmtMoney(card.market_price ?? card.cost_basis)}
          </span>
        </div>
      </div>
    </div>
  )
}


const COLOR_BG: Record<MagicColor, string> = { W: '#E8DDB5', U: '#3B9DFF', B: '#6B7280', R: '#FF5B47', G: '#37C26B' }

function MagicPlaceholder({ colors }: { colors: MagicColor[] }) {
  const primary = colors[0]
  const bg = primary ? COLOR_BG[primary] : '#4F5568'
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(circle at 40% 35%, ${bg}33 0%, var(--bg-2) 70%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 32, opacity: 0.6,
    }}>
      ✦
    </div>
  )
}
