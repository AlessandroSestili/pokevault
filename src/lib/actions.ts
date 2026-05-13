'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { insertCard, updateCard, deleteCard, upsertPriceSnapshot } from './queries'
import { runAndRevalidate } from './action-utils'
import type { CollectionCard, Language, Source } from '@/types'


export async function syncMarketPricesAction(): Promise<{
  updated: number
  notFound: number
  notFoundCards: { name: string; set_code: string; language: string }[]
}> {
  // Use service client for both reads and writes to bypass RLS on price_snapshots.
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cards } = await serviceClient.from('cards').select('id, name, set_name, set_code, language')
  if (!cards?.length) return { updated: 0, notFound: 0, notFoundCards: [] }

  const today = new Date().toISOString().slice(0, 10)
  let updated = 0
  let notFound = 0
  const notFoundCards: { name: string; set_code: string; language: string }[] = []

  for (const card of cards) {
    const price = await lookupMarketPrice(card.name, card.set_code, card.language, card.set_name)

    if (price !== null) {
      const { error } = await serviceClient.from('price_snapshots').upsert(
        { card_id: card.id, date: today, price_eur: price, price_usd: null },
        { onConflict: 'card_id,date' }
      )
      if (error) {
        console.error(`[sync] upsert error for ${card.name}:`, error)
      } else {
        updated++
        console.log(`[sync] ✓ ${card.name} (${card.set_name}) → €${price}`)
      }
    } else {
      notFound++
      notFoundCards.push({ name: card.name, set_code: card.set_code, language: card.language })
      console.log(`[sync] ✗ ${card.name} (${card.set_name} / ${card.language}) — not found`)
    }
  }

  revalidatePath('/')
  return { updated, notFound, notFoundCards }
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

const IT_TO_EN_CARD_NAMES: Record<string, string> = {
  'Voltorb di Hisui': 'Hisuian Voltorb',
  'Spidops del Team Rocket': "Team Rocket's Spidops",
}

function cleanCardName(name: string): string {
  return name
    .trim()
    .replace(/\s*-\s*\d+\/\d+$/, '')  // strip " - 077/073" suffixes
    .replace(/\s*-\s*$/, '')           // strip trailing " -"
    .trim()
}

function translateCardName(name: string): string {
  return IT_TO_EN_CARD_NAMES[name] ?? name
}

async function lookupMarketPrice(
  name: string,
  _setCode: string | null,
  _lang: string,
  setName?: string | null
): Promise<number | null> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cleanName = translateCardName(cleanCardName(name))

  // CardTrader tags ALL Pokémon cards (including JP sets) as language="EN".
  // Match by name + set_name only — set_name is the reliable distinguisher between JP/EN sets.
  const setFilter = setName?.trim() ?? null
  let cardIds: string[] | null = null

  if (setFilter) {
    const { data } = await supabase
      .from('market_cards')
      .select('id')
      .ilike('name', cleanName)
      .ilike('set_name', setFilter)
      .limit(20)
    if (data?.length) cardIds = data.map(c => c.id)
  }

  // Fall back to name-only if set filter returned nothing
  if (!cardIds) {
    const { data } = await supabase
      .from('market_cards')
      .select('id')
      .ilike('name', cleanName)
      .limit(10)
    if (!data?.length) return null
    cardIds = data.map(c => c.id)
  }

  // Use MAX price_low: collection is heavy on Illustration Rares (IR), so the more
  // expensive blueprint within the set is the better approximation without card numbers.
  const { data: prices } = await supabase
    .from('market_prices')
    .select('price_low')
    .in('card_id', cardIds)
    .not('price_low', 'is', null)
    .order('price_low', { ascending: false })
    .limit(1)

  return prices?.[0]?.price_low ?? null
}

export async function resolveCardPriceAction(
  cardName: string,
  setCode: string | null,
  language: string
): Promise<{ price: number | null; source: 'market' | 'en-fallback' | null }> {
  const marketPrice = await lookupMarketPrice(cardName, setCode, language)
  if (marketPrice !== null) return { price: marketPrice, source: 'market' }

  // Fallback: tenta senza filtro lingua per trovare un prezzo EN
  if (language !== 'EN') {
    const enPrice = await lookupMarketPrice(cardName, setCode, 'EN')
    if (enPrice !== null) return { price: enPrice, source: 'en-fallback' }
  }

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

export async function editCardAction(id: string, patch: Partial<Omit<CollectionCard, 'id' | 'created_at'>>) {
  return runAndRevalidate(() => updateCard(id, patch))
}

export async function deleteCardAction(id: string) {
  return runAndRevalidate(() => deleteCard(id))
}

const VALID_LANGUAGES = new Set(['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH'])
const VALID_SOURCES = new Set(['CardTrader', 'Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro'])

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
