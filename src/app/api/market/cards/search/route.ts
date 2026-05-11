import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  STANDARD_TO_CT,
  STANDARD_TO_PTCG,
  CT_JP_TO_TCGDEX,
  JP_SET_CODES,
} from '@/lib/setCodeMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PTCG = 'https://api.pokemontcg.io/v2'
const TCGDEX = 'https://api.tcgdex.net/v2'

// ── types ────────────────────────────────────────────────

interface DbCard {
  id: string
  name: string
  set_name: string
  set_code: string
  number: string
  rarity: string | null
  language: string
  image_url: string | null
  cardtrader_blueprint_id: number | null
}

interface PriceRow {
  card_id: string
  price_low: number | null
  price_mid: number | null
  price_high: number | null
  currency: string
  scraped_at: string
}

type CardWithPrice = DbCard & { price: PriceRow | null }

// ── price enrichment ────────────────────────────────────

async function attachPrices(cards: DbCard[]): Promise<CardWithPrice[]> {
  if (!cards.length) return []
  const { data: prices } = await supabase
    .from('market_prices')
    .select('card_id, price_low, price_mid, price_high, currency, scraped_at')
    .in('card_id', cards.map(c => c.id))
    .order('scraped_at', { ascending: false })

  const latest = new Map<string, PriceRow>()
  for (const p of (prices ?? []) as PriceRow[]) {
    if (!latest.has(p.card_id)) latest.set(p.card_id, p)
  }
  return cards.map(c => ({ ...c, price: latest.get(c.id) ?? null }))
}

// ── PokéTCG.io helpers ───────────────────────────────────

interface PtcgCard {
  id: string
  name: string
  number: string
  rarity?: string
  set: { id: string; name: string; printedTotal?: number; total?: number }
  images?: { small?: string; large?: string }
}

async function ptcgSearch(qFilter: string, limit: number): Promise<PtcgCard[]> {
  const url = `${PTCG}/cards?q=${encodeURIComponent(qFilter)}&pageSize=${limit}&select=id,name,number,rarity,set,images`
  try {
    const r = await fetch(url)
    if (!r.ok) return []
    const j = await r.json()
    return (j.data ?? []) as PtcgCard[]
  } catch { return [] }
}

function ptcgToResult(c: PtcgCard, ctSetCode: string, lang = 'EN'): CardWithPrice {
  const total = c.set.printedTotal ?? c.set.total ?? 0
  const num = parseInt(c.number)
  const formatted = !isNaN(num) && total > 0
    ? `${String(num).padStart(3, '0')}/${String(total).padStart(3, '0')}`
    : c.number
  return {
    id: `ptcg-${c.id}`,
    name: c.name,
    set_name: c.set.name,
    set_code: ctSetCode,
    number: formatted,
    rarity: c.rarity ?? null,
    language: lang,
    image_url: c.images?.small ?? null,
    cardtrader_blueprint_id: null,
    price: null,
  }
}

// ── search strategies ────────────────────────────────────

// "PAR-191" or "sv4-191": known set + number
async function searchBySetAndNumber(
  ptcgSetId: string,
  ctSetCode: string,
  numStr: string,
  limit: number,
  isJp: boolean
): Promise<CardWithPrice[]> {
  if (isJp) {
    // TCGdex for JP sets
    const tcgdexId = CT_JP_TO_TCGDEX[ctSetCode.toLowerCase()]
    if (!tcgdexId) return []
    const localId = numStr.replace(/^0+/, '') || numStr
    try {
      const r = await fetch(`${TCGDEX}/ja/cards/${tcgdexId}-${localId}`)
      if (!r.ok) return []
      const card = await r.json()
      // Try to find in DB first
      const { data: dbCards } = await supabase
        .from('market_cards')
        .select('id, name, set_name, set_code, number, rarity, language, image_url, cardtrader_blueprint_id')
        .ilike('set_code', ctSetCode)
        .ilike('number', `${numStr.replace(/^0+/, '').padStart(3, '0')}%`)
        .limit(limit)
      if (dbCards?.length) return attachPrices(dbCards as DbCard[])
      return [{
        id: `tcgdex-${tcgdexId}-${localId}`,
        name: card.name ?? `Card ${localId}`,
        set_name: card.set?.name ?? tcgdexId,
        set_code: ctSetCode,
        number: card.localId ?? localId,
        rarity: card.rarity ?? null,
        language: 'JP',
        image_url: card.image ? `${card.image}/low.webp` : null,
        cardtrader_blueprint_id: null,
        price: null,
      }]
    } catch { return [] }
  }

  // EN: PokéTCG.io
  const ptcgCards = await ptcgSearch(`set.id:${ptcgSetId} number:${parseInt(numStr) || numStr}`, limit)
  if (!ptcgCards.length) return []

  // Try to find matching DB rows for price
  const { data: dbCards } = await supabase
    .from('market_cards')
    .select('id, name, set_name, set_code, number, rarity, language, image_url, cardtrader_blueprint_id')
    .ilike('set_code', ctSetCode)
    .in('name', ptcgCards.map(c => c.name))
    .limit(limit)

  if (dbCards?.length) return attachPrices(dbCards as DbCard[])
  return ptcgCards.map(c => ptcgToResult(c, ctSetCode))
}

