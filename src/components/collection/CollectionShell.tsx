'use client'

import { useState, useMemo } from 'react'
import { Search, Star, Plus } from 'lucide-react'
import type { CollectionCardWithPrice, CardFilters, SortKey } from '@/types'
import { filterCards } from '@/lib/filters'
import { sortCards } from '@/lib/sorts'
import { computePortfolioTotals } from '@/lib/totals'
import { StatsBar } from './StatsBar'
import { CardGrid } from './CardGrid'
import { CardDetailSheet } from './CardDetailSheet'
import { AddCardModal } from '@/components/modals/AddCardModal'
import { BottomNav } from '@/components/layout/BottomNav'

const DEFAULT_FILTERS: CardFilters = {
  search: '',
  element: null,
  set: null,
  rarity: null,
  language: null,
  favoritesOnly: false,
  minValue: null,
  maxValue: null,
}

export function CollectionShell({ cards: allCards }: { cards: CollectionCardWithPrice[] }) {
  const [filters, setFilters] = useState<CardFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortKey>('value')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => sortCards(filterCards(allCards, filters), sort), [allCards, filters, sort])
  const totals = useMemo(() => computePortfolioTotals(allCards), [allCards])
  const selectedCard = useMemo(() => allCards.find(c => c.id === selectedId) ?? null, [allCards, selectedId])

  return (
    <>
      <div className="flex-1 pb-nav">
        {/* Mobile topbar */}
        <div
          className="sticky top-0 z-40 md:hidden px-4 pt-4 pb-3"
          style={{ background: 'rgba(11, 13, 18, 0.95)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-semibold text-[18px] tracking-[-0.4px]" style={{ color: 'var(--accent)' }}>
              PokeVault
            </span>
            <button onClick={() => setFilters(f => ({ ...f, favoritesOnly: !f.favoritesOnly }))} className="p-1.5">
              <Star
                size={18}
                strokeWidth={1.5}
                style={{ color: filters.favoritesOnly ? 'var(--accent)' : 'var(--text-2)' }}
                fill={filters.favoritesOnly ? 'var(--accent)' : 'none'}
              />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-2)' }} />
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Cerca carte, set..."
              className="w-full pl-8 pr-4 py-2 rounded-xl font-mono text-[13px] outline-none"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-0)' }}
            />
          </div>
        </div>

        <div className="px-4 md:px-8 py-4 space-y-5 max-w-[1400px] mx-auto">
          <StatsBar totals={totals} />

          {/* Sort pills + count + desktop add button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {/* Desktop add button */}
            <button
              onClick={() => setAddOpen(true)}
              className="hidden md:flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11px] transition-colors"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              <Plus size={12} strokeWidth={2.5} />
              Aggiungi
            </button>

            {(['value', 'recent', 'alpha', 'mover'] as SortKey[]).map((key) => {
              const labels: Record<string, string> = { value: 'Valore', recent: 'Recenti', alpha: 'A–Z', mover: 'Top mover' }
              const active = sort === key
              return (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full font-mono text-[11px] transition-colors"
                  style={{
                    background: active ? 'var(--accent-dim)' : 'var(--bg-1)',
                    color: active ? 'var(--accent)' : 'var(--text-1)',
                    border: `1px solid ${active ? 'rgba(255,203,46,0.3)' : 'var(--border)'}`,
                  }}
                >
                  {labels[key]}
                </button>
              )
            })}
            <div className="flex-1" />
            <span className="font-mono text-[11px] flex-shrink-0" style={{ color: 'var(--text-2)' }}>
              {filtered.length} carte
            </span>
          </div>

          <CardGrid cards={filtered} onCardClick={setSelectedId} />
        </div>
      </div>

      <BottomNav onAdd={() => setAddOpen(true)} />

      {/* Detail sheet */}
      <CardDetailSheet
        card={selectedCard}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />

      {/* Add card modal */}
      <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}
