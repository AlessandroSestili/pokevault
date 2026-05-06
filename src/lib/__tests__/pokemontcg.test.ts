import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCardById, searchCards } from "../api/pokemontcg";
import type { PokemonTcgCard } from "@/types";

const mockCard: PokemonTcgCard = {
  id: "sv3pt5-6",
  name: "Charizard ex",
  number: "006",
  set: { id: "sv3pt5", name: "151", printedTotal: 165, series: "Scarlet & Violet", releaseDate: "2023/09/22" },
  types: ["Fire"],
  rarity: "Ultra Rare",
  images: { small: "https://images.pokemontcg.io/sv3pt5/6.png", large: "https://images.pokemontcg.io/sv3pt5/6_hires.png" },
  cardmarket: { updatedAt: "2024/01/01", prices: { trendPrice: 85, averageSellPrice: 80, lowPrice: 70 } },
};

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchCardById", () => {
  it("returns the card on success", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: mockCard }));
    const result = await fetchCardById("sv3pt5-6");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("sv3pt5-6");
    expect(result?.name).toBe("Charizard ex");
  });

  it("calls the correct endpoint", async () => {
    const fetchSpy = mockFetch({ data: mockCard });
    vi.stubGlobal("fetch", fetchSpy);
    await fetchCardById("sv3pt5-6");
    const url = (fetchSpy.mock.calls[0][0] as string);
    expect(url).toContain("/v2/cards/sv3pt5-6");
  });

  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "not found" }, 404));
    const result = await fetchCardById("invalid-id");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await fetchCardById("sv3pt5-6");
    expect(result).toBeNull();
  });
});

describe("searchCards", () => {
  it("returns array of cards", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [mockCard] }));
    const results = await searchCards("Charizard");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Charizard ex");
  });

  it("returns empty array when no results", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [] }));
    const results = await searchCards("zzznomatch");
    expect(results).toHaveLength(0);
  });

  it("includes set filter in query when provided", async () => {
    const fetchSpy = mockFetch({ data: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await searchCards("Pikachu", "sv3pt5");
    const url = (fetchSpy.mock.calls[0][0] as string);
    expect(url).toContain("sv3pt5");
  });

  it("returns empty array on fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));
    const results = await searchCards("Charizard");
    expect(results).toHaveLength(0);
  });
});
