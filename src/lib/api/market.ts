export interface MarketCard {
  id: string
  name: string
  set_name: string
  set_code: string
  number: string | null
  rarity: string | null
  language: string
  image_url: string | null
  cardtrader_blueprint_id: number | null
  price: {
    price_low: number | null
    price_mid: number | null
    price_high: number | null
    currency: string
    scraped_at: string
  } | null
}

export interface MarketPricePoint {
  price_low: number | null
  price_mid: number | null
  price_high: number | null
  currency: string
  scraped_at: string
}

export async function searchMarketCards(q: string, limit = 24): Promise<MarketCard[]> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  const res = await fetch(`/api/market/cards/search?${params}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchBlueprintPrice(blueprintId: number): Promise<number | null> {
  const params = new URLSearchParams({ blueprint_id: String(blueprintId) })
  const res = await fetch(`/api/market/cards/price?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.price ?? null
}

export async function fetchMarketPriceHistory(cardId: string): Promise<MarketPricePoint[]> {
  const res = await fetch(`/api/market/cards/${cardId}/prices`)
  if (!res.ok) return []
  return res.json()
}