// "191/182": number + total → PokéTCG with printedTotal filter
async function searchByNumberWithTotal(num: string, total: string, limit: number): Promise<CardWithPrice[]> {
  // EN: printedTotal identifies the set uniquely
  const ptcgCards = await ptcgSearch(
    `number:${parseInt(num) || num} set.printedTotal:${total}`,
    limit
  )
  if (ptcgCards.length) {
    const results: CardWithPrice[] = []
    for (const c of ptcgCards) {
      const ctCode = STANDARD_TO_CT[c.set.id.toUpperCase()] ?? c.set.id.toLowerCase()
      // Try DB for price
      const { data: dbRows } = await supabase
        .from('market_cards')
        .select('id, name, set_name, set_code, number, rarity, language, image_url, cardtrader_blueprint_id')
        .ilike('set_code', ctCode)
        .eq('name', c.name)
        .limit(3)
      if (dbRows?.length) {
        const enriched = await attachPrices(dbRows as DbCard[])
        results.push(...enriched)
      } else {
        results.push(ptcgToResult(c, ctCode))
      }
    }
    return results
  }

  // JP fallback: find JP set where official count = total, localId = num
  const jpResults: CardWithPrice[] = []
  for (const [ctCode, tcgdexId] of Object.entries(CT_JP_TO_TCGDEX)) {
    try {
      const r = await fetch(`${TCGDEX}/ja/sets/${tcgdexId}`)
      if (!r.ok) continue
      const setData = await r.json()
      const official = setData.cardCount?.official ?? 0
      if (String(official) !== total) continue

      // This JP set has the matching total — look up the card
      const localId = parseInt(num).toString()
      const r2 = await fetch(`${TCGDEX}/ja/cards/${tcgdexId}-${localId}`)
      if (!r2.ok) continue
      const card = await r2.json()

      const { data: dbRows } = await supabase
        .from('market_cards')
        .select('id, name, set_name, set_code, number, rarity, language, image_url, cardtrader_blueprint_id')
        .ilike('set_code', ctCode)
        .ilike('number', `${num.padStart(3, '0')}%`)
        .limit(3)
      if (dbRows?.length) {
        const enriched = await attachPrices(dbRows as DbCard[])
        jpResults.push(...enriched)
      } else {
        jpResults.push({
          id: `tcgdex-${tcgdexId}-${localId}`,
          name: card.name ?? `Card ${localId}`,
          set_name: card.set?.name ?? tcgdexId,
          set_code: ctCode,
          number: `${num.padStart(3, '0')}/${String(official).padStart(3, '0')}`,
          rarity: card.rarity ?? null,
          language: 'JP',
          image_url: card.image ? `${card.image}/low.webp` : null,
          cardtrader_blueprint_id: null,
          price: null,
        })
      }
      if (jpResults.length >= limit) break
    } catch { continue }
  }
  return jpResults
}

// Name search: DB only
async function searchByName(q: string, lang: string | null, limit: number): Promise<CardWithPrice[]> {
  let query = supabase
    .from('market_cards')
    .select('id, name, set_name, set_code, number, rarity, language, image_url, cardtrader_blueprint_id')
    .ilike('name', `%${q}%`)
    .limit(limit)
  if (lang) query = query.eq('language', lang)
  const { data } = await query
  if (!data?.length) return []
  return attachPrices(data as DbCard[])
}

// ── main handler ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') ?? '').trim()
  const lang = searchParams.get('lang')?.toUpperCase() ?? null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  if (q.length < 2) return NextResponse.json([])

  // Pattern 1: "SETCODE-NNN" — e.g. "PAR-191", "sv5k-075", "obf-123"
  const setNumMatch = q.match(/^([a-zA-Z][a-zA-Z0-9]{1,11})-(\d{1,4})$/i)
  if (setNumMatch) {
    const rawCode = setNumMatch[1]
    const numStr = setNumMatch[2]
    const codeUpper = rawCode.toUpperCase()
    const codeLower = rawCode.toLowerCase()

    if (STANDARD_TO_PTCG[codeUpper]) {
      // Standard abbreviation (PAR, OBF, TEF…)
      const ptcgId = STANDARD_TO_PTCG[codeUpper]
      const ctCode = STANDARD_TO_CT[codeUpper] ?? codeLower
      const result = await searchBySetAndNumber(ptcgId, ctCode, numStr, limit, false)
      return NextResponse.json(result)
    }

    if (JP_SET_CODES.has(codeLower)) {
      // JP CardTrader code (sv5k, sv4k…)
      const result = await searchBySetAndNumber('', codeLower, numStr, limit, true)
      return NextResponse.json(result)
    }

    // EN CardTrader code (par, obf, pal…) — check if it maps to PokéTCG
    // Reverse lookup: CT code → standard → ptcg
    const standardEntry = Object.entries(STANDARD_TO_CT).find(([, ct]) => ct === codeLower)
    if (standardEntry) {
      const ptcgId = STANDARD_TO_PTCG[standardEntry[0]]
      if (ptcgId) {
        const result = await searchBySetAndNumber(ptcgId, codeLower, numStr, limit, false)
        return NextResponse.json(result)
      }
    }

    // Fallback: DB query with whatever code was given
    const { data } = await supabase
      .from('market_cards')
      .select('id, name, set_name, set_code, number, rarity, language, image_url, cardtrader_blueprint_id')
      .ilike('set_code', codeLower)
      .ilike('number', `${numStr.padStart(3, '0')}%`)
      .limit(limit)
    if (data?.length) return NextResponse.json(await attachPrices(data as DbCard[]))
    return NextResponse.json([])
  }

  // Pattern 2: "NNN/TTT" — number with total (most precise)
  const numTotalMatch = q.match(/^(\d{1,4})\/(\d{1,3})$/)
  if (numTotalMatch) {
    const [, num, total] = numTotalMatch
    const result = await searchByNumberWithTotal(num, total, limit)
    return NextResponse.json(result)
  }

  // Pattern 3: name search
  const result = await searchByName(q, lang, limit)
  return NextResponse.json(result)
}
