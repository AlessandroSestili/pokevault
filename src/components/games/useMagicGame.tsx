'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { MagicCardWithPrice } from '@/types'
import { editMagicCardAction } from '@/lib/actions-magic'
import { MagicDashboardPage } from '../magic/MagicDashboardPage'
import { MagicCollectionShell } from '../magic/MagicCollectionShell'
import { MagicAnalyticsPage } from '../magic/MagicAnalyticsPage'
import { MagicDetailSheet } from '../magic/MagicDetailSheet'
import { AddMagicCardModal } from '../modals/AddMagicCardModal'
import type { GamePlugin, Page } from './types'

export function useMagicGame(
  initialCards: MagicCardWithPrice[],
  page: Page,
  search: string,
  setPage: (p: Page) => void,
): GamePlugin {
  const [cards, setCards] = useState(initialCards)
  const [selectedCard, setSelectedCard] = useState<MagicCardWithPrice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [minValueFilter, setMinValueFilter] = useState<number | null>(null)

  useEffect(() => { setCards(initialCards) }, [initialCards])

  function openCard(card: MagicCardWithPrice) {
    setSelectedCard(card); setSheetOpen(true)
  }

  async function toggleFav(id: string) {
    const card = cards.find(c => c.id === id)
    if (!card) return
    const newFav = !card.is_favorite
    setCards(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newFav } : c))
    if (selectedCard?.id === id) setSelectedCard(prev => prev ? { ...prev, is_favorite: newFav } : prev)
    await editMagicCardAction(id, { is_favorite: newFav })
  }

  const favCount = cards.filter(c => c.is_favorite).length
  const showActions = page !== 'settings' && page !== 'analytics'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <MagicDashboardPage cards={cards} onOpenCard={openCard} onToggleFav={toggleFav} onGoCollection={() => setPage('collection')} />
      case 'collection':
        return <MagicCollectionShell initialCards={cards} search={search} favoritesOnly={false} minValue={minValueFilter} />
      case 'watchlist':
        return <MagicCollectionShell initialCards={cards} search={search} favoritesOnly={true} />
      case 'analytics':
        return <MagicAnalyticsPage cards={cards} onGoCollectionMinValue={min => { setMinValueFilter(min); setPage('collection') }} />
      default:
        return null
    }
  })()

  return {
    counts: { collection: cards.length, watchlist: favCount },
    showSearch: false,

    railActions: (
      <button className="rail__item" onClick={() => setAddOpen(true)}>
        <span className="rail__dot" /><Plus size={14} /><span>Aggiungi carta</span>
      </button>
    ),

    topbarActions: showActions ? (
      <button
        className="btn btn--primary"
        onClick={() => setAddOpen(true)}
        style={{ background: 'linear-gradient(135deg, #7B7CF7, #4F46E5)' }}
      >
        <Plus size={13} /> Aggiungi carta
      </button>
    ) : null,

    content,

    overlays: (
      <>
        <MagicDetailSheet card={selectedCard} open={sheetOpen} onClose={() => setSheetOpen(false)} onToggleFav={toggleFav} />
        <AddMagicCardModal open={addOpen} onClose={() => setAddOpen(false)} />
      </>
    ),

    closeAll: () => { setSheetOpen(false); setAddOpen(false) },
  }
}
