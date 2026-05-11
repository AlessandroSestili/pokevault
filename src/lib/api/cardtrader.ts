const BASE = 'https://api.cardtrader.com/api/v2'
const GAME_ID = 5

function auth() {
  return { Authorization: `Bearer ${process.env.CARDTRADER_TOKEN!}` }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CTExpansion {
  id: number
  code: string
  name: string
}

export interface CTBlueprint {
  id: number
  name: string
  version: string | null
  expansion_id: number
  category_id: number
  fixed_properties: {
    collector_number?: string
    pokemon_rarity?: string
  }
  image_url: string | null
}

export interface CTProduct {
  blueprint_id: number
  price_cents: number
  price_currency: string
  properties_hash: {
    condition?: string
    pokemon_language?: string
  }
  on_vacation: boolean
}

// Category 73 = single Pokémon cards (vs boosters, boxes, accessories)
const CARD_CATEGORY = 73

// ── Expansion metadata ───────────────────────────────────────────────────────

// Known JP expansion codes on CardTrader. EN/EU sets have all other codes.
// Verified from CT API — includes SV era JP, SWSH era JP, and World Champions Pack.
export const JP_EXPANSION_CODES = new Set([
  // SV Era JP (small sets)
  'sv1a', 'sv1s', 'sv1v',
  'sv2a', 'sv2d', 'sv2p',
  'sv3a',
  'sv4a', 'sv4k',
  'sv5a', 'sv5k', 'sv5m',
  'sv6a', 'sv7a',
  'svb',
  // SV Era JP (full-size sets, use numeric sv codes on CT)
  'sv3', 'sv6', 'sv7', 'sv8', 'sv9', 'sv10',
  // SWSH Era JP
  's3', 's4', 's8', 's9', 's11', 's12a',
  // Other JP
  'wcp', 'cs2a', 'cs2b',
])

export function isJpExpansion(code: string): boolean {
  return JP_EXPANSION_CODES.has(code.toLowerCase())
}

/**
 * Printed total → CT expansion codes that share that total.
 * All values verified directly from CT blueprints/export API.
 * Add new sets here when they release.
 */
export const TOTAL_TO_CODES: Record<number, string[]> = {
  // ── SV Era EN ──────────────────────────────────────────────────────────────
  198: ['svi', 'cre'],   // Scarlet & Violet + Chilling Reign
  193: ['pal'],
  197: ['obf'],
  182: ['par'],
   91: ['paf'],
  162: ['tef'],
  167: ['twm'],
   64: ['sfa', 'sv6a', 'sv7a', 'ju'],  // Shrouded Fable EN + Mask of Change / Ancient Corner JP + Jungle
  142: ['scr'],
  191: ['ssp'],
  // ── SWSH Era EN ────────────────────────────────────────────────────────────
  202: ['ssh'],
  192: ['rcl'],
  189: ['daa', 'astr'],  // Darkness Ablaze + Astral Radiance
  185: ['viv'],
  163: ['bst'],
  172: ['brs', 's12a'],  // Brilliant Stars EN + VSTAR Universe JP
  195: ['sit'],
  159: ['crz'],
  // ── SV Era JP small sets ───────────────────────────────────────────────────
   73: ['sv1a'],
   78: ['sv1s', 'sv1v'],
  165: ['sv2a', 'ex'],  // Pokémon Card 151 JP + Expedition Base Set
   71: ['sv2d', 'sv2p', 'sv5k', 'sv5m'],
   62: ['sv3a'],
  190: ['sv4a'],
   66: ['sv4k', 'sv5a'],
  // ── SV Era JP full-size sets (CT uses numeric sv/s codes) ─────────────────
  108: ['sv3', 'evo', 'dex', 'ros', 'pk', 'wcp'],  // Ruler of the Black Flame JP + vintage EN
  101: ['sv6', 'hl', 'df', 'plb'],  // Mask of Change JP + EX Hidden Legends + EX Dragon Frontiers + Plasma Blast
  102: ['sv7', 'bs', 'shbs', 'tri'],  // Stellar Miracle JP + Base Set EN + Triumphant
  106: ['sv8', 'flf', 'em', 'ge'],    // Super Electric Breaker JP + vintage EN
  100: ['sv9', 's3', 's4', 's8', 's9', 's11'],
   98: ['sv10'],   // The Glory of Team Rocket (SV10 JP)
   28: ['svb'],
  115: ['cs2a', 'cs2b', 'uf', 'wcd2006'],  // Vivid Portrayals JP + EX Unseen Forces + World Championship Decks 2006
  // ── Vintage EN (selected sets with distinctive totals) ────────────────────
  107: ['dx'],     // EX Deoxys
  111: ['cinv', 'n1', 'rr'],
  114: ['blw', 'sts'],
  147: ['bus'],    // Burning Shadows
}

// ── API helpers ──────────────────────────────────────────────────────────────

export async function getExpansions(): Promise<Map<string, CTExpansion>> {
  const res = await fetch(`${BASE}/expansions`, {
    headers: auth(),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return new Map()
  const all: (CTExpansion & { game_id: number })[] = await res.json()
  const map = new Map<string, CTExpansion>()
  for (const e of all) {
    if (e.game_id === GAME_ID) map.set(e.code, e)
  }
  return map
}

export async function getBlueprintsByExpansion(expansionId: number): Promise<CTBlueprint[]> {
  const res = await fetch(`${BASE}/blueprints/export?expansion_id=${expansionId}`, {
    headers: auth(),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const all: CTBlueprint[] = await res.json()
  return all.filter(b => b.category_id === CARD_CATEGORY)
}

export async function searchBlueprintsByName(
  q: string,
  limit = 24
): Promise<(CTBlueprint & { expansion_code: string; expansion_name: string })[]> {
  const [res, expansions] = await Promise.all([
    fetch(`${BASE}/blueprints?name=${encodeURIComponent(q)}&game_id=${GAME_ID}&limit=${limit}`, {
      headers: auth(),
    }),
    getExpansions(),
  ])
  if (!res.ok) return []
  const all: CTBlueprint[] = await res.json()

  // Build id → {code, name} reverse map once
  const byId = new Map<number, { code: string; name: string }>()
  for (const [code, e] of expansions) byId.set(e.id, { code, name: e.name })

  return all
    .filter(b => b.category_id === CARD_CATEGORY)
    .map(b => {
      const exp = byId.get(b.expansion_id) ?? { code: '', name: '' }
      return { ...b, expansion_code: exp.code, expansion_name: exp.name }
    })
}

export const CT_CONDITIONS = ['Near Mint', 'Slightly Played', 'Moderately Played', 'Played', 'Poor'] as const
export type CTCondition = typeof CT_CONDITIONS[number]

export const CONDITION_MULTIPLIERS: Record<CTCondition, number> = {
  'Near Mint':          1.00,
  'Slightly Played':    0.85,
  'Moderately Played':  0.70,
  'Played':             0.50,
  'Poor':               0.25,
}

export function gradeToCTCondition(grade: number): CTCondition {
  if (grade >= 9)   return 'Near Mint'
  if (grade >= 7)   return 'Slightly Played'
  if (grade >= 5)   return 'Moderately Played'
  if (grade >= 3)   return 'Played'
  return 'Poor'
}

async function fetchMarketplaceProducts(blueprintId: number): Promise<CTProduct[]> {
  const res = await fetch(`${BASE}/marketplace/products?blueprint_id=${blueprintId}`, {
    headers: auth(),
  })
  if (!res.ok) return []
  const data: Record<string, CTProduct[]> = await res.json()
  return data[String(blueprintId)] ?? []
}

/**
 * Returns the minimum price in EUR for a blueprint at the given CT condition.
 * Falls back to NM price × multiplier if no listings found for that condition.
 */
export async function getMinPriceForCondition(
  blueprintId: number,
  condition: CTCondition
): Promise<number | null> {
  const products = await fetchMarketplaceProducts(blueprintId)
  const available = products.filter(p => !p.on_vacation && p.price_cents > 0)

  const forCondition = available.filter(p => p.properties_hash?.condition === condition)
  if (forCondition.length) {
    return Math.min(...forCondition.map(p => p.price_cents)) / 100
  }

  // Fallback: NM price × multiplier
  const nmPrices = available
    .filter(p => p.properties_hash?.condition === 'Near Mint')
    .map(p => p.price_cents)
  if (!nmPrices.length) return null
  const nmPrice = Math.min(...nmPrices) / 100
  return +(nmPrice * CONDITION_MULTIPLIERS[condition]).toFixed(2)
}

/**
 * Returns the minimum Near Mint price in EUR for a blueprint.
 * Skips vacationing sellers and non-NM listings.
 */
export async function getMinNMPrice(blueprintId: number): Promise<number | null> {
  return getMinPriceForCondition(blueprintId, 'Near Mint')
}

// ── Result shape ─────────────────────────────────────────────────────────────

export interface CTSearchResult {
  id: string
  name: string
  set_name: string
  set_code: string
  number: string | null
  rarity: string | null
  language: string
  image_url: string | null
  cardtrader_blueprint_id: number
  price: null
}

export function blueprintToResult(
  b: CTBlueprint,
  expansionCode: string,
  expansionName: string
): CTSearchResult {
  // version is "010/182", "Ultra Rare | 010/182", or "Illustration Rare | GG16/GG70"
  const numMatch = (b.version ?? '').match(/([A-Z]*\d+\/[A-Z]*\d+)/i)
  const number = numMatch ? numMatch[1] : (b.fixed_properties?.collector_number ?? null)
  const rarity = b.fixed_properties?.pokemon_rarity ?? null

  return {
    id: String(b.id),
    name: b.name,
    set_name: expansionName,
    set_code: expansionCode,
    number,
    rarity,
    language: isJpExpansion(expansionCode) ? 'JP' : 'EN',
    image_url: b.image_url,
    cardtrader_blueprint_id: b.id,
    price: null,
  }
}
