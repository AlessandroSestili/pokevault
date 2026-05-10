const BASE = 'https://api.justtcg.com/v1'
const USD_TO_EUR = 0.92

interface JustTcgVariant {
  condition: string
  language: string
  price: number
  printing: string
}

interface JustTcgCard {
  id: string
  name: string
  set: string
  set_name: string
  number: string
  rarity: string
  variants: JustTcgVariant[]
}

export interface JustTcgSearchResult {
  id: string
  name: string
  set: string
  set_name: string
  number: string
  rarity: string
  priceEur: number | null
}

const CONDITION_RANK: Record<string, number> = {
  'Near Mint': 0,
  'Lightly Played': 1,
  'Moderately Played': 2,
  'Heavily Played': 3,
  'Damaged': 4,
}

function bestJapanesePrice(variants: JustTcgVariant[]): number | null {
  const japVariants = variants.filter(v => v.language?.toLowerCase() === 'japanese' && v.price > 0)
  if (!japVariants.length) return null
  japVariants.sort((a, b) => {
    const condDiff = (CONDITION_RANK[a.condition] ?? 99) - (CONDITION_RANK[b.condition] ?? 99)
    if (condDiff !== 0) return condDiff
    const aNormal = a.printing?.toLowerCase().includes('normal') ? 0 : 1
    const bNormal = b.printing?.toLowerCase().includes('normal') ? 0 : 1
    return aNormal - bNormal
  })
  return Math.round(japVariants[0].price * USD_TO_EUR * 100) / 100
}

export async function searchJapaneseCards(query: string): Promise<JustTcgSearchResult[]> {
  const key = process.env.JUSTTCG_API_KEY
  if (!key) return []

  try {
    const res = await fetch(
      `${BASE}/cards?q=${encodeURIComponent(query)}&game=pokemon-japan&pageSize=24`,
      { headers: { 'x-api-key': key }, next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const cards: JustTcgCard[] = data.data ?? []

    return cards.map(card => ({
      id: card.id,
      name: card.name,
      set: card.set || '',
      set_name: card.set_name,
      number: card.number || '',
      rarity: card.rarity || '',
      priceEur: bestJapanesePrice(card.variants ?? []),
    }))
  } catch {
    return []
  }
}

export async function fetchJapaneseCardPrice(name: string): Promise<number | null> {
  const key = process.env.JUSTTCG_API_KEY
  if (!key) return null

  try {
    const res = await fetch(
      `${BASE}/cards?q=${encodeURIComponent(name)}&game=pokemon-japan`,
      { headers: { 'x-api-key': key }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const cards: JustTcgCard[] = data.data ?? []
    if (!cards.length) return null

    const allVariants: JustTcgVariant[] = cards.flatMap(c => c.variants ?? [])
    return bestJapanesePrice(allVariants)
  } catch {
    return null
  }
}
