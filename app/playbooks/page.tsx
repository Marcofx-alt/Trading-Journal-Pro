'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookMarked, CheckCircle2, ChevronLeft, ClipboardCheck, Copy, Plus,
  Save, ShieldCheck, Sparkles, Target, Trash2, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Plan = {
  id: string
  name: string
  summary: string
  bias: string
  session: string
  markets: string
  rules: string[]
  checklist: string[]
  risk_rules: string[]
  notes: string
  color: string
  created_at?: string
  updated_at?: string
}

type Preset = Omit<Plan, 'id'> & { presetKey: string }

const presets: Preset[] = [
  {
    presetKey: 'strategy-a',
    name: 'Strategy A — Normal Strategy',
    summary: 'Your main supply & demand / liquidity model with confirmation and disciplined risk.',
    bias: 'Trade with the higher-timeframe structure unless a clear reversal model is present.',
    session: 'London / New York',
    markets: 'XAUUSD, EURUSD, GBPUSD',
    rules: [
      'Mark the higher-timeframe structure and directional bias.',
      'Wait for a valid supply or demand zone.',
      'Require liquidity to be marked and preferably swept.',
      'Use FVG mitigation as confluence when present.',
      'Wait for a confirmation candle before entry.',
      'Minimum planned reward-to-risk: 1:2.'
    ],
    checklist: ['HTF bias aligned', 'Valid zone', 'Liquidity marked', 'News checked', 'Confirmation candle', 'Risk within daily limit'],
    risk_rules: ['Risk only the amount defined in the Risk Center.', 'Do not widen the stop after entry.', 'Stop trading after the daily loss limit is reached.'],
    notes: '',
    color: '#60a5fa'
  },
  {
    presetKey: 'strategy-b',
    name: 'Strategy B — FVG + Confirmation Candle',
    summary: 'A focused FVG setup that only triggers after the imbalance is respected and confirmation appears.',
    bias: 'Prefer FVGs aligned with higher-timeframe direction and displacement.',
    session: 'London / New York / Asia when tested',
    markets: 'XAUUSD, EURUSD, GBPUSD, USDJPY, AUDJPY, AUDUSD',
    rules: [
      'Identify a clean bullish or bearish FVG.',
      'Record the FVG timeframe.',
      'Wait for price to return into or mitigate the FVG.',
      'Require price to respect the FVG.',
      'Wait for a confirmation candle on the selected confirmation timeframe.',
      'Only enter after confirmation; do not anticipate the candle.'
    ],
    checklist: ['FVG direction clear', 'FVG timeframe recorded', 'Price respected FVG', 'Confirmation candle present', 'Confirmation timeframe recorded', 'Risk approved'],
    risk_rules: ['Keep risk consistent across the backtest sample.', 'Do not change rules mid-sample without creating a new version.', 'Record the result in R.'],
    notes: '',
    color: '#a78bfa'
  },
  {
    presetKey: 'asia-plan',
    name: 'Asia Session Plan',
    summary: 'A selective after-work plan for Tokyo / Sydney conditions and cleaner Asia-session opportunities.',
    bias: 'Expect quieter conditions than London/NY and prioritize clean liquidity behavior over forced momentum.',
    session: 'Asia — Sydney / Tokyo',
    markets: 'USDJPY, AUDJPY, AUDUSD',
    rules: ['Check major Asia news first.', 'Mark the Asia range high and low.', 'Avoid forcing trades in low liquidity.', 'Require displacement or a clear rejection before entry.'],
    checklist: ['Asia session active', 'Spread acceptable', 'News checked', 'Range marked', 'A+ setup only'],
    risk_rules: ['Use normal risk or reduced risk until the Asia sample is proven.', 'One quality setup is enough.'],
    notes: '',
    color: '#34d399'
  }
]

const emptyDraft: Plan = {
  id: '', name: '', summary: '', bias: '', session: '', markets: '',
  rules: [], checklist: [], risk_rules: [], notes: '', color: '#60a5fa'
}

function lines(value: string) {
  return value.split('\n').map((v) => v.trim()).filter(Boolean)
}

