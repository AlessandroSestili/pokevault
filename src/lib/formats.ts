export function formatEur(value: number): string {
  return '€' + value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPct(value: number, showSign = true): string {
  const prefix = showSign && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

export function formatCondition(condition: number): string {
  return condition % 1 === 0 ? `${condition}.0` : String(condition)
}
