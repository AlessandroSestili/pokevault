export const maxDuration = 60

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getMinNMPrice, searchBlueprintsByName } from '@/lib/api/cardtrader'
import { upsertPriceSnapshot } from '@/lib/queries'
import { checkAndSendAlerts } from '@/lib/alerts'

// Stay well under the 200 req/10s rate limit
const DELAY_MS = 60

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
    .from('cards')
    .select('id, name, set_name, api_id, api_source')

  for (const card of cards ?? []) {
    await sleep(DELAY_MS)

    let blueprintId: number | null = null

    // Cards added via CT search already have the blueprint id stored in api_id
    if (card.api_source === 'cardtrader' && card.api_id) {
      blueprintId = parseInt(card.api_id)
      if (isNaN(blueprintId)) blueprintId = null
    }

    // Fallback: search by name to discover blueprint id
    if (!blueprintId) {
      const results = await searchBlueprintsByName(card.name, 5)
      await sleep(DELAY_MS)
      // Prefer exact name match, then set name match
      const match =
        results.find(b => b.name.toLowerCase() === card.name.toLowerCase() && b.expansion_name === card.set_name) ??
        results.find(b => b.name.toLowerCase() === card.name.toLowerCase()) ??
        results[0] ?? null
      if (match) blueprintId = match.id
    }

    if (!blueprintId) { skipped++; continue }

    const price = await getMinNMPrice(blueprintId)
    if (price !== null) {
      await upsertPriceSnapshot(card.id, today, price)
      updated++
    } else {
      skipped++
    }
  }

  await checkAndSendAlerts('pokemon', supabase, today)

  return NextResponse.json({ updated, skipped, date: today })
}
