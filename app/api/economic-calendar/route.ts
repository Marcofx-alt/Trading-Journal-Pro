import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RawEvent = Record<string, unknown>

function text(value: unknown) {
  return value == null ? '' : String(value)
}

function normalizeImportance(value: unknown) {
  const raw = text(value).toLowerCase()
  if (raw.includes('high') || raw === '3') return 'High'
  if (raw.includes('medium') || raw.includes('moderate') || raw === '2') return 'Medium'
  return 'Low'
}

function normalizeDate(value: unknown) {
  const raw = text(value)
  if (!raw) return ''
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? raw : date.toISOString()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || new Date().toISOString().slice(0, 10)
  const to = searchParams.get('to') || from

  const credential = process.env.TRADING_ECONOMICS_KEY || 'guest:guest'
  const url = `https://api.tradingeconomics.com/calendar/country/all/${encodeURIComponent(from)}/${encodeURIComponent(to)}?c=${encodeURIComponent(credential)}&f=json`

  try {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
    if (!response.ok) {
      return NextResponse.json({ events: [], source: 'Trading Economics', error: `Calendar provider returned ${response.status}.` }, { status: 200 })
    }

    const payload = await response.json()
    const rows: RawEvent[] = Array.isArray(payload) ? payload : []
    const events = rows.map((item, index) => ({
      id: text(item.CalendarId || item.Id || `${index}-${item.Date || ''}-${item.Event || ''}`),
      date: normalizeDate(item.Date),
      country: text(item.Country),
      currency: text(item.Currency),
      event: text(item.Event || item.Category),
      category: text(item.Category),
      impact: normalizeImportance(item.Importance),
      actual: text(item.Actual),
      forecast: text(item.Forecast),
      previous: text(item.Previous),
      reference: text(item.Reference),
      source: text(item.Source)
    })).filter(event => event.date && event.event)

    return NextResponse.json({ events, source: 'Trading Economics', error: null })
  } catch (error) {
    return NextResponse.json({ events: [], source: 'Trading Economics', error: error instanceof Error ? error.message : 'Calendar feed unavailable.' }, { status: 200 })
  }
}
