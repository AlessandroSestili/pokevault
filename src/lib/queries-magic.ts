import { createClient } from './supabase/server'
import { makeTableCRUD } from './db'
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

const crud = makeTableCRUD('magic_cards', 'MagicCard')

export const insertMagicCard = (data: Omit<MagicCard, 'id' | 'created_at'>) => crud.insert(data)
export const updateMagicCard = (id: string, patch: Partial<Omit<MagicCard, 'id' | 'created_at'>>) => crud.update(id, patch)
export const deleteMagicCard = (id: string) => crud.remove(id)
