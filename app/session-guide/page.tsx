'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, Flame, Gem, Globe2, MoonStar, ShieldAlert, Sparkles, SunMedium } from 'lucide-react'

type Window = { label: string; start: number; end: number; best?: boolean }
type Market = {
  symbol: string
  name: string
  bestSession: string
  windows: Window[]
  reasons: string[]
  avoid?: string[]
  accent: string
  icon: 'gold' | 'euro' | 'pound' | 'yen' | 'aussie'
}

const morningMarkets: Market[] = [
  {
    symbol: 'XAUUSD', name: 'Gold', bestSession: 'London + New York overlap', icon: 'gold',
    windows: [
      { label: 'London Open', start: 60, end: 300 },
      { label: 'New York forex window', start: 360, end: 600 },
      { label: 'Best of all', start: 390, end: 600, best: true },
    ],
    reasons: ['Highest liquidity', 'Strong trends', 'Tighter spreads', 'Momentum around major economic news'],
    avoid: ['Late New York afternoon', 'Quiet Asian session unless major news is active'],
    accent: 'gold',
  },
  {
    symbol: 'EURUSD', name: 'Euro / U.S. Dollar', bestSession: 'London', icon: 'euro',
    windows: [
      { label: 'London window', start: 60, end: 300 },
      { label: 'Best', start: 120, end: 300, best: true },
      { label: 'Second best', start: 360, end: 600 },
    ],
    reasons: ['Most volume arrives during London hours', 'Spreads are often lowest', 'Trends can be cleaner'],
    accent: 'euro',
  },
  {
    symbol: 'GBPUSD', name: 'British Pound / U.S. Dollar', bestSession: 'London', icon: 'pound',
    windows: [
      { label: 'London window', start: 60, end: 300 },
      { label: 'Best', start: 120, end: 300, best: true },
      { label: 'Second best', start: 360, end: 600 },
    ],
    reasons: ['Strong London-session participation', 'Often moves more than EURUSD', 'Extra momentum around UK economic releases'],
    accent: 'pound',
  },
]

const asiaMarkets: Market[] = [
  {
    symbol: 'USDJPY', name: 'U.S. Dollar / Japanese Yen', bestSession: 'Tokyo', icon: 'yen',
    windows: [
      { label: 'Sydney opening hours', start: 900, end: 1080 },
      { label: 'Tokyo session', start: 1080, end: 180 },
      { label: 'Best', start: 1080, end: 1380, best: true },
    ],
    reasons: ['Strongest JPY participation', 'Usually better Asia-session liquidity', 'Useful for range sweeps and Tokyo breakouts'],
    avoid: ['Do not assume every Tokyo session will trend', 'Check spreads and major Japanese or U.S. news'],
    accent: 'yen',
  },
  {
    symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', bestSession: 'Sydney + Tokyo overlap', icon: 'aussie',
    windows: [
      { label: 'Sydney session', start: 900, end: 0 },
      { label: 'Tokyo session', start: 1080, end: 180 },
      { label: 'Best overlap', start: 1080, end: 0, best: true },
    ],
    reasons: ['Both currencies are active in Asia', 'Often more movement than EURUSD in the evening', 'Responsive to Australian, Japanese and China-related news'],
    accent: 'aussie',
  },
  {
    symbol: 'AUDUSD', name: 'Australian Dollar / U.S. Dollar', bestSession: 'Sydney', icon: 'aussie',
    windows: [
      { label: 'Sydney session', start: 900, end: 0 },
      { label: 'Sydney–Tokyo overlap', start: 1080, end: 0 },
      { label: 'Best', start: 1080, end: 1320, best: true },
    ],
    reasons: ['Australian liquidity is active', 'Often calmer than AUDJPY', 'Useful for measured range and liquidity setups'],
    accent: 'aussie',
  },
]

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  let hour = Number(get('hour')) % 12
  if (get('dayPeriod') === 'PM') hour += 12
  return {
    minutes: hour * 60 + Number(get('minute')),
    time: `${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod')}`,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local device time',
    date: `${get('weekday')}, ${get('month')} ${get('day')}, ${get('year')}`,
  }
}

function isActive(minutes: number, window: Window) {
  if (window.start === window.end) return false
  return window.end > window.start
    ? minutes >= window.start && minutes < window.end
    : minutes >= window.start || minutes < window.end
}

function minutesUntil(minutes: number, start: number) {
  return (start - minutes + 1440) % 1440
}

