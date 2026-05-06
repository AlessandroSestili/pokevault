import type { PokemonTcgCard } from "@/types";

const BASE = "https://api.pokemontcg.io/v2";

export async function fetchCardById(id: string): Promise<PokemonTcgCard | null> {
  try {
    const res = await fetch(`${BASE}/cards/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

// Parses the raw input and returns the right pokemontcg.io query string.
// Supported formats:
//   sv6-012        → set.id:sv6 number:12
//   sv6 012        → set.id:sv6 number:12
//   sv6            → set.id:sv6   (browse whole set)
//   4/102          → number:4
//   012            → number:12    (pure number)
//   Charizard      → name:"Charizard"
function buildQuery(raw: string): string {
  const s = raw.trim()

  // "sv6-012" or "sv6 012" — set code followed by a number
  const setNum = s.match(/^([a-zA-Z][a-zA-Z0-9]*)[-\s](\d+)$/)
  if (setNum) {
    return `set.id:${setNum[1].toLowerCase()} number:${parseInt(setNum[2], 10)}`
  }

  // "4/102" — card number in set (ignore the /total part)
  const slashNum = s.match(/^(\d+)\/\d+$/)
  if (slashNum) return `number:${parseInt(slashNum[1], 10)}`

  // pure number — e.g. "012" or "4"
  const pureNum = s.match(/^\d+$/)
  if (pureNum) return `number:${parseInt(s, 10)}`

  // set code only — letters + optional digits, no spaces, no extra words
  const setOnly = s.match(/^[a-zA-Z][a-zA-Z0-9]{1,5}$/)
  if (setOnly) return `set.id:${s.toLowerCase()}`

  // fallback: name search
  return `name:"${s}"`
}

export async function searchCards(query: string): Promise<PokemonTcgCard[]> {
  try {
    const q = buildQuery(query)
    const res = await fetch(`${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=20`)
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}
