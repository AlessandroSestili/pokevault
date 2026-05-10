import { createClient } from './supabase/server'
import type { CollectionCard, CollectionCardWithPrice, PriceSnapshot } from '@/types'

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function fetchCards(): Promise<CollectionCardWithPrice[]> {
  const supabase = await createClient()

  const [{ data: cards }, { data: snapshots }] = await Promise.all([
    supabase.from('cards').select('*').order('created_at', { ascending: false }),
    supabase.from('price_snapshots').select('card_id, date, price_eur, price_usd').order('date', { ascending: true }),
  ])

  if (!cards) return []

  const snapsByCard = new Map<string, PriceSnapshot[]>()
  for (const s of snapshots ?? []) {
    const arr = snapsByCard.get(s.card_id) ?? []
    arr.push({ date: s.date, price_eur: s.price_eur, price_usd: s.price_usd })
    snapsByCard.set(s.card_id, arr)
  }

  return cards.map((c) => {
    const history = snapsByCard.get(c.id) ?? []
    const latest = history.length > 0 ? history[history.length - 1].price_eur : null
    return { ...c, market_price: latest, price_history: history }
  })
}

export async function fetchCardById(id: string): Promise<CollectionCardWithPrice | null> {
  const supabase = await createClient()

  const [{ data: card }, { data: snapshots }] = await Promise.all([
    supabase.from('cards').select('*').eq('id', id).single(),
    supabase.from('price_snapshots').select('date, price_eur, price_usd').eq('card_id', id).order('date', { ascending: true }),
  ])

  if (!card) return null

  const history: PriceSnapshot[] = (snapshots ?? []).map(s => ({
    date: s.date,
    price_eur: s.price_eur,
    price_usd: s.price_usd,
  }))
  const latest = history.length > 0 ? history[history.length - 1].price_eur : null

  return { ...card, market_price: latest, price_history: history }
}

export async function insertCard(card: Omit<CollectionCard, 'id' | 'created_at'>): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('cards').insert(card).select('id').single()
  if (error) { console.error('insertCard error:', JSON.stringify(error)); return null }
  return data?.id ?? null
}

export async function updateCard(id: string, patch: Partial<Omit<CollectionCard, 'id' | 'created_at'>>): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').update(patch).eq('id', id)
  if (error) { console.error(error); return false }
  return true
}

export async function deleteCard(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) { console.error(error); return false }
  return true
}

// ─── Price snapshots ──────────────────────────────────────────────────────────

export async function upsertPriceSnapshot(
  cardId: string,
  date: string,
  priceEur: number,
  priceUsd?: number
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('price_snapshots').upsert(
    { card_id: cardId, date, price_eur: priceEur, price_usd: priceUsd ?? null },
    { onConflict: 'card_id,date' }
  )
  if (error) console.error('[upsertPriceSnapshot] error:', JSON.stringify(error))
}
