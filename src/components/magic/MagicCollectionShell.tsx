'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { Plus, Search, Star, Grid3X3, List, SlidersHorizontal } from 'lucide-react'
import type { MagicCardWithPrice, MagicColor } from '@/types'
import { MagicCardItem } from './MagicCardItem'
import { MagicDetailSheet } from './MagicDetailSheet'
import { AddMagicCardModal } from '@/components/modals/AddMagicCardModal'
import { editMagicCardAction } from '@/lib/actions-magic'

type SortKey = 'recent' | 'alpha' | 'value' | 'cmc'

const COLOR_MAP: Record<MagicColor, { bg: string }> = {
  W: { bg: '#E8DDB5' }, U: { bg: '#3B9DFF' }, B: { bg: '#6B7280' },
  R: { bg: '#FF5B47' }, G: { bg: '#37C26B' },
}

function sortCards(cards: MagicCardWithPrice[], sort: SortKey): MagicCardWithPrice[] {
  const arr = [...cards]
  switch (sort) {
    case 'recent': return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case 'alpha':  return arr.sort((a, b) => a.name.localeCompare(b.name))
    case 'value':  return arr.sort((a, b) => (b.market_price ?? b.cost_basis) - (a.market_price ?? a.cost_basis))
    case 'cmc':    return arr.sort((a, b) => a.cmc - b.cmc)
  }
}

function filterCards(
  cards: MagicCardWithPrice[],
  search: string,
  colorFilter: MagicColor | null,
  foilOnly: boolean,
  favOnly: boolean,
): MagicCardWithPrice[] {
  let result = cards
  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.set_name.toLowerCase().includes(q) ||
      c.collector_number.includes(q) ||
      (c.type_line ?? '').toLowerCase().includes(q)
    )
  }
  if (colorFilter) result = result.filter(c => c.colors?.includes(colorFilter))
  if (foilOnly) result = result.filter(c => c.foil)
  if (favOnly) result = result.filter(c => c.is_favorite)
  return result
}

export function MagicCollectionShell({
  initialCards,
  search,
  favoritesOnly,
  onOpenSearch,
}: {
  initialCards: MagicCardWithPrice[]
  search: string
  favoritesOnly: boolean
  onOpenSearch?: () => void
}) {
  const [cards, setCards] = useState(initialCards)
  useEffect(() => { setCards(initialCards) }, [initialCards])
  const [sort, setSort] = useState<SortKey>('recent')
  const [colorFilter, setColorFilter] = useState<MagicColor | null>(null)
  const [foilOnly, setFoilOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<MagicCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [, startTransition] = useTransition()

  const filtered = useMemo(
    () => sortCards(filterCards(cards, search, colorFilter, foilOnly, favoritesOnly), sort),
    [cards, search, colorFilter, foilOnly, favoritesOnly, sort]
  )

  const totalValue = cards.reduce((acc, c) => acc + (c.market_price ?? c.cost_basis), 0)
  const totalCost = cards.reduce((acc, c) => acc + c.cost_basis, 0)
  const pl = totalValue - totalCost

  function openCard(card: MagicCardWithPrice) {
    setSelectedCard(card)
    setSheetOpen(true)
  }

  function toggleFav(id: string) {
    const card = cards.find(c => c.id === id)
    if (!card) return
    const newFav = !card.is_favorite
    setCards(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newFav } : c))
    if (selectedCard?.id === id) setSelectedCard(prev => prev ? { ...prev, is_favorite: newFav } : prev)
    startTransition(async () => { await editMagicCardAction(id, { is_favorite: newFav }) })
  }

  const COLORS: MagicColor[] = ['W', 'U', 'B', 'R', 'G']
  const SORT_LABELS: Record<SortKey, string> = {
    recent: 'Recenti', alpha: 'A–Z', value: 'Valore', cmc: 'CMC',
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Stats strip */}
        <div style={{
          display: 'flex', gap: 1, background: 'var(--line)',
          borderBottom: '1px solid var(--line)', flexShrink: 0,
        }}>
          {[
            { label: 'Carte', value: cards.length.toString() },
            { label: 'Valore', value: '€' + totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
            { label: 'Costo', value: '€' + totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
            {
              label: 'P&L',
              value: `${pl >= 0 ? '+' : '−'}€${Math.abs(pl).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              color: pl >= 0 ? '#2DD881' : '#FF5B47',
            },
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
          {/* Color filters */}
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onClick={() => setColorFilter(null)}
              style={{
                width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: colorFilter === null ? 'var(--accent)' : 'var(--bg-2)',
                fontSize: 9, fontWeight: 700, color: colorFilter === null ? '#000' : 'var(--ink-3)',
              }}
              title="Tutti"
            >
              ALL
            </button>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColorFilter(colorFilter === c ? null : c)}
                title={{ W: 'Bianco', U: 'Blu', B: 'Nero', R: 'Rosso', G: 'Verde' }[c]}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: COLOR_MAP[c].bg,
                  opacity: colorFilter && colorFilter !== c ? 0.35 : 1,
                  boxShadow: colorFilter === c ? `0 0 0 3px ${COLOR_MAP[c].bg}55` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: c === 'W' ? '#3B3209' : '#fff',
                  transition: 'opacity 140ms, box-shadow 140ms',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--line)' }} />

          {/* Foil toggle */}
          <button
            onClick={() => setFoilOnly(b => !b)}
            style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: foilOnly ? 'linear-gradient(135deg, rgba(255,203,46,0.2), rgba(176,123,255,0.2))' : 'var(--bg-2)',
              color: foilOnly ? '#FFCB2E' : 'var(--ink-3)',
            }}
          >
            ✦ Foil
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Sort pills */}
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
              <button
                key={k}
                onClick={() => setSort(k)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: sort === k ? 'rgba(123,124,247,0.18)' : 'var(--bg-2)',
                  color: sort === k ? '#7B7CF7' : 'var(--ink-3)',
                }}
              >
                {SORT_LABELS[k]}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
            {filtered.length} carte
          </span>

          {/* Add button */}
          <button
            onClick={() => setAddOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #7B7CF7, #4F46E5)',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} /> Aggiungi
          </button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {filtered.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 14,
            }}>
              {filtered.map(card => (
                <MagicCardItem
                  key={card.id}
                  card={card}
                  onClick={openCard}
                  onToggleFav={toggleFav}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MagicDetailSheet
        card={selectedCard}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onToggleFav={toggleFav}
      />

      <AddMagicCardModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px', textAlign: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>✦</div>
      <div style={{ fontFamily: 'var(--font-space)', fontSize: 20, fontWeight: 600, color: 'var(--ink-2)' }}>
        Nessuna carta Magic
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 320 }}>
        Aggiungi la tua prima carta cercando su Scryfall
      </div>
      <button
        onClick={onAdd}
        style={{
          marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #7B7CF7, #4F46E5)',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }}
      >
        Aggiungi carta
      </button>
    </div>
  )
}
