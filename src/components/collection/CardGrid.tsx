'use client'

import Image from 'next/image'
import type { CollectionCardWithPrice } from '@/types'
import { formatEur, formatPct, formatCondition } from '@/lib/formats'

function PlBadge({ pl, pct }: { pl: number; pct: number }) {
  const pos = pl >= 0
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium"
      style={{
        background: pos ? 'var(--pos-dim)' : 'var(--neg-dim)',
        color: pos ? 'var(--pos)' : 'var(--neg)',
      }}
    >
      {pos ? '↑' : '↓'} {formatPct(pct)}
    </div>
  )
}

function CardThumbnail({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (!imageUrl) {
    return (
      <div
        className="w-full aspect-[2.5/3.5] rounded-xl flex items-center justify-center font-mono text-[10px]"
        style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}
      >
        No img
      </div>
    )
  }
  return (
    <div className="w-full aspect-[2.5/3.5] relative rounded-xl overflow-hidden">
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-contain"
        unoptimized
      />
    </div>
  )
}

function CardItem({ card, onClick }: { card: CollectionCardWithPrice; onClick: () => void }) {
  const pl = (card.market_price ?? 0) - card.cost_basis
  const plPct = card.cost_basis > 0 ? (pl / card.cost_basis) * 100 : 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.97]"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
    >
      <div className="p-2.5 pb-0">
        <CardThumbnail imageUrl={card.image_url} name={card.name} />
      </div>
      <div className="p-2.5 pt-2">
        <p
          className="font-display font-semibold text-[12.5px] leading-tight truncate tracking-[-0.2px] mb-0.5"
          style={{ color: 'var(--text-0)' }}
        >
          {card.name}
        </p>
        <p className="font-mono text-[10px] truncate mb-2" style={{ color: 'var(--text-2)' }}>
          {card.set_code} · {card.card_number}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-medium" style={{ color: 'var(--text-0)' }}>
            {card.market_price != null ? formatEur(card.market_price) : '—'}
          </span>
          {card.market_price != null && <PlBadge pl={pl} pct={plPct} />}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}
          >
            {card.language}
          </span>
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}
          >
            {formatCondition(card.condition)}
          </span>
          {card.is_favorite && (
            <span className="text-[11px]" title="Preferita">⭐</span>
          )}
        </div>
      </div>
    </button>
  )
}

export function CardGrid({
  cards,
  onCardClick,
}: {
  cards: CollectionCardWithPrice[]
  onCardClick: (id: string) => void
}) {
  if (cards.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 font-mono text-[13px] tracking-[0.3px]"
        style={{ color: 'var(--text-2)' }}
      >
        <span className="text-4xl mb-4">📦</span>
        Nessuna carta. Aggiungine una!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} onClick={() => onCardClick(card.id)} />
      ))}
    </div>
  )
}
