import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCardFromTcgDex, searchCardsTcgDex } from "../api/tcgdex";
import type { TcgDexCard } from "@/types";

const mockCard: TcgDexCard = {
  id: "swsh1-1",
  localId: "001",
  name: "Florges",
  image: "https://assets.tcgdex.net/en/swsh/swsh1/1",
  rarity: "Rare",
  category: "Pokemon",
  types: ["Fairy"],
  set: {
    id: "swsh1",
    name: "Sword & Shield",
    serie: { name: "Sword & Shield" },
    cardCount: { total: 202, official: 202 },
  },
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

describe("fetchCardFromTcgDex", () => {
  it("returns card on success", async () => {
    vi.stubGlobal("fetch", mockFetch(mockCard));
    const result = await fetchCardFromTcgDex("swsh1-1", "en");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("swsh1-1");
    expect(result?.name).toBe("Florges");
  });

  it("calls endpoint with correct language", async () => {
    const fetchSpy = mockFetch(mockCard);
    vi.stubGlobal("fetch", fetchSpy);
    await fetchCardFromTcgDex("swsh1-1", "jp");
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("/jp/");
    expect(url).toContain("swsh1-1");
  });

  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", mockFetch(null, 404));
    const result = await fetchCardFromTcgDex("invalid", "en");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));
    const result = await fetchCardFromTcgDex("swsh1-1", "en");
    expect(result).toBeNull();
  });
});

describe("searchCardsTcgDex", () => {
  it("returns array of cards", async () => {
    vi.stubGlobal("fetch", mockFetch([mockCard]));
    const results = await searchCardsTcgDex("swsh1", "en");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Florges");
  });

  it("returns empty array on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));
    const results = await searchCardsTcgDex("swsh1", "jp");
    expect(results).toHaveLength(0);
  });

  it("includes language in request URL", async () => {
    const fetchSpy = mockFetch([]);
    vi.stubGlobal("fetch", fetchSpy);
    await searchCardsTcgDex("sv1", "it");
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("/it/");
  });
});
