import { NextRequest, NextResponse } from 'next/server'
import { getMinPriceForCondition, gradeToCTCondition } from '@/lib/api/cardtrader'

export async function GET(req: NextRequest) {
  const blueprintId = parseInt(req.nextUrl.searchParams.get('blueprint_id') ?? '')
  if (!blueprintId) return NextResponse.json({ price: null })

  const gradeParam = req.nextUrl.searchParams.get('grade')
  const grade = gradeParam ? parseFloat(gradeParam) : 10
  const condition = gradeToCTCondition(isNaN(grade) ? 10 : grade)

  const price = await getMinPriceForCondition(blueprintId, condition)
  return NextResponse.json({ price, condition })
}
