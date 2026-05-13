'use server'

import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { PriceAlert } from '@/types'

export async function getAlertForCard(cardId: string): Promise<PriceAlert | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('card_id', cardId)
    .single()
  return data ?? null
}

export async function upsertAlert(
  cardId: string,
  game: 'pokemon' | 'magic',
  thresholdEur: number
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase.from('price_alerts').upsert(
    {
      user_id: user.id,
      card_id: cardId,
      game,
      threshold_eur: thresholdEur,
      last_triggered_price: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_id' }
  )
  if (error) { console.error('[upsertAlert]', error); return false }
  revalidatePath('/')
  return true
}

export async function deleteAlert(cardId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('price_alerts').delete().eq('card_id', cardId)
  if (error) { console.error('[deleteAlert]', error); return false }
  revalidatePath('/')
  return true
}
