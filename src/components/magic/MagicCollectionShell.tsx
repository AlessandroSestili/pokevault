'use client'

import { useState, useEffect, useMemo, useTransition, useRef, useCallback } from 'react'

const PAGE_SIZE = 80
import { Plus, Search, Star, Grid3X3, List, SlidersHorizontal, Layers, ChevronLeft } from 'lucide-react'
import type { MagicCardWithPrice, MagicColor } from '@/types'

type ViewMode = 'cards' | 'sets'

interface MagicSetGroup {
  set_id: string
  set_name: string
  cards: MagicCardWithPrice[]
  imageUrl: string | null
  totalValue: number
  totalCost: number
  colors: Set<MagicColor>
}
import { MagicCardItem } from './MagicCardItem'
import { MagicDetailSheet } from './MagicDetailSheet'
import { AddMagicCardModal } from '@/components/modals/AddMagicCardModal'
import { editMagicCardAction } from '@/lib/actions-magic'
import { MagicManaIcon } from '@/components/ui/MagicManaIcon'
import { filterMagicCards, sortMagicCards, type MagicSortKey } from '@/lib/filters-magic'

type SortKey = MagicSortKey

const VALUE_THRESHOLDS = [
  { label: 'Tutte', value: null },
  { label: '›€1',  value: 1 },
  { label: '›€5',  value: 5 },
  { label: '›€10', value: 10 },
] as const

export function MagicCollectionShell({
  initialCards,
  search,
  favoritesOnly,
  minValue: initialMinValue = null,
  onOpenSearch,
}: {
  initialCards: MagicCardWithPrice[]
  search: string
  favoritesOnly: boolean
  minValue?: number | null
  onOpenSearch?: () => void
}) {
  const [cards, setCards] = useState(initialCards)
  useEffect(() => { setCards(initialCards) }, [initialCards])
  const [sort, setSort] = useState<SortKey>('recent')
  const [colorFilter, setColorFilter] = useState<MagicColor | null>(null)
  const [foilOnly, setFoilOnly] = useState(false)
  const [minValueFilter, setMinValueFilter] = useState<number | null>(initialMinValue)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => { setMinValueFilter(initialMinValue) }, [initialMinValue])
  const [selectedCard, setSelectedCard] = useState<MagicCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [drillSet, setDrillSet] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const setGroups = useMemo<MagicSetGroup[]>(() => {
    const map = new Map<string, MagicSetGroup>()
    for (const card of cards) {
      const key = card.set_name
      if (!map.has(key)) {
        map.set(key, {
          set_id: card.set_id,
          set_name: card.set_name,
          cards: [],
          imageUrl: card.image_url,
          totalValue: 0,
          totalCost: 0,
          colors: new Set(),
        })
      }
      const g = map.get(key)!
      g.cards.push(card)
      g.totalValue += card.market_price ?? card.cost_basis
      g.totalCost += card.cost_basis
      if (!g.imageUrl && card.image_url) g.imageUrl = card.image_url
      for (const c of (card.colors ?? [])) g.colors.add(c)
    }
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [cards])

  const filtered = useMemo(
    () => {
      let base = cards
      if (drillSet) base = base.filter(c => c.set_name === drillSet)
      let result = filterMagicCards(base, search, colorFilter, foilOnly, favoritesOnly)
      if (minValueFilter !== null) result = result.filter(c => (c.market_price ?? c.cost_basis) > minValueFilter)
      return sortMagicCards(result, sort)
    },
    [cards, search, colorFilter, foilOnly, favoritesOnly, minValueFilter, sort, drillSet]
  )

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filtered])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [filtered.length, visibleCount])

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

          {/* Color filters — hidden in sets view */}
          {viewMode === 'cards' && (
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
                    width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${colorFilter === c ? '#7B7CF7' : 'transparent'}`,
                    cursor: 'pointer', background: 'transparent', padding: 0,
                    opacity: colorFilter && colorFilter !== c ? 0.35 : 1,
                    boxShadow: colorFilter === c ? '0 0 0 3px rgba(123,124,247,0.3)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 140ms, box-shadow 140ms',
                  }}
                >
                  <MagicManaIcon color={c} size={22} />
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

          {/* Foil toggle */}
          {viewMode === 'cards' && (
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
          )}

          {viewMode === 'cards' && (
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

          {/* Add button */}
          {viewMode === 'cards' && (
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
                <MagicSetCard
                  key={g.set_name}
                  group={g}
                  onClick={() => { setDrillSet(g.set_name); setViewMode('cards') }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} />
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 14,
              }}>
                {filtered.slice(0, visibleCount).map(card => (
                  <MagicCardItem
                    key={card.id}
                    card={card}
                    onClick={openCard}
                    onToggleFav={toggleFav}
                  />
                ))}
              </div>
              <div ref={sentinelRef} style={{ height: 1 }} />
            </>
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

function MagicSetCard({ group, onClick }: { group: MagicSetGroup; onClick: () => void }) {
  const pl = group.totalValue - group.totalCost
  const iconUrl = `https://svgs.scryfall.io/sets/${group.set_id}.svg`

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
        e.currentTarget.style.borderColor = '#7B7CF7'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(123,124,247,.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Set image area */}
      <div style={{
        height: 100, background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, position: 'relative', overflow: 'hidden',
      }}>
        {group.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.15, filter: 'blur(3px)',
            }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt={group.set_name}
          style={{ width: 56, height: 56, objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'invert(1) opacity(0.9)' }}
          onError={e => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
          }}
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
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
          {group.set_id.toUpperCase()} · {group.cards.length} {group.cards.length === 1 ? 'carta' : 'carte'}
          {group.cards.some(c => c.foil) && ' · ✦'}
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
