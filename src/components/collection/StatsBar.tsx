import type { PortfolioTotals } from '@/types'
import { formatEur, formatPct } from '@/lib/formats'

export function StatsBar({ totals }: { totals: PortfolioTotals }) {
  const { totalValue, totalPl, plPercent, cardCount } = totals
  const plPositive = totalPl >= 0

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Total value */}
      <div className="glass rounded-2xl p-4">
        <p className="font-mono text-[10px] tracking-[1.5px] uppercase mb-2" style={{ color: 'var(--text-2)' }}>
          Valore
        </p>
        <p className="font-display font-semibold text-[22px] leading-none tracking-[-0.5px]" style={{ color: 'var(--text-0)' }}>
          {formatEur(totalValue)}
        </p>
      </div>

      {/* P&L */}
      <div className="glass rounded-2xl p-4">
        <p className="font-mono text-[10px] tracking-[1.5px] uppercase mb-2" style={{ color: 'var(--text-2)' }}>
          P&L
        </p>
        <p
          className="font-display font-semibold text-[22px] leading-none tracking-[-0.5px]"
          style={{ color: plPositive ? 'var(--pos)' : 'var(--neg)' }}
        >
          {formatEur(Math.abs(totalPl))}
        </p>
        <p className="font-mono text-[11px] mt-1" style={{ color: plPositive ? 'var(--pos)' : 'var(--neg)' }}>
          {formatPct(plPercent)}
        </p>
      </div>

      {/* Cards */}
      <div className="glass rounded-2xl p-4">
        <p className="font-mono text-[10px] tracking-[1.5px] uppercase mb-2" style={{ color: 'var(--text-2)' }}>
          Carte
        </p>
        <p className="font-display font-semibold text-[22px] leading-none tracking-[-0.5px]" style={{ color: 'var(--text-0)' }}>
          {cardCount}
        </p>
      </div>
    </div>
  )
}
