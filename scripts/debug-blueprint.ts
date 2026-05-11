// Run: npx tsx scripts/debug-blueprint.ts
// Shows raw CardTrader blueprint fields for first expansion
export {}

const TOKEN = process.env.CARDTRADER_TOKEN!
const BASE = 'https://api.cardtrader.com/api/v2'

async function ct<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  const json = await res.json()
  return (json.array ?? json) as T
}

async function main() {
  type Expansion = { id: number; name: string; code: string; game_id: number }
  const all = await ct<Expansion[]>('/expansions')
  const pokemon = all.filter(e => e.game_id === 5)

  // Pick a recent expansion
  const exp = pokemon.find(e => e.code === 'obf') ?? pokemon.find(e => e.code === 'svi') ?? pokemon[0]
  console.log(`Expansion: ${exp.name} (${exp.code}) id=${exp.id}\n`)

  const blueprints = await ct<unknown[]>(`/blueprints/export?expansion_id=${exp.id}`)
  const first = blueprints[0]
  console.log('First blueprint raw:\n', JSON.stringify(first, null, 2))

  const bps = blueprints as Record<string, unknown>[]

  // Find the Charizard ex card
  const charizard = bps.find(b => String(b.name).toLowerCase().includes('charizard'))
  if (charizard) {
    console.log('\nCharizard blueprint:\n', JSON.stringify(charizard, null, 2))
  }

  // Show first 5 names to understand format
  console.log('\nAll names (first 10):')
  bps.slice(0, 10).forEach(b => console.log(` cat=${b.category_id} name="${b.name}" image_url="${b.image_url}"`))

  // Check if number is extractable from image_url
  const withImgNum = bps.filter(b => /\/\d+-\d+-/.test(String(b.image_url) + '-'))
  console.log(`\n→ ${withImgNum.length}/${bps.length} have a NNN-NNN pattern in image_url`)
}

main().catch(console.error)
