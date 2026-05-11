const TOKEN = process.env.CARDTRADER_TOKEN!
const BASE = 'https://api.cardtrader.com/api/v2'

async function main() {
  // Search Charizard — full response
  const res = await fetch(`${BASE}/blueprints?name=Charizard&game_id=5&limit=5`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  const data = await res.json()
  console.log('Full first result:\n', JSON.stringify(data[0], null, 2))
  console.log('\nAll names + versions:')
  for (const b of data) {
    console.log(` [${b.id}] ${b.name} | ${b.version} | ${b.expansion_id}`)
  }

  // Also test: does it support collector_number filter?
  const res2 = await fetch(`${BASE}/blueprints?name=Reuniclus&game_id=5&limit=10`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  const data2 = await res2.json()
  console.log('\nReuniclus results:')
  for (const b of data2) {
    console.log(` [${b.id}] ${b.name} | ${b.version} | set:${b.expansion_id}`)
  }
}

main().catch(console.error)
