import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runAutomationTick } from '@/lib/automation/tick'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const secret = process.env.AUTOMATION_WORKER_SECRET
  const supplied = request.headers.get('authorization') || ''
  const expected = secret ? `Bearer ${secret}` : ''
  if (!secret || secret.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    return NextResponse.json(await runAutomationTick(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    console.error('automation_tick_failed')
    return NextResponse.json({ state: 'failed' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