export default function PlaybooksPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Plan>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const selected = useMemo(() => plans.find((p) => p.id === selectedId) || null, [plans, selectedId])

  useEffect(() => { loadPlans() }, [])
  useEffect(() => { if (selected) setDraft(selected) }, [selected])

  async function loadPlans() {
    setLoading(true)
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setError('Sign in to use Playbook Plans.'); setLoading(false); return }
    const { data, error } = await supabase
      .from('playbook_plans')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else {
      const next = (data || []) as Plan[]
      setPlans(next)
      if (next.length && !selectedId) setSelectedId(next[0].id)
    }
    setLoading(false)
  }

  function startNew(base?: Partial<Plan>) {
    setSelectedId(null)
    setDraft({ ...emptyDraft, ...base, id: '' })
    setCreating(true)
    setError('')
  }

  async function savePlan() {
    if (!draft.name.trim()) { setError('Give this plan a name first.'); return }
    setSaving(true)
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setError('You must be signed in.'); setSaving(false); return }
    const payload = {
      user_id: auth.user.id,
      name: draft.name.trim(),
      summary: draft.summary || '',
      bias: draft.bias || '',
      session: draft.session || '',
      markets: draft.markets || '',
      rules: draft.rules || [],
      checklist: draft.checklist || [],
      risk_rules: draft.risk_rules || [],
      notes: draft.notes || '',
      color: draft.color || '#60a5fa',
      updated_at: new Date().toISOString()
    }
    if (draft.id) {
      const { error } = await supabase.from('playbook_plans').update(payload).eq('id', draft.id)
      if (error) setError(error.message)
      else await loadPlans()
    } else {
      const { data, error } = await supabase.from('playbook_plans').insert(payload).select('*').single()
      if (error) setError(error.message)
      else {
        setCreating(false)
        await loadPlans()
        if (data?.id) setSelectedId(data.id)
      }
    }
    setSaving(false)
  }

  async function removePlan() {
    if (!draft.id || !confirm(`Delete “${draft.name}”?`)) return
    const { error } = await supabase.from('playbook_plans').delete().eq('id', draft.id)
    if (error) { setError(error.message); return }
    setSelectedId(null)
    setCreating(false)
    setDraft(emptyDraft)
    await loadPlans()
  }

  function usePreset(preset: Preset) {
    const { presetKey: _presetKey, ...plan } = preset
    startNew(plan)
  }

  const editorOpen = creating || !!selected

  return (
    <div className="plans-page">
      <div className="plans-topbar">
        <div>
          <div className="eyebrow">Playbook planning</div>
          <h1 className="page-title">Trading Plans</h1>
          <p className="muted">Build and refine your execution plans — rules, bias, checklist, and risk in one place.</p>
        </div>
        <button className="button" onClick={() => startNew()}><Plus size={17}/> New Plan</button>
      </div>

      {error && <div className="plans-error">{error}</div>}

      <div className={collapsed ? 'plans-shell collapsed' : 'plans-shell'}>
        <aside className="plans-rail">
          <div className="plans-rail-title">
            <span>MY PLANS</span>
            <button onClick={() => startNew()} aria-label="New plan"><Plus size={17}/></button>
            <button onClick={() => setCollapsed(!collapsed)} aria-label="Collapse plans"><ChevronLeft size={18}/></button>
          </div>
          {!collapsed && <>
            <div className="plans-list">
              {loading && <div className="muted small">Loading plans…</div>}
              {!loading && !plans.length && <div className="plans-empty-mini"><BookMarked size={34}/><span>No plans yet</span></div>}
              {plans.map((plan) => (
                <button key={plan.id} onClick={() => { setCreating(false); setSelectedId(plan.id) }} className={selectedId === plan.id ? 'plan-list-item active' : 'plan-list-item'}>
                  <i style={{ background: plan.color || '#60a5fa' }}/>
                  <span><strong>{plan.name}</strong><small>{plan.session || 'No session set'}</small></span>
                </button>
              ))}
            </div>
            <div className="plans-presets-label">PRESETS</div>
            <div className="plans-presets-list">
              {presets.map((preset) => (
                <button key={preset.presetKey} onClick={() => usePreset(preset)} className="preset-list-item">
                  <i style={{ background: preset.color }}/>
                  <span><strong>{preset.name}</strong><small>{preset.summary}</small></span>
                  <Copy size={14}/>
                </button>
              ))}
            </div>
          </>}
        </aside>

        <main className="plans-main">
          {!editorOpen ? (
            <div className="plans-empty-state">
              <BookMarked size={64}/>
              <h2>No plan selected</h2>
              <p>Create your first trading plan or start from one of the presets.</p>
              <button className="button" onClick={() => startNew()}><Plus size={17}/> Create My First Plan</button>
            </div>
          ) : (
            <div className="plan-editor">
              <div className="plan-editor-head">
                <div className="plan-title-row">
                  <span className="plan-color-dot" style={{ background: draft.color }}/>
                  <input className="plan-name-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Plan name" />
                </div>
                <div className="plan-editor-actions">
                  {draft.id && <button className="ghost danger" onClick={removePlan}><Trash2 size={16}/> Delete</button>}
                  <button className="button" onClick={savePlan} disabled={saving}><Save size={16}/>{saving ? 'Saving…' : 'Save Plan'}</button>
                  {creating && <button className="ghost" onClick={() => { setCreating(false); setDraft(emptyDraft) }}><X size={16}/></button>}
                </div>
              </div>

              <div className="plan-meta-grid">
                <label><span>Session</span><input value={draft.session} onChange={(e) => setDraft({ ...draft, session: e.target.value })} placeholder="London / New York"/></label>
                <label><span>Markets / Pairs</span><input value={draft.markets} onChange={(e) => setDraft({ ...draft, markets: e.target.value })} placeholder="XAUUSD, EURUSD"/></label>
                <label><span>Accent</span><input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })}/></label>
              </div>

              <section className="plan-block">
                <div className="plan-block-title"><Sparkles size={18}/><div><strong>Plan Summary</strong><span>What edge is this plan designed to capture?</span></div></div>
                <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Describe the setup and what makes it valid…"/>
              </section>

              <section className="plan-block">
                <div className="plan-block-title"><Target size={18}/><div><strong>Directional Bias</strong><span>Define when you are allowed to look long or short.</span></div></div>
                <textarea value={draft.bias} onChange={(e) => setDraft({ ...draft, bias: e.target.value })} placeholder="Example: Trade with H4 structure unless…"/>
              </section>

              <div className="plan-columns">
                <section className="plan-block">
                  <div className="plan-block-title"><ClipboardCheck size={18}/><div><strong>Entry Rules</strong><span>One rule per line.</span></div></div>
                  <textarea value={draft.rules.join('\n')} onChange={(e) => setDraft({ ...draft, rules: lines(e.target.value) })} placeholder={'Valid zone\nLiquidity sweep\nConfirmation candle'}/>
                  <div className="rule-preview">{draft.rules.map((rule, i) => <div key={`${rule}-${i}`}><CheckCircle2 size={15}/><span>{rule}</span></div>)}</div>
                </section>
                <section className="plan-block">
                  <div className="plan-block-title"><CheckCircle2 size={18}/><div><strong>Pre-Trade Checklist</strong><span>What must be checked before execution?</span></div></div>
                  <textarea value={draft.checklist.join('\n')} onChange={(e) => setDraft({ ...draft, checklist: lines(e.target.value) })} placeholder={'News checked\nSession active\nRisk approved'}/>
                  <div className="rule-preview">{draft.checklist.map((rule, i) => <div key={`${rule}-${i}`}><CheckCircle2 size={15}/><span>{rule}</span></div>)}</div>
                </section>
              </div>

              <section className="plan-block">
                <div className="plan-block-title"><ShieldCheck size={18}/><div><strong>Risk Rules</strong><span>Rules that protect the account even when the setup looks perfect.</span></div></div>
                <textarea value={draft.risk_rules.join('\n')} onChange={(e) => setDraft({ ...draft, risk_rules: lines(e.target.value) })} placeholder={'Risk 0.5% per trade\nNever widen stop loss\nStop after daily loss limit'}/>
              </section>

              <section className="plan-block">
                <div className="plan-block-title"><BookMarked size={18}/><div><strong>Notes</strong><span>Version notes, observations, or reminders.</span></div></div>
                <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="What should future-you remember about this plan?"/>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
