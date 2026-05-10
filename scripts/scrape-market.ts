import { createClient } from "@supabase/supabase-js";

const CARDTRADER_TOKEN = process.env.CARDTRADER_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POKEMON_GAME_ID = 5;
const BASE_URL = "https://api.cardtrader.com/api/v2";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: "market" },
});

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

type Expansion = {
  id: number;
  name: string;
  code: string;
  game_id: number;
};

type Blueprint = {
  id: number;
  name: string;
  collector_number: string;
  rarity: string;
  image_url: string | null;
  expansion: { id: number; name: string; code: string };
  properties_hash: { pokemon_language?: string };
};

type MarketProduct = {
  blueprint_id: number;
  price: { cents: number; currency: string };
};

async function main() {
  log("Avvio scraping CardTrader Pokémon...");

  const { data: run, error: runErr } = await supabase
    .from("scrape_runs")
    .insert({ status: "running" })
    .select()
    .single();
  if (runErr) throw runErr;
  const runId = run.id;
  log(`Run ID: ${runId}`);

  let cardsUpdated = 0;
  const errors: string[] = [];

  try {
    const expansions = await ct<Expansion[]>(
      `/expansions?game_id=${POKEMON_GAME_ID}`
    );
    log(`Set trovati: ${expansions.length}`);

    for (let i = 0; i < expansions.length; i++) {
      const exp = expansions[i];
      const pct = Math.round(((i + 1) / expansions.length) * 100);
      log(`[${pct}%] (${i + 1}/${expansions.length}) ${exp.name} (${exp.code})`);

      // Aggiorna progresso nel DB ogni 5 set
      if (i % 5 === 0) {
        await supabase
          .from("scrape_runs")
          .update({ cards_updated: cardsUpdated })
          .eq("id", runId);
      }

      try {
        const blueprints = await ct<Blueprint[]>(
          `/blueprints/export?expansion_id=${exp.id}`
        );
        log(`  → ${blueprints.length} carte`);

        for (const bp of blueprints) {
          const { data: card, error: cardErr } = await supabase
            .from("cards")
            .upsert(
              {
                cardtrader_blueprint_id: bp.id,
                name: bp.name,
                set_name: exp.name,
                set_code: exp.code,
                number: bp.collector_number,
                rarity: bp.rarity,
                language: bp.properties_hash?.pokemon_language ?? "EN",
                image_url: bp.image_url,
              },
              { onConflict: "cardtrader_blueprint_id" }
            )
            .select("id")
            .single();

          if (cardErr) {
            errors.push(`Blueprint ${bp.id}: ${cardErr.message}`);
            continue;
          }

          cardsUpdated++;

          await sleep(100);
          const products = await ct<MarketProduct[]>(
            `/marketplace/products?blueprint_id=${bp.id}&game_id=${POKEMON_GAME_ID}`
          ).catch(() => [] as MarketProduct[]);

          if (products.length > 0) {
            const cents = products.map((p) => p.price.cents);
            await supabase.from("prices").insert({
              card_id: card.id,
              source: "cardtrader",
              price_low: Math.min(...cents) / 100,
              price_mid: cents.reduce((s, x) => s + x, 0) / cents.length / 100,
              price_high: Math.max(...cents) / 100,
              currency: products[0].price.currency,
            });
          }
        }

        await sleep(200);
      } catch (e) {
        const msg = `Set ${exp.name}: ${String(e)}`;
        errors.push(msg);
        log(`  ⚠ ${msg}`);
      }
    }
  } finally {
    await supabase
      .from("scrape_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        cards_updated: cardsUpdated,
        errors: errors.length > 0 ? errors : null,
      })
      .eq("id", runId);

    log(`✓ Completato. Carte: ${cardsUpdated}, Errori: ${errors.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
