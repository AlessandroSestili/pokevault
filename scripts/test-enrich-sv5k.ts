// Enriches sv5k (Wild Force JP) numbers using TCGdex + PokeAPI
// Applies changes to DB.
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const TCGDEX = 'https://api.tcgdex.net/v2'
const POKEAPI = 'https://pokeapi.co/api/v2'

function normalize(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, '') }
// Strip "ex","v","vmax","vstar","gx" suffixes for matching
function normalizeBase(s: string) { return normalize(s).replace(/(?:ex|vmax|vstar|gx|v)$/, '') }
function pad3(n: number) { return String(n).padStart(3, '0') }

const dexCache = new Map<number, string>()
async function dexToEn(id: number): Promise<string | null> {
  if (dexCache.has(id)) return dexCache.get(id)!
  try {
    const r = await fetch(`${POKEAPI}/pokemon-species/${id}`)
    if (!r.ok) return null
    const j = await r.json()
    const en = j.names.find((n: {language:{name:string};name:string}) => n.language.name === 'en')?.name ?? null
    if (en) dexCache.set(id, en)
    return en
  } catch { return null }
}

async function main() {
  const SET_CODE = 'sv5k'
  const TCGDEX_ID = 'SV5K'

  // 1. Get set official total
  const rSet = await fetch(`${TCGDEX}/ja/sets/${TCGDEX_ID}`)
  const setData = await rSet.json()
  const official = setData.cardCount?.official ?? 71
  const allCards: { localId: string }[] = setData.cards ?? []
  console.log(`TCGdex ${TCGDEX_ID}: official=${official}, cards=${allCards.length}`)

  // 2. Build localId → EN base name (via dexId) + formatted number
  // Map: normalizedBaseName → [formatted numbers]
  const baseToNumbers = new Map<string, string[]>()

  for (const card of allCards) {
    const num = parseInt(card.localId)
    if (isNaN(num)) continue

    const formatted = `${pad3(num)}/${pad3(official)}`

    try {
      const r2 = await fetch(`${TCGDEX}/ja/cards/${TCGDEX_ID}-${card.localId}`)
      if (!r2.ok) continue
      const full = await r2.json()
      const dexIds: number[] = full.dexId ?? []

      if (dexIds.length > 0) {
        const en = await dexToEn(dexIds[0])
        if (en) {
          const key = normalizeBase(en) // e.g. "torterra" (handles "Torterra ex" lookup)
          if (!baseToNumbers.has(key)) baseToNumbers.set(key, [])
          baseToNumbers.get(key)!.push(formatted)
        }
      }
    } catch { continue }

    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n${baseToNumbers.size} Pokémon EN base names resolved`)

  // 3. Match market_cards and apply fixes
  const { data: mcards } = await supabase
    .from('market_cards')
    .select('id, name, number')
    .ilike('set_code', SET_CODE)

  console.log(`market_cards sv5k: ${mcards?.length} rows\n`)

  let fixed = 0, skipped = 0
  for (const card of mcards ?? []) {
    const base = normalizeBase(card.name) // strips "ex" etc.
    const candidates = baseToNumbers.get(base)
    if (!candidates?.length) { skipped++; continue }

    const curNum = card.number ? parseInt(card.number) : 0
    // Pick candidate closest to current extracted number
    const best = candidates.reduce((a, b) =>
      Math.abs(parseInt(a) - curNum) <= Math.abs(parseInt(b) - curNum) ? a : b
    )

    if (best === card.number) { skipped++; continue }

    console.log(`  ${card.name}: ${card.number ?? 'null'} → ${best}`)
    await supabase.from('market_cards').update({ number: best }).eq('id', card.id)
    fixed++
  }

  console.log(`\n✅ Fixed: ${fixed}, skipped: ${skipped}`)
}

main().catch(console.error)
