import type { CollectionCardWithPrice, PortfolioTotals } from "@/types";

export function computePortfolioTotals(cards: CollectionCardWithPrice[]): PortfolioTotals {
  if (cards.length === 0) {
    return { totalValue: 0, totalCost: 0, totalPl: 0, plPercent: 0, cardCount: 0, favoriteCount: 0, topGradeCount: 0 };
  }

  const totalValue = cards.reduce((s, c) => s + (c.market_price ?? 0), 0);
  const totalCost = cards.reduce((s, c) => s + c.cost_basis, 0);
  const totalPl = totalValue - totalCost;
  const plPercent = totalCost === 0 ? 0 : (totalPl / totalCost) * 100;
  const favoriteCount = cards.filter((c) => c.is_favorite).length;
  const topGradeCount = cards.filter((c) => c.condition >= 9.5).length;

  return { totalValue, totalCost, totalPl, plPercent, cardCount: cards.length, favoriteCount, topGradeCount };
}
