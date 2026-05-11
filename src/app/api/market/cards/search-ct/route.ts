import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.CARDTRADER_TOKEN!
const BASE = 'https://api.cardtrader.com/api/v2'

type Expansion = { id: number; name: string; code: string; game_id: number }
let expansionCache: Map<number, { name: string; code: string }> | null = null

async function getExpansions() {
  if (expansionCache) return expansionCache
  try {
    const res = await fetch(`${BASE}/expansions`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return new Map()
    const all: Expansion[] = await res.json()
    expansionCache = new Map(
      all.filter(e => e.game_id === 5).map(e => [e.id, { name: e.name, code: e.code }])
    )
  } catch {
    return new Map<number, { name: string; code: string }>()
  }
  return expansionCache
}

type Blueprint = {
  id: number
  name: string
  version: string | null
  expansion_id: number
  image: { preview: { url: string } } | null
}

function parseVersion(version: string | null): { rarity: string | null; number: string | null } {
  if (!version) return { rarity: null, number: null }
  if (version.includes('|')) {
    const [rarity, number] = version.split('|').map(s => s.trim())
    return { rarity: rarity || null, number: number || null }
  }
  // Just a number like "4/102"
  if (/\d/.test(version)) return { rarity: null, number: version.trim() }
  return { rarity: version.trim() || null, number: null }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 40)

  if (!q || q.length < 2) return NextResponse.json([])

  const [blueprints, expansions] = await Promise.all([
    fetch(`${BASE}/blueprints?name=${encodeURIComponent(q)}&game_id=5&limit=${limit}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }).then(r => r.ok ? r.json() as Promise<Blueprint[]> : [] as Blueprint[]),
    getExpansions(),
  ])

  const results = (blueprints as Blueprint[]).map(b => {
    const exp = expansions.get(b.expansion_id) ?? { name: '', code: '' }
    const { rarity, number } = parseVersion(b.version)
    return {
      id: String(b.id),
      name: b.name,
      set_name: exp.name,
      set_code: exp.code,
      number,
      rarity,
      language: 'EN',
      image_url: b.image?.preview?.url ? `https://cardtrader.com${b.image.preview.url}` : null,
      cardtrader_blueprint_id: b.id,
      price: null,
    }
  })

  return NextResponse.json(results)
}
