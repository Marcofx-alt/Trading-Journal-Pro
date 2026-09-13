'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BellRing, CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, List,
  LockKeyhole, RefreshCw, Settings2, ShieldAlert, X
} from 'lucide-react'

type Impact = 'High' | 'Medium' | 'Low'
type EconomicEvent = {
  id: string
  date: string
  country: string
  currency: string
  event: string
  category: string
  impact: Impact
  actual: string
  forecast: string
  previous: string
  reference: string
  source: string
}

type BlockSettings = {
  enabled: boolean
  impact: Impact
  beforeMinutes: number
  afterMinutes: number
}

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD', 'CNY']
const impacts: Impact[] = ['High', 'Medium', 'Low']
const categories = [
  'Interest Rate', 'Inflation', 'Employment', 'GDP', 'Retail Sales', 'Consumer Confidence',
  'Manufacturing', 'Industrial Production', 'Housing', 'Balance Of Trade'
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function localDateFromIso(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatValue(value: string) {
  return value?.trim() || '—'
}

function impactClass(impact: Impact) {
  return impact.toLowerCase()
}

export default function NewsPage() {
  const today = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(isoDate(today))
  const [to, setTo] = useState(isoDate(today))
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['USD', 'EUR', 'GBP', 'JPY', 'AUD'])
  const [selectedImpacts, setSelectedImpacts] = useState<Impact[]>(['High', 'Medium', 'Low'])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState('')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showBlockSettings, setShowBlockSettings] = useState(false)
  const [blockSettings, setBlockSettings] = useState<BlockSettings>({ enabled: true, impact: 'High', beforeMinutes: 30, afterMinutes: 15 })
  const [now, setNow] = useState(new Date())

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time', [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('tjp-news-block-settings')
    if (stored) {
      try { setBlockSettings(JSON.parse(stored)) } catch {}
    }
  }, [])

  function updateBlockSettings(next: BlockSettings) {
    setBlockSettings(next)
    localStorage.setItem('tjp-news-block-settings', JSON.stringify(next))
  }

  async function loadEvents() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/economic-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store' })
      const data = await response.json()
      setEvents(Array.isArray(data.events) ? data.events : [])
      setSource(data.source || '')
      setError(data.error || '')
    } catch (err) {
      setEvents([])
      setError(err instanceof Error ? err.message : 'Could not load the economic calendar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [from, to])

  const filtered = useMemo(() => events.filter(event => {
    const currencyOk = !event.currency || selectedCurrencies.length === 0 || selectedCurrencies.includes(event.currency)
    const impactOk = selectedImpacts.includes(event.impact)
    const categoryText = `${event.category} ${event.event}`.toLowerCase()
    const categoryOk = selectedCategories.length === 0 || selectedCategories.some(category => categoryText.includes(category.toLowerCase()))
    return currencyOk && impactOk && categoryOk
  }).sort((a, b) => +new Date(a.date) - +new Date(b.date)), [events, selectedCurrencies, selectedImpacts, selectedCategories])

  const grouped = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>()
    filtered.forEach(event => {
      const date = localDateFromIso(event.date)
      const key = date ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : event.date
      const bucket = map.get(key) || []
      bucket.push(event)
      map.set(key, bucket)
    })
    return Array.from(map.entries())
  }, [filtered])

  const nextBlocked = useMemo(() => {
    if (!blockSettings.enabled) return null
    const nowMs = now.getTime()
    const eligible = filtered
      .filter(event => event.impact === blockSettings.impact)
      .map(event => ({ event, time: new Date(event.date).getTime() }))
      .filter(item => Number.isFinite(item.time) && item.time + blockSettings.afterMinutes * 60000 >= nowMs)
      .sort((a, b) => a.time - b.time)[0]
    if (!eligible) return null
    const start = eligible.time - blockSettings.beforeMinutes * 60000
    const end = eligible.time + blockSettings.afterMinutes * 60000
    return { ...eligible, blockedNow: nowMs >= start && nowMs <= end, start, end }
  }, [filtered, blockSettings, now])

  function toggle<T extends string>(value: T, list: T[], setter: (next: T[]) => void) {
    setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value])
  }

  function quickRange(kind: 'today' | 'tomorrow' | 'week' | 'next-week' | 'month') {
    const start = new Date()
    const end = new Date(start)
    if (kind === 'tomorrow') { start.setDate(start.getDate() + 1); end.setTime(start.getTime()) }
    if (kind === 'week') end.setDate(start.getDate() + 6)
    if (kind === 'next-week') { start.setDate(start.getDate() + 7); end.setDate(start.getDate() + 6) }
    if (kind === 'month') end.setMonth(start.getMonth() + 1, 0)
    setFrom(isoDate(start)); setTo(isoDate(end))
  }

  function shiftRange(days: number) {
    const start = new Date(`${from}T12:00:00`)
    const end = new Date(`${to}T12:00:00`)
    start.setDate(start.getDate() + days)
    end.setDate(end.getDate() + days)
    setFrom(isoDate(start)); setTo(isoDate(end))
  }

  return <div className="news-page">
    <header className="news-header">
      <div>
        <span className="eyebrow">Macro risk</span>
        <h1>News</h1>
        <p>Economic calendar, impact filters, and your personal no-trade window.</p>
      </div>
      <div className="news-header-actions">
        <div className="segmented-control">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={16}/> List</button>
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}><CalendarDays size={16}/> Calendar</button>
        </div>
        <button className="button" onClick={() => setShowBlockSettings(true)}><LockKeyhole size={16}/> Block Trading Settings</button>
        <button className="icon-button" onClick={loadEvents} title="Refresh calendar"><RefreshCw size={17} className={loading ? 'spin' : ''}/></button>
      </div>
    </header>

    <div className={`news-risk-strip ${nextBlocked?.blockedNow ? 'blocked' : ''}`}>
      <ShieldAlert size={19}/>
      <div>
        <strong>{nextBlocked?.blockedNow ? 'Trading block is active' : blockSettings.enabled ? 'Trading protection is on' : 'Trading protection is off'}</strong>
        <span>{nextBlocked ? `${nextBlocked.event.currency || nextBlocked.event.country} · ${nextBlocked.event.event} · ${nextBlocked.event.impact} impact` : 'No matching upcoming blocked event in the selected range.'}</span>
      </div>
      {nextBlocked && <small>{new Date(nextBlocked.event.date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>}
    </div>

    <div className="news-layout">
      <aside className="news-filters card">
        <div className="news-filter-title"><Filter size={17}/><strong>Filters</strong></div>
        <div className="news-date-range">
          <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label>
          <label>To<input type="date" value={to} onChange={e => setTo(e.target.value)}/></label>
        </div>
        <div className="news-quick-links">
          <button onClick={() => quickRange('today')}>Today</button><button onClick={() => quickRange('tomorrow')}>Tomorrow</button><button onClick={() => quickRange('week')}>This week</button><button onClick={() => quickRange('next-week')}>Next week</button><button onClick={() => quickRange('month')}>This month</button>
        </div>

        <section className="news-filter-section">
          <div className="news-filter-section-head"><strong>Currencies</strong><button onClick={() => setSelectedCurrencies(selectedCurrencies.length === currencies.length ? [] : [...currencies])}>Select all</button></div>
          <div className="news-checkbox-grid">{currencies.map(currency => <label key={currency}><input type="checkbox" checked={selectedCurrencies.includes(currency)} onChange={() => toggle(currency, selectedCurrencies, setSelectedCurrencies)}/><span>{currency}</span></label>)}</div>
        </section>

        <section className="news-filter-section">
          <div className="news-filter-section-head"><strong>Impact</strong></div>
          <div className="news-impact-list">{impacts.map(impact => <label key={impact}><input type="checkbox" checked={selectedImpacts.includes(impact)} onChange={() => toggle(impact, selectedImpacts, setSelectedImpacts)}/><i className={`impact-dot ${impactClass(impact)}`}/><span>{impact}</span></label>)}</div>
        </section>

        <section className="news-filter-section">
          <div className="news-filter-section-head"><strong>Categories</strong><button onClick={() => setSelectedCategories([])}>Clear</button></div>
          <div className="news-category-list">{categories.map(category => <label key={category}><input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggle(category, selectedCategories, setSelectedCategories)}/><span>{category}</span></label>)}</div>
        </section>
      </aside>

      <main className="news-main card">
        <div className="news-main-toolbar">
          <div className="news-day-nav"><button className="icon-button" onClick={() => shiftRange(-1)}><ChevronLeft size={17}/></button><button className="icon-button" onClick={() => shiftRange(1)}><ChevronRight size={17}/></button><div><strong>{from === to ? new Date(`${from}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : `${from} → ${to}`}</strong><span>{filtered.length} events</span></div></div>
          <div className="news-local-clock"><Clock3 size={17}/><div><strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><span>{timezone}</span></div></div>
        </div>

        {error && <div className="news-feed-warning"><BellRing size={17}/><div><strong>Live calendar feed unavailable</strong><span>{error} Add TRADING_ECONOMICS_KEY in Vercel for a full production feed.</span></div></div>}

        {view === 'list' ? <div className="news-list">
          <div className="news-list-head"><span>Time</span><span>Currency</span><span>Impact</span><span>Event</span><span>Actual</span><span>Forecast</span><span>Previous</span></div>
          {loading ? <div className="news-empty">Loading economic events…</div> : grouped.length ? grouped.map(([day, dayEvents]) => <section key={day} className="news-day-group">
            <h3>{day}</h3>
            {dayEvents.map(event => {
              const date = localDateFromIso(event.date)
              return <div key={event.id} className="news-event-row">
                <span>{date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                <span className="news-currency">{event.currency || event.country || '—'}</span>
                <span><i className={`impact-dot ${impactClass(event.impact)}`}/><b>{event.impact}</b></span>
                <span className="news-event-name"><strong>{event.event}</strong><small>{event.category}</small></span>
                <span>{formatValue(event.actual)}</span><span>{formatValue(event.forecast)}</span><span>{formatValue(event.previous)}</span>
              </div>
            })}
          </section>) : <div className="news-empty"><CalendarDays size={32}/><strong>No matching events</strong><span>Try widening the date range or changing your filters.</span></div>}
        </div> : <div className="news-calendar-view">
          {grouped.length ? grouped.map(([day, dayEvents]) => <section key={day} className="news-calendar-day"><h3>{day}</h3><div>{dayEvents.map(event => <article key={event.id}><span><i className={`impact-dot ${impactClass(event.impact)}`}/>{event.currency || event.country}</span><strong>{event.event}</strong><small>{new Date(event.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {event.impact}</small></article>)}</div></section>) : <div className="news-empty">No matching events.</div>}
        </div>}

        <footer className="news-source">Calendar source: {source || 'Trading Economics'} · Times shown in your device timezone.</footer>
      </main>
    </div>

    {showBlockSettings && <div className="modal-backdrop" onClick={() => setShowBlockSettings(false)}>
      <section className="news-settings-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <header><div><Settings2 size={20}/><span><strong>Block Trading Settings</strong><small>Create a personal no-trade window around important news.</small></span></div><button className="icon-button" onClick={() => setShowBlockSettings(false)}><X size={18}/></button></header>
        <label className="news-switch-row"><span><strong>Enable trading block</strong><small>Highlight when you are inside a restricted news window.</small></span><input type="checkbox" checked={blockSettings.enabled} onChange={e => updateBlockSettings({ ...blockSettings, enabled: e.target.checked })}/></label>
        <label>Minimum impact<select value={blockSettings.impact} onChange={e => updateBlockSettings({ ...blockSettings, impact: e.target.value as Impact })}>{impacts.map(i => <option key={i}>{i}</option>)}</select></label>
        <div className="news-settings-grid"><label>Minutes before<input type="number" min="0" max="240" value={blockSettings.beforeMinutes} onChange={e => updateBlockSettings({ ...blockSettings, beforeMinutes: Number(e.target.value) })}/></label><label>Minutes after<input type="number" min="0" max="240" value={blockSettings.afterMinutes} onChange={e => updateBlockSettings({ ...blockSettings, afterMinutes: Number(e.target.value) })}/></label></div>
        <div className="news-settings-example">Example: with 30 minutes before and 15 minutes after, an 8:30 AM release blocks trading from 8:00–8:45 AM.</div>
        <button className="button primary" onClick={() => setShowBlockSettings(false)}>Save settings</button>
      </section>
    </div>}
  </div>
}
