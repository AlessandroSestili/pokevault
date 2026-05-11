export {}
async function main() {
  const res = await fetch('https://api.pokemontcg.io/v2/cards?q=set.id:sv3&pageSize=5&select=name,number')
  const json = await res.json()
  console.log('PokéTCG sv3 sample:', JSON.stringify(json.data, null, 2))

  const res2 = await fetch('https://api.tcgdex.net/v2/en/sets/sv5K/cards')
  const cards2 = await res2.json()
  console.log('\nTCGdex sv5K sample:', JSON.stringify(Array.isArray(cards2) ? cards2.slice(0, 5) : cards2, null, 2))
}
main().catch(console.error)
