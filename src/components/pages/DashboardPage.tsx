'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { AreaChart } from '../charts/AreaChart'
import { CardItem } from '../CardItem'

function fmtMoney(v: number) {
  const n = Math.abs(v)
  const s = n >= 1000
    ? n.toLocaleString('it-IT', { maximumFractionDigits: 0 })
    : n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '−' : '') + '€' + s
}
function fmtPct(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'
}
function fmt2(v: number) {
  return '€' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Range = '30g' | '90g' | '1y' | 'sempre'

function getDashboardChart(cards: CollectionCardWithPrice[], n: number): number[] {
  const dayValues = new Array(n).fill(0)
  for (const card of cards) {
    const history = card.price_history
    if (history.length === 0) {
      const val = card.market_price ?? 0
      dayValues.forEach((_, i) => { dayValues[i] += val })
    } else {
      const last = history.slice(-n)
      const padded = [
        ...new Array(Math.max(0, n - last.length)).fill(last[0]?.price_eur ?? 0),
        ...last.map(s => s.price_eur),
      ]
      padded.forEach((v, i) => { dayValues[i] += v })
    }
  }
  return dayValues
}

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
  const [range, setRange] = useState<Range>('30g')

  const totals = useMemo(() => {
    const value = cards.reduce((s, c) => s + (c.market_price ?? 0), 0)
    const cost  = cards.reduce((s, c) => s + c.cost_basis, 0)
    const pl = value - cost
    const values30 = getDashboardChart(cards, 30)
    const dayPl = values30.length >= 2 && values30[0] > 0
      ? ((values30[29] - values30[0]) / values30[0]) * 100
      : 0
    return { value, cost, pl, dayPl }
  }, [cards])

  const chartValues = useMemo(() => {
    const n = range === '30g' ? 30 : range === '90g' ? 90 : 365
    return getDashboardChart(cards, n)
  }, [cards, range])

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

  const topSets = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number }>()
    for (const c of cards) {
      if (!map.has(c.set_name)) map.set(c.set_name, { name: c.set_name, value: 0, count: 0 })
      const g = map.get(c.set_name)!
      g.value += c.market_price ?? 0
      g.count += 1
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [cards])

  const recentCards = useMemo(() =>
    [...cards].sort((a, b) => new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime()).slice(0, 8),
    [cards]
  )

  const chartChange = chartValues.length >= 2
    ? ((chartValues[chartValues.length - 1] - chartValues[0]) / chartValues[0]) * 100
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 1, background: 'var(--line)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {[
          { label: 'Carte',      value: cards.length.toString() },
          { label: 'Valore',     value: fmt2(totals.value) },
          { label: 'Costo',      value: fmt2(totals.cost) },
          { label: 'P&L',        value: `${totals.pl >= 0 ? '+' : '−'}${fmt2(Math.abs(totals.pl))}`, color: totals.pl >= 0 ? '#2DD881' : '#FF5B47' },
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
        {/* Chart + Top sets (merged) */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 18, padding: '22px 24px', marginBottom: 28,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 600 }}>
                Valore totale collezione
              </div>
              <div style={{ fontFamily: 'var(--font-space)', fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ink-0)' }}>
                {fmtMoney(totals.value)}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 999,
                  background: totals.dayPl >= 0 ? 'rgba(45,216,129,0.12)' : 'rgba(255,91,71,0.12)',
                  color: totals.dayPl >= 0 ? '#2DD881' : '#FF5B47',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)',
                }}>
                  {totals.dayPl >= 0 ? '▲' : '▼'} {fmtPct(totals.dayPl)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>negli ultimi 30 giorni</span>
              </div>
            </div>
            {/* Range pills */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['30g', '90g', '1y', 'sempre'] as Range[]).map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  background: range === r ? 'rgba(255,203,46,0.15)' : 'var(--bg-2)',
                  color: range === r ? '#FFCB2E' : 'var(--ink-3)',
                }}>
                  {r === '30g' ? '30g' : r === '90g' ? '90g' : r === '1y' ? '1a' : 'Tutto'}
                </button>
              ))}
            </div>
          </div>
          <AreaChart values={chartValues} color="#FFCB2E" height={140} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            <span>Min {fmtMoney(Math.min(...chartValues))}</span>
            <span style={{ color: chartChange >= 0 ? '#2DD881' : '#FF5B47' }}>{fmtPct(chartChange)} nel periodo</span>
            <span>Max {fmtMoney(Math.max(...chartValues))}</span>
          </div>

          {topSets.length > 0 && (() => {
            const maxVal = topSets[0].value
            return (
              <>
                <div style={{ height: 1, background: 'var(--line)', margin: '20px 0' }} />
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
                          {fmt2(s.value)} · {s.count}c
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
