'use client'

import { useMemo } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { CardItem } from '../CardItem'
import { fmtMoney, fmtPct, computeTopSets } from '@/lib/fmt'


export function DashboardPage({
  cards,
  onOpenCard,
  onToggleFav,
  onGoCollection,
}: {
  cards: CollectionCardWithPrice[]
  onOpenCard: (card: CollectionCardWithPrice) => void
  onToggleFav: (id: string) => void
  onGoCollection: () => void
}) {
  const totals = useMemo(() => {
    const value = cards.reduce((s, c) => s + (c.market_price ?? 0), 0)
    const cost  = cards.reduce((s, c) => s + c.cost_basis, 0)
    const pl = value - cost
    const dayPl = (() => {
      const vals = cards.flatMap(c => c.price_history.slice(-30))
      if (vals.length < 2) return 0
      const first = vals[0].price_eur, last = vals[vals.length - 1].price_eur
      return first > 0 ? ((last - first) / first) * 100 : 0
    })()
    return { value, cost, pl, dayPl }
  }, [cards])

  const topMover = useMemo(() => {
    if (!cards.length) return null
    return cards.map(c => {
      const h = c.price_history.slice(-30)
      const ch = h.length >= 2 ? ((h[h.length - 1].price_eur - h[0].price_eur) / h[0].price_eur) * 100 : 0
      return { card: c, ch }
    }).sort((a, b) => b.ch - a.ch)[0]
  }, [cards])

  const mostValuable = useMemo(() =>
    cards.length ? [...cards].sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))[0] : null,
    [cards]
  )

  const topSets = useMemo(() => computeTopSets(cards), [cards])

  const recentCards = useMemo(() =>
    [...cards].sort((a, b) => new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime()).slice(0, 8),
    [cards]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 1, background: 'var(--line)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {[
          { label: 'Carte',      value: cards.length.toString() },
          { label: 'Valore',     value: fmtMoney(totals.value) },
          { label: 'Costo',      value: fmtMoney(totals.cost) },
          { label: 'P&L',        value: `${totals.pl >= 0 ? '+' : '−'}${fmtMoney(Math.abs(totals.pl))}`, color: totals.pl >= 0 ? '#2DD881' : '#FF5B47' },
          { label: 'Var. 30g',   value: fmtPct(totals.dayPl), color: totals.dayPl >= 0 ? '#2DD881' : '#FF5B47',
            icon: <TrendingUp size={11} style={{ color: totals.dayPl >= 0 ? '#2DD881' : '#FF5B47' }} /> },
        ].map(item => (
          <div key={item.label} style={{ flex: 1, padding: '12px 20px', background: 'var(--bg-0)' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              {item.label} {'icon' in item && item.icon}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: item.color ?? 'var(--ink-0)' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px' }}>
        {/* Valore totale + Top sets */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 18, padding: '22px 24px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 600 }}>
            Valore totale collezione
          </div>
          <div style={{ fontFamily: 'var(--font-space)', fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ink-0)', marginBottom: 20 }}>
            {fmtMoney(totals.value)}
          </div>

          {topSets.length > 0 && (() => {
            const maxVal = topSets[0].value
            return (
              <>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 14 }}>
                  Top set per valore
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topSets.map(s => (
                    <div key={s.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
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
                          width: `${(s.value / maxVal) * 100}%`,
                          background: 'linear-gradient(90deg, #FFCB2E, #FF9500)',
                          borderRadius: 4,
                          transition: 'width 400ms ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            {
              label: 'Carte totali',
              value: String(cards.length),
              sub: `${cards.filter(c => c.is_favorite).length} preferite · ${cards.filter(c => c.condition >= 9.5).length} grado 9.5+`,
            },
            {
              label: 'Top mover 30g',
              value: topMover?.card.name ?? '—',
              sub: topMover ? `${fmtPct(topMover.ch)} · ${fmtMoney(topMover.card.market_price ?? topMover.card.cost_basis)}` : '',
              valueColor: topMover && topMover.ch >= 0 ? '#2DD881' : topMover ? '#FF5B47' : undefined,
            },
            {
              label: 'Carta più preziosa',
              value: mostValuable?.name ?? '—',
              sub: mostValuable ? fmtMoney(mostValuable.market_price ?? mostValuable.cost_basis) : '',
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
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⚡</div>
            <div style={{ fontFamily: 'var(--font-space)', fontSize: 18, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
              Nessuna carta nella collezione
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
              <CardItem key={c.id} card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
