'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Star, Grid3X3, Layers, ChevronLeft } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { CardItem } from '../CardItem'
import { PokemonTypeIcon } from '../ui/PokemonTypeIcon'

type ViewMode = 'cards' | 'sets'

interface SetGroup {
  set_id: string
  set_name: string
  set_code: string
  cards: CollectionCardWithPrice[]
  imageUrl: string | null
  totalValue: number
  totalCost: number
}

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

const VALUE_THRESHOLDS = [
  { label: 'Tutte', value: null },
  { label: '›€1',  value: 1 },
  { label: '›€5',  value: 5 },
  { label: '›€10', value: 10 },
] as const

export function CollectionPage({
  cards,
  search,
  favoritesOnly,
  minValue: initialMinValue = null,
  onOpenCard,
  onToggleFav,
  onAdd,
}: {
  cards: CollectionCardWithPrice[]
  search: string
  favoritesOnly: boolean
  minValue?: number | null
  onOpenCard: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
  onAdd?: () => void
}) {
  const [elemFilter, setElemFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('value')
  const [favOnly, setFavOnly] = useState(favoritesOnly)
  const [minValueFilter, setMinValueFilter] = useState<number | null>(initialMinValue)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [drillSet, setDrillSet] = useState<string | null>(null)

  useEffect(() => { setFavOnly(favoritesOnly) }, [favoritesOnly])
  useEffect(() => { setMinValueFilter(initialMinValue) }, [initialMinValue])

  const setGroups = useMemo<SetGroup[]>(() => {
    const map = new Map<string, SetGroup>()
    for (const card of cards) {
      const key = card.set_name
      if (!map.has(key)) {
        map.set(key, {
          set_id: card.set_id,
          set_name: card.set_name,
          set_code: card.set_code || card.set_id.toUpperCase(),
          cards: [],
          imageUrl: card.image_url,
          totalValue: 0,
          totalCost: 0,
        })
      }
      const g = map.get(key)!
      g.cards.push(card)
      g.totalValue += card.market_price ?? 0
      g.totalCost += card.cost_basis
      if (!g.imageUrl && card.image_url) g.imageUrl = card.image_url
    }
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [cards])

  const filtered = useMemo(() => {
    let arr = cards
    if (drillSet) arr = arr.filter(c => c.set_name === drillSet)
    if (search) arr = arr.filter(c =>
      (c.name + ' ' + c.set_name + ' ' + c.card_number).toLowerCase().includes(search.toLowerCase())
    )
    if (elemFilter) arr = arr.filter(c => (c.element ?? '').toLowerCase() === elemFilter)
    if (favOnly) arr = arr.filter(c => c.is_favorite)
    if (minValueFilter !== null) arr = arr.filter(c => (c.market_price ?? 0) > minValueFilter)
    return sortCards(arr, sort)
  }, [cards, search, elemFilter, favOnly, minValueFilter, sort, drillSet])

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
        {/* Back from drill-down */}
        {viewMode === 'cards' && drillSet && (
          <button
            onClick={() => { setDrillSet(null); setViewMode('sets') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: 'var(--bg-2)', color: 'var(--ink-2)',
            }}
          >
            <ChevronLeft size={13} /> Set
          </button>
        )}

        {/* Element filters — hidden in sets view */}
        {viewMode === 'cards' && (
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
        )}

        {viewMode === 'cards' && <div style={{ width: 1, height: 20, background: 'var(--line)' }} />}

        {/* Value threshold chips */}
        {viewMode === 'cards' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {VALUE_THRESHOLDS.map(t => (
              <button
                key={String(t.value)}
                onClick={() => setMinValueFilter(minValueFilter === t.value ? null : t.value)}
                style={{
                  padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  background: minValueFilter === t.value ? 'rgba(45,216,129,0.15)' : 'var(--bg-2)',
                  color: minValueFilter === t.value ? '#2DD881' : 'var(--ink-3)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'cards' && <div style={{ width: 1, height: 20, background: 'var(--line)' }} />}

        {/* Fav toggle */}
        {viewMode === 'cards' && (
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
        )}

        {/* Sort pills — hidden in sets view */}
        {viewMode === 'cards' && (
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
        )}

        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', marginLeft: viewMode === 'sets' ? 'auto' : undefined }}>
          {viewMode === 'sets' ? `${setGroups.length} set` : `${filtered.length} carte`}
        </span>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-2)', borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => { setViewMode('cards'); setDrillSet(null) }}
            title="Vista carte"
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: viewMode === 'cards' ? 'var(--bg-1)' : 'transparent',
              color: viewMode === 'cards' ? 'var(--ink-0)' : 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
            }}
          >
            <Grid3X3 size={13} />
          </button>
          <button
            onClick={() => { setViewMode('sets'); setDrillSet(null) }}
            title="Vista set"
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: viewMode === 'sets' ? 'var(--bg-1)' : 'transparent',
              color: viewMode === 'sets' ? 'var(--ink-0)' : 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: viewMode === 'sets' ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
            }}
          >
            <Layers size={13} />
          </button>
        </div>

        {onAdd && viewMode === 'cards' && (
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
        {viewMode === 'sets' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {setGroups.map(g => (
              <PokemonSetCard
                key={g.set_name}
                group={g}
                onClick={() => { setDrillSet(g.set_name); setViewMode('cards') }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
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

function PokemonSetCard({ group, onClick }: { group: SetGroup; onClick: () => void }) {
  const pl = group.totalValue - group.totalCost
  const logoUrl = `https://images.pokemontcg.io/${group.set_id}/logo.png`

  function fmt(v: number) {
    return '€' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-1)', borderRadius: 14, border: '1px solid var(--line)',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 140ms, transform 140ms, box-shadow 140ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--line-2)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Set logo area */}
      <div style={{
        height: 100, background: 'var(--bg-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 20px', position: 'relative', overflow: 'hidden',
      }}>
        {group.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.18, filter: 'blur(2px)',
            }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={group.set_name}
          referrerPolicy="no-referrer"
          style={{ maxWidth: '80%', maxHeight: 64, objectFit: 'contain', position: 'relative', zIndex: 1 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          fontWeight: 600, fontSize: 13, color: 'var(--ink-0)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2,
        }}>
          {group.set_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>
          {group.set_code} · {group.cards.length} {group.cards.length === 1 ? 'carta' : 'carte'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>Valore</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink-0)' }}>
              {fmt(group.totalValue)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>P&amp;L</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
              color: pl >= 0 ? '#2DD881' : '#FF5B47',
            }}>
              {pl >= 0 ? '+' : '−'}{fmt(Math.abs(pl))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
