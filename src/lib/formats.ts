export function formatEur(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value)
}

export function formatPct(value: number, showSign = true): string {
  const prefix = showSign && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

export function formatCondition(condition: number): string {
  return condition % 1 === 0 ? `${condition}.0` : String(condition)
}
