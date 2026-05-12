import { createClient } from './supabase/server'
import type { MagicCard, MagicCardWithPrice } from '@/types'

export async function fetchMagicCards(): Promise<MagicCardWithPrice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('magic_cards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('[fetchMagicCards]', error); return [] }
  return (data ?? []).map(c => ({ ...c, market_price: null }))
}

export async function insertMagicCard(
  card: Omit<MagicCard, 'id' | 'created_at'>
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.error('[insertMagicCard] no authenticated user'); return null }
  const { data, error } = await supabase
    .from('magic_cards')
    .insert({ ...card, user_id: user.id })
    .select('id')
    .single()
  if (error) { console.error('[insertMagicCard]', error); return null }
  return data?.id ?? null
}

export async function updateMagicCard(
  id: string,
  patch: Partial<Omit<MagicCard, 'id' | 'created_at'>>
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('magic_cards').update(patch).eq('id', id)
  if (error) { console.error('[updateMagicCard]', error); return false }
  return true
}

export async function deleteMagicCard(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('magic_cards').delete().eq('id', id)
  if (error) { console.error('[deleteMagicCard]', error); return false }
  return true
}
