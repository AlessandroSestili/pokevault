import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const name = searchParams.get('name')?.trim()
  const setCode = searchParams.get('set_code')?.trim().toUpperCase() ?? null
  const lang = searchParams.get('lang')?.toUpperCase() ?? 'EN'

  if (!name) return NextResponse.json({ price: null })

  let query = supabase
    .from('market_cards')
    .select('id')
    .ilike('name', name)
    .limit(10)

  if (setCode) query = query.ilike('set_code', setCode)
  if (lang) query = query.eq('language', lang)

  const { data: cards } = await query
  if (!cards?.length) return NextResponse.json({ price: null })

  const cardIds = cards.map(c => c.id)
  const { data: prices } = await supabase
    .from('market_prices')
    .select('price_mid, price_low, price_high, currency, scraped_at')
    .in('card_id', cardIds)
    .order('scraped_at', { ascending: false })
    .limit(1)

  const latest = prices?.[0] ?? null
  return NextResponse.json({ price: latest?.price_low ?? null, detail: latest })
}
