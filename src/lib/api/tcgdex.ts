import type { TcgDexCard, PokemonTcgCard } from "@/types";

const BASE = "https://api.tcgdex.net/v2";

// Convert a TCGdex card to the PokemonTcgCard shape (no price data)
export function tcgDexToPokemonTcg(card: TcgDexCard): PokemonTcgCard {
  return {
    id: `tcgdex-${card.id}`,
    name: card.name,
    number: card.localId,
    set: {
      id: card.set.id,
      name: card.set.name,
      printedTotal: card.set.cardCount?.official ?? card.set.cardCount?.total ?? 0,
      series: card.set.serie?.name ?? '',
      releaseDate: '',
    },
    types: card.types,
    rarity: card.rarity,
    images: card.image
      ? { small: `${card.image}/low.webp`, large: `${card.image}/high.webp` }
      : { small: '', large: '' },
  }
}

// Search cards by name via TCGdex (tries en, then ja, then all supported langs)
export async function searchCardsByNameTcgDex(
  name: string
): Promise<TcgDexCard[]> {
  const langs = ['en', 'ja', 'it', 'fr', 'de', 'es', 'pt', 'ko', 'zh-tw']
  for (const lang of langs) {
    try {
      const res = await fetch(
        `${BASE}/${lang}/cards?q=name:${encodeURIComponent(name)}&pageSize=20`
      )
      if (!res.ok) continue
      const data = await res.json()
      const cards: TcgDexCard[] = Array.isArray(data) ? data : (data.data ?? [])
      if (cards.length > 0) return cards
    } catch {
      continue
    }
  }
  return []
}

// Fetch a single card by setId + localId from TCGdex
export async function fetchCardByCodeTcgDex(
  setId: string,
  localId: string,
  lang = 'en'
): Promise<TcgDexCard | null> {
  try {
    const res = await fetch(`${BASE}/${lang}/cards/${setId}-${localId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchCardFromTcgDex(
  id: string,
  lang: string
): Promise<TcgDexCard | null> {
  try {
    const res = await fetch(`${BASE}/${lang}/cards/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchCardsTcgDex(
  setId: string,
  lang: string
): Promise<TcgDexCard[]> {
  try {
    const res = await fetch(`${BASE}/${lang}/sets/${setId}/cards`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
