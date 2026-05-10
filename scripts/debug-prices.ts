import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 1. Prendi tutte le carte della collezione
  const { data: cards } = await supabase
    .from('cards')
    .select('id, name, set_code, set_name, language, card_number')
    .order('name')

  if (!cards?.length) { console.log('No cards'); return }

  // 2. Prendi tutti i price_snapshots di oggi (o l'ultimo disponibile)
  const today = new Date().toISOString().slice(0, 10)
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('card_id, price_eur, date')
    .order('date', { ascending: false })

  const latestSnap: Record<string, number> = {}
  for (const s of snapshots ?? []) {
    if (!latestSnap[s.card_id]) latestSnap[s.card_id] = s.price_eur
  }

  let total = 0
  const rows: any[] = []

  for (const card of cards) {
    const snap = latestSnap[card.id]

    // Trova i candidati nel market DB (stessa logica di lookupMarketPrice)
    const cleanName = card.name.trim().replace(/\s*-\s*\d+\/\d+$/, '').replace(/\s*-\s*$/, '').trim()
    const lang = card.language === 'IT' || card.language === 'FR' ? 'EN' : card.language

    const { data: candidates } = await supabase
      .from('market_cards')
      .select('id, name, set_name, set_code, number, language')
      .ilike('name', cleanName)
      .eq('language', lang.toUpperCase())
      .limit(5)

    // Per ogni candidato, prendi il prezzo più recente
    let matchedCard = null
    let matchedPrice = null
    if (candidates?.length) {
      const { data: prices } = await supabase
        .from('market_prices')
        .select('card_id, price_low')
        .in('card_id', candidates.map(c => c.id))
        .order('scraped_at', { ascending: false })
        .limit(1)
      
      if (prices?.[0]) {
        matchedCard = candidates.find(c => c.id === prices[0].card_id) ?? candidates[0]
        matchedPrice = prices[0].price_low
      }
    }

    total += snap ?? 0
    rows.push({
      name: card.name,
      set: card.set_name || card.set_code,
      lang: card.language,
      snap_price: snap?.toFixed(2) ?? 'N/A',
      matched_card: matchedCard ? `${matchedCard.name} (${matchedCard.set_code}) #${matchedCard.number}` : 'NONE',
      market_low: matchedPrice?.toFixed(2) ?? 'N/A',
      candidates_count: candidates?.length ?? 0,
    })
  }

  console.log(`\nTotale price_snapshots: €${total.toFixed(2)}`)
  console.log(`\n${'COLLECTION CARD'.padEnd(30)} ${'SET'.padEnd(15)} ${'LANG'.padEnd(4)} ${'SNAP'.padEnd(8)} ${'MATCHED MARKET CARD'.padEnd(40)} ${'LOW'.padEnd(8)} ${'#CAND'}`)
  console.log('-'.repeat(120))
  for (const r of rows) {
    const mismatch = r.snap_price !== 'N/A' && r.market_low !== 'N/A' && Math.abs(parseFloat(r.snap_price) - parseFloat(r.market_low)) > 1 ? ' ⚠' : ''
    console.log(
      r.name.slice(0,29).padEnd(30),
      (r.set || '').slice(0,14).padEnd(15),
      r.lang.padEnd(4),
      r.snap_price.padEnd(8),
      r.matched_card.slice(0,39).padEnd(40),
      r.market_low.padEnd(8),
      r.candidates_count,
      mismatch
    )
  }
}

main().catch(console.error)
