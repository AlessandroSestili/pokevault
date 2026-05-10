'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, ArrowRight } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { getElement } from '@/lib/elements'
import { AreaChart } from '../charts/AreaChart'
import { CardItem } from '../CardItem'

function fmtMoney(v: number) {
  const n = Math.abs(v)
  const s = n >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '−' : '') + '$' + s
}
function fmtPct(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'
}

type Range = '30g' | '90g' | '1y' | 'sempre'

function getDashboardChart(cards: CollectionCardWithPrice[], n: number): number[] {
  const dayValues = new Array(n).fill(0)
  for (const card of cards) {
    const history = card.price_history
    if (history.length === 0) {
      const val = card.market_price ?? card.cost_basis
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
    const value = cards.reduce((s, c) => s + (c.market_price ?? c.cost_basis), 0)
    const cost = cards.reduce((s, c) => s + c.cost_basis, 0)
    const pl = value - cost
    const pct = cost > 0 ? (pl / cost) * 100 : 0
    const values30 = getDashboardChart(cards, 30)
    const dayPl = values30.length >= 2 && values30[0] > 0
      ? ((values30[29] - values30[0]) / values30[0]) * 100
      : 0
    return { value, cost, pl, pct, dayPl }
  }, [cards])

  const chartValues = useMemo(() => {
    const n = range === '30g' ? 30 : range === '90g' ? 90 : range === '1y' ? 365 : 365
    return getDashboardChart(cards, n)
  }, [cards, range])

  const topMover = useMemo(() => {
    if (cards.length === 0) return null
    return cards
      .map(c => {
        const h = c.price_history
        if (h.length < 2) return { card: c, ch: 0 }
        const last = h.slice(-30)
        const ch = last.length >= 2 ? ((last[last.length - 1].price_eur - last[0].price_eur) / last[0].price_eur) * 100 : 0
        return { card: c, ch }
      })
      .sort((a, b) => b.ch - a.ch)[0]
  }, [cards])

  const mostValuable = useMemo(() => {
    if (cards.length === 0) return null
    return [...cards].sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))[0]
  }, [cards])

  const recentCards = useMemo(
    () => [...cards].sort((a, b) => new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime()).slice(0, 6),
    [cards]
  )

  const intPart = Math.floor(Math.abs(totals.value)).toLocaleString('en-US')
  const decPart = (totals.value % 1).toFixed(2).split('.')[1]

  return (
    <>
      <div className="hero">
        <div className="hero__main">
          <div className="hero__label">Valore totale collezione</div>
          <div className="hero__value">
            {totals.value < 0 && '−'}${ intPart}
            <span className="cents">.{decPart}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={'hero__delta ' + (totals.dayPl >= 0 ? 'hero__delta--pos' : 'hero__delta--neg')}>
              {totals.dayPl >= 0 ? '▲' : '▼'} {fmtPct(totals.dayPl)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>negli ultimi 30 giorni</span>
          </div>

          <div className="hero__legend" style={{ marginTop: 22 }}>
            {(['30g', '90g', '1y', 'sempre'] as Range[]).map(r => (
              <button
                key={r}
                className={range === r ? 'is-active' : ''}
                onClick={() => setRange(r)}
              >
                {r === '30g' ? '30 giorni' : r === '90g' ? '90 giorni' : r === '1y' ? '1 anno' : 'Sempre'}
              </button>
            ))}
          </div>
          <div className="hero__chart">
            <AreaChart values={chartValues} color="#FFCB2E" height={130} />
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat__label">
              P&L Totale
              <TrendingUp size={12} />
            </div>
            <div className="stat__value" style={{ color: totals.pl >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
              {(totals.pl >= 0 ? '+' : '−') + fmtMoney(Math.abs(totals.pl))}
            </div>
            <div className={'stat__sub ' + (totals.pl >= 0 ? 'pos' : 'neg')}>
              {fmtPct(totals.pct)} ROI · costo {fmtMoney(totals.cost)}
            </div>
          </div>

          <div className="stat">
            <div className="stat__label">Carte totali</div>
            <div className="stat__value">{cards.length}</div>
            <div className="stat__sub">
              {cards.filter(c => c.is_favorite).length} preferite · {cards.filter(c => c.condition >= 9.5).length} grado 9.5+
            </div>
          </div>

          <div className="stat">
            <div className="stat__label">Top mover 30g</div>
            {topMover ? (
              <>
                <div className="stat__value" style={{ fontSize: 18, lineHeight: 1.2 }}>{topMover.card.name}</div>
                <div className={'stat__sub ' + (topMover.ch >= 0 ? 'pos' : 'neg')}>
                  {fmtPct(topMover.ch)} · {fmtMoney(topMover.card.market_price ?? topMover.card.cost_basis)}
                </div>
              </>
            ) : (
              <div className="stat__value" style={{ fontSize: 18 }}>—</div>
            )}
          </div>

          <div className="stat">
            <div className="stat__label">Carta più preziosa</div>
            {mostValuable ? (
              <>
                <div className="stat__value" style={{ fontSize: 18, lineHeight: 1.2 }}>{mostValuable.name}</div>
                <div className="stat__sub">{fmtMoney(mostValuable.market_price ?? mostValuable.cost_basis)}</div>
              </>
            ) : (
              <div className="stat__value" style={{ fontSize: 18 }}>—</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '10px 0 14px' }}>
        <h3 style={{ fontFamily: 'var(--font-space)', fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Carte recenti
        </h3>
        <button className="btn btn--ghost" onClick={onGoCollection}>
          Vedi tutte <ArrowRight size={12} />
        </button>
      </div>

      {recentCards.length === 0 ? (
        <div className="empty">
          <h3>Nessuna carta nella collezione</h3>
          <p>Aggiungi la prima carta per iniziare.</p>
        </div>
      ) : (
        <div className="cards is-cozy">
          {recentCards.map((c, i) => (
            <div key={c.id} style={{ animationDelay: `${i * 50}ms` }}>
              <CardItem card={c} onOpen={onOpenCard} onToggleFav={onToggleFav} showSpark density="cozy" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
