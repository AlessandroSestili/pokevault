'use client'

import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import type { MagicCardWithPrice } from '@/types'
import { MagicCardItem } from './MagicCardItem'
import { fmtMoney, computeTopSets } from '@/lib/fmt'

const RARITY_COLOR: Record<string, string> = {
  mythic:   '#FF8C00',
  rare:     '#FFD700',
  uncommon: '#C0C0C0',
  common:   '#A0A0B0',
}
const RARITY_LABEL: Record<string, string> = {
  mythic: 'Mythic', rare: 'Rare', uncommon: 'Uncommon', common: 'Common',
}

export function MagicDashboardPage({
  cards,
  onOpenCard,
  onToggleFav,
  onGoCollection,
}: {
  cards: MagicCardWithPrice[]
  onOpenCard: (card: MagicCardWithPrice) => void
  onToggleFav: (id: string) => void
  onGoCollection: () => void
}) {
  const totals = useMemo(() => {
    const value = cards.reduce((s, c) => s + (c.market_price ?? c.cost_basis), 0)
    const cost  = cards.reduce((s, c) => s + c.cost_basis, 0)
    const pl    = value - cost
    const foilCount = cards.filter(c => c.foil).length
    return { value, cost, pl, foilCount }
  }, [cards])

  const recentCards = useMemo(() =>
    [...cards]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
    [cards]
  )

  const mostValuable = useMemo(() =>
    cards.length ? [...cards].sort((a, b) => (b.market_price ?? b.cost_basis) - (a.market_price ?? a.cost_basis))[0] : null,
    [cards]
  )

  const topSets = useMemo(() => computeTopSets(cards), [cards])

  // Rarity breakdown
  const rarityBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {}
    for (const c of cards) {
      const r = c.rarity ?? 'common'
      if (!map[r]) map[r] = { count: 0, value: 0 }
      map[r].count += 1
      map[r].value += c.market_price ?? c.cost_basis
    }
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value)
  }, [cards])

  const maxSetValue = topSets[0]?.value ?? 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 1, background: 'var(--line)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {[
          { label: 'Carte',  value: cards.length.toString() },
          { label: 'Valore', value: fmtMoney(totals.value) },
          { label: 'Costo',  value: fmtMoney(totals.cost) },
          { label: 'P&L',    value: `${totals.pl >= 0 ? '+' : '−'}${fmtMoney(Math.abs(totals.pl))}`, color: totals.pl >= 0 ? '#2DD881' : '#FF5B47' },
          { label: 'Foil',   value: totals.foilCount.toString() },
        ].map(item => (
          <div key={item.label} style={{ flex: 1, padding: '12px 20px', background: 'var(--bg-0)' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: item.color ?? 'var(--ink-0)' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px' }}>

        {/* Top row: set breakdown + rarity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 28 }}>

          {/* Top sets */}
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--line)',
            borderRadius: 18, padding: '22px 24px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 6 }}>
              Valore totale collezione
            </div>
            <div style={{ fontFamily: 'var(--font-space)', fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ink-0)', marginBottom: 20 }}>
              {fmtMoney(totals.value)}
            </div>

            {topSets.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Nessun set</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 2 }}>
                  Top set per valore
                </div>
                {topSets.map(s => (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        {s.name}
                      </span>
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {fmtMoney(s.value)} · {s.count}c
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(s.value / maxSetValue) * 100}%`,
                        background: 'linear-gradient(90deg, #7B7CF7, #4F46E5)',
                        borderRadius: 4,
                        transition: 'width 400ms ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rarity breakdown */}
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--line)',
            borderRadius: 18, padding: '22px 24px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 16 }}>
              Per rarità
            </div>
            {rarityBreakdown.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>—</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rarityBreakdown.map(([rarity, { count, value }]) => (
                  <div key={rarity} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: RARITY_COLOR[rarity] ?? '#888',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-1)' }}>
                        {RARITY_LABEL[rarity] ?? rarity}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{count} carte</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-0)', flexShrink: 0 }}>
                      {fmtMoney(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            {
              label: 'Carte totali',
              value: String(cards.length),
              sub: `${cards.filter(c => c.is_favorite).length} preferite · ${cards.filter(c => c.foil).length} foil`,
            },
            {
              label: 'Carta più preziosa',
              value: mostValuable?.name ?? '—',
              sub: mostValuable ? fmtMoney(mostValuable.market_price ?? mostValuable.cost_basis) : '',
            },
            {
              label: 'P&L',
              value: `${totals.pl >= 0 ? '+' : '−'}${fmtMoney(Math.abs(totals.pl))}`,
              sub: totals.cost > 0 ? `${((totals.pl / totals.cost) * 100).toFixed(1)}% sul costo` : '',
              valueColor: totals.pl >= 0 ? '#2DD881' : '#FF5B47',
            },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--bg-1)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '16px 18px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 8 }}>
                {item.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-space)', fontSize: 18, fontWeight: 600,
                color: item.valueColor ?? 'var(--ink-0)', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.value}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-3)' }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Recent cards */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-space)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: 'var(--ink-0)' }}>
            Carte recenti
          </h3>
          <button onClick={onGoCollection} style={{
            display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)',
          }}>
            Vedi tutte <ArrowRight size={12} />
          </button>
        </div>

        {recentCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>✦</div>
            <div style={{ fontFamily: 'var(--font-space)', fontSize: 18, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
              Nessuna carta Magic
            </div>
            <div style={{ fontSize: 13 }}>Aggiungi la prima carta per iniziare.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 14,
          }}>
            {recentCards.map(c => (
              <MagicCardItem key={c.id} card={c} onClick={onOpenCard} onToggleFav={onToggleFav} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
