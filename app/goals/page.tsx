'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Goal, Trade, TradeReview } from '@/lib/types'
import { money } from '@/lib/utils'
import { CheckCircle2, Plus, Target, Trash2, TrendingUp } from 'lucide-react'

const metricOptions = [
  ['monthly_profit', 'Monthly net profit', '$'],
  ['win_rate', 'Win rate', '%'],
  ['average_r', 'Average R', 'R'],
  ['max_trades_day', 'Maximum trades per day', 'trades'],
  ['max_daily_loss', 'Maximum daily loss', '$'],
  ['review_rate', 'Trades reviewed', '%'],
  ['strategy_compliance', 'Strategy compliance', '%'],
  ['psychology_score', 'Psychology score', '%']
] as const

const thisMonth = new Date().toISOString().slice(0, 7)

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [reviews, setReviews] = useState<TradeReview[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [metric, setMetric] = useState('monthly_profit')
  const [target, setTarget] = useState('1000')
  const [name, setName] = useState('Monthly profit target')

  async function load() {
    const [g, t, r] = await Promise.all([
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('trades').select('*'),
      supabase.from('trade_reviews').select('*')
    ])
    setGoals((g.data || []) as Goal[])
    setTrades((t.data || []) as Trade[])
    setReviews((r.data || []) as TradeReview[])
  }

  useEffect(() => { load() }, [])

  const currentMonthTrades = useMemo(() => trades.filter(t => t.trade_date.startsWith(thisMonth) && t.result !== 'Open'), [trades])
  const reviewMap = useMemo(() => new Map(reviews.map(r => [r.trade_id, r])), [reviews])

  function currentValue(goal: Goal) {
    const rows = goal.period === 'all_time' ? trades.filter(t => t.result !== 'Open') : currentMonthTrades
    if (goal.metric === 'monthly_profit') return rows.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0)
    if (goal.metric === 'win_rate') return rows.length ? rows.filter(t => t.result === 'Win').length / rows.length * 100 : 0
    if (goal.metric === 'average_r') return rows.length ? rows.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0) / rows.length : 0
    if (goal.metric === 'review_rate') return rows.length ? rows.filter(t => reviewMap.has(t.id)).length / rows.length * 100 : 0
    if (goal.metric === 'strategy_compliance') {
      const scored = rows.map(t => reviewMap.get(t.id)?.strategy_score).filter((v): v is number => typeof v === 'number')
      return scored.length ? scored.reduce((a, b) => a + Number(b), 0) / scored.length : 0
    }
    if (goal.metric === 'psychology_score') {
      const scored = rows.map(t => reviewMap.get(t.id)?.psychology_score).filter((v): v is number => typeof v === 'number')
      return scored.length ? scored.reduce((a, b) => a + Number(b), 0) / scored.length : 0
    }
    const byDay: Record<string, Trade[]> = {}
    rows.forEach(t => (byDay[t.trade_date] ||= []).push(t))
    if (goal.metric === 'max_trades_day') return Math.max(0, ...Object.values(byDay).map(x => x.length))
    if (goal.metric === 'max_daily_loss') return Math.abs(Math.min(0, ...Object.values(byDay).map(x => x.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0))))
    return 0
  }

  function progress(goal: Goal, value: number) {
    if (goal.metric === 'max_trades_day' || goal.metric === 'max_daily_loss') {
      if (value <= goal.target_value) return 100
      return Math.max(0, goal.target_value / value * 100)
    }
    return Math.max(0, Math.min(100, value / goal.target_value * 100))
  }

  function display(goal: Goal, value: number) {
    if (goal.metric === 'monthly_profit' || goal.metric === 'max_daily_loss') return money(value)
    if (goal.metric === 'average_r') return `${value.toFixed(2)}R`
    if (goal.metric === 'max_trades_day') return `${value.toFixed(0)} trades`
    return `${value.toFixed(1)}%`
  }

  function targetDisplay(goal: Goal) { return display(goal, goal.target_value) }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return setSaving(false)
    const { error } = await supabase.from('goals').insert({ user_id: auth.user.id, name, metric, target_value: Number(target), period: metric === 'monthly_profit' ? 'monthly' : 'all_time', is_active: true })
    setSaving(false)
    if (error) return alert(error.message)
    setShowForm(false)
    await load()
  }

  async function removeGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(g => g.filter(x => x.id !== id))
  }

  function onMetricChange(value: string) {
    setMetric(value)
    const option = metricOptions.find(x => x[0] === value)
    setName(option?.[1] || 'Trading goal')
    setTarget(value === 'monthly_profit' ? '1000' : value === 'average_r' ? '2' : value === 'max_trades_day' ? '3' : value === 'max_daily_loss' ? '300' : '80')
  }

  const completed = goals.filter(g => progress(g, currentValue(g)) >= 100).length

  return <>
    <div className="goals-hero">
      <div><div className="eyebrow">Process before profit</div><h1 className="page-title">Trading Goals</h1><p className="muted">Set measurable standards and let your journal update the progress automatically.</p></div>
      <button className="button primary" onClick={() => setShowForm(v => !v)}><Plus size={17} /> New goal</button>
    </div>

    <div className="goal-summary">
      <div><Target /><span><strong>{goals.length}</strong>Active goals</span></div>
      <div><CheckCircle2 /><span><strong>{completed}</strong>Targets reached</span></div>
      <div><TrendingUp /><span><strong>{goals.length ? Math.round(goals.reduce((s,g)=>s+progress(g,currentValue(g)),0)/goals.length) : 0}%</strong>Overall progress</span></div>
    </div>

    {showForm && <form className="card goal-form" onSubmit={addGoal}>
      <div><label>Goal name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
      <div><label>Metric</label><select value={metric} onChange={e => onMetricChange(e.target.value)}>{metricOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
      <div><label>Target</label><input type="number" step="0.01" min="0.01" value={target} onChange={e => setTarget(e.target.value)} required /></div>
      <button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Create goal'}</button>
    </form>}

    <div className="goals-grid">{goals.map(goal => {
      const value = currentValue(goal)
      const pct = progress(goal, value)
      const complete = pct >= 100
      return <article key={goal.id} className={`card goal-card ${complete ? 'complete' : ''}`}>
        <div className="goal-card-head"><div className="goal-icon">{complete ? <CheckCircle2 /> : <Target />}</div><button className="icon-button" onClick={() => removeGoal(goal.id)} title="Delete goal"><Trash2 size={16} /></button></div>
        <div><span className="goal-period">{goal.period === 'monthly' ? 'Current month' : 'All time'}</span><h2>{goal.name}</h2></div>
        <div className="goal-values"><strong>{display(goal, value)}</strong><span>of {targetDisplay(goal)}</span></div>
        <div className="progress-track"><div style={{width:`${pct}%`}} /></div>
        <div className="goal-footer"><span>{pct.toFixed(0)}% complete</span><span>{complete ? 'Target reached' : 'In progress'}</span></div>
      </article>
    })}{!goals.length && <div className="card empty-state goals-empty"><Target size={35}/><h2>Create your first goal</h2><p>Track profit, discipline, trade reviews, risk limits, and strategy compliance.</p></div>}</div>
  </>
}
