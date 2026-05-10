import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCardById } from '@/lib/api/pokemontcg'
import { extractMarketPrice } from '@/lib/api/prices'
import { upsertPriceSnapshot } from '@/lib/queries'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: cards } = await supabase
    .from('cards')
    .select('id, api_id')
    .eq('api_source', 'pokemontcg')
    .not('api_id', 'is', null)

  if (!cards?.length) return NextResponse.json({ updated: 0 })

  const today = new Date().toISOString().slice(0, 10)
  let updated = 0

  for (const card of cards) {
    const tcgCard = await fetchCardById(card.api_id)
    if (!tcgCard) continue
    const priceEur = extractMarketPrice(tcgCard, 'cardmarket')
    const priceUsd = extractMarketPrice(tcgCard, 'tcgplayer') ?? undefined
    if (priceEur !== null) {
      await upsertPriceSnapshot(card.id, today, priceEur, priceUsd)
      updated++
    }
  }

  return NextResponse.json({ updated, date: today })
}
