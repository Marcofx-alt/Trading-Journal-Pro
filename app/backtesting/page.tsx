'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Backtest } from '@/lib/types'
import { pairs, timeframes, scoreFrom, grade } from '@/lib/utils'
import StatCard from '@/components/StatCard'

type BacktestOutcome = 'Take Profit Hit' | 'Stop Loss Hit' | 'Breakeven' | 'No Entry / Skipped'

function outcomeToResult(outcome: BacktestOutcome) {
  if (outcome === 'Take Profit Hit') return 'Win' as const
  if (outcome === 'Stop Loss Hit') return 'Loss' as const
  if (outcome === 'Breakeven') return 'Breakeven' as const
  return 'Skipped' as const
}

function localDateValue() {
  const d = new Date()
  const offset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

function outcomeToR(outcome: BacktestOutcome, achievedR: number | null) {
  if (outcome === 'Take Profit Hit') return achievedR
  if (outcome === 'Stop Loss Hit') return -1
  if (outcome === 'Breakeven') return 0
  return null
}

export default function Backtesting() {
  const [data, setData] = useState<Backtest[]>([])
  const [show, setShow] = useState(false)
  const [pair, setPair] = useState('All')
  const [outcome, setOutcome] = useState<BacktestOutcome>('Take Profit Hit')

  async function load() {
    const { data } = await supabase
      .from('backtests')
      .select('*')
      .order('historical_trade_date', { ascending: false })
    setData((data || []) as Backtest[])
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const score = scoreFrom(f, false)
    const achievedR = f.get('achieved_r') ? Number(f.get('achieved_r')) : null
    const selectedOutcome = String(f.get('trade_outcome')) as BacktestOutcome
    const result = outcomeToResult(selectedOutcome)
    const rMultiple = outcomeToR(selectedOutcome, achievedR)

    if (selectedOutcome === 'Take Profit Hit' && (!achievedR || achievedR <= 0)) {
      alert('Enter the R achieved for a take-profit result, for example 2, 3, or 4.')
      return
    }

    const payload: any = {
      user_id: user.id,
      date_tested: f.get('date_tested'),
      historical_trade_date: f.get('historical_trade_date'),
      pair: f.get('pair'),
      direction: f.get('direction'),
      higher_timeframe_trend: f.get('higher_timeframe_trend'),
      entry_timeframe: f.get('entry_timeframe'),
      zone_type: f.get('zone_type'),
      entry_price: null,
      stop_loss: null,
      take_profit: null,
      planned_rr: selectedOutcome === 'Take Profit Hit' ? achievedR : null,
      result,
      r_multiple: rMultiple,
      setup_score: score,
      trade_grade: grade(score),
      lesson_learned: f.get('lesson_learned') || null,
    }

    ;['valid_zone', 'liquidity_marked', 'liquidity_swept', 'fvg_present', 'fvg_mitigated', 'candle_confirmation']
      .forEach(k => payload[k] = f.get(k) === 'on')

    const { error } = await supabase.from('backtests').insert(payload)
    if (error) alert(error.message)
    else {
      setShow(false)
      setOutcome('Take Profit Hit')
      load()
    }
  }

  const rows = useMemo(() => data.filter(x => pair === 'All' || x.pair === pair), [data, pair])
  const completedRows = rows.filter(x => x.result !== 'Skipped')
  const wins = completedRows.filter(x => x.result === 'Win').length
  const rRows = completedRows.filter(x => x.r_multiple != null)
  const totalR = rRows.reduce((s, x) => s + (x.r_multiple || 0), 0)
  const averageR = rRows.length ? totalR / rRows.length : 0

  const automaticResult = outcomeToResult(outcome)
  const automaticR = outcome === 'Stop Loss Hit' ? '-1R' : outcome === 'Breakeven' ? '0R' : outcome === 'No Entry / Skipped' ? '—' : 'Enter R achieved below'

  return <>
    <div className="top-row">
      <div>
        <h1 className="page-title">Backtesting</h1>
        <div className="muted">Log the outcome quickly. Entry, stop-loss and take-profit prices are not required for backtests.</div>
      </div>
      <button className="button" onClick={() => setShow(!show)}>{show ? 'Close form' : 'Add Backtest'}</button>
    </div>

    <div className="grid stats compact">
      <StatCard label="Total backtests" value={rows.length} />
      <StatCard label="Win rate" value={`${completedRows.length ? (wins / completedRows.length * 100).toFixed(1) : 0}%`} />
      <StatCard label="Average R" value={averageR.toFixed(2)} />
      <StatCard label="Total R" value={totalR.toFixed(2)} />
    </div>

    {show && <form className="card form-card" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">Date tested<input name="date_tested" type="date" defaultValue={localDateValue()} required /></label>
        <label className="field">Historical trade date<input name="historical_trade_date" type="date" required /></label>
        <label className="field">Pair<select name="pair">{pairs.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="field">Direction<select name="direction"><option>Buy</option><option>Sell</option></select></label>
        <label className="field">HTF trend<select name="higher_timeframe_trend"><option>Bullish</option><option>Bearish</option><option>Ranging</option></select></label>
        <label className="field">Entry timeframe<select name="entry_timeframe">{timeframes.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="field">Zone type<select name="zone_type"><option>Demand</option><option>Supply</option></select></label>

        <label className="field">
          Trade outcome
          <select name="trade_outcome" value={outcome} onChange={e => setOutcome(e.target.value as BacktestOutcome)}>
            <option>Take Profit Hit</option>
            <option>Stop Loss Hit</option>
            <option>Breakeven</option>
            <option>No Entry / Skipped</option>
          </select>
        </label>

        {outcome === 'Take Profit Hit' && <label className="field">
          R achieved
          <input name="achieved_r" type="number" min="0.01" step="0.01" placeholder="Example: 2, 3, 4" required />
        </label>}

        <div className="field">
          <span>Automatic result</span>
          <div className="auto-result-box"><strong>{automaticResult}</strong><small>{automaticR}</small></div>
        </div>

        <div className="field full">
          <div className="checks">
            {[
              ['valid_zone', 'Valid zone'],
              ['liquidity_marked', 'Liquidity marked'],
              ['liquidity_swept', 'Liquidity swept'],
              ['fvg_present', 'FVG present'],
              ['fvg_mitigated', 'FVG mitigated'],
              ['candle_confirmation', 'Candle confirmation'],
            ].map(([k, l]) => <label className="check" key={k}><input name={k} type="checkbox" />{l}</label>)}
          </div>
        </div>

        <label className="field full">Lesson learned<textarea name="lesson_learned" /></label>
      </div>
      <button className="button">Save Backtest</button>
    </form>}

    <div className="filters">
      <select value={pair} onChange={e => setPair(e.target.value)}><option>All</option>{pairs.map(x => <option key={x}>{x}</option>)}</select>
    </div>

    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Date tested</th><th>Historical date</th><th>Pair</th><th>Direction</th><th>Result</th><th>R</th><th>Score</th><th>Grade</th></tr></thead>
        <tbody>
          {rows.map(x => <tr key={x.id}><td>{x.date_tested}</td><td>{x.historical_trade_date}</td><td>{x.pair}</td><td>{x.direction}</td><td>{x.result}</td><td>{x.r_multiple == null ? '—' : `${x.r_multiple > 0 ? '+' : ''}${x.r_multiple}R`}</td><td>{x.setup_score}%</td><td>{x.trade_grade}</td></tr>)}
          {!rows.length && <tr><td colSpan={8} className="empty">No backtests yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </>
}
