import { createClient } from "@supabase/supabase-js";

const CARDTRADER_TOKEN = process.env.CARDTRADER_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POKEMON_GAME_ID = 5;
const BASE_URL = "https://api.cardtrader.com/api/v2";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ct<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CARDTRADER_TOKEN}` },
  });
  if (!res.ok) throw new Error(`CardTrader ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  process.stdout.write(`[${ts}] ${msg}\n`);
}

type Expansion = { id: number; name: string; code: string; game_id: number };

// blueprint_id → lista prodotti
type ExpansionProducts = Record<string, { price_cents: number; price_currency: string }[]>;

async function main() {
  log("Avvio aggiornamento prezzi (per set)...");

  const { data: run } = await supabase
    .from("market_scrape_runs")
    .insert({ status: "running" })
    .select()
    .single();
  const runId = run!.id;

  let updated = 0;
  const errors: string[] = [];

  try {
    const allExpansions = await ct<Expansion[]>(`/expansions`);
    const expansions = (allExpansions as unknown as Expansion[]).filter(
      (e) => e.game_id === POKEMON_GAME_ID
    );
    log(`Set Pokémon: ${expansions.length}`);

    // Carica mappa blueprint_id → card.id dal DB
    const { data: dbCards } = await supabase
      .from("market_cards")
      .select("id, cardtrader_blueprint_id")
      .not("cardtrader_blueprint_id", "is", null);

    const blueprintToCardId = new Map<number, string>(
      (dbCards ?? []).map((c) => [c.cardtrader_blueprint_id, c.id])
    );
    log(`Carte in DB con blueprint: ${blueprintToCardId.size}`);

    for (let i = 0; i < expansions.length; i++) {
      const exp = expansions[i];
      const pct = Math.round(((i + 1) / expansions.length) * 100);
      log(`[${pct}%] (${i + 1}/${expansions.length}) ${exp.name}`);

      try {
        const products = await ct<ExpansionProducts>(
          `/marketplace/products?expansion_id=${exp.id}&game_id=${POKEMON_GAME_ID}`
        );

        const blueprintIds = Object.keys(products);
        if (blueprintIds.length === 0) continue;

        const rows = [];
        for (const bpIdStr of blueprintIds) {
          const cardId = blueprintToCardId.get(Number(bpIdStr));
          if (!cardId) continue;

          const listings = products[bpIdStr];
          const cents = listings.map((l) => l.price_cents);
          rows.push({
            card_id: cardId,
            source: "cardtrader",
            price_low: Math.min(...cents) / 100,
            price_mid: cents.reduce((s, x) => s + x, 0) / cents.length / 100,
            price_high: Math.max(...cents) / 100,
            currency: listings[0].price_currency,
          });
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("market_prices").insert(rows);
          if (error) errors.push(`Set ${exp.name}: ${error.message}`);
          else updated += rows.length;
        }

        if (i % 10 === 0) {
          await supabase
            .from("market_scrape_runs")
            .update({ cards_updated: updated })
            .eq("id", runId);
        }
      } catch (e) {
        const msg = `Set ${exp.name}: ${String(e)}`;
        errors.push(msg);
        log(`  ⚠ ${msg}`);
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

    log(`✓ Completato. Prezzi inseriti: ${updated}, Errori: ${errors.length}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
