'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Layers, Eye, Settings,
  Plus, Upload, Search, LogOut, BarChart2,
} from 'lucide-react'
import type { CollectionCardWithPrice, MagicCardWithPrice, ActiveGame } from '@/types'
import { editCardAction } from '@/lib/actions'
import { editMagicCardAction } from '@/lib/actions-magic'
import { createClient } from '@/lib/supabase/client'
import { DashboardPage } from './pages/DashboardPage'
import { CollectionPage } from './pages/CollectionPage'
import { SettingsPage } from './pages/SettingsPage'
import { DetailSheet } from './DetailSheet'
import { AddCardModal } from './modals/AddCardModal'
import { ImportCsvModal } from './modals/ImportCsvModal'
import { MagicCollectionShell } from './magic/MagicCollectionShell'
import { MagicDashboardPage } from './magic/MagicDashboardPage'
import { MagicDetailSheet } from './magic/MagicDetailSheet'
import { MagicAnalyticsPage } from './magic/MagicAnalyticsPage'
import { AddMagicCardModal } from './modals/AddMagicCardModal'
import { GameLogo } from './ui/GameLogo'
import { AnalyticsPage } from './pages/AnalyticsPage'

type Page = 'dashboard' | 'collection' | 'watchlist' | 'analytics' | 'settings'

const GAMES: { id: ActiveGame; label: string; icon: string; color: string; disabled?: boolean }[] = [
  { id: 'pokemon', label: 'Pokémon TCG',          icon: '⚡', color: '#FFCB2E' },
  { id: 'magic',   label: 'Magic: The Gathering',  icon: '✦', color: '#7B7CF7' },
  { id: 'yugioh',  label: 'Yu-Gi-Oh!',             icon: '★', color: '#FF5B47', disabled: true },
]

type AppUser = { id: string; email: string; name: string }

export function AppShell({
  initialCards,
  initialMagicCards,
  user,
}: {
  initialCards: CollectionCardWithPrice[]
  initialMagicCards: MagicCardWithPrice[]
  user: AppUser | null
}) {
  const [cards, setCards] = useState(initialCards)
  const [magicCards, setMagicCards] = useState(initialMagicCards)
  const [page, setPage] = useState<Page>('dashboard')
  const [search, setSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState<CollectionCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [addMagicOpen, setAddMagicOpen] = useState(false)
  const [selectedMagicCard, setSelectedMagicCard] = useState<MagicCardWithPrice | null>(null)
  const [magicSheetOpen, setMagicSheetOpen] = useState(false)
  const [activeGame, setActiveGame] = useState<ActiveGame>('pokemon')

  useEffect(() => { setCards(initialCards) }, [initialCards])
  useEffect(() => { setMagicCards(initialMagicCards) }, [initialMagicCards])

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

  function openMagicCard(card: MagicCardWithPrice) {
    setSelectedMagicCard(card); setMagicSheetOpen(true)
  }

  async function toggleMagicFav(id: string) {
    const card = magicCards.find(c => c.id === id)
    if (!card) return
    const newFav = !card.is_favorite
    setMagicCards(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newFav } : c))
    if (selectedMagicCard?.id === id) setSelectedMagicCard(prev => prev ? { ...prev, is_favorite: newFav } : prev)
    await editMagicCardAction(id, { is_favorite: newFav })
  }

  const favCount = cards.filter(c => c.is_favorite).length
  const magicFavCount = magicCards.filter(c => c.is_favorite).length

  const navItems = [
    { id: 'dashboard'  as Page, label: 'Dashboard',    Icon: LayoutDashboard, count: null },
    { id: 'collection' as Page, label: 'Collezione',   Icon: Layers,
      count: activeGame === 'magic' ? magicCards.length : cards.length },
    { id: 'watchlist'  as Page, label: 'Watchlist',    Icon: Eye,
      count: activeGame === 'magic' ? magicFavCount : favCount },
    { id: 'analytics'  as Page, label: 'Analytics',    Icon: BarChart2, count: null },
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
          <div className="rail__avatar">{(user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'Utente'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Piano Collector</div>
          </div>
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            title="Esci"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}
          >
            <LogOut size={13} style={{ color: 'var(--ink-3)' }} />
          </button>
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
                <GameLogo game={g.id} size={18} />
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
            {page === 'collection' && <>Collezione <span>· {activeGame === 'magic' ? magicCards.length : cards.length} carte</span></>}
            {page === 'watchlist'  && <>Watchlist <span>· {activeGame === 'magic' ? magicFavCount : favCount} preferite</span></>}
            {page === 'analytics'  && <>Analytics <span>· insights</span></>}
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

          {page !== 'settings' && page !== 'analytics' && activeGame === 'pokemon' && (
            <>
              <button className="btn" onClick={() => setImportOpen(true)}>
                <Upload size={13} /> Importa
              </button>
              <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
                <Plus size={13} /> Aggiungi carta
              </button>
            </>
          )}
          {page !== 'settings' && page !== 'analytics' && activeGame === 'magic' && (
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
          {activeGame === 'magic' && page === 'dashboard' && (
            <MagicDashboardPage
              cards={magicCards}
              onOpenCard={openMagicCard}
              onToggleFav={toggleMagicFav}
              onGoCollection={() => setPage('collection')}
            />
          )}
          {activeGame === 'magic' && (page === 'collection' || page === 'watchlist') && (
            <MagicCollectionShell
              initialCards={magicCards}
              search={search}
              favoritesOnly={page === 'watchlist'}
            />
          )}
          {activeGame === 'pokemon' && page === 'analytics' && (
            <AnalyticsPage cards={cards} />
          )}
          {activeGame === 'magic' && page === 'analytics' && (
            <MagicAnalyticsPage cards={magicCards} />
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
        <>
          <MagicDetailSheet card={selectedMagicCard} open={magicSheetOpen} onClose={() => setMagicSheetOpen(false)} onToggleFav={toggleMagicFav} />
          <AddMagicCardModal open={addMagicOpen} onClose={() => setAddMagicOpen(false)} />
        </>
      )}
    </div>
  )
}
