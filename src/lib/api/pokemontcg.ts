import type { PokemonTcgCard } from "@/types";

const BASE = "https://api.pokemontcg.io/v2";

export async function fetchCardById(id: string): Promise<PokemonTcgCard | null> {
  try {
    const res = await fetch(`${BASE}/cards/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function searchCards(
  name: string,
  setId?: string
): Promise<PokemonTcgCard[]> {
  try {
    const q = setId ? `name:"${name}" set.id:${setId}` : `name:"${name}"`;
    const res = await fetch(`${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=20`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}
