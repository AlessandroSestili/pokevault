import { describe, it, expect } from "vitest";
import { sortCards } from "../sorts";
import type { CollectionCardWithPrice } from "@/types";

const make = (overrides: Partial<CollectionCardWithPrice>): CollectionCardWithPrice => ({
  id: "x",
  created_at: "2025-01-01T00:00:00Z",
  name: "Card",
  set_id: "sv1",
  set_name: "Scarlet & Violet",
  set_code: "SVI",
  card_number: "001/198",
  api_id: null,
  api_source: "manual",
  image_url: null,
  element: "Fire",
  rarity: "Rare",
  language: "EN",
  condition: 9,
  cost_basis: 10,
  source: "Cardmarket",
  acquired_date: "2025-01-01",
  notes: null,
  is_favorite: false,
  market_price: 10,
  price_history: [],
  ...overrides,
});

const cardA = make({ id: "a", name: "Arcanine ex",  market_price: 200, acquired_date: "2025-01-01", cost_basis: 120 });
const cardB = make({ id: "b", name: "Blastoise ex", market_price: 50,  acquired_date: "2025-06-15", cost_basis: 30 });
const cardC = make({ id: "c", name: "Charizard ex", market_price: 350, acquired_date: "2024-12-01", cost_basis: 80 });

// For mover test: need price_history with at least 30 entries
const historyOf = (start: number, end: number) =>
  Array.from({ length: 30 }, (_, i) => ({
    date: `2025-${String(i + 1).padStart(2, "0")}-01`,
    price_eur: start + ((end - start) * i) / 29,
    price_usd: null,
  }));

const moverHigh = make({ id: "mh", name: "High Mover", price_history: historyOf(10, 100), market_price: 100 });
const moverLow  = make({ id: "ml", name: "Low Mover",  price_history: historyOf(100, 50), market_price: 50 });

describe("sortCards", () => {
  it("sorts by value descending", () => {
    const result = sortCards([cardA, cardB, cardC], "value");
    expect(result.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by most recently acquired first", () => {
    const result = sortCards([cardA, cardB, cardC], "recent");
    expect(result.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts alphabetically A→Z", () => {
    const result = sortCards([cardC, cardA, cardB], "alpha");
    expect(result.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by 30-day price mover (biggest % gain first)", () => {
    const result = sortCards([moverLow, moverHigh], "mover");
    expect(result[0].id).toBe("mh");
  });

  it("sorts by P&L amount descending", () => {
    // a: 200-120=80  b: 50-30=20  c: 350-80=270
    const result = sortCards([cardA, cardB, cardC], "pl");
    expect(result.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by cost descending", () => {
    // a:120 b:30 c:80
    const result = sortCards([cardA, cardB, cardC], "cost");
    expect(result.map((c) => c.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the original array", () => {
    const original = [cardC, cardA, cardB];
    sortCards(original, "alpha");
    expect(original[0].id).toBe("c");
  });
});
