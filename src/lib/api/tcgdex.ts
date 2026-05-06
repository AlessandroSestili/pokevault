import type { TcgDexCard } from "@/types";

const BASE = "https://api.tcgdex.net/v2";

export async function fetchCardFromTcgDex(
  id: string,
  lang: string
): Promise<TcgDexCard | null> {
  try {
    const res = await fetch(`${BASE}/${lang}/cards/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchCardsTcgDex(
  setId: string,
  lang: string
): Promise<TcgDexCard[]> {
  try {
    const res = await fetch(`${BASE}/${lang}/sets/${setId}/cards`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
