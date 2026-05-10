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

// Supported input formats:
//   sv6-012          → set.id:sv6 number:12         (dash separator)
//   sv6 012          → set.id:sv6 number:12          (space separator)
//   sv6/012          → set.id:sv6 number:12          (slash separator, TCGdex style)
//   4/102            → number:4 filtered to sets with 102 total
//   55/113           → number:55 filtered to sets with 113 total
//   012              → number:12
//   sv6              → set.id:sv6 (browse set)
//   Charizard        → name:Charizard* (prefix wildcard)
//   Tang             → name:Tang* (partial prefix)
type ParsedQuery =
  | { type: 'setNum'; setId: string; number: number }
  | { type: 'numTotal'; number: number; total: number }
  | { type: 'set'; setId: string }
  | { type: 'number'; number: number }
  | { type: 'name'; name: string }

function parseQuery(raw: string): ParsedQuery {
  const s = raw.trim()

  // "{setId}-{num}" or "{setId} {num}" or "{setId}/{num}" where setId starts with a letter
  const setNumSep = s.match(/^([a-zA-Z][a-zA-Z0-9]{1,11})[-\s\/](\d{1,4})$/i)
  if (setNumSep) {
    return { type: 'setNum', setId: setNumSep[1].toLowerCase(), number: parseInt(setNumSep[2], 10) }
  }

  // "{number}/{total}" — both sides numeric (e.g. "55/113", "4/102")
  const slashNum = s.match(/^(\d+)\/(\d+)$/)
  if (slashNum) {
    return { type: 'numTotal', number: parseInt(slashNum[1], 10), total: parseInt(slashNum[2], 10) }
  }

  // pure number — "012", "55"
  if (/^\d+$/.test(s)) return { type: 'number', number: parseInt(s, 10) }

  // set code only — alphanumeric, starts with letter, contains at least one digit (e.g. sv6, swsh12)
  // Pure-alpha strings like "pikachu" fall through to name search
  if (/^[a-zA-Z][a-zA-Z0-9]{1,11}$/.test(s) && /\d/.test(s)) {
    return { type: 'set', setId: s.toLowerCase() }
  }

  return { type: 'name', name: s }
}

function buildPokemonTcgQuery(parsed: ParsedQuery): string {
  switch (parsed.type) {
    case 'setNum':   return `set.id:${parsed.setId} number:${parsed.number}`
    case 'numTotal': return `number:${parsed.number}`
    case 'set':      return `set.id:${parsed.setId}`
    case 'number':   return `number:${parsed.number}`
    case 'name':     return `name:${parsed.name}*`  // prefix wildcard — finds "Charizard ex" when typing "Char"
  }
}

async function queryPokemonTcg(q: string, pageSize = 36): Promise<PokemonTcgCard[]> {
  try {
    const res = await fetch(`${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=-set.releaseDate`)
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
  let results = await queryPokemonTcg(tcgQuery)

  // For "55/113" — filter client-side to sets whose total matches
  if (parsed.type === 'numTotal' && results.length > 0) {
    const filtered = results.filter(c => c.set.printedTotal === parsed.total)
    // Keep filtered if it narrows results; otherwise show all (user can eyeball)
    if (filtered.length > 0) results = filtered
  }

  // For name searches: if prefix wildcard found nothing, try contains (*name*)
  if (results.length === 0 && parsed.type === 'name') {
    results = await queryPokemonTcg(`name:*${parsed.name}*`)
  }

  if (results.length > 0) return results

  // ── TCGdex fallback ────────────────────────────────────────────────────────
  // Handles non-EN cards, Japanese sets, Italian sets, etc.

  if (parsed.type === 'name') {
    const tcgDexCards = await searchCardsByNameTcgDex(parsed.name)
    return tcgDexCards.map(tcgDexToPokemonTcg)
  }

  if (parsed.type === 'setNum') {
    // Try multiple languages — IT and JP set codes can differ from EN
    for (const lang of ['en', 'ja', 'it', 'fr', 'de', 'es', 'pt', 'ko']) {
      const card = await fetchCardByCodeTcgDex(
        parsed.setId,
        String(parsed.number).padStart(3, '0'),
        lang
      )
      if (card) return [tcgDexToPokemonTcg(card)]
    }
    // Also try without zero-padding (some sets use raw numbers)
    for (const lang of ['en', 'ja', 'it']) {
      const card = await fetchCardByCodeTcgDex(parsed.setId, String(parsed.number), lang)
      if (card) return [tcgDexToPokemonTcg(card)]
    }
  }

  if (parsed.type === 'numTotal') {
    // Can't narrow by total in TCGdex easily — TCGdex fallback not useful here
    return []
  }

  return []
}
