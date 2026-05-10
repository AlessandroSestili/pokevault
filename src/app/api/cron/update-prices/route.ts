import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCardById } from '@/lib/api/pokemontcg'
import { extractMarketPrice } from '@/lib/api/prices'
import { fetchJapaneseCardPrice } from '@/lib/api/justtcg'
import { upsertPriceSnapshot } from '@/lib/queries'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: cards } = await supabase
    .from('cards')
    .select('id, name, api_id, api_source, language')
    .not('api_id', 'is', null)

  if (!cards?.length) return NextResponse.json({ updated: 0 })

  const today = new Date().toISOString().slice(0, 10)
  let updated = 0

  for (const card of cards) {
    let priceEur: number | null = null

    if (card.language === 'JP') {
      priceEur = await fetchJapaneseCardPrice(card.name)
      // Fallback to EN price if JustTCG has no data
      if (priceEur === null && card.api_source === 'pokemontcg') {
        const tcgCard = await fetchCardById(card.api_id)
        if (tcgCard) {
          priceEur = extractMarketPrice(tcgCard, 'cardmarket') ?? extractMarketPrice(tcgCard, 'tcgplayer') ?? null
        }
      }
    } else if (card.api_source === 'pokemontcg') {
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

  return NextResponse.json({ updated, date: today })
}
