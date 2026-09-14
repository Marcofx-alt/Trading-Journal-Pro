import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RawEvent = Record<string, unknown>

type NormalizedEvent = {
  id: string
  date: string
  country: string
  currency: string
  event: string
  category: string
  impact: 'High' | 'Medium' | 'Low'
  actual: string
  forecast: string
  previous: string
  reference: string
  source: string
}

function text(value: unknown) {
  return value == null ? '' : String(value)
}

function normalizeImportance(value: unknown): NormalizedEvent['impact'] {
  const raw = text(value).toLowerCase()
  if (raw.includes('high') || raw === '3') return 'High'
  if (raw.includes('medium') || raw.includes('moderate') || raw === '2') return 'Medium'
  return 'Low'
}

function normalizeDate(value: unknown) {
  const raw = text(value)
  if (!raw) return ''
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function inferCategory(title: string) {
  const value = title.toLowerCase()
  if (/interest|rate|fomc|monetary|central bank|boj|boe|boc|rba|ecb/.test(value)) return 'Interest Rate'
  if (/cpi|ppi|inflation|price index|rpi/.test(value)) return 'Inflation'
  if (/employment|unemployment|claims|payroll|earnings|adp/.test(value)) return 'Employment'
  if (/gdp|gross domestic/.test(value)) return 'GDP'
  if (/retail sales/.test(value)) return 'Retail Sales'
  if (/consumer confidence|sentiment/.test(value)) return 'Consumer Confidence'
  if (/manufactur|pmi/.test(value)) return 'Manufacturing'
  if (/industrial production|capacity utilization/.test(value)) return 'Industrial Production'
  if (/housing|home sales|building permits|mortgage/.test(value)) return 'Housing'
  if (/trade balance|current account|imports|exports/.test(value)) return 'Balance Of Trade'
  return 'Other'
}

function inRequestedRange(dateIso: string, from: string, to: string) {
  const value = new Date(dateIso).getTime()
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T23:59:59.999Z`)
  return Number.isFinite(value) && value >= start && value <= end
}

async function loadTradingEconomics(from: string, to: string, credential: string) {
  const url = `https://api.tradingeconomics.com/calendar/country/all/${encodeURIComponent(from)}/${encodeURIComponent(to)}?c=${encodeURIComponent(credential)}&f=json`
  const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Trading Economics returned ${response.status}`)

  const payload = await response.json()
  const rows: RawEvent[] = Array.isArray(payload) ? payload : []
  return rows.map((item, index): NormalizedEvent => ({
    id: text(item.CalendarId || item.Id || `te-${index}-${item.Date || ''}-${item.Event || ''}`),
    date: normalizeDate(item.Date),
    country: text(item.Country),
    currency: text(item.Currency),
    event: text(item.Event || item.Category),
    category: text(item.Category) || inferCategory(text(item.Event)),
    impact: normalizeImportance(item.Importance),
    actual: text(item.Actual),
    forecast: text(item.Forecast),
    previous: text(item.Previous),
    reference: text(item.Reference),
    source: text(item.Source) || 'Trading Economics'
  })).filter(event => event.date && event.event)
}

async function loadBiquote(from: string, to: string) {
  const params = new URLSearchParams({
    from: `${from}T00:00:00Z`,
    to: `${to}T23:59:59Z`,
    limit: '500'
  })
  const response = await fetch(`https://biquote.io/api/calendar?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) throw new Error(`Biquote returned ${response.status}`)

  const payload = await response.json()
  const rows: RawEvent[] = Array.isArray(payload) ? payload : []
  return rows.map((item, index): NormalizedEvent => {
    const eventName = text(item.name || item.title || item.event)
    const currency = text(item.currency).toUpperCase()
    return {
      id: text(item.id || item.eventId || `bq-${index}-${item.time || ''}-${eventName}`),
      date: normalizeDate(item.time || item.date),
      country: text(item.countryCode || item.country),
      currency,
      event: eventName,
      category: text(item.sector) || inferCategory(eventName),
      impact: normalizeImportance(item.importance || item.impact),
      actual: text(item.actual),
      forecast: text(item.forecast),
      previous: text(item.revisedPrevious ?? item.previous),
      reference: text(item.period),
      source: 'Biquote Economic Calendar'
    }
  }).filter(event => event.date && event.event && inRequestedRange(event.date, from, to))
}

async function loadFairEconomy(from: string, to: string) {
  const urls = [
    'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://cdn-nfs.faireconomy.media/ff_calendar_nextweek.json',
    'https://nfs.faireconomy.media/ff_calendar_nextweek.json'
  ]

  const payloads = await Promise.all(urls.map(async url => {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json,text/plain,*/*' }
      })
      if (!response.ok) return []
      const payload = await response.json()
      return Array.isArray(payload) ? payload as RawEvent[] : []
    } catch {
      return []
    }
  }))

  const seen = new Set<string>()
  const events: NormalizedEvent[] = []
  payloads.flat().forEach((item, index) => {
    const eventName = text(item.title || item.event || item.Event)
    const date = normalizeDate(item.date || item.Date)
    const currency = text(item.country || item.currency || item.Currency).toUpperCase()
    if (!eventName || !date || !inRequestedRange(date, from, to)) return

    const key = `${date}|${currency}|${eventName}`
    if (seen.has(key)) return
    seen.add(key)
    events.push({
      id: `ff-${index}-${key}`,
      date,
      country: currency,
      currency,
      event: eventName,
      category: inferCategory(eventName),
      impact: normalizeImportance(item.impact || item.Importance),
      actual: text(item.actual || item.Actual),
      forecast: text(item.forecast || item.Forecast),
      previous: text(item.previous || item.Previous),
      reference: '',
      source: 'Forex Factory / Fair Economy'
    })
  })

  return events.sort((a, b) => +new Date(a.date) - +new Date(b.date))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || new Date().toISOString().slice(0, 10)
  const to = searchParams.get('to') || from
  const credential = process.env.TRADING_ECONOMICS_KEY?.trim()
  const failures: string[] = []

  if (credential) {
    try {
      const events = await loadTradingEconomics(from, to, credential)
      if (events.length) {
        return NextResponse.json({ events, source: 'Trading Economics', error: null, fallback: false })
      }
      failures.push('Trading Economics returned 0 events')
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Trading Economics failed')
    }
  }

  try {
    const events = await loadBiquote(from, to)
    if (events.length) {
      return NextResponse.json({
        events,
        source: 'Biquote Economic Calendar',
        error: null,
        fallback: true,
        notice: 'Live no-key economic calendar connected.'
      })
    }
    failures.push('Biquote returned 0 events')
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'Biquote failed')
  }

  try {
    const events = await loadFairEconomy(from, to)
    if (events.length) {
      return NextResponse.json({
        events,
        source: 'Forex Factory / Fair Economy',
        error: null,
        fallback: true,
        notice: 'Fallback weekly calendar feed connected.'
      })
    }
    failures.push('Fair Economy returned 0 events')
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'Fair Economy failed')
  }

  return NextResponse.json({
    events: [],
    source: 'Economic calendar',
    error: `No live calendar data was returned. ${failures.join(' | ')}`,
    fallback: true
  }, { status: 200 })
}
