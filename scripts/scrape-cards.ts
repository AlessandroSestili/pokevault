import { createClient } from "@supabase/supabase-js";

const CARDTRADER_TOKEN = process.env.CARDTRADER_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POKEMON_GAME_ID = 5;
const BASE_URL = "https://api.cardtrader.com/api/v2";
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ct<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CARDTRADER_TOKEN}` },
  });
  if (!res.ok) throw new Error(`CardTrader ${path} → ${res.status}`);
  const json = await res.json();
  return (json.array ?? json) as T;
}

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  process.stdout.write(`[${ts}] ${msg}\n`);
}

type Expansion = { id: number; name: string; code: string; game_id: number };
type Blueprint = {
  id: number;
  name: string;
  collector_number: string;
  rarity: string;
  image_url: string | null;
  properties_hash: { pokemon_language?: string };
};

async function main() {
  log("Avvio scraping carte Pokémon...");

  const { data: run } = await supabase
    .from("market_scrape_runs")
    .insert({ status: "running" })
    .select()
    .single();
  const runId = run!.id;

  let cardsUpdated = 0;
  const errors: string[] = [];

  try {
    const allExpansions = await ct<Expansion[]>(`/expansions`);
    const expansions = allExpansions.filter((e) => e.game_id === POKEMON_GAME_ID);
    log(`Set Pokémon: ${expansions.length} (totale CardTrader: ${allExpansions.length})`);

    for (let i = 0; i < expansions.length; i++) {
      const exp = expansions[i];
      const pct = Math.round(((i + 1) / expansions.length) * 100);
      log(`[${pct}%] (${i + 1}/${expansions.length}) ${exp.name} (${exp.code})`);

      try {
        const blueprints = await ct<Blueprint[]>(
          `/blueprints/export?expansion_id=${exp.id}`
        );

        // Upsert in batch
        for (let b = 0; b < blueprints.length; b += BATCH_SIZE) {
          const batch = blueprints.slice(b, b + BATCH_SIZE).map((bp) => ({
            cardtrader_blueprint_id: bp.id,
            name: bp.name,
            set_name: exp.name,
            set_code: exp.code,
            number: bp.collector_number,
            rarity: bp.rarity,
            language: bp.properties_hash?.pokemon_language ?? "EN",
            image_url: bp.image_url,
          }));

          const { error } = await supabase
            .from("market_cards")
            .upsert(batch, { onConflict: "cardtrader_blueprint_id" });

          if (error) errors.push(`Set ${exp.name} batch ${b}: ${error.message}`);
          else cardsUpdated += batch.length;
        }

        log(`  → ${blueprints.length} carte`);

        if (i % 10 === 0) {
          await supabase
            .from("market_scrape_runs")
            .update({ cards_updated: cardsUpdated })
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
        cards_updated: cardsUpdated,
        errors: errors.length > 0 ? errors : null,
      })
      .eq("id", runId);

    log(`✓ Completato. Carte: ${cardsUpdated}, Errori: ${errors.length}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
