import type { ScryfallCard, MagicColor } from '@/types'

const BASE = 'https://api.scryfall.com'

async function scryfallFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
      // Scryfall asks for a small delay between requests; Next.js caching covers us
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function searchMagicCards(query: string, limit = 20): Promise<ScryfallCard[]> {
  if (query.trim().length < 2) return []

  // Detect "SET-NUMBER" or "SET NUMBER" patterns (e.g. "SLD-2013", "MKM 42")
  const setNumMatch = query.trim().match(/^([A-Za-z0-9]{2,6})[-\s](\d+)$/)
  const normalized = setNumMatch
    ? `set:${setNumMatch[1]} cn:${setNumMatch[2]}`
    : query.trim()

  const q = encodeURIComponent(normalized)
  const data = await scryfallFetch<{ data: ScryfallCard[]; total_cards: number }>(
    `/cards/search?q=${q}&order=released&unique=cards&page=1`
  )
  if (!data?.data) return []
  return data.data.slice(0, limit)
}

export async function fetchMagicCardById(id: string): Promise<ScryfallCard | null> {
  return scryfallFetch<ScryfallCard>(`/cards/${id}`)
}

// Extract the front-face image URL from a Scryfall card
export function getScryfallImage(card: ScryfallCard, size: 'small' | 'normal' | 'large' = 'normal'): string | null {
  if (card.image_uris) return card.image_uris[size] ?? null
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size] ?? null
  return null
}

export function getScryfallBackImage(card: ScryfallCard): string | null {
  if (card.card_faces?.[1]?.image_uris) return card.card_faces[1].image_uris.normal ?? null
  return null
}

// Derive primary color identity for display
export function getCardColors(card: ScryfallCard): MagicColor[] {
  if (card.colors && card.colors.length > 0) return card.colors
  return card.color_identity ?? []
}

// Parse Scryfall type_line → broad card_type bucket
export function parseCardType(typeLine: string): string {
  const tl = typeLine.toLowerCase()
  if (tl.includes('creature')) return 'Creatura'
  if (tl.includes('planeswalker')) return 'Planeswalker'
  if (tl.includes('instant')) return 'Istantaneo'
  if (tl.includes('sorcery')) return 'Stregoneria'
  if (tl.includes('enchantment')) return 'Incantesimo'
  if (tl.includes('artifact')) return 'Artefatto'
  if (tl.includes('land')) return 'Terra'
  if (tl.includes('battle')) return 'Battaglia'
  return 'Altro'
}

// Best EUR price from Scryfall
export function getScryfallPrice(card: ScryfallCard, foil: boolean): number | null {
  const raw = foil ? card.prices.eur_foil : card.prices.eur
  if (!raw) return null
  const n = parseFloat(raw)
  return isNaN(n) ? null : n
}
