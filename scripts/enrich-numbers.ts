/**
 * enrich-numbers.ts
 * Fixes market_cards.number using:
 *  - PokéTCG.io for EN/IT/DE/FR sets
 *  - TCGdex + PokeAPI (dexId bridge) for JP sets
 *
 * Run: npx tsx scripts/enrich-numbers.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PTCG = 'https://api.pokemontcg.io/v2'
const TCGDEX = 'https://api.tcgdex.net/v2'
const POKEAPI = 'https://pokeapi.co/api/v2'

// JP set codes (CardTrader) → TCGdex set id (uppercase)
const JP_SETS: Record<string, string> = {
  sv1a:'SV1a', sv1s:'SV1S', sv1v:'SV1V',
  sv2a:'SV2A', sv2d:'SV2D', sv2p:'SV2P',
  sv3a:'SV3a', sv4a:'SV4a', sv4k:'SV4K',
  sv5a:'SV5a', sv5k:'SV5K', sv5m:'SV5M',
  sv6a:'SV6a', sv6b:'SV6b', sv7a:'SV7a',
  svb:'SVb',
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}
function normalizeBase(s: string) {
  return normalize(s).replace(/(?:ex|vmax|vstar|gx|v)$/, '')
}

function pad(n: string | number, total: number): string {
  const len = String(total).length
  return String(n).padStart(len < 3 ? 3 : len, '0')
}

// ──────────────────────────────────────────────────────────
// EN SETS — PokéTCG.io
// ──────────────────────────────────────────────────────────
async function ptcgSetTotal(setId: string): Promise<number> {
  try {
    const r = await fetch(`${PTCG}/sets/${setId}`)
    if (!r.ok) return 0
    const j = await r.json()
    return j.data?.printedTotal ?? j.data?.total ?? 0
  } catch { return 0 }
}

async function ptcgCards(setId: string): Promise<{ name: string; number: string }[]> {
  const out: { name: string; number: string }[] = []
  let page = 1
  while (true) {
    const r = await fetch(`${PTCG}/cards?q=set.id:${setId}&pageSize=250&page=${page}&select=name,number`)
    if (!r.ok) break
    const j = await r.json()
    const cards: { name: string; number: string }[] = j.data ?? []
    out.push(...cards)
    if (cards.length < 250) break
    page++
  }
  return out
}

async function enrichEn(setCode: string): Promise<Map<string, string>> {
  const [cards, total] = await Promise.all([ptcgCards(setCode), ptcgSetTotal(setCode)])
  // name_normalized → formatted number "NNN/TTT"
  const map = new Map<string, string>()
  for (const c of cards) {
    const key = normalize(c.name)
    const num = parseInt(c.number)
    if (isNaN(num)) {
      // promo like "SWSH001" — keep as-is
      if (!map.has(key)) map.set(key, c.number)
    } else {
      const formatted = total > 0
        ? `${pad(num, total)}/${pad(total, total)}`
        : String(num).padStart(3, '0')
      // Prefer higher numbers (secret rares) if name already seen
      if (!map.has(key)) map.set(key, formatted)
    }
  }
  return map
}

// ──────────────────────────────────────────────────────────
// JP SETS — TCGdex + PokeAPI dexId bridge
// ──────────────────────────────────────────────────────────
const dexCache = new Map<number, string>() // dexId → EN name

async function dexIdToEnName(dexId: number): Promise<string | null> {
  if (dexCache.has(dexId)) return dexCache.get(dexId)!
  try {
    const r = await fetch(`${POKEAPI}/pokemon-species/${dexId}`)
    if (!r.ok) return null
    const j = await r.json()
    const en = (j.names as { language: { name: string }; name: string }[])
      .find(n => n.language.name === 'en')?.name ?? null
    if (en) dexCache.set(dexId, en)
    return en
  } catch { return null }
}

type TcgDexCard = { localId: string; name: string; dexId?: number[] }

async function tcgdexSetData(setId: string): Promise<{ official: number; cards: TcgDexCard[] }> {
  const r = await fetch(`${TCGDEX}/ja/sets/${setId}`)
  if (!r.ok) return { official: 0, cards: [] }
  const data = await r.json()
  return {
    official: data.cardCount?.official ?? 0,
    cards: (data.cards ?? []) as TcgDexCard[],
  }
}

async function enrichJp(setCode: string, tcgdexId: string): Promise<Map<string, string>> {
  const { official, cards } = await tcgdexSetData(tcgdexId)
  if (!cards.length) return new Map()
  const total = official || Math.max(...cards.map(c => parseInt(c.localId) || 0).filter(n => n <= 300))
  const map = new Map<string, string>() // EN name normalized → "NNN/TTT"

  // The set overview only gives name (JP) + localId.
  // Fetch each card individually to get dexId (only needed for Pokémon cards)
  // To avoid 250 API calls, batch fetch only the ones with high localId (IRs/SRs are likely wrong)
  // For now: fetch all cards individually and use dexId→PokeAPI for EN name
  for (const card of cards) {
    const localIdNum = parseInt(card.localId)
    if (isNaN(localIdNum)) continue

    // Fetch full card data to get dexId
    let dexIds: number[] = []
    try {
      const r2 = await fetch(`${TCGDEX}/ja/cards/${tcgdexId}-${card.localId}`)
      if (r2.ok) {
        const full = await r2.json()
        dexIds = full.dexId ?? []
      }
    } catch { /* skip */ }

    if (dexIds.length > 0) {
      const enName = await dexIdToEnName(dexIds[0])
      if (enName) {
        const key = normalizeBase(enName)
        const formatted = `${pad(localIdNum, total)}/${pad(total, total)}`
        // If same Pokémon appears multiple times (IR, SAR...) store highest localId first
        // We'll pick the right one by comparing with current extracted number
        if (!map.has(key)) map.set(key, formatted)
        else {
          // Store both: key and key_NNN for disambiguation
          map.set(`${key}_${localIdNum}`, formatted)
        }
      }
    }
    // Rate limit: 150ms between calls
    await new Promise(r => setTimeout(r, 150))
  }
  return map
}

