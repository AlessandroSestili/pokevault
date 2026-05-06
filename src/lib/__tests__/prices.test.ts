import { describe, it, expect } from "vitest";
import { extractMarketPrice } from "../api/prices";
import type { PokemonTcgCard } from "@/types";

const baseCard: PokemonTcgCard = {
  id: "sv3pt5-6",
  name: "Charizard ex",
  number: "006",
  set: { id: "sv3pt5", name: "151", printedTotal: 165, series: "Scarlet & Violet", releaseDate: "2023/09/22" },
  types: ["Fire"],
  rarity: "Ultra Rare",
  images: { small: "https://images.pokemontcg.io/sv3pt5/6.png", large: "https://images.pokemontcg.io/sv3pt5/6_hires.png" },
};

describe("extractMarketPrice — cardmarket", () => {
  it("returns trendPrice when available", () => {
    const card: PokemonTcgCard = {
      ...baseCard,
      cardmarket: { updatedAt: "2024/01/01", prices: { trendPrice: 85.5, averageSellPrice: 80, lowPrice: 70 } },
    };
    expect(extractMarketPrice(card, "cardmarket")).toBeCloseTo(85.5);
  });

  it("falls back to averageSellPrice when trendPrice is 0", () => {
    const card: PokemonTcgCard = {
      ...baseCard,
      cardmarket: { updatedAt: "2024/01/01", prices: { trendPrice: 0, averageSellPrice: 80, lowPrice: 70 } },
    };
    expect(extractMarketPrice(card, "cardmarket")).toBeCloseTo(80);
  });

  it("returns null when cardmarket is missing", () => {
    expect(extractMarketPrice(baseCard, "cardmarket")).toBeNull();
  });

  it("returns null when all cardmarket prices are 0", () => {
    const card: PokemonTcgCard = {
      ...baseCard,
      cardmarket: { updatedAt: "2024/01/01", prices: { trendPrice: 0, averageSellPrice: 0, lowPrice: 0 } },
    };
    expect(extractMarketPrice(card, "cardmarket")).toBeNull();
  });
});

describe("extractMarketPrice — tcgplayer", () => {
  it("returns market price from holofoil variant", () => {
    const card: PokemonTcgCard = {
      ...baseCard,
      tcgplayer: {
        updatedAt: "2024/01/01",
        prices: { holofoil: { low: 10, mid: 15, high: 20, market: 14.5 } },
      },
    };
    expect(extractMarketPrice(card, "tcgplayer")).toBeCloseTo(14.5);
  });

  it("picks first variant with a non-zero market price", () => {
    const card: PokemonTcgCard = {
      ...baseCard,
      tcgplayer: {
        updatedAt: "2024/01/01",
        prices: {
          normal: { low: 1, mid: 2, high: 3, market: 0 },
          holofoil: { low: 10, mid: 15, high: 20, market: 14.5 },
        },
      },
    };
    expect(extractMarketPrice(card, "tcgplayer")).toBeCloseTo(14.5);
  });

  it("returns null when tcgplayer is missing", () => {
    expect(extractMarketPrice(baseCard, "tcgplayer")).toBeNull();
  });

  it("returns null when all tcgplayer market prices are 0", () => {
    const card: PokemonTcgCard = {
      ...baseCard,
      tcgplayer: {
        updatedAt: "2024/01/01",
        prices: { normal: { low: 1, mid: 2, high: 3, market: 0 } },
      },
    };
    expect(extractMarketPrice(card, "tcgplayer")).toBeNull();
  });
});
