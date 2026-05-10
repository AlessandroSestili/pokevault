import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const IT_TO_EN_CARD_NAMES: Record<string, string> = {
  'Voltorb di Hisui': 'Hisuian Voltorb',
  'Spidops del Team Rocket': "Team Rocket's Spidops",
}

function cleanCardName(name: string): string {
  return name.trim().replace(/\s*-\s*\d+\/\d+$/, '').replace(/\s*-\s*$/, '').trim()
}

function translateCardName(name: string): string {
  return IT_TO_EN_CARD_NAMES[name] ?? name
}

async function lookupMarketPrice(name: string, setName?: string | null): Promise<number | null> {
  const cleanName = translateCardName(cleanCardName(name))
  const setFilter = setName?.trim() ?? null

  let cardIds: string[] | null = null

  // CardTrader tags ALL Pokémon (including JP sets) as language=EN.
  // Match by name + set_name only — set_name distinguishes JP from EN editions.
  if (setFilter) {
    const { data } = await supabase
      .from('market_cards')
      .select('id')
      .ilike('name', cleanName)
      .ilike('set_name', setFilter)
      .limit(20)
    if (data?.length) cardIds = data.map(c => c.id)
  }

  if (!cardIds) {
    const { data } = await supabase
      .from('market_cards')
      .select('id')
      .ilike('name', cleanName)
      .limit(10)
    if (!data?.length) return null
    cardIds = data.map(c => c.id)
  }

  // MAX price_low: collection is IR-heavy so the expensive blueprint is the better approx
  const { data: prices } = await supabase
    .from('market_prices')
    .select('price_low')
    .in('card_id', cardIds)
    .not('price_low', 'is', null)
    .order('price_low', { ascending: false })
    .limit(1)

  return prices?.[0]?.price_low ?? null
}

async function main() {
  const { data: collectionCards } = await supabase
    .from('cards')
    .select('id, name, set_name, set_code, language')

  if (!collectionCards?.length) { console.log('No cards'); return }

  const today = new Date().toISOString().slice(0, 10)
  console.log(`Sync date: ${today} — ${collectionCards.length} cards\n`)

  let updated = 0, notFound = 0
  const rows: { card_id: string; date: string; price_eur: number; price_usd: null }[] = []
  const missing: string[] = []

  for (const card of collectionCards) {
    const price = await lookupMarketPrice(card.name, card.set_name)

    if (price !== null) {
      rows.push({ card_id: card.id, date: today, price_eur: price, price_usd: null })
      updated++
      console.log(`✓ ${card.name.padEnd(35)} ${(card.set_name ?? '').slice(0,25).padEnd(25)} → €${price}`)
    } else {
      notFound++
      missing.push(`  ${card.name} (${card.language} / ${card.set_name})`)
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from('price_snapshots')
      .upsert(rows, { onConflict: 'card_id,date' })
    if (error) console.error('\nUpsert error:', error)
    else {
      const total = rows.reduce((s, r) => s + r.price_eur, 0)
      console.log(`\n✅ Upserted ${rows.length} snapshots for ${today}`)
      console.log(`💶 Totale collezione: €${total.toFixed(2)}`)
    }
  }

  if (missing.length) {
    console.log(`\n❌ Non trovati (${notFound}):`)
    missing.forEach(m => console.log(m))
  }
}

main().catch(console.error)
