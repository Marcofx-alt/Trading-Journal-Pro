'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Goal, Trade, TradeReview } from '@/lib/types'
import { money } from '@/lib/utils'
import { ArrowRight, BrainCircuit, CalendarClock, ChartNoAxesCombined, CircleDollarSign, ClipboardCheck, Radar, ShieldCheck, Target } from 'lucide-react'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function WorkspacePage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [reviews, setReviews] = useState<TradeReview[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setNote(localStorage.getItem('tjp-workspace-note') || '')
    Promise.all([
      supabase.from('trades').select('*').order('trade_date', { ascending: false }).limit(100),
      supabase.from('trade_reviews').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('goals').select('*').eq('is_active', true).order('created_at', { ascending: false })
    ]).then(([tradeRes, reviewRes, goalRes]) => {
      setTrades((tradeRes.data || []) as Trade[])
      setReviews((reviewRes.data || []) as TradeReview[])
      setGoals((goalRes.data || []) as Goal[])
      setLoading(false)
    })
  }, [])

  const data = useMemo(() => {
    const today = todayIso()
    const month = today.slice(0, 7)
    const todayTrades = trades.filter(t => t.trade_date === today)
    const monthTrades = trades.filter(t => t.trade_date.startsWith(month) && t.result !== 'Open')
    const monthNet = monthTrades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0)
    const wins = monthTrades.filter(t => t.result === 'Win').length
    const winRate = monthTrades.length ? wins / monthTrades.length * 100 : 0
    const reviewedIds = new Set(reviews.map(r => r.trade_id))
    const pendingReviews = trades.filter(t => t.result !== 'Open' && !reviewedIds.has(t.id)).length
    const latestReview = reviews[0]
    const currentStreak = (() => {
      const closed = trades.filter(t => t.result === 'Win' || t.result === 'Loss')
      if (!closed.length) return { label: 'No streak yet', count: 0 }
      const result = closed[0].result
      let count = 0
      for (const t of closed) { if (t.result === result) count++; else break }
      return { label: `${result} streak`, count }
    })()
    return { todayTrades, monthTrades, monthNet, winRate, pendingReviews, latestReview, currentStreak }
  }, [trades, reviews])

  function saveNote(value: string) {
    setNote(value)
    localStorage.setItem('tjp-workspace-note', value)
  }

  if (loading) return <div className="card">Loading your workspace…</div>

  return <>
    <div className="workspace-hero">
      <div>
        <div className="eyebrow">Marco.N command center</div>
        <h1 className="page-title">Trading Workspace</h1>
        <p className="muted">Plan carefully, protect risk, execute only when your rules are present.</p>
      </div>
      <div className="workspace-date"><CalendarClock size={18}/><span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
    </div>

    <div className="workspace-kpis">
      <div className="card workspace-kpi"><CircleDollarSign/><span>Month P/L</span><strong>{money(data.monthNet)}</strong></div>
      <div className="card workspace-kpi"><ChartNoAxesCombined/><span>Month win rate</span><strong>{data.winRate.toFixed(1)}%</strong></div>
      <div className="card workspace-kpi"><ClipboardCheck/><span>Reviews pending</span><strong>{data.pendingReviews}</strong></div>
      <div className="card workspace-kpi"><ShieldCheck/><span>{data.currentStreak.label}</span><strong>{data.currentStreak.count}</strong></div>
    </div>

    <div className="workspace-grid">
      <section className="card workspace-actions">
        <div className="section-heading"><div><h2>Pre-trade workflow</h2><p>Use the same process before every entry.</p></div><Radar/></div>
        <div className="workspace-action-grid">
          <Link href="/chart-vision" className="workspace-action"><BrainCircuit/><span><strong>Analyze chart</strong><small>Review visible market structure</small></span><ArrowRight/></Link>
          <Link href="/live-assistant" className="workspace-action"><Radar/><span><strong>Score setup</strong><small>Check strategy rules before entry</small></span><ArrowRight/></Link>
          <Link href="/risk-center" className="workspace-action"><ShieldCheck/><span><strong>Calculate risk</strong><small>Size the position and check limits</small></span><ArrowRight/></Link>
          <Link href="/trades/new" className="workspace-action"><ClipboardCheck/><span><strong>Journal trade</strong><small>Record the plan and execution</small></span><ArrowRight/></Link>
        </div>
      </section>

      <section className="card workspace-today">
        <div className="section-heading"><div><h2>Today</h2><p>Your activity for the current trading day.</p></div><Target/></div>
        <div className="today-summary">
          <div><span>Trades</span><strong>{data.todayTrades.length}</strong></div>
          <div><span>Net P/L</span><strong>{money(data.todayTrades.reduce((s,t)=>s+(Number(t.profit_loss)||0),0))}</strong></div>
          <div><span>Open</span><strong>{data.todayTrades.filter(t=>t.result==='Open').length}</strong></div>
        </div>
        <Link href="/trades" className="button secondary link-button">Open trade journal</Link>
      </section>

      <section className="card workspace-goals">
        <div className="section-heading"><div><h2>Active goals</h2><p>Keep your process targets visible.</p></div><Target/></div>
        {goals.length ? <div className="workspace-goal-list">{goals.slice(0,5).map(g=><div key={g.id}><span>{g.name}</span><strong>{g.target_value}</strong></div>)}</div> : <div className="empty-inline">No active goals yet.</div>}
        <Link href="/goals" className="review-link">Manage goals →</Link>
      </section>

      <section className="card workspace-coach">
        <div className="section-heading"><div><h2>Latest coach signal</h2><p>Your most recent completed review.</p></div><BrainCircuit/></div>
        {data.latestReview ? <>
          <div className="coach-grade"><span>Grade</span><strong>{data.latestReview.grade}</strong></div>
          <p>{data.latestReview.coach_feedback || 'Review saved. Continue following the process.'}</p>
          <Link href="/ai-coach" className="review-link">Open AI Coach →</Link>
        </> : <div className="empty-inline">Complete a trade review to generate coaching feedback.</div>}
      </section>

      <section className="card workspace-note">
        <div className="section-heading"><div><h2>Daily focus note</h2><p>Saved automatically on this device.</p></div><ClipboardCheck/></div>
        <textarea value={note} onChange={e=>saveNote(e.target.value)} placeholder="Example: Wait for confirmation. Maximum two trades. No revenge trading." />
      </section>
    </div>
  </>
}
