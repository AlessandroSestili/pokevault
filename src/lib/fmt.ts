export function fmtMoney(v: number | null): string {
  if (v === null) return '—'
  const n = Math.abs(v)
  const s = n >= 1000
    ? n.toLocaleString('it-IT', { maximumFractionDigits: 0 })
    : n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '−' : '') + '€' + s
}

export function fmtPct(v: number): string {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'
}

export function computeTopSets<C extends { set_name: string; market_price?: number | null; cost_basis: number }>(
  cards: C[],
  n = 5
): { name: string; value: number; count: number }[] {
  const map = new Map<string, { name: string; value: number; count: number }>()
  for (const c of cards) {
    if (!map.has(c.set_name)) map.set(c.set_name, { name: c.set_name, value: 0, count: 0 })
    const g = map.get(c.set_name)!
    g.value += c.market_price ?? c.cost_basis
    g.count += 1
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, n)
}
