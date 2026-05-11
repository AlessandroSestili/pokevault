import { NextRequest, NextResponse } from 'next/server'
import {
  getExpansions,
  getBlueprintsByExpansion,
  searchBlueprintsByName,
  blueprintToResult,
  TOTAL_TO_CODES,
  type CTExpansion,
} from '@/lib/api/cardtrader'

// User-friendly set code → actual CT expansion code
const SET_CODE_ALIASES: Record<string, string> = {
  'svp':   'svpromo',  // SV Black Star Promos (SVP 001...)
  'swshp': 'swshbs',   // SWSH Black Star Promos
  'smp':   'smbs',     // SM Black Star Promos
  'xyp':   'xybsp',    // XY Black Star Promos
  'bwp':   'bwbsp',    // BW Black Star Promos
  'dpp':   'dpbsp',    // DP Black Star Promos
}

// Subset/promo prefix → expansion codes
const PREFIX_TO_CODES: Record<string, string[]> = {
  'GG':   ['crz'],                        // Crown Zenith Galarian Gallery
  'TG':   ['brs', 'astr', 'lorg', 'sit'], // Trainer Gallery (SWSH era)
  'SWSH': ['swshbs'],                     // SWSH Black Star Promos
  'SM':   ['smbs'],                       // SM Black Star Promos
  'XY':   ['xybsp'],                      // XY Black Star Promos
  'BW':   ['bwbsp'],                      // BW Black Star Promos
  'DP':   ['dpbsp'],                      // DP Black Star Promos
  'HGSS': ['hggsbs'],                     // HGSS Black Star Promos
}

// Some sets (SM era, vintage) store collector_number as "134/147" instead of "134"
function cnMatches(cn: string, paddedNum: string, rawNum: string): boolean {
  const base = cn.includes('/') ? cn.split('/')[0] : cn
  return base === paddedNum || base === rawNum
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
    const expansion = expansions.get(code) ?? expansions.get(SET_CODE_ALIASES[code] ?? '')
    if (!expansion) return NextResponse.json([])

    const blueprints = await getBlueprintsByExpansion(expansion.id)
    const matches = blueprints.filter(b =>
      cnMatches(b.fixed_properties?.collector_number ?? '', paddedNum, numStr)
    )

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
          .filter(b => cnMatches(b.fixed_properties?.collector_number ?? '', paddedNum, numStr))
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

  // Pattern 4b: "NAME NNN/TTT" — e.g. "Necrozma 134/142"
  const nameNumTotalMatch = q.match(/^(.+?)\s+(\d{1,4})\/(\d{1,3})$/)
  if (nameNumTotalMatch) {
    const name = nameNumTotalMatch[1].trim()
    const numStr = nameNumTotalMatch[2]
    const total = parseInt(nameNumTotalMatch[3])
    const paddedNum = numStr.padStart(3, '0')
    const codes = TOTAL_TO_CODES[total] ?? []
    if (codes.length) {
      const expansions = await getExpansions()
      const targets = codes
        .map(c => ({ code: c, exp: expansions.get(c) }))
        .filter((x): x is { code: string; exp: CTExpansion } => x.exp != null)
      const groups = await Promise.all(
        targets.map(async ({ code, exp }) => {
          const bps = await getBlueprintsByExpansion(exp.id)
          return bps
            .filter(b => cnMatches(b.fixed_properties?.collector_number ?? '', paddedNum, numStr))
            .filter(b => b.name.toLowerCase().includes(name.toLowerCase()))
            .map(b => blueprintToResult(b, code, exp.name))
        })
      )
      const flat = groups.flat()
      if (flat.length) return NextResponse.json(flat.slice(0, limit))
    }
  }

  // Pattern 5: standalone promo code — "SWSH260", "SM100", "XY01"
  const standalonePromoMatch = q.match(/^([A-Za-z]{2,5})(\d{2,4})$/i)
  if (standalonePromoMatch) {
    const prefix = standalonePromoMatch[1].toUpperCase()
    const numStr = standalonePromoMatch[2]
    const collectorNumber = `${prefix}${numStr}`
    const codes = PREFIX_TO_CODES[prefix] ?? []
    if (codes.length) {
      const expansions = await getExpansions()
      const targets = codes
        .map(c => ({ code: c, exp: expansions.get(c) }))
        .filter((x): x is { code: string; exp: CTExpansion } => x.exp != null)
      const groups = await Promise.all(
        targets.map(async ({ code, exp }) => {
          const bps = await getBlueprintsByExpansion(exp.id)
          return bps
            .filter(b => (b.fixed_properties?.collector_number ?? '').toUpperCase() === collectorNumber)
            .map(b => blueprintToResult(b, code, exp.name))
        })
      )
      const flat = groups.flat()
      if (flat.length) return NextResponse.json(flat.slice(0, limit))
    }
  }

  // Pattern 6: "name + promo code" — "Charizard V SWSH260"
  const namePlusPromoMatch = q.match(/^(.+?)\s+([A-Za-z]{2,5}\d{2,4})$/i)
  if (namePlusPromoMatch) {
    const name = namePlusPromoMatch[1].trim()
    const promoCode = namePlusPromoMatch[2].toUpperCase()
    const results = await searchBlueprintsByName(name, 40)
    const filtered = results.filter(
      b => (b.fixed_properties?.collector_number ?? '').toUpperCase() === promoCode
    )
    if (filtered.length) {
      return NextResponse.json(
        filtered.slice(0, limit).map(b => blueprintToResult(b, b.expansion_code, b.expansion_name))
      )
    }
  }

  // Pattern 7: name search — live CT call + cached expansions map
  const blueprints = await searchBlueprintsByName(q, limit)
  return NextResponse.json(
    blueprints.map(b => blueprintToResult(b, b.expansion_code, b.expansion_name))
  )
}
