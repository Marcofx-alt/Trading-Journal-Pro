'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Strategy, Trade, TradeReview } from '@/lib/types'
import StatCard from '@/components/StatCard'
import { money } from '@/lib/utils'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter,
  ScatterChart, Tooltip, XAxis, YAxis
} from 'recharts'
import { BarChart3, CalendarDays, Clock3, ShieldAlert, Trophy } from 'lucide-react'

type RangeKey = '30D' | '90D' | '1Y' | 'ALL'

type PairRow = { pair: string; trades: number; wins: number; winRate: number; net: number; avgR: number; profitFactor: number }

const startForRange = (range: RangeKey) => {
  if (range === 'ALL') return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (range === '30D') d.setDate(d.getDate() - 29)
  if (range === '90D') d.setDate(d.getDate() - 89)
  if (range === '1Y') d.setFullYear(d.getFullYear() - 1)
  return d
}

const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [reviews, setReviews] = useState<TradeReview[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [range, setRange] = useState<RangeKey>('ALL')
  const [pairFilter, setPairFilter] = useState('All pairs')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('trades').select('*').order('trade_date', { ascending: true }).order('entry_time', { ascending: true }),
      supabase.from('trade_reviews').select('*'),
      supabase.from('strategies').select('*')
    ]).then(([tradeRes, reviewRes, strategyRes]) => {
      setTrades((tradeRes.data || []) as Trade[])
      setReviews((reviewRes.data || []) as TradeReview[])
      setStrategies((strategyRes.data || []) as Strategy[])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const start = startForRange(range)
    return trades.filter(t => {
      if (t.result === 'Open') return false
      if (pairFilter !== 'All pairs' && t.pair !== pairFilter) return false
      if (start && new Date(`${t.trade_date}T00:00:00`) < start) return false
      return true
    })
  }, [trades, range, pairFilter])

  const metrics = useMemo(() => {
    const wins = filtered.filter(t => t.result === 'Win')
    const losses = filtered.filter(t => t.result === 'Loss')
    const grossProfit = filtered.reduce((s, t) => s + Math.max(Number(t.profit_loss) || 0, 0), 0)
    const grossLoss = Math.abs(filtered.reduce((s, t) => s + Math.min(Number(t.profit_loss) || 0, 0), 0))
    const net = grossProfit - grossLoss
    const avgWin = wins.length ? grossProfit / wins.length : 0
    const avgLoss = losses.length ? grossLoss / losses.length : 0
    const expectancy = filtered.length ? net / filtered.length : 0
    const avgR = filtered.length ? filtered.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0) / filtered.length : 0
    const largestWin = Math.max(0, ...filtered.map(t => Number(t.profit_loss) || 0))
    const largestLoss = Math.abs(Math.min(0, ...filtered.map(t => Number(t.profit_loss) || 0)))
    return { wins, losses, grossProfit, grossLoss, net, avgWin, avgLoss, expectancy, avgR, largestWin, largestLoss, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0 }
  }, [filtered])

  const equity = useMemo(() => {
    let value = 0
    let peak = 0
    let maxDrawdown = 0
    let currentDrawdown = 0
    let longest = 0
    let activeLength = 0
    return {
      data: filtered.map((t, index) => {
        value += Number(t.profit_loss) || 0
        peak = Math.max(peak, value)
        currentDrawdown = value - peak
        maxDrawdown = Math.min(maxDrawdown, currentDrawdown)
        activeLength = currentDrawdown < 0 ? activeLength + 1 : 0
        longest = Math.max(longest, activeLength)
        return { index: index + 1, date: t.trade_date, equity: value, drawdown: currentDrawdown }
      }),
      maxDrawdown: Math.abs(maxDrawdown),
      currentDrawdown: Math.abs(currentDrawdown),
      longest
    }
  }, [filtered])

  const pairRows = useMemo<PairRow[]>(() => {
    const map: Record<string, Trade[]> = {}
    filtered.forEach(t => (map[t.pair] ||= []).push(t))
    return Object.entries(map).map(([pair, rows]) => {
      const grossProfit = rows.reduce((s, t) => s + Math.max(Number(t.profit_loss) || 0, 0), 0)
      const grossLoss = Math.abs(rows.reduce((s, t) => s + Math.min(Number(t.profit_loss) || 0, 0), 0))
      const wins = rows.filter(t => t.result === 'Win').length
      return {
        pair, trades: rows.length, wins, winRate: rows.length ? wins / rows.length * 100 : 0,
        net: grossProfit - grossLoss,
        avgR: rows.length ? rows.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0) / rows.length : 0,
        profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? 99 : 0
      }
    }).sort((a, b) => b.net - a.net)
  }, [filtered])

  const periodData = useMemo(() => {
    const map: Record<string, { period: string; net: number; trades: number; wins: number }> = {}
    filtered.forEach(t => {
      const key = t.trading_period || 'Not recorded'
      map[key] ||= { period: key, net: 0, trades: 0, wins: 0 }
      map[key].net += Number(t.profit_loss) || 0
      map[key].trades++
      if (t.result === 'Win') map[key].wins++
    })
    return Object.values(map).map(x => ({ ...x, winRate: x.trades ? x.wins / x.trades * 100 : 0 })).sort((a, b) => b.net - a.net)
  }, [filtered])

  const weekdayData = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const map = days.map(day => ({ day, net: 0, trades: 0, wins: 0 }))
    filtered.forEach(t => {
      const row = map[new Date(`${t.trade_date}T00:00:00`).getDay()]
      row.net += Number(t.profit_loss) || 0
      row.trades++
      if (t.result === 'Win') row.wins++
    })
    return map.filter(x => x.trades).map(x => ({ ...x, winRate: x.wins / x.trades * 100 }))
  }, [filtered])

  const monthly = useMemo(() => {
    const map: Record<string, { month: string; profit: number; loss: number; net: number }> = {}
    filtered.forEach(t => {
      const key = t.trade_date.slice(0, 7)
      map[key] ||= { month: key, profit: 0, loss: 0, net: 0 }
      const pl = Number(t.profit_loss) || 0
      if (pl >= 0) map[key].profit += pl
      else map[key].loss += Math.abs(pl)
      map[key].net += pl
    })
    return Object.values(map)
  }, [filtered])

  const strategyData = useMemo(() => {
    const names = new Map(strategies.map(s => [s.id, `${s.name} ${s.version}`]))
    const map: Record<string, { strategy: string; trades: number; wins: number; net: number; score: number }> = {}
    filtered.forEach(t => {
      const key = t.strategy_id || 'none'
      map[key] ||= { strategy: names.get(key) || 'No strategy', trades: 0, wins: 0, net: 0, score: 0 }
      map[key].trades++
      if (t.result === 'Win') map[key].wins++
      map[key].net += Number(t.profit_loss) || 0
      map[key].score += Number(t.setup_score) || 0
    })
    return Object.values(map).map(x => ({ ...x, winRate: x.trades ? x.wins / x.trades * 100 : 0, avgScore: x.trades ? x.score / x.trades : 0 }))
  }, [filtered, strategies])

  const reviewTrend = useMemo(() => {
    const allowed = new Set(filtered.map(t => t.id))
    return reviews.filter(r => allowed.has(r.trade_id)).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((r, i) => ({
      review: i + 1,
      strategy: Number(r.strategy_score) || 0,
      psychology: Number(r.psychology_score) || 0,
      discipline: Number(r.discipline_score) || 0
    }))
  }, [filtered, reviews])

  const calendar = useMemo(() => {
    const map: Record<string, { date: string; net: number; count: number }> = {}
    filtered.forEach(t => {
      map[t.trade_date] ||= { date: t.trade_date, net: 0, count: 0 }
      map[t.trade_date].net += Number(t.profit_loss) || 0
      map[t.trade_date].count++
    })
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 42)
  }, [filtered])

  const bestPair = pairRows[0]
  const bestPeriod = periodData[0]
  const bestDay = [...weekdayData].sort((a, b) => b.net - a.net)[0]

  if (loading) return <div className="card">Loading analytics…</div>

  return <>
    <div className="analytics-hero">
      <div>
        <div className="eyebrow">Sprint 6 · Deep performance intelligence</div>
        <h1 className="page-title">Analytics Center</h1>
        <p className="muted">Turn every closed trade into a clearer decision for the next one.</p>
      </div>
      <div className="analytics-filters">
        <select value={pairFilter} onChange={e => setPairFilter(e.target.value)}>
          <option>All pairs</option>
          {[...new Set(trades.map(t => t.pair))].sort().map(pair => <option key={pair}>{pair}</option>)}
        </select>
        <div className="range-tabs">{(['30D', '90D', '1Y', 'ALL'] as RangeKey[]).map(x => <button key={x} onClick={() => setRange(x)} className={range === x ? 'active' : ''}>{x}</button>)}</div>
      </div>
    </div>

    <div className="grid stats analytics-stats">
      <StatCard label="Net profit" value={money(metrics.net)} />
      <StatCard label="Profit factor" value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)} />
      <StatCard label="Expectancy / trade" value={money(metrics.expectancy)} />
      <StatCard label="Average R" value={metrics.avgR.toFixed(2)} />
      <StatCard label="Average win" value={money(metrics.avgWin)} />
      <StatCard label="Average loss" value={money(metrics.avgLoss)} />
      <StatCard label="Largest win" value={money(metrics.largestWin)} />
      <StatCard label="Largest loss" value={money(metrics.largestLoss)} />
      <StatCard label="Max drawdown" value={money(equity.maxDrawdown)} />
      <StatCard label="Current drawdown" value={money(equity.currentDrawdown)} />
      <StatCard label="Longest drawdown" value={`${equity.longest} trades`} />
      <StatCard label="Closed trades" value={filtered.length} />
    </div>

    <div className="analytics-insights">
      <div className="mini-insight"><Trophy /><span>Best pair<strong>{bestPair ? `${bestPair.pair} · ${money(bestPair.net)}` : 'Not enough data'}</strong></span></div>
      <div className="mini-insight"><Clock3 /><span>Best trading period<strong>{bestPeriod ? `${bestPeriod.period} · ${money(bestPeriod.net)}` : 'Not enough data'}</strong></span></div>
      <div className="mini-insight"><CalendarDays /><span>Best weekday<strong>{bestDay ? `${bestDay.day} · ${money(bestDay.net)}` : 'Not enough data'}</strong></span></div>
      <div className="mini-insight"><ShieldAlert /><span>Risk status<strong>{equity.currentDrawdown === 0 ? 'At equity high' : `${money(equity.currentDrawdown)} below peak`}</strong></span></div>
    </div>

    <div className="analytics-grid">
      <section className="card analytics-chart wide"><div className="section-heading"><div><h2>Equity and drawdown</h2><p>Account growth with every closed trade.</p></div><BarChart3 /></div>
        <ResponsiveContainer width="100%" height={340}><ComposedChart data={equity.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={dateLabel} /><YAxis /><Tooltip labelFormatter={dateLabel} formatter={(value) => money(Number(value))} /><Area type="monotone" dataKey="drawdown" fill="var(--danger-soft)" stroke="var(--danger)" /><Line type="monotone" dataKey="equity" stroke="var(--chart-primary)" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer>
      </section>

      <section className="card analytics-chart"><h2>Monthly P/L</h2><p>Gross gains, losses, and net result.</p><ResponsiveContainer width="100%" height={290}><ComposedChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => money(Number(v))} /><Legend /><Bar dataKey="profit" fill="var(--good)" radius={[5,5,0,0]} /><Bar dataKey="loss" fill="var(--danger)" radius={[5,5,0,0]} /><Line dataKey="net" stroke="var(--chart-primary)" /></ComposedChart></ResponsiveContainer></section>
      <section className="card analytics-chart"><h2>Outcome mix</h2><p>Wins, losses, and breakeven trades.</p><ResponsiveContainer width="100%" height={290}><PieChart><Pie data={[{name:'Wins',value:metrics.wins.length},{name:'Losses',value:metrics.losses.length},{name:'Breakeven',value:filtered.filter(t=>t.result==='Breakeven').length}]} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={4}>{[0,1,2].map((_,i)=><Cell key={i} fill={i===0?'var(--good)':i===1?'var(--danger)':'var(--muted)'} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></section>

      <section className="card analytics-chart"><h2>Pair performance</h2><p>Net P/L and win rate by market.</p><ResponsiveContainer width="100%" height={320}><ComposedChart data={pairRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="pair" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" domain={[0,100]} /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="net" fill="var(--chart-primary)" radius={[5,5,0,0]} /><Line yAxisId="right" dataKey="winRate" stroke="var(--good)" strokeWidth={2} /></ComposedChart></ResponsiveContainer></section>
      <section className="card analytics-chart"><h2>Trading period performance</h2><p>Find the time window that protects your edge.</p><ResponsiveContainer width="100%" height={320}><BarChart data={periodData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Bar dataKey="net" fill="var(--chart-primary)" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></section>

      <section className="card analytics-chart"><h2>Weekday edge</h2><p>Compare consistency across the week.</p><ResponsiveContainer width="100%" height={300}><ComposedChart data={weekdayData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" domain={[0,100]} /><Tooltip /><Bar yAxisId="left" dataKey="net" fill="var(--chart-primary)" radius={[5,5,0,0]} /><Line yAxisId="right" dataKey="winRate" stroke="var(--good)" /></ComposedChart></ResponsiveContainer></section>
      <section className="card analytics-chart"><h2>Setup score vs R</h2><p>See whether stronger execution produces better outcomes.</p><ResponsiveContainer width="100%" height={300}><ScatterChart><CartesianGrid /><XAxis dataKey="setup_score" name="Setup score" domain={[0,100]} /><YAxis dataKey="r_multiple" name="R multiple" /><Tooltip cursor={{strokeDasharray:'3 3'}} /><Scatter data={filtered} fill="var(--chart-primary)" /></ScatterChart></ResponsiveContainer></section>

      <section className="card analytics-chart wide"><h2>Strategy comparison</h2><p>Performance across your custom playbooks.</p><div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Trades</th><th>Win rate</th><th>Average score</th><th>Net P/L</th></tr></thead><tbody>{strategyData.map(row=><tr key={row.strategy}><td><strong>{row.strategy}</strong></td><td>{row.trades}</td><td>{row.winRate.toFixed(1)}%</td><td>{row.avgScore.toFixed(1)}%</td><td className={row.net>=0?'positive':'negative'}>{money(row.net)}</td></tr>)}{!strategyData.length&&<tr><td colSpan={5}>No strategy data yet.</td></tr>}</tbody></table></div></section>

      <section className="card analytics-chart wide"><h2>Coach score trend</h2><p>Strategy, psychology, and discipline across reviewed trades.</p><ResponsiveContainer width="100%" height={310}><LineChart data={reviewTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="review" /><YAxis domain={[0,100]} /><Tooltip /><Legend /><Line dataKey="strategy" stroke="var(--chart-primary)" strokeWidth={2} /><Line dataKey="psychology" stroke="var(--good)" strokeWidth={2} /><Line dataKey="discipline" stroke="var(--warning)" strokeWidth={2} /></LineChart></ResponsiveContainer></section>
    </div>

    <section className="card calendar-card">
      <div className="section-heading"><div><h2>Recent trading calendar</h2><p>Each square represents one trading day. Hover for details.</p></div><CalendarDays /></div>
      <div className="calendar-heatmap">{calendar.map(day => <div key={day.date} className={`calendar-day ${day.net>0?'profit':day.net<0?'loss':'flat'}`} title={`${day.date}: ${money(day.net)} across ${day.count} trade${day.count===1?'':'s'}`}><span>{new Date(`${day.date}T00:00:00`).getDate()}</span><small>{money(day.net)}</small></div>)}{!calendar.length&&<div className="empty-state">No closed trades in this range.</div>}</div>
    </section>
  </>
}
