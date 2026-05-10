import type { CollectionCardWithPrice, SortKey } from "@/types";

export function sortCards(
  cards: CollectionCardWithPrice[],
  key: SortKey
): CollectionCardWithPrice[] {
  return [...cards].sort((a, b) => {
    switch (key) {
      case "value":
        return (b.market_price ?? 0) - (a.market_price ?? 0);

      case "recent":
        return new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime();

      case "alpha":
        return a.name.localeCompare(b.name);

      case "mover": {
        const change = (card: CollectionCardWithPrice) => {
          const h = card.price_history;
          if (h.length < 2) return 0;
          const first = h[0].price_eur;
          const last = h[h.length - 1].price_eur;
          return first === 0 ? 0 : (last - first) / first;
        };
        return change(b) - change(a);
      }

      default:
        return 0;
    }
  });
}
