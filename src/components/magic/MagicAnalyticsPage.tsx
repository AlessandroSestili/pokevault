'use client'

import { useMemo } from 'react'
import type { MagicCardWithPrice, MagicColor } from '@/types'
import { MagicManaIcon } from '@/components/ui/MagicManaIcon'
import { fmtMoney } from '@/lib/fmt'

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

const RARITY_COLORS: Record<string, string> = {
  mythic: '#FF8C00', rare: '#FFD700', uncommon: '#C0C0C0', common: '#A0A0B0',
}
const RARITY_LABELS: Record<string, string> = {
  mythic: 'Mythic', rare: 'Rare', uncommon: 'Uncommon', common: 'Common',
}
const COLOR_NAMES: Record<MagicColor, string> = {
  W: 'Bianco', U: 'Blu', B: 'Nero', R: 'Rosso', G: 'Verde',
}

export function MagicAnalyticsPage({ cards }: { cards: MagicCardWithPrice[] }) {
  const totalValue = cards.reduce((s, c) => s + (c.market_price ?? c.cost_basis), 0)
  const totalCost  = cards.reduce((s, c) => s + c.cost_basis, 0)
  const pl         = totalValue - totalCost

  // By color (cards can have multiple colors)
  const byColor = useMemo(() => {
    const map = new Map<MagicColor, { count: number; value: number }>()
    for (const c of cards) {
      const cols = c.colors?.length ? c.colors : []
      for (const col of cols) {
        if (!map.has(col)) map.set(col, { count: 0, value: 0 })
        const g = map.get(col)!
        g.count++; g.value += (c.market_price ?? c.cost_basis) / cols.length
      }
    }
    const colorless = cards.filter(c => !c.colors?.length)
    return { colored: Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value), colorlessCount: colorless.length }
  }, [cards])

  // By rarity
  const byRarity = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const c of cards) {
      const key = c.rarity ?? 'common'
      if (!map.has(key)) map.set(key, { count: 0, value: 0 })
      const g = map.get(key)!
      g.count++; g.value += c.market_price ?? c.cost_basis
    }
    return Array.from(map.entries()).sort((a, b) => {
      const order = ['mythic', 'rare', 'uncommon', 'common']
      return order.indexOf(a[0]) - order.indexOf(b[0])
    })
  }, [cards])

  // P&L by set
  const setPlData = useMemo(() => {
    const map = new Map<string, { value: number; cost: number; count: number }>()
    for (const c of cards) {
      if (!map.has(c.set_name)) map.set(c.set_name, { value: 0, cost: 0, count: 0 })
      const g = map.get(c.set_name)!
      g.value += c.market_price ?? c.cost_basis; g.cost += c.cost_basis; g.count++
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, pl: d.value - d.cost, value: d.value, count: d.count }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 8)
  }, [cards])

  // CMC distribution
  const byCmc = useMemo(() => {
    const map = new Map<number, number>()
    for (const c of cards) {
      const key = Math.min(c.cmc, 7)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [cards])

  // Foil stats
  const foilCount = cards.filter(c => c.foil).length
  const foilValue = cards.filter(c => c.foil).reduce((s, c) => s + (c.market_price ?? c.cost_basis), 0)

  // Acquisitions by month
  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cards) {
      const key = c.acquired_date.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
  }, [cards])

  // Top 5 by value
  const top5 = useMemo(() =>
    [...cards].sort((a, b) => (b.market_price ?? b.cost_basis) - (a.market_price ?? a.cost_basis)).slice(0, 5),
    [cards]
  )

  // Type distribution
  const byType = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const c of cards) {
      const raw = c.type_line ?? c.card_type ?? 'Sconosciuto'
      const key = raw.split('—')[0].trim().split(' ').slice(-1)[0]
      if (!map.has(key)) map.set(key, { count: 0, value: 0 })
      const g = map.get(key)!
      g.count++; g.value += c.market_price ?? c.cost_basis
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 6)
  }, [cards])

  const maxSetPl  = Math.max(...setPlData.map(s => Math.abs(s.pl)), 1)
  const maxMonth  = Math.max(...byMonth.map(([, v]) => v), 1)
  const maxCmc    = Math.max(...byCmc.map(([, v]) => v), 1)
  const maxType   = Math.max(...byType.map(([, d]) => d.count), 1)

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>✦</div>
        <div style={{ fontFamily: 'var(--font-space)', fontSize: 18, fontWeight: 600, color: 'var(--ink-2)' }}>Nessun dato</div>
        <div style={{ fontSize: 13 }}>Aggiungi carte Magic per vedere le analytics.</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── Riepilogo finanziario (full) ── */}
        <Card span={2}>
          <CardLabel>Riepilogo finanziario</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Valore totale',     value: fmtMoney(totalValue),   color: 'var(--ink-0)' },
              { label: 'Costo totale',      value: fmtMoney(totalCost),    color: 'var(--ink-0)' },
              { label: 'P&L assoluto',      value: `${pl >= 0 ? '+' : '−'}${fmtMoney(Math.abs(pl))}`, color: pl >= 0 ? '#2DD881' : '#FF5B47' },
              { label: 'P&L %',             value: totalCost > 0 ? `${pl >= 0 ? '+' : '−'}${Math.abs((pl / totalCost) * 100).toFixed(1)}%` : '—', color: pl >= 0 ? '#2DD881' : '#FF5B47' },
              { label: 'Carte totali',      value: String(cards.length), color: 'var(--ink-0)' },
              { label: 'Foil',              value: String(foilCount),  color: '#FFCB2E' },
              { label: 'Preferite',         value: String(cards.filter(c => c.is_favorite).length), color: '#7B7CF7' },
              { label: 'Valore medio/carta',value: fmtMoney(totalValue / cards.length), color: 'var(--ink-0)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Per colore ── */}
        <Card>
          <CardLabel>Distribuzione per colore mana</CardLabel>
          {byColor.colored.map(([col, d]) => (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <MagicManaIcon color={col} size={20} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{COLOR_NAMES[col]}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{d.count}c</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', width: 70, textAlign: 'right' }}>{fmtMoney(d.value)}</span>
            </div>
          ))}
          {byColor.colorlessCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--line)' }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>Incolore</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{byColor.colorlessCount}c</span>
            </div>
          )}
        </Card>

        {/* ── Per rarità ── */}
        <Card>
          <CardLabel>Distribuzione per rarità</CardLabel>
          {byRarity.map(([r, d]) => (
            <div key={r} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: RARITY_COLORS[r] ?? '#888' }} />
                  <span style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{RARITY_LABELS[r] ?? r}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {d.count}c · {fmtMoney(d.value)}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(d.count / cards.length) * 100}%`, background: RARITY_COLORS[r] ?? '#888', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </Card>

        {/* ── P&L per set (full) ── */}
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

        {/* ── CMC distribution ── */}
        <Card>
          <CardLabel>Distribuzione costo mana (CMC)</CardLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {byCmc.map(([cmc, count]) => (
              <div key={cmc} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{count}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${(count / maxCmc) * 90}px`,
                  background: 'linear-gradient(180deg, #7B7CF7, #4F46E5)',
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {cmc === 7 ? '7+' : cmc}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Foil ── */}
        <Card>
          <CardLabel>Foil vs Non-foil</CardLabel>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Foil ✦', count: foilCount, value: foilValue, color: '#FFCB2E' },
              { label: 'Non-foil', count: cards.length - foilCount, value: totalValue - foilValue, color: 'var(--ink-3)' },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: 'var(--bg-2)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: item.color }}>{item.count}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{fmtMoney(item.value)}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 8, borderRadius: 8, background: 'var(--bg-2)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8,
              width: `${(foilCount / cards.length) * 100}%`,
              background: 'linear-gradient(90deg, #FFCB2E, #FF9500)',
            }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
            {((foilCount / cards.length) * 100).toFixed(1)}% foil
          </div>
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
                  background: 'linear-gradient(180deg, #7B7CF7, #4F46E5)',
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.2 }}>
                  {month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Top 5 per valore ── */}
        <Card>
          <CardLabel>Top 5 carte per valore</CardLabel>
          {top5.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: i < 3 ? '#000' : 'var(--ink-3)',
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.set_name}{c.foil ? ' · ✦' : ''}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', flexShrink: 0 }}>
                {fmtMoney(c.market_price ?? c.cost_basis)}
              </div>
            </div>
          ))}
        </Card>

        {/* ── Tipo carta ── */}
        <Card>
          <CardLabel>Distribuzione tipo carta</CardLabel>
          {byType.map(([type, d]) => (
            <HBar
              key={type}
              label={type}
              value={d.count}
              max={maxType}
              color="linear-gradient(90deg, #7B7CF7, #4F46E5)"
              sub={`${d.count}c · ${fmtMoney(d.value)}`}
            />
          ))}
        </Card>

        {/* ── Fasce di valore ── */}
        <Card span={2}>
          <CardLabel>Fasce di valore · carte da vendere</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Tutte le carte', threshold: 0,  color: 'var(--ink-0)' },
              { label: 'Valore › €1',    threshold: 1,  color: '#FFCB2E' },
              { label: 'Valore › €5',    threshold: 5,  color: '#FF9A3B' },
              { label: 'Valore › €10',   threshold: 10, color: '#2DD881' },
            ].map(({ label, threshold, color }) => {
              const group = cards.filter(c => (c.market_price ?? c.cost_basis) > threshold)
              const total = group.reduce((s, c) => s + (c.market_price ?? c.cost_basis), 0)
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

      </div>
    </div>
  )
}
