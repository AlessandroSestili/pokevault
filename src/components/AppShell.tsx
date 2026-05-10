'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Layers, Eye, Settings,
  Plus, Upload, Search,
} from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { editCardAction } from '@/lib/actions'
import { DashboardPage } from './pages/DashboardPage'
import { CollectionPage } from './pages/CollectionPage'
import { SettingsPage } from './pages/SettingsPage'
import { DetailSheet } from './DetailSheet'
import { AddCardModal } from './modals/AddCardModal'
import { ImportCsvModal } from './modals/ImportCsvModal'

type Page = 'dashboard' | 'collection' | 'watchlist' | 'settings'

export function AppShell({ initialCards }: { initialCards: CollectionCardWithPrice[] }) {
  const [cards, setCards] = useState(initialCards)
  const [page, setPage] = useState<Page>('dashboard')
  const [search, setSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState<CollectionCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Keep cards in sync if parent re-renders (server revalidation)
  useEffect(() => {
    console.log('[AppShell] initialCards updated, count:', initialCards.length, 'sample market_price:', initialCards[0]?.market_price)
    setCards(initialCards)
  }, [initialCards])

  // Esc closes sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSheetOpen(false); setAddOpen(false); setImportOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openCard(card: CollectionCardWithPrice) {
    setSelectedCard(card)
    setSheetOpen(true)
  }

  async function toggleFav(id: string) {
    const card = cards.find(c => c.id === id)
    if (!card) return
    const newFav = !card.is_favorite
    setCards(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newFav } : c))
    if (selectedCard?.id === id) setSelectedCard(prev => prev ? { ...prev, is_favorite: newFav } : prev)
    await editCardAction(id, { is_favorite: newFav })
  }

  const favCount = cards.filter(c => c.is_favorite).length

  const navItems = [
    { id: 'dashboard'  as Page, label: 'Dashboard',    Icon: LayoutDashboard, count: null },
    { id: 'collection' as Page, label: 'Collezione',   Icon: Layers,          count: cards.length },
    { id: 'watchlist'  as Page, label: 'Watchlist',    Icon: Eye,             count: favCount },
    { id: 'settings'   as Page, label: 'Impostazioni', Icon: Settings,        count: null },
  ]

  const showSearch = page === 'collection' || page === 'watchlist'

  return (
    <div className="app">
      {/* ── RAIL ── */}
      <nav className="rail">
        <div className="rail__brand">
          <div className="rail__logo" />
          <div>
            <h1>PokeVault</h1>
            <small>v 1.0 · Beta</small>
          </div>
        </div>

        <div className="rail__group">Workspace</div>
        {navItems.map(({ id, label, Icon, count }) => (
          <button
            key={id}
            className={'rail__item' + (page === id ? ' is-active' : '')}
            onClick={() => setPage(id)}
          >
            <span className="rail__dot" />
            <Icon size={14} />
            <span>{label}</span>
            {count !== null && <span className="rail__count">{count}</span>}
          </button>
        ))}

        <div className="rail__group">Azioni rapide</div>
        <button className="rail__item" onClick={() => setAddOpen(true)}>
          <span className="rail__dot" />
          <Plus size={14} />
          <span>Aggiungi carta</span>
        </button>
        <button className="rail__item" onClick={() => setImportOpen(true)}>
          <span className="rail__dot" />
          <Upload size={14} />
          <span>Importa CSV</span>
        </button>

        <div className="rail__user">
          <div className="rail__avatar">A</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Alessandro</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Piano Collector</div>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="main">
        <header className="topbar">
          <h2 className="topbar__title">
            {page === 'dashboard'  && <>Dashboard <span>· panoramica</span></>}
            {page === 'collection' && <>Collezione <span>· {cards.length} carte</span></>}
            {page === 'watchlist'  && <>Watchlist <span>· {favCount} preferite</span></>}
            {page === 'settings'   && <>Impostazioni</>}
          </h2>

          {showSearch && (
            <div className="search">
              <Search size={14} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca per nome, set, numero…"
              />
            </div>
          )}

          <div className="spacer" />

          {page !== 'settings' && (
            <>
              <button className="btn" onClick={() => setImportOpen(true)}>
                <Upload size={13} /> Importa
              </button>
              <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
                <Plus size={13} /> Aggiungi carta
              </button>
            </>
          )}
        </header>

        <div className="content">
          {page === 'dashboard' && (
            <DashboardPage
              cards={cards}
              onOpenCard={openCard}
              onToggleFav={toggleFav}
              onGoCollection={() => setPage('collection')}
            />
          )}
          {(page === 'collection' || page === 'watchlist') && (
            <CollectionPage
              cards={cards}
              search={search}
              favoritesOnly={page === 'watchlist'}
              onOpenCard={openCard}
              onToggleFav={toggleFav}
            />
          )}
          {page === 'settings' && <SettingsPage />}
        </div>
      </div>

      {/* ── OVERLAYS ── */}
      <DetailSheet
        card={selectedCard}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onToggleFav={toggleFav}
      />
      <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
