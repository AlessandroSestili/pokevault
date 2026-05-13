'use client'

import { useMemo, useState } from 'react'
import type { CollectionCardWithPrice } from '@/types'
import { AreaChart } from '../charts/AreaChart'
import { fmtMoney, fmtPct } from '@/lib/fmt'

type Range = '30g' | '90g' | '1a' | 'tutto'

function buildTimeSeries(cards: CollectionCardWithPrice[], n: number): number[] {
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

// ── Shared mini components ──────────────────────────────────────────────────

function Card({ children, span = 1, style = {} }: { children: React.ReactNode; span?: 1 | 2; style?: React.CSSProperties }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      background: 'var(--bg-1)', border: '1px solid var(--line)',
      borderRadius: 18, padding: '20px 22px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 14 }}>
      {children}
    </div>
  )
}

function HBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{label}</span>
        <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{sub ?? fmtMoney(value)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 400ms ease' }} />
      </div>
    </div>
  )
}

function DotRow({ label, count, total, color, value }: { label: string; count: number; total: number; color: string; value?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{count}</span>
      <div style={{ width: 60, height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(count / total) * 100}%`, background: color, borderRadius: 4 }} />
      </div>
      {value && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', width: 60, textAlign: 'right' }}>{value}</span>}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function AnalyticsPage({ cards }: { cards: CollectionCardWithPrice[] }) {
  const [range, setRange] = useState<Range>('30g')

  const totalValue = cards.reduce((s, c) => s + (c.market_price ?? 0), 0)
  const totalCost  = cards.reduce((s, c) => s + c.cost_basis, 0)

  const chartValues = useMemo(() => {
    const n = range === '30g' ? 30 : range === '90g' ? 90 : range === '1a' ? 365 : 730
    return buildTimeSeries(cards, n)
  }, [cards, range])

  const chartChange = chartValues.length >= 2 && chartValues[0] > 0
    ? ((chartValues[chartValues.length - 1] - chartValues[0]) / chartValues[0]) * 100
    : 0

  // Top gainer / loser (30g)
  const movers = useMemo(() => {
    return cards.map(c => {
      const h = c.price_history.slice(-30)
      const ch = h.length >= 2 && h[0].price_eur > 0
        ? ((h[h.length - 1].price_eur - h[0].price_eur) / h[0].price_eur) * 100
        : 0
      return { name: c.name, ch, value: c.market_price ?? c.cost_basis }
    }).sort((a, b) => b.ch - a.ch)
  }, [cards])

  const gainers = movers.filter(m => m.ch > 0).slice(0, 5)
  const losers  = [...movers].reverse().filter(m => m.ch < 0).slice(0, 5)

  // By element
  const byElement = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const c of cards) {
      const key = c.element ?? 'Sconosciuto'
      if (!map.has(key)) map.set(key, { count: 0, value: 0 })
      const g = map.get(key)!
      g.count++; g.value += c.market_price ?? 0
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count)
  }, [cards])

  // By rarity
  const byRarity = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const c of cards) {
      const key = c.rarity ?? 'Sconosciuta'
      if (!map.has(key)) map.set(key, { count: 0, value: 0 })
      const g = map.get(key)!
      g.count++; g.value += c.market_price ?? 0
    }
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value)
  }, [cards])

  // P&L by set
  const setPlData = useMemo(() => {
    const map = new Map<string, { value: number; cost: number; count: number }>()
    for (const c of cards) {
      if (!map.has(c.set_name)) map.set(c.set_name, { value: 0, cost: 0, count: 0 })
      const g = map.get(c.set_name)!
      g.value += c.market_price ?? 0; g.cost += c.cost_basis; g.count++
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, pl: d.value - d.cost, value: d.value, count: d.count }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 8)
  }, [cards])

  // Acquisitions by month
  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cards) {
      const key = c.acquired_date.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    return entries
  }, [cards])

  // By condition
  const byCondition = useMemo(() => {
    const buckets: Record<string, number> = {
      '10': 0, '9.5': 0, '9': 0, '8.5': 0, '8': 0, '<8': 0,
    }
    for (const c of cards) {
      if (c.condition >= 10) buckets['10']++
      else if (c.condition >= 9.5) buckets['9.5']++
      else if (c.condition >= 9) buckets['9']++
      else if (c.condition >= 8.5) buckets['8.5']++
      else if (c.condition >= 8) buckets['8']++
      else buckets['<8']++
    }
    return Object.entries(buckets).filter(([, v]) => v > 0)
  }, [cards])

  const ELEMENT_COLORS: Record<string, string> = {
    Fire: '#FF5B47', Water: '#4FC3F7', Grass: '#66BB6A', Lightning: '#FFCB2E',
    Psychic: '#AB47BC', Fighting: '#FF7043', Darkness: '#5C6BC0',
    Metal: '#90A4AE', Dragon: '#7E57C2', Fairy: '#F48FB1', Normal: '#BDBDBD',
    Colorless: '#9E9E9E', Sconosciuto: '#555',
  }
  const CONDITION_COLORS: Record<string, string> = {
    '10': '#2DD881', '9.5': '#4CAF50', '9': '#FFCB2E', '8.5': '#FF9800', '8': '#FF5B47', '<8': '#9E9E9E',
  }
  const RARITY_COLORS = ['#FFD700', '#C0C0C0', '#FF8C00', '#7B7CF7', '#4FC3F7', '#66BB6A', '#FF5B47', '#AB47BC']

  const maxMonth = Math.max(...byMonth.map(([, v]) => v), 1)
  const maxSetPl = Math.max(...setPlData.map(s => Math.abs(s.pl)), 1)
  const maxCondition = Math.max(...byCondition.map(([, v]) => v), 1)

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>⚡</div>
        <div style={{ fontFamily: 'var(--font-space)', fontSize: 18, fontWeight: 600, color: 'var(--ink-2)' }}>Nessun dato</div>
        <div style={{ fontSize: 13 }}>Aggiungi carte per vedere le analytics.</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>

        {/* ── Andamento valore (full width) ── */}
        <Card span={2}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <CardLabel>Andamento valore portfolio</CardLabel>
              <div style={{ fontFamily: 'var(--font-space)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ink-0)' }}>
                {fmtMoney(totalValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: chartChange >= 0 ? '#2DD881' : '#FF5B47', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {fmtPct(chartChange)} nel periodo selezionato
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['30g', '90g', '1a', 'tutto'] as Range[]).map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  background: range === r ? 'rgba(255,203,46,0.15)' : 'var(--bg-2)',
                  color: range === r ? '#FFCB2E' : 'var(--ink-3)',
                }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <AreaChart values={chartValues} color="#FFCB2E" height={160} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            <span>Min {fmtMoney(Math.min(...chartValues))}</span>
            <span>Max {fmtMoney(Math.max(...chartValues))}</span>
          </div>
        </Card>

        {/* ── Top Gainer ── */}
        <Card>
          <CardLabel>🚀 Top gainer 30g</CardLabel>
          {gainers.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nessun dato storico disponibile</div>
            : gainers.map(m => (
              <HBar
                key={m.name}
                label={m.name}
                value={m.ch}
                max={gainers[0].ch}
                color="#2DD881"
                sub={fmtPct(m.ch)}
              />
            ))}
        </Card>

        {/* ── Top Loser ── */}
        <Card>
          <CardLabel>📉 Top loser 30g</CardLabel>
          {losers.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nessun dato storico disponibile</div>
            : losers.map(m => (
              <HBar
                key={m.name}
                label={m.name}
                value={Math.abs(m.ch)}
                max={Math.abs(losers[0].ch)}
                color="#FF5B47"
                sub={fmtPct(m.ch)}
              />
            ))}
        </Card>

        {/* ── P&L per set (full width) ── */}
        <Card span={2}>
          <CardLabel>P&L per set</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px' }}>
            {setPlData.map(s => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{s.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: s.pl >= 0 ? '#2DD881' : '#FF5B47', flexShrink: 0 }}>
                    {s.pl >= 0 ? '+' : '−'}{fmtMoney(Math.abs(s.pl))}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(Math.abs(s.pl) / maxSetPl) * 100}%`,
                    background: s.pl >= 0 ? 'linear-gradient(90deg,#2DD881,#00C853)' : 'linear-gradient(90deg,#FF5B47,#D50000)',
                    borderRadius: 4, transition: 'width 400ms ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Per elemento ── */}
        <Card>
          <CardLabel>Distribuzione per tipo</CardLabel>
          {byElement.slice(0, 8).map(([el, d]) => (
            <DotRow
              key={el}
              label={el}
              count={d.count}
              total={cards.length}
              color={ELEMENT_COLORS[el] ?? '#7B7CF7'}
              value={fmtMoney(d.value)}
            />
          ))}
        </Card>

        {/* ── Per rarità ── */}
        <Card>
          <CardLabel>Distribuzione per rarità</CardLabel>
          {byRarity.slice(0, 8).map(([r, d], i) => (
            <DotRow
              key={r}
              label={r}
              count={d.count}
              total={cards.length}
              color={RARITY_COLORS[i % RARITY_COLORS.length]}
              value={fmtMoney(d.value)}
            />
          ))}
        </Card>

        {/* ── Acquisiti per mese ── */}
        <Card>
          <CardLabel>Acquisiti per mese</CardLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {byMonth.map(([month, count]) => (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{count}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${(count / maxMonth) * 90}px`,
                  background: 'linear-gradient(180deg, #FFCB2E, #FF9500)',
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.2 }}>
                  {month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Condizione PSA ── */}
        <Card>
          <CardLabel>Distribuzione condizione PSA</CardLabel>
          {byCondition.map(([grade, count]) => (
            <div key={grade} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>PSA {grade}</span>
                <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{count} carte ({((count / cards.length) * 100).toFixed(0)}%)</span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(count / maxCondition) * 100}%`,
                  background: CONDITION_COLORS[grade] ?? '#888',
                  borderRadius: 4,
                }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-3)' }}>Condizione media</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-0)' }}>
              {(cards.reduce((s, c) => s + c.condition, 0) / cards.length).toFixed(1)}
            </span>
          </div>
        </Card>

        {/* ── Fasce di valore ── */}
        <Card span={2}>
          <CardLabel>Fasce di valore · carte da vendere</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Tutte le carte',   threshold: 0,  color: 'var(--ink-0)' },
              { label: 'Valore › €1',      threshold: 1,  color: '#FFCB2E' },
              { label: 'Valore › €5',      threshold: 5,  color: '#FF9A3B' },
              { label: 'Valore › €10',     threshold: 10, color: '#2DD881' },
            ].map(({ label, threshold, color }) => {
              const group = cards.filter(c => (c.market_price ?? 0) > threshold)
              const total = group.reduce((s, c) => s + (c.market_price ?? 0), 0)
              return (
                <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, marginBottom: 4 }}>{group.length}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>{fmtMoney(total)}</div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Riepilogo finanziario ── */}
        <Card span={2}>
          <CardLabel>Riepilogo finanziario</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Valore totale', value: fmtMoney(totalValue), color: 'var(--ink-0)' },
              { label: 'Costo totale', value: fmtMoney(totalCost), color: 'var(--ink-0)' },
              { label: 'P&L assoluto', value: `${totalValue - totalCost >= 0 ? '+' : '−'}${fmtMoney(Math.abs(totalValue - totalCost))}`, color: totalValue - totalCost >= 0 ? '#2DD881' : '#FF5B47' },
              { label: 'P&L %', value: totalCost > 0 ? fmtPct(((totalValue - totalCost) / totalCost) * 100) : '—', color: totalValue - totalCost >= 0 ? '#2DD881' : '#FF5B47' },
              { label: 'Carte totali', value: String(cards.length), color: 'var(--ink-0)' },
              { label: 'Con storico prezzi', value: String(cards.filter(c => c.price_history.length > 0).length), color: 'var(--ink-0)' },
              { label: 'Preferite', value: String(cards.filter(c => c.is_favorite).length), color: '#FFCB2E' },
              { label: 'Valore medio/carta', value: fmtMoney(totalValue / cards.length), color: 'var(--ink-0)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  )
}
