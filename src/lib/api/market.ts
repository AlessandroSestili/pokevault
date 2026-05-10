export interface MarketCard {
  id: string
  name: string
  set_name: string
  set_code: string
  number: string
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

export async function searchMarketCards(
  q: string,
  lang?: string,
  limit = 20
): Promise<MarketCard[]> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  if (lang) params.set('lang', lang)
  const res = await fetch(`/api/market/cards/search?${params}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchMarketPrice(
  name: string,
  setCode?: string | null,
  lang = 'EN'
): Promise<number | null> {
  const params = new URLSearchParams({ name, lang })
  if (setCode) params.set('set_code', setCode)
  const res = await fetch(`/api/market/cards/price?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.price ?? null
}

export async function fetchMarketPriceHistory(
  cardId: string
): Promise<MarketPricePoint[]> {
  const res = await fetch(`/api/market/cards/${cardId}/prices`)
  if (!res.ok) return []
  return res.json()
}
