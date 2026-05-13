export const maxDuration = 30

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertMagicPriceSnapshot } from '@/lib/queries-magic'
import { checkAndSendAlerts } from '@/lib/alerts'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch all active alerts
  const { data: alerts } = await supabase.from('price_alerts').select('card_id, game, threshold_eur')
  if (!alerts?.length) return NextResponse.json({ message: 'Nessun alert configurato' })

  // For each alert, fetch price from Scryfall/CardTrader and save snapshot
  const updated: string[] = []
  for (const alert of alerts) {
    if (alert.game === 'magic') {
      const { data: card } = await supabase.from('magic_cards').select('api_id, foil, name').eq('id', alert.card_id).single()
      if (!card?.api_id) continue

      const res = await fetch(`https://api.scryfall.com/cards/${card.api_id}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) continue
      const scryfall = await res.json()
      const prices = scryfall.prices ?? {}
      const price = card.foil
        ? parseFloat(prices.eur_foil ?? prices.eur ?? '0') || null
        : parseFloat(prices.eur ?? '0') || null

      if (price) {
        await upsertMagicPriceSnapshot(alert.card_id, today, price)
        updated.push(`${card.name}: €${price}`)
      }
    }
  }

  await checkAndSendAlerts('magic', supabase, today)
  await checkAndSendAlerts('pokemon', supabase, today)

  return NextResponse.json({ today, updated, alerts: alerts.length })
}