function nextStart(markets: Market[], minutes: number) {
  const starts = markets.flatMap(m => m.windows.map(w => w.start))
  return Math.min(...starts.map(start => minutesUntil(minutes, start)).filter(x => x > 0))
}

function formatCountdown(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return `${h}h ${m}m`
}

function formatMinutes(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

function MarketIcon({ type }: { type: Market['icon'] }) {
  if (type === 'gold') return <Gem />
  if (type === 'euro') return <Sparkles />
  if (type === 'pound') return <Flame />
  if (type === 'yen') return <MoonStar />
  return <Globe2 />
}

function MarketCard({ market, minutes }: { market: Market; minutes: number }) {
  const active = market.windows.filter(w => isActive(minutes, w))
  const bestActive = active.some(w => w.best)
  const next = nextStart([market], minutes)
  const openingSoon = !active.length && next <= 60
  const status = bestActive ? 'BEST WINDOW LIVE' : active.length ? 'SESSION ACTIVE' : openingSoon ? `STARTS IN ${formatCountdown(next)}` : 'CLOSED'

  return <article className={`card session-market-card ${market.accent}`}>
    <div className="session-market-head">
      <div className="symbol-mark"><MarketIcon type={market.icon}/></div>
      <div><span>{market.symbol}</span><h2>{market.name}</h2></div>
      <div className={`session-status ${bestActive ? 'best' : active.length ? 'active' : openingSoon ? 'soon' : 'closed'}`}>{status}</div>
    </div>

    <div className="best-session"><SunMedium size={18}/><span>Best session</span><strong>{market.bestSession}</strong></div>

    <div className="time-window-list">
      {market.windows.map(w => <div className={w.best ? 'best-window' : ''} key={w.label}>
        <span>{w.best && <Flame size={14}/>} {w.label}</span>
        <strong>{formatMinutes(w.start)} – {formatMinutes(w.end)}</strong>
        {isActive(minutes, w) && <b>LIVE</b>}
      </div>)}
    </div>

    <div className="session-reasons">
      <h3>Why this window?</h3>
      <ul>{market.reasons.map(x => <li key={x}>{x}</li>)}</ul>
    </div>

    {market.avoid && <div className="avoid-box"><ShieldAlert size={18}/><div><strong>Remember</strong>{market.avoid.map(x => <span key={x}>{x}</span>)}</div></div>}
  </article>
}

export default function SessionGuidePage() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const local = useMemo(() => localParts(now), [now])
  const asiaLive = asiaMarkets.some(m => m.windows.some(w => isActive(local.minutes, w)))

  return <>
    <div className="session-guide-hero">
      <div>
        <div className="eyebrow">24-hour market plan · your local time</div>
        <h1 className="page-title">Trading Session Guide</h1>
        <p className="muted">Morning focus: XAUUSD, EURUSD and GBPUSD. After-work Asia focus: USDJPY, AUDJPY and AUDUSD. Session windows are planning context, not guaranteed signals.</p>
      </div>
      <div className="mt-clock card">
        <Clock3 size={22}/>
        <div><span>Your local time</span><strong>{local.time}</strong><small>{local.date} · {local.zone}</small></div>
      </div>
    </div>

    <section className="session-section-head">
      <div><SunMedium/><span><small>Morning plan</small><strong>London & New York</strong></span></div>
      <p>Higher-liquidity windows for gold, EURUSD and GBPUSD.</p>
    </section>
    <div className="session-market-grid">
      {morningMarkets.map(m => <MarketCard market={m} minutes={local.minutes} key={m.symbol}/>) }
    </div>

    <section className="session-section-head asia-head">
      <div><MoonStar/><span><small>After-work plan</small><strong>Asia Session</strong></span></div>
      <div className={`session-section-live ${asiaLive ? 'live' : ''}`}>{asiaLive ? 'ASIA ACTIVE NOW' : `NEXT ASIA WINDOW IN ${formatCountdown(nextStart(asiaMarkets, local.minutes))}`}</div>
    </section>
    <div className="session-market-grid">
      {asiaMarkets.map(m => <MarketCard market={m} minutes={local.minutes} key={m.symbol}/>) }
    </div>

    <section className="card session-reminder">
      <MoonStar size={24}/>
      <div><h2>Work-schedule plan</h2><p>Your 7:00 AM–3:00 PM shift overlaps much of New York. Use Asia after work for selective setups, but backtest each pair and check spreads before risking real money.</p></div>
    </section>
  </>
}
