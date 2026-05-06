import type { PokemonTcgCard } from "@/types";
import { searchCardsByNameTcgDex, fetchCardByCodeTcgDex, tcgDexToPokemonTcg } from "./tcgdex";

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

// Detects query format and builds the right pokemontcg.io q= parameter.
//
// Supported input formats:
//   sv6-012          → set.id:sv6 number:12
//   swsh12pt5-200    → set.id:swsh12pt5 number:200   (long set codes)
//   sv6 012          → set.id:sv6 number:12           (space separator)
//   sv6/012          → set.id:sv6 number:12           (slash separator, TCGdex style)
//   4/102            → number:4                        (card number / set total)
//   012              → number:12                       (pure number)
//   sv6              → set.id:sv6                      (browse whole set)
//   Charizard        → name:"Charizard"
//
// Set codes on pokemontcg.io can be up to ~12 chars (e.g. swsh12pt5, sv4pt5).
type ParsedQuery =
  | { type: 'setNum'; setId: string; number: number }
  | { type: 'set'; setId: string }
  | { type: 'number'; number: number }
  | { type: 'name'; name: string }

function parseQuery(raw: string): ParsedQuery {
  const s = raw.trim()

  // "{setId}-{num}" or "{setId} {num}" or "{setId}/{num}" where setId is alphanumeric
  // and num is 1-4 digits (avoids matching "4/102" total notation below)
  const setNumSep = s.match(/^([a-zA-Z][a-zA-Z0-9]{1,11})[-\s\/](\d{1,4})$/i)
  if (setNumSep) {
    const setId = setNumSep[1].toLowerCase()
    const num = parseInt(setNumSep[2], 10)
    // distinguish "4/102" (number/total) from "sv6/012" (set/number):
    // if the left part starts with a letter it's a set code
    return { type: 'setNum', setId, number: num }
  }

  // "{number}/{total}" — pure numeric slash notation e.g. "4/102"
  const slashNum = s.match(/^(\d+)\/\d+$/)
  if (slashNum) return { type: 'number', number: parseInt(slashNum[1], 10) }

  // pure number — "012", "4"
  if (/^\d+$/.test(s)) return { type: 'number', number: parseInt(s, 10) }

  // set code only — no spaces, alphanumeric, starts with letter, up to 12 chars
  if (/^[a-zA-Z][a-zA-Z0-9]{1,11}$/.test(s)) {
    return { type: 'set', setId: s.toLowerCase() }
  }

  return { type: 'name', name: s }
}

function buildPokemonTcgQuery(parsed: ParsedQuery): string {
  switch (parsed.type) {
    case 'setNum': return `set.id:${parsed.setId} number:${parsed.number}`
    case 'set':    return `set.id:${parsed.setId}`
    case 'number': return `number:${parsed.number}`
    case 'name':   return `name:"${parsed.name}"`
  }
}

async function queryPokemonTcg(q: string): Promise<PokemonTcgCard[]> {
  try {
    const res = await fetch(`${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=20`)
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export async function searchCards(query: string): Promise<PokemonTcgCard[]> {
  const parsed = parseQuery(query)
  const tcgQuery = buildPokemonTcgQuery(parsed)
  const results = await queryPokemonTcg(tcgQuery)
  if (results.length > 0) return results

  // Fallback to TCGdex for cards not in pokemontcg.io database
  if (parsed.type === 'name') {
    const tcgDexCards = await searchCardsByNameTcgDex(parsed.name)
    return tcgDexCards.map(tcgDexToPokemonTcg)
  }

  if (parsed.type === 'setNum') {
    // Try TCGdex with the same set+number — tries en then jp
    for (const lang of ['en', 'ja', 'it', 'fr', 'de']) {
      const card = await fetchCardByCodeTcgDex(
        parsed.setId,
        String(parsed.number).padStart(3, '0'),
        lang
      )
      if (card) return [tcgDexToPokemonTcg(card)]
    }
  }

  return []
}
