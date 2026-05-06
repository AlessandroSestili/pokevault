import type { PokemonTcgCard, PriceSource } from "@/types";

export function extractMarketPrice(card: PokemonTcgCard, source: PriceSource): number | null {
  if (source === "cardmarket") {
    const p = card.cardmarket?.prices;
    if (!p) return null;
    const price = (p.trendPrice || 0) > 0 ? p.trendPrice : (p.averageSellPrice || 0) > 0 ? p.averageSellPrice : 0;
    return price > 0 ? price : null;
  }

  if (source === "tcgplayer") {
    const prices = card.tcgplayer?.prices;
    if (!prices) return null;
    for (const variant of Object.values(prices)) {
      if (variant.market > 0) return variant.market;
    }
    return null;
  }

  return null;
}
