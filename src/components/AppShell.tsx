'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Layers, Eye, Settings,
  BarChart2, Search, LogOut,
} from 'lucide-react'
import type { CollectionCardWithPrice, MagicCardWithPrice, ActiveGame } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { SettingsPage } from './pages/SettingsPage'
import { GameLogo } from './ui/GameLogo'
import { usePokemonGame } from './games/usePokemonGame'
import { useMagicGame } from './games/useMagicGame'
import type { Page } from './games/types'

const GAMES: { id: ActiveGame; label: string; color: string; disabled?: boolean }[] = [
  { id: 'pokemon', label: 'Pokémon TCG',          color: '#FFCB2E' },
  { id: 'magic',   label: 'Magic: The Gathering',  color: '#7B7CF7' },
  { id: 'yugioh',  label: 'Yu-Gi-Oh!',             color: '#FF5B47', disabled: true },
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
  const [page, setPage]           = useState<Page>('dashboard')
  const [search, setSearch]       = useState('')
  const [activeGame, setActiveGame] = useState<ActiveGame>('pokemon')

  useEffect(() => {
    const saved = localStorage.getItem('tcgvault_game') as ActiveGame | null
    if (saved && ['pokemon', 'magic'].includes(saved)) setActiveGame(saved as ActiveGame)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') activePlugin.closeAll() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Hooks sempre chiamati (regola dei hook) ──────────────────────────────
  const pokemon = usePokemonGame(initialCards,      page, search, setPage)
  const magic   = useMagicGame(initialMagicCards,   page, search, setPage)

  // ── Dizionario: aggiungere Yu-Gi-Oh = 1 riga ───────────────────────────
  const pluginMap: Partial<Record<ActiveGame, typeof pokemon>> = { pokemon, magic }
  const activePlugin = pluginMap[activeGame] ?? pokemon
  const activeColor  = GAMES.find(g => g.id === activeGame)?.color ?? '#FFCB2E'

  function switchGame(game: ActiveGame) {
    if (GAMES.find(g => g.id === game)?.disabled) return
    setActiveGame(game)
    localStorage.setItem('tcgvault_game', game)
    setPage('dashboard')
  }

  const navItems = [
    { id: 'dashboard'  as Page, label: 'Dashboard',    Icon: LayoutDashboard, count: null },
    { id: 'collection' as Page, label: 'Collezione',   Icon: Layers,   count: activePlugin.counts.collection },
    { id: 'watchlist'  as Page, label: 'Watchlist',    Icon: Eye,      count: activePlugin.counts.watchlist },
    { id: 'analytics'  as Page, label: 'Analytics',    Icon: BarChart2, count: null },
    { id: 'settings'   as Page, label: 'Impostazioni', Icon: Settings,  count: null },
  ]

  const pageTitle: Record<Page, React.ReactNode> = {
    dashboard:  <>Dashboard  <span>· panoramica</span></>,
    collection: <>Collezione <span>· {activePlugin.counts.collection} carte</span></>,
    watchlist:  <>Watchlist  <span>· {activePlugin.counts.watchlist} preferite</span></>,
    analytics:  <>Analytics  <span>· insights</span></>,
    settings:   <>Impostazioni</>,
  }

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
        {activePlugin.railActions}

        <div className="rail__user">
          <div className="rail__avatar">{(user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'Utente'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Piano Collector</div>
          </div>
          <button
            onClick={async () => { const s = createClient(); await s.auth.signOut(); window.location.href = '/login' }}
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
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--line)', background: 'var(--bg-0)', flexShrink: 0 }}>
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
                  whiteSpace: 'nowrap', marginBottom: -1,
                }}
              >
                <GameLogo game={g.id} size={18} />
                {g.label}
                {g.disabled && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4 }}>
                    Soon
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <header className="topbar">
          <h2 className="topbar__title">{pageTitle[page]}</h2>

          {activePlugin.showSearch && (
            <div className="search">
              <Search size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, set, numero…" />
            </div>
          )}

          <div className="spacer" />
          {activePlugin.topbarActions}
        </header>

        <div className="content">
          {page === 'settings' ? <SettingsPage /> : activePlugin.content}
        </div>
      </div>

      {/* ── OVERLAYS — entrambi sempre nel DOM, ognuno gestisce i propri stati ── */}
      {pokemon.overlays}
      {magic.overlays}
    </div>
  )
}
