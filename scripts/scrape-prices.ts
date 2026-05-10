import { createClient } from "@supabase/supabase-js";

const CARDTRADER_TOKEN = process.env.CARDTRADER_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POKEMON_GAME_ID = 5;
const BASE_URL = "https://api.cardtrader.com/api/v2";
const SLEEP_MS = 100; // 10 req/s max

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ct<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CARDTRADER_TOKEN}` },
  });
  if (!res.ok) throw new Error(`CardTrader ${path} → ${res.status}`);
  const json = await res.json();
  return (json.array ?? json) as T;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  process.stdout.write(`[${ts}] ${msg}\n`);
}

type MarketProduct = {
  price: { cents: number; currency: string };
};

type Card = { id: string; cardtrader_blueprint_id: number };

async function main() {
  log("Avvio aggiornamento prezzi...");

  const { data: run } = await supabase
    .from("market_scrape_runs")
    .insert({ status: "running" })
    .select()
    .single();
  const runId = run!.id;

  let updated = 0;
  const errors: string[] = [];

  try {
    // Fetch tutte le carte dal DB
    const { data: cards, error: cardsErr } = await supabase
      .from("market_cards")
      .select("id, cardtrader_blueprint_id")
      .not("cardtrader_blueprint_id", "is", null);

    if (cardsErr) throw cardsErr;
    log(`Carte da aggiornare: ${cards!.length}`);

    for (let i = 0; i < cards!.length; i++) {
      const card = cards![i] as Card;
      const pct = Math.round(((i + 1) / cards!.length) * 100);

      if (i % 500 === 0) {
        log(`[${pct}%] (${i + 1}/${cards!.length}) — prezzi aggiornati: ${updated}`);
        await supabase
          .from("market_scrape_runs")
          .update({ cards_updated: updated })
          .eq("id", runId);
      }

      try {
        await sleep(SLEEP_MS);
        const products = await ct<MarketProduct[]>(
          `/marketplace/products?blueprint_id=${card.cardtrader_blueprint_id}&game_id=${POKEMON_GAME_ID}`
        ).catch(() => [] as MarketProduct[]);

        if (products.length === 0) continue;

        const cents = products.map((p) => p.price.cents);
        await supabase.from("market_prices").insert({
          card_id: card.id,
          source: "cardtrader",
          price_low: Math.min(...cents) / 100,
          price_mid: cents.reduce((s, x) => s + x, 0) / cents.length / 100,
          price_high: Math.max(...cents) / 100,
          currency: products[0].price.currency,
        });

        updated++;
      } catch (e) {
        errors.push(`Card ${card.id}: ${String(e)}`);
      }
    }
  } finally {
    await supabase
      .from("market_scrape_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        cards_updated: updated,
        errors: errors.length > 0 ? errors : null,
      })
      .eq("id", runId);

    log(`✓ Completato. Prezzi: ${updated}, Errori: ${errors.length}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
