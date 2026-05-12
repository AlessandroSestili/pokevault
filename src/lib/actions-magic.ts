'use server'

import { revalidatePath } from 'next/cache'
import type { MagicCard } from '@/types'
import { insertMagicCard, updateMagicCard, deleteMagicCard } from './queries-magic'

export async function addMagicCardAction(
  data: Omit<MagicCard, 'id' | 'created_at'>
): Promise<string | null> {
  const id = await insertMagicCard(data)
  revalidatePath('/')
  return id
}

export async function editMagicCardAction(
  id: string,
  patch: Partial<Omit<MagicCard, 'id' | 'created_at'>>
): Promise<boolean> {
  const ok = await updateMagicCard(id, patch)
  revalidatePath('/')
  return ok
}

export async function deleteMagicCardAction(id: string): Promise<boolean> {
  const ok = await deleteMagicCard(id)
  revalidatePath('/')
  return ok
}
