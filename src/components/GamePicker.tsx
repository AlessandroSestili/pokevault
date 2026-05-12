'use client'

import type { ActiveGame } from '@/types'

const GAMES = [
  {
    id: 'pokemon' as ActiveGame,
    name: 'Pokémon TCG',
    sub: 'Espansioni SV · SWH · Scarlet & Violet',
    color: '#FFCB2E',
    glow: 'rgba(255,203,46,0.28)',
    symbol: '⚡',
    gradient: 'radial-gradient(circle at 35% 30%, #FFCB2E 0%, #FF8C00 45%, #FF5B47 100%)',
    disabled: false,
  },
  {
    id: 'magic' as ActiveGame,
    name: 'Magic: The Gathering',
    sub: 'Powered by Scryfall · tutti i set',
    color: '#7B7CF7',
    glow: 'rgba(123,124,247,0.28)',
    symbol: '✦',
    gradient: 'radial-gradient(circle at 35% 30%, #A5B4FC 0%, #7B7CF7 45%, #4F46E5 100%)',
    disabled: false,
  },
  {
    id: 'yugioh' as ActiveGame,
    name: 'Yu-Gi-Oh!',
    sub: 'Prossimamente',
    color: '#FF5B47',
    glow: 'rgba(255,91,71,0.15)',
    symbol: '★',
    gradient: 'radial-gradient(circle at 35% 30%, #FFCB2E 0%, #FF8C00 45%, #FF5B47 100%)',
    disabled: true,
  },
]

export function GamePicker({ onSelect }: { onSelect: (game: ActiveGame) => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg-0)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 48, zIndex: 200, padding: 24,
      }}
    >
      {/* Brand */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18, margin: '0 auto 20px',
          background: 'radial-gradient(circle at 35% 30%, #FFCB2E 0%, #FF5B47 50%, #B07BFF 100%)',
          boxShadow: '0 8px 32px rgba(255,91,71,.45), inset 0 1px 0 rgba(255,255,255,.35)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: '17px',
            borderRadius: '50%', background: 'var(--bg-0)',
            boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.4)',
          }} />
        </div>
        <h1 style={{
          fontFamily: 'var(--font-space)', fontSize: 40, fontWeight: 700,
          margin: 0, letterSpacing: '-0.03em', color: 'var(--ink-0)',
        }}>
          TCG Vault
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '10px 0 0', fontWeight: 400 }}>
          Scegli il gioco di carte per accedere alla collezione
        </p>
      </div>

      {/* Game cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {GAMES.map(g => (
          <GameCard key={g.id} game={g} onSelect={onSelect} />
        ))}
      </div>

      <p style={{ color: 'var(--ink-3)', fontSize: 12, margin: 0 }}>
        Puoi cambiare gioco in qualsiasi momento dalla barra laterale
      </p>
    </div>
  )
}

function GameCard({
  game,
  onSelect,
}: {
  game: typeof GAMES[0]
  onSelect: (g: ActiveGame) => void
}) {
  return (
    <button
      onClick={() => !game.disabled && onSelect(game.id)}
      disabled={game.disabled}
      style={{
        width: 200, padding: '32px 24px 28px',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-2)',
        borderRadius: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        cursor: game.disabled ? 'default' : 'pointer',
        opacity: game.disabled ? 0.42 : 1,
        transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease',
        position: 'relative',
        outline: 'none',
      }}
      onMouseEnter={e => {
        if (game.disabled) return
        const el = e.currentTarget
        el.style.background = 'var(--bg-2)'
        el.style.borderColor = game.color
        el.style.boxShadow = `0 0 0 4px ${game.glow}, 0 12px 40px rgba(0,0,0,.4)`
        el.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        if (game.disabled) return
        const el = e.currentTarget
        el.style.background = 'var(--bg-1)'
        el.style.borderColor = 'var(--line-2)'
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      {game.disabled && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--bg-3)', padding: '2px 9px',
          borderRadius: 99, fontSize: 9, color: 'var(--ink-3)',
          fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Soon
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 15,
        background: game.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        boxShadow: game.disabled ? 'none' : `0 6px 24px ${game.glow}`,
      }}>
        {game.symbol}
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink-0)', marginBottom: 5, lineHeight: 1.3 }}>
          {game.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          {game.sub}
        </div>
      </div>
    </button>
  )
}
