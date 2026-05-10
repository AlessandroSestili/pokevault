import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const lang = searchParams.get('lang')?.toUpperCase() ?? null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  if (!q || q.length < 2) return NextResponse.json([])

  // "sv5k-075" → set_code=sv5k, number starts with 075
  const setNumMatch = q.match(/^([a-zA-Z][a-zA-Z0-9]{1,11})-(\d{1,4})$/i)
  const looksLikeNumber = /^\d/.test(q)

  let query = supabase
    .from('market_cards')
    .select(`
      id,
      name,
      set_name,
      set_code,
      number,
      rarity,
      language,
      image_url,
      cardtrader_blueprint_id
    `)
    .limit(limit)

  if (setNumMatch) {
    query = query.ilike('set_code', setNumMatch[1]).ilike('number', `${setNumMatch[2]}%`)
  } else if (looksLikeNumber) {
    query = query.ilike('number', `%${q}%`)
  } else {
    query = query.or(`name.ilike.%${q}%,number.ilike.%${q}%`)
  }

  if (lang) query = query.eq('language', lang)

  const { data: cards, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cards?.length) return NextResponse.json([])

  // Fetch latest price for each card
  const ids = cards.map(c => c.id)
  const { data: prices } = await supabase
    .from('market_prices')
    .select('card_id, price_low, price_mid, price_high, currency, scraped_at')
    .in('card_id', ids)
    .order('scraped_at', { ascending: false })

  // Keep only latest price per card
  const latestPrice = new Map<string, typeof prices extends (infer T)[] | null ? T : never>()
  for (const p of prices ?? []) {
    if (!latestPrice.has(p.card_id)) latestPrice.set(p.card_id, p)
  }

  const result = cards.map(c => ({
    ...c,
    price: latestPrice.get(c.id) ?? null,
  }))

  return NextResponse.json(result)
}
