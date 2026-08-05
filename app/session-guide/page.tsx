'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, Flame, Gem, MoonStar, ShieldAlert, Sparkles, SunMedium } from 'lucide-react'

type Window = { label: string; start: number; end: number; best?: boolean }
type Market = {
  symbol: string
  name: string
  bestSession: string
  windows: Window[]
  reasons: string[]
  avoid?: string[]
  accent: string
}

const markets: Market[] = [
  {
    symbol: 'XAUUSD',
    name: 'Gold',
    bestSession: 'London + New York overlap',
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
    symbol: 'EURUSD',
    name: 'Euro / U.S. Dollar',
    bestSession: 'London',
    windows: [
      { label: 'London window', start: 60, end: 300 },
      { label: 'Best', start: 120, end: 300, best: true },
      { label: 'Second best', start: 360, end: 600 },
    ],
    reasons: ['Most volume arrives during London hours', 'Spreads are often lowest', 'Trends can be cleaner'],
    accent: 'euro',
  },
  {
    symbol: 'GBPUSD',
    name: 'British Pound / U.S. Dollar',
    bestSession: 'London',
    windows: [
      { label: 'London window', start: 60, end: 300 },
      { label: 'Best', start: 120, end: 300, best: true },
      { label: 'Second best', start: 360, end: 600 },
    ],
    reasons: ['Strong London-session participation', 'Often moves more than EURUSD', 'Extra momentum around UK economic releases'],
    accent: 'pound',
  },
]

function localParts(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone ? { timeZone } : {}),
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  return {
    minutes: (() => {
      let hour = Number(get('hour')) % 12
      if (get('dayPeriod') === 'PM') hour += 12
      return hour * 60 + Number(get('minute'))
    })(),
    time: `${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod')}`,
    zone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local device time',
    date: `${get('weekday')}, ${get('month')} ${get('day')}, ${get('year')}`,
  }
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export default function SessionGuidePage() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const mt = useMemo(() => localParts(now), [now])

  return <>
    <div className="session-guide-hero">
      <div>
        <div className="eyebrow">Focused market plan · your local time</div>
        <h1 className="page-title">Trading Session Guide</h1>
        <p className="muted">Your app is now focused on XAUUSD, EURUSD, and GBPUSD only. Use these windows as planning context, not as guaranteed signals.</p>
      </div>
      <div className="mt-clock card">
        <Clock3 size={22}/>
        <div><span>Your local time</span><strong>{mt.time}</strong><small>{mt.date} · {mt.zone}</small></div>
      </div>
    </div>

    <div className="session-market-grid">
      {markets.map(m => {
        const active = m.windows.filter(w => mt.minutes >= w.start && mt.minutes < w.end)
        const bestActive = active.some(w => w.best)
        return <article className={`card session-market-card ${m.accent}`} key={m.symbol}>
          <div className="session-market-head">
            <div className="symbol-mark">{m.symbol === 'XAUUSD' ? <Gem/> : m.symbol === 'EURUSD' ? <Sparkles/> : <Flame/>}</div>
            <div><span>{m.symbol}</span><h2>{m.name}</h2></div>
            <div className={`session-status ${bestActive ? 'best' : active.length ? 'active' : ''}`}>
              {bestActive ? 'BEST WINDOW LIVE' : active.length ? 'SESSION ACTIVE' : 'WAITING'}
            </div>
          </div>

          <div className="best-session"><SunMedium size={18}/><span>Best session</span><strong>{m.bestSession}</strong></div>

          <div className="time-window-list">
            {m.windows.map(w => <div className={w.best ? 'best-window' : ''} key={w.label}>
              <span>{w.best && <Flame size={14}/>} {w.label}</span>
              <strong>{formatMinutes(w.start)} – {formatMinutes(w.end)}</strong>
              {mt.minutes >= w.start && mt.minutes < w.end && <b>LIVE</b>}
            </div>)}
          </div>

          <div className="session-reasons">
            <h3>Why this window?</h3>
            <ul>{m.reasons.map(x => <li key={x}>{x}</li>)}</ul>
          </div>

          {m.avoid && <div className="avoid-box"><ShieldAlert size={18}/><div><strong>Avoid when possible</strong>{m.avoid.map(x => <span key={x}>{x}</span>)}</div></div>}
        </article>
      })}
    </div>

    <section className="card session-reminder">
      <MoonStar size={24}/>
      <div><h2>Work-schedule reminder</h2><p>Your 7:00 AM–3:00 PM shift overlaps much of the New York window. Use early mornings, days off, backtesting, and alerts rather than forcing a live trade while working.</p></div>
    </section>
  </>
}
