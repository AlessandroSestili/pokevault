import type { CollectionCardWithPrice, CardFilters } from "@/types";

export function filterCards(
  cards: CollectionCardWithPrice[],
  filters: CardFilters
): CollectionCardWithPrice[] {
  return cards.filter((card) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${card.name} ${card.set_name} ${card.card_number}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.element && card.element !== filters.element) return false;
    if (filters.set && card.set_id !== filters.set) return false;
    if (filters.rarity && card.rarity !== filters.rarity) return false;
    if (filters.language && card.language !== filters.language) return false;
    if (filters.favoritesOnly && !card.is_favorite) return false;
    if (filters.minValue !== null && (card.market_price ?? 0) < filters.minValue) return false;
    if (filters.maxValue !== null && (card.market_price ?? 0) > filters.maxValue) return false;
    return true;
  });
}
