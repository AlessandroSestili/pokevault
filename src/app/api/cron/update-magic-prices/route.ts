import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertPriceSnapshot } from '@/lib/queries'
import { checkAndSendAlerts } from '@/lib/alerts'

const DELAY_MS = 100

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  let updated = 0
  let skipped = 0

  const { data: cards } = await supabase
    .from('magic_cards')
    .select('id, name, api_id, foil')

  for (const card of cards ?? []) {
    if (!card.api_id) { skipped++; continue }
    await sleep(DELAY_MS)

    const res = await fetch(`https://api.scryfall.com/cards/${card.api_id}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) { skipped++; continue }

    const scryfall = await res.json()
    const prices = scryfall.prices ?? {}
    const price = card.foil
      ? parseFloat(prices.eur_foil ?? prices.eur ?? '0') || null
      : parseFloat(prices.eur ?? '0') || null

    if (price) {
      await upsertPriceSnapshot(card.id, today, price)
      updated++
    } else {
      skipped++
    }
  }

  await checkAndSendAlerts('magic', supabase, today)

  return NextResponse.json({ updated, skipped, date: today })
}
