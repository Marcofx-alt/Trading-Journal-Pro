'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/lib/types'
import { money } from '@/lib/utils'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { ChevronLeft, ChevronRight, CircleHelp, Settings2, X } from 'lucide-react'

type Tab = 'calendar' | 'trades' | 'charts'
type DisplayMode = 'money' | 'r'

type DayBucket = {
  date: string
  trades: Trade[]
  pnl: number
  r: number
}

const isoDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const formatSignedMoney = (n: number) => `${n > 0 ? '+' : ''}${money(n)}`
const formatR = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}R`

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return <article className="pnl-metric-card">
    <div className="pnl-metric-label"><span>{label}</span><CircleHelp size={14} /></div>
    <strong className={tone ? `pnl-${tone}` : ''}>{value}</strong>
  </article>
}

export default function PnLCalendarPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('calendar')
  const [display, setDisplay] = useState<DisplayMode>('money')
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [startingEquity, setStartingEquity] = useState(10000)

  useEffect(() => {
    const saved = window.localStorage.getItem('tjp-starting-equity')
    if (saved && Number.isFinite(Number(saved))) setStartingEquity(Number(saved))
    supabase.from('trades').select('*').order('trade_date', { ascending: true }).order('entry_time', { ascending: true })
      .then(({ data }) => {
        setTrades((data || []) as Trade[])
        setLoading(false)
      })
  }, [])

  const closed = useMemo(() => trades.filter(t => t.result !== 'Open'), [trades])
  const allTime = useMemo(() => {
    const wins = closed.filter(t => t.result === 'Win')
    const losses = closed.filter(t => t.result === 'Loss')
    const grossProfit = closed.reduce((s, t) => s + Math.max(Number(t.profit_loss) || 0, 0), 0)
    const grossLoss = Math.abs(closed.reduce((s, t) => s + Math.min(Number(t.profit_loss) || 0, 0), 0))
    const net = grossProfit - grossLoss
    const bestProfit = Math.max(0, ...closed.map(t => Number(t.profit_loss) || 0))
    const biggestLoss = Math.abs(Math.min(0, ...closed.map(t => Number(t.profit_loss) || 0)))
    const expectancy = closed.length ? net / closed.length : 0
    const avgTradeSize = closed.length ? closed.reduce((s, t) => s + Math.abs(Number(t.profit_loss) || 0), 0) / closed.length : 0
    const winLossBase = wins.length + losses.length
    const winRate = winLossBase ? wins.length / winLossBase * 100 : 0
    const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0

    let equity = startingEquity
    let high = startingEquity
    closed.forEach(t => {
      equity += Number(t.profit_loss) || 0
      high = Math.max(high, equity)
    })
    return { wins, losses, grossProfit, grossLoss, net, bestProfit, biggestLoss, expectancy, avgTradeSize, winRate, profitFactor, equity, high }
  }, [closed, startingEquity])

  const currentMonthKey = monthKey(month)
  const monthTrades = useMemo(() => closed.filter(t => t.trade_date.startsWith(currentMonthKey)), [closed, currentMonthKey])

  const byDay = useMemo(() => {
    const map = new Map<string, DayBucket>()
    monthTrades.forEach(t => {
      const bucket = map.get(t.trade_date) || { date: t.trade_date, trades: [], pnl: 0, r: 0 }
      bucket.trades.push(t)
      bucket.pnl += Number(t.profit_loss) || 0
      bucket.r += Number(t.r_multiple) || 0
      map.set(t.trade_date, bucket)
    })
    return map
  }, [monthTrades])

  const monthStats = useMemo(() => {
    const days = [...byDay.values()]
    const profitable = days.filter(d => d.pnl > 0).length
    const losing = days.filter(d => d.pnl < 0).length
    const breakeven = days.filter(d => d.pnl === 0).length
    const pnl = days.reduce((s, d) => s + d.pnl, 0)
    const totalR = days.reduce((s, d) => s + d.r, 0)
    const bestDay = days.length ? Math.max(...days.map(d => d.pnl)) : 0
    const worstDay = days.length ? Math.min(...days.map(d => d.pnl)) : 0
    const avgDaily = days.length ? pnl / days.length : 0
    return { tradingDays: days.length, profitable, losing, breakeven, pnl, totalR, bestDay, worstDay, avgDaily }
  }, [byDay])

  const calendarCells = useMemo(() => {
    const year = month.getFullYear()
    const mo = month.getMonth()
    const first = new Date(year, mo, 1)
    const last = new Date(year, mo + 1, 0)
    const start = new Date(year, mo, 1 - first.getDay())
    const end = new Date(year, mo, last.getDate() + (6 - last.getDay()))
    const cells: Date[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      cells.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    while (cells.length < 42) {
      const next = new Date(cells[cells.length - 1])
      next.setDate(next.getDate() + 1)
      cells.push(next)
    }
    return cells.slice(0, 42)
  }, [month])

  const selected = selectedDate ? byDay.get(selectedDate) || null : null
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const dailyChart = useMemo(() => [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)).map(x => ({ date: x.date.slice(8), pnl: x.pnl, r: x.r })), [byDay])
  const cumulativeChart = useMemo(() => {
    let pnl = 0
    let r = 0
    return dailyChart.map(x => {
      pnl += x.pnl
      r += x.r
      return { date: x.date, pnl, r }
    })
  }, [dailyChart])

  const goMonth = (delta: number) => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  const goToday = () => setMonth(new Date())
  const todayKey = isoDate(new Date())

  const saveStartingEquity = (value: number) => {
    setStartingEquity(value)
    window.localStorage.setItem('tjp-starting-equity', String(value))
  }

  if (loading) return <div className="card">Loading P&amp;L calendar…</div>

  return <div className="pnl-page">
    <div className="pnl-tabs" role="tablist">
      <button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}>Daily PnL</button>
      <button className={tab === 'trades' ? 'active' : ''} onClick={() => setTab('trades')}>Closed trades</button>
      <button className={tab === 'charts' ? 'active' : ''} onClick={() => setTab('charts')}>Charts</button>
    </div>

    {tab === 'calendar' && <>
      <section className="pnl-calendar-shell">
        <div className="pnl-calendar-toolbar">
          <button className="pnl-today" onClick={goToday}>Today</button>
          <div className="pnl-month-nav">
            <button onClick={() => goMonth(-1)} aria-label="Previous month"><ChevronLeft size={20} /></button>
            <strong>{monthLabel}</strong>
            <button onClick={() => goMonth(1)} aria-label="Next month"><ChevronRight size={20} /></button>
          </div>
          <div className="pnl-mode-toggle">
            <button className={display === 'money' ? 'active' : ''} onClick={() => setDisplay('money')}>$ PnL</button>
            <button className={display === 'r' ? 'active' : ''} onClick={() => setDisplay('r')}>R Multiple</button>
          </div>
          <div className="pnl-month-summary">
            <span>Monthly stats:</span>
            <b className={monthStats.pnl >= 0 ? 'pnl-good' : 'pnl-bad'}>{display === 'money' ? formatSignedMoney(monthStats.pnl) : formatR(monthStats.totalR)}</b>
            <em>Trading days: {monthStats.tradingDays}</em>
            <button onClick={() => setSettingsOpen(true)} aria-label="Calendar settings"><Settings2 size={18} /></button>
          </div>
        </div>

        <div className="pnl-weekdays">{['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <div key={d}>{d}</div>)}</div>
        <div className="pnl-calendar-grid">
          {calendarCells.map((date, idx) => {
            const key = isoDate(date)
            const bucket = byDay.get(key)
            const inMonth = date.getMonth() === month.getMonth()
            const active = selectedDate === key
            const positive = bucket && bucket.pnl > 0
            const negative = bucket && bucket.pnl < 0
            return <button
              key={`${key}-${idx}`}
              className={`pnl-day ${!inMonth ? 'outside' : ''} ${active ? 'selected' : ''}`}
              onClick={() => inMonth && setSelectedDate(key)}
              disabled={!inMonth}
            >
              <span className={key === todayKey ? 'today-dot' : ''}>{date.getDate()}</span>
              {bucket && <div className={`pnl-day-data ${positive ? 'positive' : negative ? 'negative' : 'flat'}`}>
                <strong>{display === 'money' ? formatSignedMoney(bucket.pnl) : formatR(bucket.r)}</strong>
                <small>{bucket.trades.length} {bucket.trades.length === 1 ? 'trade' : 'trades'}</small>
                <small>{display === 'money' ? formatR(bucket.r) : formatSignedMoney(bucket.pnl)}</small>
              </div>}
            </button>
          })}
        </div>

        <div className="pnl-calendar-footer">
          <div className="pnl-legend"><span><i className="green"/>Profitable day</span><span><i className="red"/>Losing day</span><span><i className="gray"/>No trades</span></div>
          <div>Total: <b>{monthStats.tradingDays}</b> trading days <span/> Profitable: <b className="pnl-good">{monthStats.profitable}</b> <span/> Losing: <b className="pnl-bad">{monthStats.losing}</b> <span/> Breakeven: <b>{monthStats.breakeven}</b></div>
        </div>
      </section>

      {selected && <section className="pnl-selected-day card">
        <div className="pnl-selected-head">
          <div><span>Selected day</span><h2>{new Date(`${selected.date}T00:00:00`).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</h2></div>
          <div><strong className={selected.pnl >= 0 ? 'pnl-good' : 'pnl-bad'}>{formatSignedMoney(selected.pnl)}</strong><small>{formatR(selected.r)}</small></div>
        </div>
        <div className="pnl-selected-list">
          {selected.trades.map(t => <article key={t.id}>
            <b>{t.pair}</b><span>{t.direction}</span><span>{t.result}</span><span className={(Number(t.profit_loss)||0) >= 0 ? 'pnl-good' : 'pnl-bad'}>{formatSignedMoney(Number(t.profit_loss)||0)}</span><span>{formatR(Number(t.r_multiple)||0)}</span><small>{t.trading_period || 'Session not recorded'}</small>
          </article>)}
        </div>
      </section>}

      <section className="pnl-summary-grid">
        <article className="pnl-equity-card">
          <div className="pnl-card-title"><span>PnL From All Time<br/>HWM Equity</span><CircleHelp size={15}/></div>
          <strong>{money(allTime.equity)}</strong>
          <div className="pnl-equity-track"><i style={{ width: `${Math.min(100, Math.max(4, startingEquity ? allTime.equity / Math.max(allTime.high, startingEquity) * 100 : 0))}%` }}/></div>
          <footer><span>Current Equity <b>{money(allTime.equity)}</b></span><span>HWM <b>{money(allTime.high)}</b></span></footer>
        </article>

        <article className="pnl-winrate-card">
          <div className="pnl-card-title"><span>Win / Loss Rate</span><CircleHelp size={15}/></div>
          <div className="pnl-gauge"><div className="pnl-gauge-fill" style={{ '--win-rate': `${Math.max(0, Math.min(100, allTime.winRate)) * 1.8}deg` } as React.CSSProperties}></div><strong>{allTime.winRate.toFixed(0)}%</strong></div>
          <span className="pnl-good-pill">{allTime.winRate >= 50 ? 'Good!' : 'Keep building'}</span>
        </article>

        <div className="pnl-metric-stack">
          <MetricCard label="Net Profit" value={money(allTime.net)} tone={allTime.net >= 0 ? 'good' : 'bad'} />
          <MetricCard label="Profit Factor" value={allTime.profitFactor === Infinity ? '∞' : allTime.profitFactor.toFixed(2)} />
          <MetricCard label="Expectancy" value={money(allTime.expectancy)} tone={allTime.expectancy >= 0 ? 'good' : 'bad'} />
        </div>
        <div className="pnl-metric-stack">
          <MetricCard label="Gross Profit" value={money(allTime.grossProfit)} tone="good" />
          <MetricCard label="Best Profit" value={money(allTime.bestProfit)} tone="good" />
          <MetricCard label="Avg. Trade Size" value={money(allTime.avgTradeSize)} />
        </div>
        <div className="pnl-metric-stack">
          <MetricCard label="Gross Loss" value={money(allTime.grossLoss)} tone="bad" />
          <MetricCard label="Biggest Loss" value={money(allTime.biggestLoss)} tone="bad" />
          <MetricCard label="Monthly Avg / Day" value={money(monthStats.avgDaily)} tone={monthStats.avgDaily >= 0 ? 'good' : 'bad'} />
        </div>
      </section>
    </>}

    {tab === 'trades' && <section className="pnl-tab-panel card">
      <div className="pnl-panel-head"><div><span>Closed trades</span><h2>{monthLabel}</h2></div><strong>{monthTrades.length} trades</strong></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Pair</th><th>Direction</th><th>Result</th><th>P/L</th><th>R</th><th>Session</th></tr></thead><tbody>
        {monthTrades.map(t => <tr key={t.id}><td>{t.trade_date}</td><td>{t.pair}</td><td>{t.direction}</td><td>{t.result}</td><td className={(Number(t.profit_loss)||0) >= 0 ? 'pnl-good' : 'pnl-bad'}>{formatSignedMoney(Number(t.profit_loss)||0)}</td><td>{formatR(Number(t.r_multiple)||0)}</td><td>{t.trading_period || '—'}</td></tr>)}
        {!monthTrades.length && <tr><td colSpan={7} className="empty">No closed trades for this month.</td></tr>}
      </tbody></table></div>
    </section>}

    {tab === 'charts' && <section className="pnl-charts-grid">
      <article className="card pnl-chart-card"><h2>Cumulative P&amp;L</h2><ResponsiveContainer width="100%" height={300}><AreaChart data={cumulativeChart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={(v) => money(Number(v))}/><Area type="monotone" dataKey="pnl" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={.18}/></AreaChart></ResponsiveContainer></article>
      <article className="card pnl-chart-card"><h2>Daily P&amp;L</h2><ResponsiveContainer width="100%" height={300}><BarChart data={dailyChart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={(v) => money(Number(v))}/><Bar dataKey="pnl" fill="var(--chart-primary)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></article>
      <article className="card pnl-chart-card"><h2>Cumulative R</h2><ResponsiveContainer width="100%" height={300}><LineChart data={cumulativeChart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={(v) => `${Number(v).toFixed(2)}R`}/><Line type="monotone" dataKey="r" stroke="var(--good)" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></article>
      <article className="card pnl-chart-card"><h2>Month summary</h2><div className="pnl-mini-stats"><div><span>Best day</span><strong className="pnl-good">{formatSignedMoney(monthStats.bestDay)}</strong></div><div><span>Worst day</span><strong className="pnl-bad">{formatSignedMoney(monthStats.worstDay)}</strong></div><div><span>Total R</span><strong>{formatR(monthStats.totalR)}</strong></div><div><span>Avg / day</span><strong>{formatSignedMoney(monthStats.avgDaily)}</strong></div></div></article>
    </section>}

    {settingsOpen && <div className="pnl-modal-backdrop" onClick={() => setSettingsOpen(false)}><section className="pnl-settings-modal" onClick={e => e.stopPropagation()}>
      <div className="pnl-settings-head"><div><span>P&amp;L Calendar settings</span><h2>Account baseline</h2></div><button onClick={() => setSettingsOpen(false)}><X size={20}/></button></div>
      <label>Starting equity<input type="number" value={startingEquity} min="0" step="100" onChange={e => saveStartingEquity(Number(e.target.value) || 0)} /></label>
      <p>This value is stored only in this browser and is used to calculate the equity and high-water-mark cards. Trade P&amp;L still comes directly from your journal.</p>
      <button className="button" onClick={() => setSettingsOpen(false)}>Save</button>
    </section></div>}
  </div>
}