// ──────────────────────────────────────────────────────────
// Apply updates to market_cards
// ──────────────────────────────────────────────────────────
async function applyUpdates(setCode: string, refMap: Map<string, string>, isJp: boolean) {
  const { data: mcards } = await supabase
    .from('market_cards')
    .select('id, name, number')
    .ilike('set_code', setCode)

  if (!mcards?.length) return

  let updated = 0, skipped = 0
  const updates: { id: string; number: string }[] = []

  for (const card of mcards) {
    const key = normalize(card.name)
    const baseKey = normalizeBase(card.name)
    let newNumber = refMap.get(key) ?? refMap.get(baseKey) ?? null

    if (!newNumber) { skipped++; continue }
    if (newNumber === card.number) { skipped++; continue }

    updates.push({ id: card.id, number: newNumber })
    if (isJp) {
      console.log(`  ${card.name}: ${card.number ?? 'null'} → ${newNumber}`)
    }
    updated++
  }

  for (const u of updates) {
    await supabase.from('market_cards').update({ number: u.number }).eq('id', u.id)
  }

  console.log(`  → ${updated} fixed, ${skipped} unchanged / not found`)
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────
// Mapping from CardTrader EN set codes to PokéTCG.io set IDs
const CT_TO_PTCG: Record<string, string> = {
  // Scarlet & Violet
  svi:'sv1', svp:'svp', svpromo:'svp',
  pal:'sv2', obf:'sv3', sv3pt5:'sv3pt5', par:'sv4', paf:'sv4pt5',
  tef:'sv5', twm:'sv6', sfa:'sv6pt5', scr:'sv7', sse:'sv7pt5', ssp:'sv8',
  // Sword & Shield
  swsh1:'swsh1', rb:'swsh2', da:'swsh3', viv:'swsh4', brs:'swsh5', chf:'swsh5pt5',
  evt:'swsh6', cel:'swsh7', fus:'swsh8', brs2:'swsh9', ast:'swsh10', loz:'swsh10pt5',
  pop:'swsh11', sv1:'swsh12', sv2:'swsh12pt5',
  // Sun & Moon
  sm1:'sm1', gri:'sm2', bus:'sm3', cri:'sm4', ult:'sm5', fli:'sm6',
  cel2:'sm7', lon:'sm8', teu:'sm9', cob:'sm10', u:'sm11', sma:'sma',
  // XY
  xy1:'xy1', fl:'xy2', ph:'xy3', rr:'xy4', prc:'xy5', bf:'xy6',
  ao:'xy7', bk:'xy8', bw:'xy9', fco:'xy10', sts:'xy11', ev:'xy12',
  // Black & White
  bw1:'bw1', ep:'bw2', nv:'bw3', de:'bw4', pl2:'bw5', bc:'bw6',
  pl3:'bw7', pl4:'bw8', lc2:'bw9', ps:'bw10', bc2:'bw11', bw:'bwp',
  // HeartGold SoulSilver
  hs:'hgss1', ul:'hgss2', ud:'hgss3', tr:'hgss4', cl:'hgss5', tm:'hgssp',
  // Diamond & Pearl
  dp:'dp1', mt:'dp2', sw:'dp4', ge:'dp5', md:'dp6', la:'dp7', sf:'dp8', pl:'dp9',
  // POP
  pop6:'pop6', pop7:'pop7', pop8:'pop8', pop9:'pop9',
}

async function main() {
  // Paginate through market_cards to get all distinct set codes
  const sets = new Map<string, string>()
  let page = 0
  while (true) {
    const { data: rows } = await supabase
      .from('market_cards')
      .select('set_code, set_name')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!rows?.length) break
    for (const r of rows) if (r.set_code) sets.set(r.set_code, r.set_name ?? '')
    if (rows.length < 1000) break
    page++
  }

  // Separate JP from EN
  const jpSets = [...sets.keys()].filter(c => JP_SETS[c])
  const enSets = [...sets.keys()].filter(c => !JP_SETS[c])

  console.log(`Sets: ${enSets.length} EN, ${jpSets.length} JP\n`)

  // ── EN sets ──
  let i = 0
  for (const code of enSets) {
    i++
    const ptcgCode = CT_TO_PTCG[code] ?? code.toLowerCase()
    console.log(`[EN ${i}/${enSets.length}] ${code} → ptcg:${ptcgCode} — ${sets.get(code)}`)
    const map = await enrichEn(ptcgCode)
    if (!map.size) { console.log('  ⚠ No PokéTCG data'); continue }
    await applyUpdates(code, map, false)
    await new Promise(r => setTimeout(r, 300))
  }

  // ── JP sets ──
  let j = 0
  for (const code of jpSets) {
    j++
    const tcgId = JP_SETS[code]
    console.log(`\n[JP ${j}/${jpSets.length}] ${code} (TCGdex: ${tcgId}) — ${sets.get(code)}`)
    const map = await enrichJp(code, tcgId)
    if (!map.size) { console.log('  ⚠ No TCGdex data'); continue }
    console.log(`  ${map.size} EN names resolved`)
    await applyUpdates(code, map, true)
  }

  console.log('\n✅ Done')
}

main().catch(console.error)
