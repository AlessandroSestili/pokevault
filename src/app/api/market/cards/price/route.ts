import { NextRequest, NextResponse } from 'next/server'
import { getMinNMPrice } from '@/lib/api/cardtrader'

export async function GET(req: NextRequest) {
  const blueprintId = parseInt(req.nextUrl.searchParams.get('blueprint_id') ?? '')
  if (!blueprintId) return NextResponse.json({ price: null })

  const price = await getMinNMPrice(blueprintId)
  return NextResponse.json({ price })
}
