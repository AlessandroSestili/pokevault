'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ArrowUpDown, Grid3X3, List, Check, ChevronDown, Star, Layers } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { CardItem } from '../CardItem'
import { ListRow } from '../ListRow'

const ELEMENTS = [
  { key: 'fire',      color: '#FF5B47', label: 'Fire' },
  { key: 'water',     color: '#3B9DFF', label: 'Water' },
  { key: 'lightning', color: '#FFCB2E', label: 'Lightning' },
  { key: 'grass',     color: '#37C26B', label: 'Grass' },
  { key: 'psychic',   color: '#B07BFF', label: 'Psychic' },
  { key: 'darkness',  color: '#7A8AA0', label: 'Darkness' },
] as const

type SortKey = 'value' | 'recent' | 'mover' | 'alpha'
const SORT_LABELS: Record<SortKey, string> = {
  value: 'Valore (alto → basso)',
  recent: 'Acquisite di recente',
  mover: 'Top mover 30g',
  alpha: 'Alfabetico A → Z',
}

function sortCards(cards: CollectionCardWithPrice[], sort: SortKey): CollectionCardWithPrice[] {
  const arr = [...cards]
  switch (sort) {
    case 'value':  return arr.sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))
    case 'recent': return arr.sort((a, b) => new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime())
    case 'mover':  return arr.sort((a, b) => {
      const ch = (c: CollectionCardWithPrice) => {
        const h = c.price_history.slice(-30)
        if (h.length < 2) return 0
        return (h[h.length - 1].price_eur - h[0].price_eur) / h[0].price_eur
      }
      return ch(b) - ch(a)
    })
    case 'alpha':  return arr.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export function CollectionPage({
  cards,
  search,
  favoritesOnly,
  onOpenCard,
  onToggleFav,
}: {
  cards: CollectionCardWithPrice[]
  search: string
  favoritesOnly: boolean
  onOpenCard: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
}) {
  const [filterElem, setFilterElem] = useState<string | null>(null)
  const [filterFav, setFilterFav] = useState(favoritesOnly)
  const [sort, setSort] = useState<SortKey>('value')
  const [sortOpen, setSortOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [groupBySet, setGroupBySet] = useState(false)
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set())
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFilterFav(favoritesOnly)
  }, [favoritesOnly])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const filtered = useMemo(() => {
    let arr = cards
    if (search) arr = arr.filter(c => (c.name + ' ' + c.set_name + ' ' + c.card_number).toLowerCase().includes(search.toLowerCase()))
    if (filterElem) arr = arr.filter(c => (c.element ?? '').toLowerCase() === filterElem)
    if (filterFav) arr = arr.filter(c => c.is_favorite)
    return sortCards(arr, sort)
  }, [cards, search, filterElem, filterFav, sort])

  const groupedSets = useMemo(() => {
    const map = new Map<string, CollectionCardWithPrice[]>()
    for (const c of filtered) {
      const key = c.set_name || 'Senza set'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  function toggleSet(name: string) {
    setCollapsedSets(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__chips">
          <button
            className={'chip' + (!filterElem && !filterFav ? ' is-active' : '')}
            onClick={() => { setFilterElem(null); setFilterFav(false) }}
          >
            Tutte
          </button>
          {ELEMENTS.map(el => (
            <button
              key={el.key}
              className={'chip' + (filterElem === el.key ? ' is-active' : '')}
              onClick={() => setFilterElem(filterElem === el.key ? null : el.key)}
            >
              <span className="chip__dot" style={{ background: el.color }} />
              {el.label}
            </button>
          ))}
          <button
            className={'chip' + (filterFav ? ' is-active' : '')}
            onClick={() => setFilterFav(f => !f)}
          >
            <Star size={11} fill={filterFav ? 'currentColor' : 'none'} strokeWidth={1.5} />
            Preferite
          </button>
        </div>

        <div className="toolbar__right">
          <div className="menu-wrap" ref={sortRef}>
            <button className="btn" onClick={() => setSortOpen(o => !o)}>
              <ArrowUpDown size={13} />
              Ordina: {sort === 'value' ? 'Valore' : sort === 'recent' ? 'Recenti' : sort === 'mover' ? 'Top mover' : 'A → Z'}
              <ChevronDown size={12} />
            </button>
            <div className={'menu' + (sortOpen ? ' is-open' : '')}>
              {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, l]) => (
                <button
                  key={k}
                  className={sort === k ? 'is-on' : ''}
                  onClick={() => { setSort(k); setSortOpen(false) }}
                >
                  {l}
                  <span className="check"><Check size={12} /></span>
                </button>
              ))}
            </div>
          </div>

          <div className="viewtoggle">
            <button className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')}>
              <Grid3X3 size={14} />
            </button>
            <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}>
              <List size={14} />
            </button>
            <button className={groupBySet ? 'is-active' : ''} onClick={() => setGroupBySet(g => !g)} title="Raggruppa per set">
              <Layers size={14} />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>Nessuna carta trovata</h3>
          <p>Prova a rimuovere qualche filtro o cambia la ricerca.</p>
        </div>
      ) : groupBySet ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groupedSets.map(([setName, setCards]) => {
            const collapsed = collapsedSets.has(setName)
            const total = setCards.reduce((s, c) => s + (c.market_price ?? 0), 0)
            return (
              <div key={setName} style={{ border: '1px solid var(--line-2)', borderRadius: 12, overflow: 'hidden' }}>
                <button
                  onClick={() => toggleSet(setName)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--bg-2)', cursor: 'pointer',
                    fontFamily: 'var(--font-jetbrains)', fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--ink-0)' }}>{setName}</span>
                  <span style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--ink-3)' }}>
                    <span>{setCards.length} carte</span>
                    {total > 0 && <span style={{ color: 'var(--accent)' }}>€{total.toFixed(2)}</span>}
                    <ChevronDown size={13} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
                  </span>
                </button>
                {!collapsed && (
                  view === 'list' ? (
                    <div className="listview" style={{ padding: '0 12px 12px' }}>
                      <div className="list__head">
                        <div></div>
                        <div>Nome</div>
                        <div>Elemento</div>
                        <div>Rarità</div>
                        <div>Grado</div>
                        <div style={{ textAlign: 'right' }}>Valore</div>
                        <div style={{ textAlign: 'right' }}>P&L</div>
                        <div></div>
                      </div>
                      {setCards.map(c => (
                        <ListRow key={c.id} card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} />
                      ))}
                    </div>
                  ) : (
                  <div className="cards is-cozy" style={{ padding: '12px 12px' }}>
                    {setCards.map((c, i) => (
                      <div key={c.id} style={{ animationDelay: `${i * 20}ms` }}>
                        <CardItem card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} showSpark density="cozy" />
                      </div>
                    ))}
                  </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      ) : view === 'grid' ? (
        <div className="cards is-cozy">
          {filtered.map((c, i) => (
            <div key={c.id} style={{ animationDelay: `${i * 30}ms` }}>
              <CardItem card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} showSpark density="cozy" />
            </div>
          ))}
        </div>
      ) : (
        <div className="listview">
          <div className="list__head">
            <div></div>
            <div>Nome</div>
            <div>Elemento</div>
            <div>Rarità</div>
            <div>Grado</div>
            <div style={{ textAlign: 'right' }}>Valore</div>
            <div style={{ textAlign: 'right' }}>P&L</div>
            <div></div>
          </div>
          {filtered.map(c => (
            <ListRow key={c.id} card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} />
          ))}
        </div>
      )}
    </>
  )
}
