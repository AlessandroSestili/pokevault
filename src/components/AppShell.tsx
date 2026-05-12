'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Layers, Eye, Settings,
  Plus, Upload, Search,
} from 'lucide-react'
import type { CollectionCardWithPrice, MagicCardWithPrice, ActiveGame } from '@/types'
import { editCardAction } from '@/lib/actions'
import { DashboardPage } from './pages/DashboardPage'
import { CollectionPage } from './pages/CollectionPage'
import { SettingsPage } from './pages/SettingsPage'
import { DetailSheet } from './DetailSheet'
import { AddCardModal } from './modals/AddCardModal'
import { ImportCsvModal } from './modals/ImportCsvModal'
import { MagicCollectionShell } from './magic/MagicCollectionShell'
import { AddMagicCardModal } from './modals/AddMagicCardModal'

type Page = 'dashboard' | 'collection' | 'watchlist' | 'settings'

const GAMES: { id: ActiveGame; label: string; icon: string; color: string; disabled?: boolean }[] = [
  { id: 'pokemon', label: 'Pokémon TCG',          icon: '⚡', color: '#FFCB2E' },
  { id: 'magic',   label: 'Magic: The Gathering',  icon: '✦', color: '#7B7CF7' },
  { id: 'yugioh',  label: 'Yu-Gi-Oh!',             icon: '★', color: '#FF5B47', disabled: true },
]

export function AppShell({
  initialCards,
  initialMagicCards,
}: {
  initialCards: CollectionCardWithPrice[]
  initialMagicCards: MagicCardWithPrice[]
}) {
  const [cards, setCards] = useState(initialCards)
  const [page, setPage] = useState<Page>('dashboard')
  const [search, setSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState<CollectionCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [addMagicOpen, setAddMagicOpen] = useState(false)
  const [activeGame, setActiveGame] = useState<ActiveGame>('pokemon')

  useEffect(() => { setCards(initialCards) }, [initialCards])

  useEffect(() => {
    const saved = localStorage.getItem('tcgvault_game') as ActiveGame | null
    if (saved && ['pokemon', 'magic'].includes(saved)) setActiveGame(saved)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetOpen(false); setAddOpen(false)
        setImportOpen(false); setAddMagicOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function switchGame(game: ActiveGame) {
    if (game === 'yugioh') return
    setActiveGame(game)
    localStorage.setItem('tcgvault_game', game)
    setPage('dashboard')
  }

  function openCard(card: CollectionCardWithPrice) {
    setSelectedCard(card); setSheetOpen(true)
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
  const magicFavCount = initialMagicCards.filter(c => c.is_favorite).length

  const navItems = [
    { id: 'dashboard'  as Page, label: 'Dashboard',    Icon: LayoutDashboard, count: null },
    { id: 'collection' as Page, label: 'Collezione',   Icon: Layers,
      count: activeGame === 'magic' ? initialMagicCards.length : cards.length },
    { id: 'watchlist'  as Page, label: 'Watchlist',    Icon: Eye,
      count: activeGame === 'magic' ? magicFavCount : favCount },
    { id: 'settings'   as Page, label: 'Impostazioni', Icon: Settings, count: null },
  ]

  const showSearch = (page === 'collection' || page === 'watchlist') && activeGame === 'pokemon'
  const activeColor = GAMES.find(g => g.id === activeGame)?.color ?? '#FFCB2E'

  return (
    <div className="app">
      {/* ── RAIL ── */}
      <nav className="rail">
        <div className="rail__brand">
          <div className="rail__logo" />
          <div>
            <h1>TCG Vault</h1>
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
        {activeGame === 'pokemon' ? (
          <>
            <button className="rail__item" onClick={() => setAddOpen(true)}>
              <span className="rail__dot" /><Plus size={14} /><span>Aggiungi carta</span>
            </button>
            <button className="rail__item" onClick={() => setImportOpen(true)}>
              <span className="rail__dot" /><Upload size={14} /><span>Importa CSV</span>
            </button>
          </>
        ) : (
          <button className="rail__item" onClick={() => setAddMagicOpen(true)}>
            <span className="rail__dot" /><Plus size={14} /><span>Aggiungi carta</span>
          </button>
        )}

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
        {/* Game tabs */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-0)',
          flexShrink: 0,
        }}>
          {GAMES.map(g => {
            const active = activeGame === g.id
            return (
              <button
                key={g.id}
                onClick={() => switchGame(g.id)}
                disabled={g.disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 22px', height: 44,
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${active ? g.color : 'transparent'}`,
                  color: active ? g.color : g.disabled ? 'var(--ink-3)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  cursor: g.disabled ? 'default' : 'pointer',
                  opacity: g.disabled ? 0.4 : 1,
                  transition: 'color 140ms, border-color 140ms',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                }}
              >
                <span style={{ fontSize: 15 }}>{g.icon}</span>
                {g.label}
                {g.disabled && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--ink-3)',
                    background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4,
                  }}>Soon</span>
                )}
              </button>
            )
          })}
        </div>

        <header className="topbar">
          <h2 className="topbar__title">
            {page === 'dashboard'  && <>Dashboard <span>· panoramica</span></>}
            {page === 'collection' && <>Collezione <span>· {activeGame === 'magic' ? initialMagicCards.length : cards.length} carte</span></>}
            {page === 'watchlist'  && <>Watchlist <span>· {activeGame === 'magic' ? magicFavCount : favCount} preferite</span></>}
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

          {page !== 'settings' && activeGame === 'pokemon' && (
            <>
              <button className="btn" onClick={() => setImportOpen(true)}>
                <Upload size={13} /> Importa
              </button>
              <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
                <Plus size={13} /> Aggiungi carta
              </button>
            </>
          )}
          {page !== 'settings' && activeGame === 'magic' && (
            <button
              className="btn btn--primary"
              onClick={() => setAddMagicOpen(true)}
              style={{ background: 'linear-gradient(135deg, #7B7CF7, #4F46E5)' }}
            >
              <Plus size={13} /> Aggiungi carta
            </button>
          )}
        </header>

        <div className="content">
          {activeGame === 'pokemon' && page === 'dashboard' && (
            <DashboardPage
              cards={cards}
              onOpenCard={openCard}
              onToggleFav={toggleFav}
              onGoCollection={() => setPage('collection')}
            />
          )}
          {activeGame === 'pokemon' && (page === 'collection' || page === 'watchlist') && (
            <CollectionPage
              cards={cards}
              search={search}
              favoritesOnly={page === 'watchlist'}
              onOpenCard={openCard}
              onToggleFav={toggleFav}
              onAdd={() => setAddOpen(true)}
            />
          )}
          {activeGame === 'magic' && (page === 'dashboard' || page === 'collection' || page === 'watchlist') && (
            <MagicCollectionShell
              initialCards={initialMagicCards}
              search={search}
              favoritesOnly={page === 'watchlist'}
            />
          )}
          {page === 'settings' && <SettingsPage />}
        </div>
      </div>

      {/* ── OVERLAYS ── */}
      {activeGame === 'pokemon' && (
        <>
          <DetailSheet card={selectedCard} open={sheetOpen} onClose={() => setSheetOpen(false)} onToggleFav={toggleFav} />
          <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} />
          <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
        </>
      )}
      {activeGame === 'magic' && (
        <AddMagicCardModal open={addMagicOpen} onClose={() => setAddMagicOpen(false)} />
      )}
    </div>
  )
}
