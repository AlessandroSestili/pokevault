import { describe, it, expect } from "vitest";
import { computePortfolioTotals } from "../totals";
import type { CollectionCardWithPrice } from "@/types";

const make = (overrides: Partial<CollectionCardWithPrice>): CollectionCardWithPrice => ({
  id: "x",
  created_at: "2025-01-01T00:00:00Z",
  name: "Card",
  set_id: "sv1",
  set_name: "SV",
  set_code: "SVI",
  card_number: "001/198",
  api_id: null,
  api_source: "manual",
  image_url: null,
  element: null,
  rarity: null,
  language: "EN",
  condition: 8,
  cost_basis: 10,
  source: "Cardmarket",
  acquired_date: "2025-01-01",
  notes: null,
  is_favorite: false,
  market_price: 10,
  price_history: [],
  ...overrides,
});

describe("computePortfolioTotals", () => {
  it("returns zeros for empty collection", () => {
    const t = computePortfolioTotals([]);
    expect(t.totalValue).toBe(0);
    expect(t.totalCost).toBe(0);
    expect(t.totalPl).toBe(0);
    expect(t.plPercent).toBe(0);
    expect(t.cardCount).toBe(0);
  });

  it("sums market prices as totalValue", () => {
    const cards = [make({ market_price: 100 }), make({ market_price: 50 })];
    expect(computePortfolioTotals(cards).totalValue).toBe(150);
  });

  it("treats null market_price as 0", () => {
    const cards = [make({ market_price: null }), make({ market_price: 40 })];
    expect(computePortfolioTotals(cards).totalValue).toBe(40);
  });

  it("sums cost_basis as totalCost", () => {
    const cards = [make({ cost_basis: 30 }), make({ cost_basis: 20 })];
    expect(computePortfolioTotals(cards).totalCost).toBe(50);
  });

  it("computes P&L as totalValue - totalCost", () => {
    const cards = [make({ market_price: 150, cost_basis: 100 })];
    const t = computePortfolioTotals(cards);
    expect(t.totalPl).toBe(50);
  });

  it("computes plPercent correctly", () => {
    const cards = [make({ market_price: 150, cost_basis: 100 })];
    expect(computePortfolioTotals(cards).plPercent).toBeCloseTo(50);
  });

  it("plPercent is 0 when totalCost is 0", () => {
    const cards = [make({ cost_basis: 0, market_price: 10 })];
    expect(computePortfolioTotals(cards).plPercent).toBe(0);
  });

  it("counts favorites", () => {
    const cards = [
      make({ is_favorite: true }),
      make({ is_favorite: false }),
      make({ is_favorite: true }),
    ];
    expect(computePortfolioTotals(cards).favoriteCount).toBe(2);
  });

  it("counts cards with condition >= 9.5 as topGradeCount", () => {
    const cards = [
      make({ condition: 10 }),
      make({ condition: 9.5 }),
      make({ condition: 9 }),
    ];
    expect(computePortfolioTotals(cards).topGradeCount).toBe(2);
  });

  it("returns correct cardCount", () => {
    const cards = [make({}), make({}), make({})];
    expect(computePortfolioTotals(cards).cardCount).toBe(3);
  });
});
