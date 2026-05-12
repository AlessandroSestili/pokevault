'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Star } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { CardItem } from '../CardItem'
import { PokemonTypeIcon } from '../ui/PokemonTypeIcon'

const ELEMENTS = [
  { key: 'fire',      color: '#FF5B47', glyph: '▲', label: 'Fire' },
  { key: 'water',     color: '#3B9DFF', glyph: '◐', label: 'Water' },
  { key: 'lightning', color: '#FFCB2E', glyph: '✦', label: 'Lightning' },
  { key: 'grass',     color: '#37C26B', glyph: '✿', label: 'Grass' },
  { key: 'psychic',   color: '#B07BFF', glyph: '✺', label: 'Psychic' },
  { key: 'darkness',  color: '#7A8AA0', glyph: '◆', label: 'Darkness' },
  { key: 'fairy',     color: '#FF7AC4', glyph: '❋', label: 'Fairy' },
] as const

type SortKey = 'value' | 'recent' | 'mover' | 'alpha'
const SORT_LABELS: Record<SortKey, string> = {
  value: 'Valore', recent: 'Recenti', mover: 'Top mover', alpha: 'A–Z',
}

function sortCards(cards: CollectionCardWithPrice[], sort: SortKey): CollectionCardWithPrice[] {
  const arr = [...cards]
  switch (sort) {
    case 'value':  return arr.sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))
    case 'recent': return arr.sort((a, b) => new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime())
    case 'mover':  return arr.sort((a, b) => {
      const ch = (c: CollectionCardWithPrice) => {
        const h = c.price_history.slice(-30)
        return h.length < 2 ? 0 : (h[h.length - 1].price_eur - h[0].price_eur) / h[0].price_eur
      }
      return ch(b) - ch(a)
    })
    case 'alpha': return arr.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export function CollectionPage({
  cards,
  search,
  favoritesOnly,
  onOpenCard,
  onToggleFav,
  onAdd,
}: {
  cards: CollectionCardWithPrice[]
  search: string
  favoritesOnly: boolean
  onOpenCard: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
  onAdd?: () => void
}) {
  const [elemFilter, setElemFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('value')
  const [favOnly, setFavOnly] = useState(favoritesOnly)

  useEffect(() => { setFavOnly(favoritesOnly) }, [favoritesOnly])

  const filtered = useMemo(() => {
    let arr = cards
    if (search) arr = arr.filter(c =>
      (c.name + ' ' + c.set_name + ' ' + c.card_number).toLowerCase().includes(search.toLowerCase())
    )
    if (elemFilter) arr = arr.filter(c => (c.element ?? '').toLowerCase() === elemFilter)
    if (favOnly) arr = arr.filter(c => c.is_favorite)
    return sortCards(arr, sort)
  }, [cards, search, elemFilter, favOnly, sort])

  const totalValue = cards.reduce((acc, c) => acc + (c.market_price ?? 0), 0)
  const totalCost  = cards.reduce((acc, c) => acc + c.cost_basis, 0)
  const pl = totalValue - totalCost

  function fmt(v: number) {
    return '€' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 1, background: 'var(--line)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {[
          { label: 'Carte',  value: cards.length.toString() },
          { label: 'Valore', value: fmt(totalValue) },
          { label: 'Costo',  value: fmt(totalCost) },
          { label: 'P&L',    value: `${pl >= 0 ? '+' : '−'}${fmt(Math.abs(pl))}`, color: pl >= 0 ? '#2DD881' : '#FF5B47' },
        ].map(item => (
          <div key={item.label} style={{ flex: 1, padding: '12px 20px', background: 'var(--bg-0)' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: item.color ?? 'var(--ink-0)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px',
        borderBottom: '1px solid var(--line)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Element filters */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            onClick={() => setElemFilter(null)}
            title="Tutti"
            style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: elemFilter === null ? 'var(--accent)' : 'var(--bg-2)',
              fontSize: 9, fontWeight: 700, color: elemFilter === null ? '#000' : 'var(--ink-3)',
            }}
          >
            ALL
          </button>
          {ELEMENTS.map(e => (
            <button
              key={e.key}
              onClick={() => setElemFilter(elemFilter === e.key ? null : e.key)}
              title={e.label}
              style={{
                width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                background: 'transparent',
                border: `1.5px solid ${elemFilter === e.key ? e.color : 'transparent'}`,
                opacity: elemFilter && elemFilter !== e.key ? 0.35 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
                boxShadow: elemFilter === e.key ? `0 0 0 3px ${e.color}33` : 'none',
                transition: 'opacity 140ms, box-shadow 140ms',
              } as React.CSSProperties}
            >
              <PokemonTypeIcon type={e.key} size={22} />
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />

        {/* Fav toggle */}
        <button
          onClick={() => setFavOnly(b => !b)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: favOnly ? 'rgba(255,203,46,0.15)' : 'var(--bg-2)',
            color: favOnly ? '#FFCB2E' : 'var(--ink-3)',
          }}
        >
          <Star size={11} fill={favOnly ? '#FFCB2E' : 'none'} strokeWidth={1.5} />
          Preferite
        </button>

        {/* Sort pills */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => setSort(k)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: sort === k ? 'rgba(255,203,46,0.15)' : 'var(--bg-2)',
                color: sort === k ? '#FFCB2E' : 'var(--ink-3)',
              }}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
          {filtered.length} carte
        </span>

        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#1a1500', fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} /> Aggiungi
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>⚡</div>
            <div style={{ fontFamily: 'var(--font-space)', fontSize: 20, fontWeight: 600, color: 'var(--ink-2)' }}>
              Nessuna carta trovata
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 280 }}>
              Prova a cambiare i filtri o la ricerca.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 14,
          }}>
            {filtered.map(c => (
              <CardItem key={c.id} card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
