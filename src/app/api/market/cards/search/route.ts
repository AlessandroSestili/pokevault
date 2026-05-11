import { NextRequest, NextResponse } from 'next/server'
import {
  getExpansions,
  getBlueprintsByExpansion,
  searchBlueprintsByName,
  blueprintToResult,
  TOTAL_TO_CODES,
  type CTExpansion,
} from '@/lib/api/cardtrader'

// Subset prefix → expansion codes (Gallery/Trainer Gallery subsets)
const PREFIX_TO_CODES: Record<string, string[]> = {
  'GG': ['crz'],              // Crown Zenith Galarian Gallery (GG01–GG70)
  'TG': ['brs', 'astr', 'lorg', 'sit'], // Trainer Gallery (TG01–TG30 across SWSH sets)
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '24'), 40)

  if (q.length < 2) return NextResponse.json([])

  // Pattern 1: "SETCODE-NUM" — e.g. "sv5k-075", "PAR-191", "par-191"
  const setNumMatch = q.match(/^([a-zA-Z][a-zA-Z0-9]{1,11})-(\d{1,4})$/i)
  if (setNumMatch) {
    const code = setNumMatch[1].toLowerCase()
    const numStr = setNumMatch[2]
    const paddedNum = numStr.padStart(3, '0')

    const expansions = await getExpansions()
    const expansion = expansions.get(code)
    if (!expansion) return NextResponse.json([])

    const blueprints = await getBlueprintsByExpansion(expansion.id)
    const matches = blueprints.filter(b => {
      const cn = b.fixed_properties.collector_number
      return cn === paddedNum || cn === numStr
    })

    return NextResponse.json(
      matches.slice(0, limit).map(b => blueprintToResult(b, code, expansion.name))
    )
  }

  // Pattern 2: "193/182" — collector number + printed total
  const numTotalMatch = q.match(/^(\d{1,4})\/(\d{1,3})$/)
  if (numTotalMatch) {
    const numStr = numTotalMatch[1]
    const total = parseInt(numTotalMatch[2])
    const paddedNum = numStr.padStart(3, '0')

    const codes = TOTAL_TO_CODES[total] ?? []
    if (!codes.length) return NextResponse.json([])

    const expansions = await getExpansions()
    const targets = codes
      .map(c => ({ code: c, exp: expansions.get(c) }))
      .filter((x): x is { code: string; exp: CTExpansion } => x.exp != null)

    // Fetch blueprints in parallel — each call is independently cached for 1h
    const groups = await Promise.all(
      targets.map(async ({ code, exp }) => {
        const blueprints = await getBlueprintsByExpansion(exp.id)
        return blueprints
          .filter(b => {
            const cn = b.fixed_properties.collector_number
            return cn === paddedNum || cn === numStr
          })
          .map(b => blueprintToResult(b, code, exp.name))
      })
    )

    return NextResponse.json(groups.flat().slice(0, limit))
  }

  // Pattern 4: "GG02/GG70", "TG01/TG30" — subset prefix + number format
  const alphaPrefixMatch = q.match(/^([A-Za-z]+)(\d+)\/([A-Za-z]+\d+)$/i)
  if (alphaPrefixMatch) {
    const prefix = alphaPrefixMatch[1].toUpperCase()
    const numStr = alphaPrefixMatch[2]
    const collectorNumber = `${prefix}${numStr.padStart(2, '0')}`

    const codes = PREFIX_TO_CODES[prefix] ?? []
    if (codes.length) {
      const expansions = await getExpansions()
      const targets = codes
        .map(c => ({ code: c, exp: expansions.get(c) }))
        .filter((x): x is { code: string; exp: CTExpansion } => x.exp != null)

      const groups = await Promise.all(
        targets.map(async ({ code, exp }) => {
          const blueprints = await getBlueprintsByExpansion(exp.id)
          return blueprints
            .filter(b => (b.fixed_properties?.collector_number ?? '') === collectorNumber)
            .map(b => blueprintToResult(b, code, exp.name))
        })
      )

      const flat = groups.flat()
      if (flat.length) return NextResponse.json(flat.slice(0, limit))
    }
  }

  // Pattern 5: name search — live CT call + cached expansions map
  const blueprints = await searchBlueprintsByName(q, limit)
  return NextResponse.json(
    blueprints.map(b => blueprintToResult(b, b.expansion_code, b.expansion_name))
  )
}
