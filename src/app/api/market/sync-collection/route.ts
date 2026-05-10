import { NextResponse } from 'next/server'
import { syncMarketPricesAction } from '@/lib/actions'

export async function POST() {
  const result = await syncMarketPricesAction()
  return NextResponse.json(result)
}
