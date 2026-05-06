import { describe, it, expect } from "vitest";
import { filterCards } from "../filters";
import type { CollectionCardWithPrice, CardFilters } from "@/types";

const base: CollectionCardWithPrice = {
  id: "1",
  created_at: "2025-01-01T00:00:00Z",
  name: "Charizard ex",
  set_id: "sv3pt5",
  set_name: "151",
  set_code: "MEW",
  card_number: "006/165",
  api_id: "sv3pt5-6",
  api_source: "pokemontcg",
  image_url: null,
  element: "Fire",
  rarity: "Ultra Rare",
  language: "EN",
  condition: 9.5,
  cost_basis: 80,
  source: "Cardmarket",
  acquired_date: "2025-03-15",
  notes: null,
  is_favorite: false,
  market_price: 120,
  price_history: [],
};

const pikachu: CollectionCardWithPrice = {
  ...base,
  id: "2",
  name: "Pikachu V",
  card_number: "025/190",
  element: "Electric",
  rarity: "Rare",
  language: "JP",
  set_id: "swsh9",
  set_name: "Brilliant Stars",
  set_code: "BRS",
  cost_basis: 10,
  market_price: 8,
  is_favorite: true,
};

const noFilter: CardFilters = {
  search: "",
  element: null,
  set: null,
  rarity: null,
  language: null,
  favoritesOnly: false,
  minValue: null,
  maxValue: null,
};

describe("filterCards", () => {
  it("returns all cards when no filters active", () => {
    expect(filterCards([base, pikachu], noFilter)).toHaveLength(2);
  });

  it("filters by case-insensitive name search", () => {
    const result = filterCards([base, pikachu], { ...noFilter, search: "chariz" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by set name search", () => {
    const result = filterCards([base, pikachu], { ...noFilter, search: "151" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by card number search", () => {
    const result = filterCards([base, pikachu], { ...noFilter, search: "006/165" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by element", () => {
    const result = filterCards([base, pikachu], { ...noFilter, element: "Electric" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by set_id", () => {
    const result = filterCards([base, pikachu], { ...noFilter, set: "sv3pt5" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by language", () => {
    const result = filterCards([base, pikachu], { ...noFilter, language: "JP" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by favoritesOnly", () => {
    const result = filterCards([base, pikachu], { ...noFilter, favoritesOnly: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by rarity", () => {
    const result = filterCards([base, pikachu], { ...noFilter, rarity: "Ultra Rare" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by minValue", () => {
    const result = filterCards([base, pikachu], { ...noFilter, minValue: 50 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by maxValue", () => {
    const result = filterCards([base, pikachu], { ...noFilter, maxValue: 20 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("combines multiple filters (AND logic)", () => {
    const result = filterCards([base, pikachu], {
      ...noFilter,
      language: "EN",
      favoritesOnly: true,
    });
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no cards match", () => {
    expect(filterCards([base, pikachu], { ...noFilter, search: "mewtwo" })).toHaveLength(0);
  });
});
