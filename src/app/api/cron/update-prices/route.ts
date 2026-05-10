import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCardById } from '@/lib/api/pokemontcg'
import { extractMarketPrice } from '@/lib/api/prices'
import { fetchJapaneseCardPrice } from '@/lib/api/justtcg'
import { upsertPriceSnapshot } from '@/lib/queries'

const JP_BATCH_SIZE = 100

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  let updated = 0

  // ── EN / ITA cards — no rate limits, update all ───────────────────────────
  const { data: enCards } = await supabase
    .from('cards')
    .select('id, api_id, api_source, language')
    .not('api_id', 'is', null)
    .neq('language', 'JP')
    .eq('api_source', 'pokemontcg')

  for (const card of enCards ?? []) {
    const tcgCard = await fetchCardById(card.api_id)
    if (!tcgCard) continue
    const priceEur = extractMarketPrice(tcgCard, 'cardmarket') ?? extractMarketPrice(tcgCard, 'tcgplayer') ?? null
    if (priceEur !== null) {
      await upsertPriceSnapshot(card.id, today, priceEur)
      updated++
    }
  }

  // ── JP cards — rotate through in batches of 100 ───────────────────────────
  // Fetch all JP cards with their latest snapshot date, sort oldest-first,
  // take the first JP_BATCH_SIZE. Next run those will be newest → natural rotation.
  const { data: jpCards } = await supabase
    .from('cards')
    .select('id, name, api_id, api_source, language')
    .not('api_id', 'is', null)
    .eq('language', 'JP')

  if (jpCards?.length) {
    const jpIds = jpCards.map(c => c.id)

    const { data: snapshots } = await supabase
      .from('price_snapshots')
      .select('card_id, date')
      .in('card_id', jpIds)
      .order('date', { ascending: false })

    // Latest snapshot date per card
    const latestDate = new Map<string, string>()
    for (const s of snapshots ?? []) {
      if (!latestDate.has(s.card_id)) latestDate.set(s.card_id, s.date)
    }

    // Sort oldest-first (cards never updated come first as '0000-00-00')
    const batch = [...jpCards]
      .sort((a, b) => (latestDate.get(a.id) ?? '0000-00-00').localeCompare(latestDate.get(b.id) ?? '0000-00-00'))
      .slice(0, JP_BATCH_SIZE)

    for (const card of batch) {
      let priceEur: number | null = await fetchJapaneseCardPrice(card.name)

      // Fallback to EN price from pokemontcg.io
      if (priceEur === null && card.api_source === 'pokemontcg') {
        const tcgCard = await fetchCardById(card.api_id)
        if (tcgCard) {
          priceEur = extractMarketPrice(tcgCard, 'cardmarket') ?? extractMarketPrice(tcgCard, 'tcgplayer') ?? null
        }
      }

      if (priceEur !== null) {
        await upsertPriceSnapshot(card.id, today, priceEur)
        updated++
      }
    }
  }

  return NextResponse.json({ updated, date: today, jpBatchSize: JP_BATCH_SIZE })
}
