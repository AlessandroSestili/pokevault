'use server'

import { revalidatePath } from 'next/cache'
import { insertCard, updateCard, deleteCard } from './queries'
import type { CollectionCard } from '@/types'

export async function addCardAction(
  data: Omit<CollectionCard, 'id' | 'created_at'>
): Promise<string | null> {
  const id = await insertCard(data)
  revalidatePath('/')
  return id
}

export async function editCardAction(
  id: string,
  patch: Partial<Omit<CollectionCard, 'id' | 'created_at'>>
): Promise<boolean> {
  const ok = await updateCard(id, patch)
  revalidatePath('/')
  return ok
}

export async function deleteCardAction(id: string): Promise<boolean> {
  const ok = await deleteCard(id)
  revalidatePath('/')
  return ok
}
