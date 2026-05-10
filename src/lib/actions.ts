'use server'

import { revalidatePath } from 'next/cache'
import { insertCard, updateCard, deleteCard, upsertPriceSnapshot } from './queries'
import { fetchCardById } from './api/pokemontcg'
import { extractMarketPrice } from './api/prices'
import { fetchJapaneseCardPrice, searchJapaneseCards } from './api/justtcg'
import type { JustTcgSearchResult } from './api/justtcg'
import type { CollectionCard, Language, Source } from '@/types'

export async function searchJapaneseCardsAction(query: string): Promise<JustTcgSearchResult[]> {
  return searchJapaneseCards(query)
}

export async function uploadCardImageAction(formData: FormData): Promise<string | null> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return null

  const supabase = await createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('card-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) { console.error('[uploadCardImage]', error); return null }

  const { data } = supabase.storage.from('card-images').getPublicUrl(path)
  return data.publicUrl
}

export async function resolveCardPriceAction(
  cardName: string,
  apiId: string | null,
  language: string
): Promise<{ price: number | null; source: 'api' | 'jap' | 'en-fallback' | null }> {
  if (language === 'JP') {
    const japPrice = await fetchJapaneseCardPrice(cardName)
    if (japPrice !== null) return { price: japPrice, source: 'jap' }

    // Fallback to EN price from pokemontcg.io
    if (apiId) {
      const tcgCard = await fetchCardById(apiId)
      const enPrice = tcgCard
        ? (extractMarketPrice(tcgCard, 'cardmarket') ?? extractMarketPrice(tcgCard, 'tcgplayer') ?? null)
        : null
      if (enPrice !== null) return { price: enPrice, source: 'en-fallback' }
    }
    return { price: null, source: null }
  }

  // EN / ITA — price already extracted client-side from search result
  return { price: null, source: null }
}

export async function addCardAction(
  data: Omit<CollectionCard, 'id' | 'created_at'>,
  priceEur?: number
): Promise<string | null> {
  const id = await insertCard(data)
  if (id && priceEur && priceEur > 0) {
    const today = new Date().toISOString().slice(0, 10)
    await upsertPriceSnapshot(id, today, priceEur)
  }
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

const VALID_LANGUAGES = new Set(['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH'])
const VALID_SOURCES = new Set(['Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro'])

export async function importCardsAction(
  rows: Array<Record<string, string>>
): Promise<number> {
  let imported = 0
  for (const row of rows) {
    const name = row['name']?.trim()
    if (!name) continue

    const conditionRaw = parseFloat(row['condition'] ?? '')
    const costRaw = parseFloat(row['cost'] ?? '')
    const condition = isNaN(conditionRaw) ? 7 : Math.min(10, Math.max(1, conditionRaw))
    const cost_basis = isNaN(costRaw) ? 0 : Math.max(0, costRaw)

    const langRaw = (row['language'] ?? 'EN').toUpperCase()
    const language: Language = VALID_LANGUAGES.has(langRaw) ? (langRaw as Language) : 'EN'

    const sourceRaw = row['source']?.trim() ?? 'Altro'
    const source: Source = VALID_SOURCES.has(sourceRaw) ? (sourceRaw as Source) : 'Altro'

    const dateRaw = row['acquired_date']?.trim()
    const acquired_date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw
      : new Date().toISOString().slice(0, 10)

    const id = await insertCard({
      name,
      set_id: row['set_name']?.trim().toLowerCase().replace(/\s+/g, '-') ?? 'unknown',
      set_name: row['set_name']?.trim() ?? '',
      set_code: (row['set_name']?.trim() ?? '').toUpperCase().slice(0, 6),
      card_number: row['card_number']?.trim() ?? '',
      api_id: null,
      api_source: 'manual',
      image_url: null,
      element: null,
      rarity: null,
      language,
      condition,
      cost_basis,
      source,
      acquired_date,
      notes: row['notes']?.trim() || null,
      is_favorite: false,
    })
    if (id) imported++
  }
  if (imported > 0) revalidatePath('/')
  return imported
}
