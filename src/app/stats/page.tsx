import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { fetchCards } from '@/lib/queries'
import { computePortfolioTotals } from '@/lib/totals'
import { formatEur } from '@/lib/formats'

export const metadata = { title: 'Stats — PokeVault' }

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="font-mono text-[10px] tracking-[1.5px] uppercase mb-2" style={{ color: 'var(--text-2)' }}>{label}</p>
      <p className="font-display font-semibold text-[22px] leading-none tracking-[-0.5px]" style={{ color: 'var(--text-0)' }}>{value}</p>
      {sub && <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--text-2)' }}>{sub}</p>}
    </div>
  )
}

function BarRow({ label, value, max, amount }: { label: string; value: number; max: number; amount: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px]" style={{ color: 'var(--text-1)' }}>{label}</span>
        <span className="font-mono text-[12px]" style={{ color: 'var(--text-2)' }}>{amount}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--accent)' }}
        />
      </div>
    </div>
  )
}

export default async function StatsPage() {
  let cards: Awaited<ReturnType<typeof fetchCards>> = []
  try { cards = await fetchCards() } catch { /* Supabase not configured */ }

  const totals = computePortfolioTotals(cards)

  // Group by element
  const byElement: Record<string, { count: number; value: number }> = {}
  for (const card of cards) {
    const key = card.element ?? 'Senza tipo'
    if (!byElement[key]) byElement[key] = { count: 0, value: 0 }
    byElement[key].count++
    byElement[key].value += card.market_price ?? 0
  }
  const elementRows = Object.entries(byElement)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 8)
  const maxElementValue = Math.max(...elementRows.map(r => r[1].value), 1)

  // Group by set
  const bySet: Record<string, { count: number; value: number }> = {}
  for (const card of cards) {
    const key = card.set_name
    if (!bySet[key]) bySet[key] = { count: 0, value: 0 }
    bySet[key].count++
    bySet[key].value += card.market_price ?? 0
  }
  const setRows = Object.entries(bySet)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 8)
  const maxSetValue = Math.max(...setRows.map(r => r[1].value), 1)

  // Top cards by market value
  const topCards = [...cards]
    .sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))
    .slice(0, 5)

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar pathname="/stats" />
      <div className="flex-1 pb-nav px-4 md:px-8 py-6 max-w-[1000px] mx-auto w-full space-y-8">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Valore totale" value={formatEur(totals.totalValue)} />
          <StatCard label="Carte" value={String(totals.cardCount)} />
          <StatCard label="Preferite" value={String(totals.favoriteCount)} />
          <StatCard label="Grado 9.5+" value={String(totals.topGradeCount)} />
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 font-mono text-[13px]" style={{ color: 'var(--text-2)' }}>
            <span className="text-4xl mb-4">📊</span>
            Aggiungi carte per vedere le statistiche
          </div>
        ) : (
          <>
            {/* By element */}
            {elementRows.length > 0 && (
              <div className="glass rounded-2xl p-5 space-y-4">
                <p className="font-mono text-[10px] tracking-[1.5px] uppercase" style={{ color: 'var(--text-2)' }}>Per tipo</p>
                <div className="space-y-3">
                  {elementRows.map(([label, { count, value }]) => (
                    <BarRow
                      key={label}
                      label={label}
                      value={value}
                      max={maxElementValue}
                      amount={`${count} carte · ${formatEur(value)}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* By set */}
            {setRows.length > 0 && (
              <div className="glass rounded-2xl p-5 space-y-4">
                <p className="font-mono text-[10px] tracking-[1.5px] uppercase" style={{ color: 'var(--text-2)' }}>Per set</p>
                <div className="space-y-3">
                  {setRows.map(([label, { count, value }]) => (
                    <BarRow
                      key={label}
                      label={label}
                      value={value}
                      max={maxSetValue}
                      amount={`${count} carte · ${formatEur(value)}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Top cards */}
            {topCards.length > 0 && (
              <div className="glass rounded-2xl p-5 space-y-3">
                <p className="font-mono text-[10px] tracking-[1.5px] uppercase mb-4" style={{ color: 'var(--text-2)' }}>Top carte per valore</p>
                {topCards.map((card, i) => (
                  <div key={card.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-mono text-[12px] w-5 text-right flex-shrink-0" style={{ color: 'var(--text-2)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-medium text-[14px] truncate" style={{ color: 'var(--text-0)' }}>{card.name}</p>
                      <p className="font-mono text-[11px]" style={{ color: 'var(--text-2)' }}>{card.set_name}</p>
                    </div>
                    <p className="font-mono text-[13px] flex-shrink-0" style={{ color: 'var(--text-0)' }}>
                      {card.market_price != null ? formatEur(card.market_price) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
