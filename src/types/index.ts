// Core domain types for PokeVault

export type Language = "IT" | "EN" | "JP" | "DE" | "FR" | "ES" | "PT" | "KO" | "ZH";

export type Condition =
  | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5
  | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5
  | 9 | 9.5 | 10;

export type Source = "CardTrader" | "Cardmarket" | "eBay" | "TCGPlayer" | "Scambio" | "Negozio locale" | "Asta" | "Altro";

export type PriceSource = "cardmarket" | "tcgplayer";

export type ApiSource = "pokemontcg" | "tcgdex" | "cardtrader" | "manual";

// A card in the user's collection (stored in Supabase)
export interface CollectionCard {
  id: string;
  created_at: string;
  // Card identity
  name: string;
  set_id: string;        // e.g. "sv6" or tcgdex set code
  set_name: string;
  set_code: string;      // short code e.g. "SV6"
  card_number: string;   // e.g. "012/180"
  api_id: string | null; // pokemontcg.io or tcgdex card id
  api_source: ApiSource;
  image_url: string | null;
  // Card attributes
  element: string | null;     // Pokemon type (Fire, Water, etc.)
  rarity: string | null;
  language: Language;
  // Acquisition
  condition: number;          // PSA-style 1-10
  cost_basis: number;         // what user paid (EUR)
  source: Source;
  acquired_date: string;      // ISO date
  notes: string | null;
  is_favorite: boolean;
}

// Card with live market price appended (computed at render time)
export interface CollectionCardWithPrice extends CollectionCard {
  market_price: number | null;   // latest known price (EUR)
  price_history: PriceSnapshot[]; // sorted ASC by date
}

// One daily price snapshot (stored in Supabase)
export interface PriceSnapshot {
  date: string;     // ISO date YYYY-MM-DD
  price_eur: number;
  price_usd: number | null;
}

// Raw card data from pokemontcg.io
export interface PokemonTcgCard {
  id: string;
  name: string;
  number: string;
  set: {
    id: string;
    name: string;
    printedTotal: number;
    series: string;
    releaseDate: string;
  };
  types: string[] | undefined;
  rarity: string | undefined;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    updatedAt: string;
    prices: Record<string, {
      low: number;
      mid: number;
      high: number;
      market: number;
      directLow?: number;
    }>;
  };
  cardmarket?: {
    updatedAt: string;
    prices: {
      averageSellPrice: number;
      lowPrice: number;
      trendPrice: number;
      germanProLow?: number;
      suggestedPrice?: number;
      reverseHoloSell?: number;
      reverseHoloLow?: number;
      reverseHoloTrend?: number;
      lowPriceExPlus?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
      reverseHoloAvg1?: number;
      reverseHoloAvg7?: number;
      reverseHoloAvg30?: number;
    };
  };
}

// Raw card data from TCGdex API
export interface TcgDexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  rarity?: string;
  category?: string;
  types?: string[];
  set: {
    id: string;
    name: string;
    serie?: { name: string };
    cardCount?: { total: number; official: number };
  };
}

// Filters applied to the collection view
export interface CardFilters {
  search: string;
  element: string | null;
  set: string | null;
  rarity: string | null;
  language: Language | null;
  favoritesOnly: boolean;
  minValue: number | null;
  maxValue: number | null;
}

export type SortKey = "value" | "recent" | "mover" | "alpha";

export interface PortfolioTotals {
  totalValue: number;    // sum of market prices
  totalCost: number;     // sum of cost_basis
  totalPl: number;       // totalValue - totalCost
  plPercent: number;     // (totalPl / totalCost) * 100
  cardCount: number;
  favoriteCount: number;
  topGradeCount: number; // condition >= 9.5
}
