'use server'

import type { MagicCard } from '@/types'
import { insertMagicCard, updateMagicCard, deleteMagicCard } from './queries-magic'
import { runAndRevalidate } from './action-utils'

export async function addMagicCardAction(data: Omit<MagicCard, 'id' | 'created_at'>) {
  return runAndRevalidate(() => insertMagicCard(data))
}

export async function editMagicCardAction(id: string, patch: Partial<Omit<MagicCard, 'id' | 'created_at'>>) {
  return runAndRevalidate(() => updateMagicCard(id, patch))
}

export async function deleteMagicCardAction(id: string) {
  return runAndRevalidate(() => deleteMagicCard(id))
}
