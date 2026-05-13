'use client'

import { useState, useEffect } from 'react'
import { Plus, Upload } from 'lucide-react'
import type { CollectionCardWithPrice } from '@/types'
import { editCardAction } from '@/lib/actions'
import { DashboardPage } from '../pages/DashboardPage'
import { CollectionPage } from '../pages/CollectionPage'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { DetailSheet } from '../DetailSheet'
import { AddCardModal } from '../modals/AddCardModal'
import { ImportCsvModal } from '../modals/ImportCsvModal'
import type { GamePlugin, Page } from './types'

export function usePokemonGame(
  initialCards: CollectionCardWithPrice[],
  page: Page,
  search: string,
  setPage: (p: Page) => void,
): GamePlugin {
  const [cards, setCards] = useState(initialCards)
  const [selectedCard, setSelectedCard] = useState<CollectionCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [minValueFilter, setMinValueFilter] = useState<number | null>(null)

  useEffect(() => { setCards(initialCards) }, [initialCards])

  function openCard(card: CollectionCardWithPrice) {
    setSelectedCard(card); setSheetOpen(true)
  }

  async function toggleFav(id: string) {
    const card = cards.find(c => c.id === id)
    if (!card) return
    const newFav = !card.is_favorite
    setCards(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newFav } : c))
    if (selectedCard?.id === id) setSelectedCard(prev => prev ? { ...prev, is_favorite: newFav } : prev)
    await editCardAction(id, { is_favorite: newFav })
  }

  const favCount = cards.filter(c => c.is_favorite).length
  const showActions = page !== 'settings' && page !== 'analytics'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage cards={cards} onOpenCard={openCard} onToggleFav={toggleFav} onGoCollection={() => setPage('collection')} />
      case 'collection':
        return <CollectionPage cards={cards} search={search} favoritesOnly={false} minValue={minValueFilter} onOpenCard={openCard} onToggleFav={toggleFav} onAdd={() => setAddOpen(true)} />
      case 'watchlist':
        return <CollectionPage cards={cards} search={search} favoritesOnly={true} onOpenCard={openCard} onToggleFav={toggleFav} onAdd={() => setAddOpen(true)} />
      case 'analytics':
        return <AnalyticsPage cards={cards} onGoCollectionMinValue={min => { setMinValueFilter(min); setPage('collection') }} />
      default:
        return null
    }
  })()

  return {
    counts: { collection: cards.length, watchlist: favCount },
    showSearch: page === 'collection' || page === 'watchlist',

    railActions: (
      <>
        <button className="rail__item" onClick={() => setAddOpen(true)}>
          <span className="rail__dot" /><Plus size={14} /><span>Aggiungi carta</span>
        </button>
        <button className="rail__item" onClick={() => setImportOpen(true)}>
          <span className="rail__dot" /><Upload size={14} /><span>Importa CSV</span>
        </button>
      </>
    ),

    topbarActions: showActions ? (
      <>
        <button className="btn" onClick={() => setImportOpen(true)}>
          <Upload size={13} /> Importa
        </button>
        <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
          <Plus size={13} /> Aggiungi carta
        </button>
      </>
    ) : null,

    content,

    overlays: (
      <>
        <DetailSheet card={selectedCard} open={sheetOpen} onClose={() => setSheetOpen(false)} onToggleFav={toggleFav} />
        <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} />
        <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
      </>
    ),

    closeAll: () => { setSheetOpen(false); setAddOpen(false); setImportOpen(false) },
  }
}
