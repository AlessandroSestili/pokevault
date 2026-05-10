const BASE = 'https://api.justtcg.com/v1'
const USD_TO_EUR = 0.92

interface JustTcgVariant {
  condition: string
  language: string
  price: number
  printing: string
}

interface JustTcgCard {
  name: string
  set_name: string
  variants: JustTcgVariant[]
}

const CONDITION_RANK: Record<string, number> = {
  'Near Mint': 0,
  'Lightly Played': 1,
  'Moderately Played': 2,
  'Heavily Played': 3,
  'Damaged': 4,
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

    // Find best Near Mint Japanese Normal variant across all results
    const japVariants: JustTcgVariant[] = []
    for (const card of cards) {
      for (const v of card.variants ?? []) {
        if (v.language?.toLowerCase() === 'japanese' && v.price > 0) {
          japVariants.push(v)
        }
      }
    }
    if (!japVariants.length) return null

    // Sort by condition quality, prefer Normal printing
    japVariants.sort((a, b) => {
      const condDiff = (CONDITION_RANK[a.condition] ?? 99) - (CONDITION_RANK[b.condition] ?? 99)
      if (condDiff !== 0) return condDiff
      const aNormal = a.printing?.toLowerCase().includes('normal') ? 0 : 1
      const bNormal = b.printing?.toLowerCase().includes('normal') ? 0 : 1
      return aNormal - bNormal
    })

    const usd = japVariants[0].price
    return Math.round(usd * USD_TO_EUR * 100) / 100
  } catch {
    return null
  }
}
