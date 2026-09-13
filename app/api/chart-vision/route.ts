import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'AI Chart Vision has been retired from Trading Journal Pro.' }, { status: 410 })
}
