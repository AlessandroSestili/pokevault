import type { MagicCardWithPrice, MagicColor } from '@/types'

export type MagicSortKey = 'recent' | 'alpha' | 'value' | 'cmc'

export function filterMagicCards(
  cards: MagicCardWithPrice[],
  search: string,
  colorFilter: MagicColor | null,
  foilOnly: boolean,
  favOnly: boolean,
): MagicCardWithPrice[] {
  let result = cards
  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.set_name.toLowerCase().includes(q) ||
      c.collector_number.includes(q) ||
      (c.type_line ?? '').toLowerCase().includes(q)
    )
  }
  if (colorFilter) result = result.filter(c => c.colors?.includes(colorFilter))
  if (foilOnly)    result = result.filter(c => c.foil)
  if (favOnly)     result = result.filter(c => c.is_favorite)
  return result
}

export function sortMagicCards(cards: MagicCardWithPrice[], sort: MagicSortKey): MagicCardWithPrice[] {
  const arr = [...cards]
  switch (sort) {
    case 'recent': return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case 'alpha':  return arr.sort((a, b) => a.name.localeCompare(b.name))
    case 'value':  return arr.sort((a, b) => (b.market_price ?? b.cost_basis) - (a.market_price ?? a.cost_basis))
    case 'cmc':    return arr.sort((a, b) => a.cmc - b.cmc)
  }
}
