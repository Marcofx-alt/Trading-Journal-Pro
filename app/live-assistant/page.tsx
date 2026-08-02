'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Gauge, History, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { pairs, periods, timeframes } from '@/lib/utils'
import type { Strategy, StrategyRule } from '@/lib/types'

type Analysis = {
  id:string; strategy_id:string|null; pair:string; direction:'Buy'|'Sell'; trading_period:string|null; entry_timeframe:string|null;
  entry_price:number|null; stop_loss:number|null; take_profit:number|null; planned_rr:number|null; rule_answers:Record<string,boolean>;
  setup_score:number; setup_grade:string; recommendation:string; notes:string|null; status:'Planned'|'Taken'|'Skipped'; created_at:string
}

const fallbackRules:StrategyRule[] = [
  {id:'1',strategy_id:'',user_id:'',rule_key:'htf_trend',label:'Higher timeframe trend matched',weight:15,sort_order:1,is_required:true,created_at:''},
  {id:'2',strategy_id:'',user_id:'',rule_key:'valid_zone',label:'Valid supply or demand zone',weight:15,sort_order:2,is_required:true,created_at:''},
  {id:'3',strategy_id:'',user_id:'',rule_key:'liquidity_sweep',label:'Liquidity sweep confirmed',weight:15,sort_order:3,is_required:true,created_at:''},
  {id:'4',strategy_id:'',user_id:'',rule_key:'fvg',label:'Fair Value Gap present',weight:10,sort_order:4,is_required:false,created_at:''},
  {id:'5',strategy_id:'',user_id:'',rule_key:'bos',label:'Break of Structure confirmed',weight:10,sort_order:5,is_required:false,created_at:''},
  {id:'6',strategy_id:'',user_id:'',rule_key:'choch',label:'Change of Character confirmed',weight:5,sort_order:6,is_required:false,created_at:''},
  {id:'7',strategy_id:'',user_id:'',rule_key:'confirmation_candle',label:'Confirmation candle closed',weight:15,sort_order:7,is_required:true,created_at:''},
  {id:'8',strategy_id:'',user_id:'',rule_key:'news_checked',label:'High-impact news checked',weight:5,sort_order:8,is_required:false,created_at:''},
  {id:'9',strategy_id:'',user_id:'',rule_key:'correct_session',label:'Correct trading period',weight:5,sort_order:9,is_required:false,created_at:''},
  {id:'10',strategy_id:'',user_id:'',rule_key:'risk_managed',label:'Risk is within plan',weight:5,sort_order:10,is_required:true,created_at:''},
]

const n = (value:string) => value === '' ? null : Number(value)
const rrFrom = (entry:number|null, stop:number|null, take:number|null) => {
  if(entry===null||stop===null||take===null) return null
  const risk=Math.abs(entry-stop), reward=Math.abs(take-entry)
  return risk>0 ? reward/risk : null
}
const gradeFrom=(score:number)=>score>=90?'A+':score>=80?'A':score>=70?'B':score>=60?'C':'F'

export default function LiveAssistant(){
  const [strategies,setStrategies]=useState<Strategy[]>([])
  const [strategyId,setStrategyId]=useState('')
  const [answers,setAnswers]=useState<Record<string,boolean>>({})
  const [entry,setEntry]=useState(''),[stop,setStop]=useState(''),[take,setTake]=useState('')
  const [recent,setRecent]=useState<Analysis[]>([])
  const [saving,setSaving]=useState(false),[message,setMessage]=useState('')

  async function load(){
    const [{data:s},{data:a}] = await Promise.all([
      supabase.from('strategies').select('*,strategy_rules(*)').eq('is_active',true).order('is_default',{ascending:false}),
      supabase.from('live_trade_analyses').select('*').order('created_at',{ascending:false}).limit(8)
    ])
    const list=(s||[]) as Strategy[]
    setStrategies(list)
    setStrategyId(x=>x||list.find(v=>v.is_default)?.id||list[0]?.id||'')
    setRecent((a||[]) as Analysis[])
  }
  useEffect(()=>{load()},[])

  const selected=useMemo(()=>strategies.find(s=>s.id===strategyId),[strategies,strategyId])
  const rules=useMemo(()=>{
    const list=[...(selected?.strategy_rules||[])].sort((a,b)=>a.sort_order-b.sort_order)
    return list.length?list:fallbackRules
  },[selected])
  useEffect(()=>{setAnswers({})},[strategyId])

  const totalWeight=rules.reduce((sum,r)=>sum+Number(r.weight||0),0)||1
  const earned=rules.reduce((sum,r)=>sum+(answers[r.rule_key]?Number(r.weight||0):0),0)
  const score=Math.round((earned/totalWeight)*100)
  const missingRequired=rules.filter(r=>r.is_required&&!answers[r.rule_key])
  const plannedRR=rrFrom(n(entry),n(stop),n(take))
  const riskWarning=plannedRR!==null&&plannedRR<2
  const recommendation=missingRequired.length?'Wait — required confirmation missing':riskWarning?'Review — reward may not justify risk':score>=90?'A+ setup — all checks still require your judgment':score>=75?'Developing setup — wait for stronger confirmation':'Wait — setup quality is low'
  const recommendationTone=missingRequired.length||score<75?'danger':score>=90&&!riskWarning?'good':'warning'

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setSaving(true);setMessage('')
    try{
      const f=new FormData(e.currentTarget);const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in first.')
      const payload={user_id:user.id,strategy_id:strategyId||null,pair:String(f.get('pair')),direction:String(f.get('direction')),trading_period:String(f.get('trading_period')||'')||null,entry_timeframe:String(f.get('entry_timeframe')||'')||null,higher_timeframe_trend:String(f.get('higher_timeframe_trend')||'')||null,entry_price:n(entry),stop_loss:n(stop),take_profit:n(take),risk_percent:n(String(f.get('risk_percent')||'')),planned_rr:plannedRR,rule_answers:answers,setup_score:score,setup_grade:gradeFrom(score),recommendation,notes:String(f.get('notes')||'')||null,status:'Planned'}
      const{error}=await supabase.from('live_trade_analyses').insert(payload);if(error)throw error
      setMessage('Analysis saved to your setup history.');await load()
    }catch(x:any){setMessage(x.message)}finally{setSaving(false)}
  }
  async function updateStatus(id:string,status:Analysis['status']){await supabase.from('live_trade_analyses').update({status,updated_at:new Date().toISOString()}).eq('id',id);await load()}
  async function remove(id:string){if(!confirm('Delete this saved setup analysis?'))return;await supabase.from('live_trade_analyses').delete().eq('id',id);await load()}

  return <>
    <div className="assistant-hero">
      <div><div className="eyebrow">Pre-trade decision support</div><h1 className="page-title">Live Trade Assistant</h1><p className="muted">Check a setup against your strategy before you risk money. The score measures rule compliance—not the probability of winning.</p></div>
      <div className="assistant-safety"><ShieldCheck size={18}/><span><strong>Decision support only</strong>Your judgment and risk limits come first.</span></div>
    </div>

    <div className="assistant-layout">
      <form className="card assistant-form" onSubmit={submit}>
        <div className="section-title">1. Setup details</div>
        <div className="form-grid">
          <label className="field">Pair<select name="pair">{pairs.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="field">Direction<select name="direction"><option>Buy</option><option>Sell</option></select></label>
          <label className="field">Strategy<select value={strategyId} onChange={e=>setStrategyId(e.target.value)}><option value="">Core checklist</option>{strategies.map(s=><option key={s.id} value={s.id}>{s.name} v{s.version}</option>)}</select></label>
          <label className="field">Trading period<select name="trading_period">{periods.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="field">Entry timeframe<select name="entry_timeframe">{timeframes.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="field">HTF trend<select name="higher_timeframe_trend"><option>Bullish</option><option>Bearish</option><option>Ranging</option></select></label>
          <label className="field">Entry price<input type="number" step="any" value={entry} onChange={e=>setEntry(e.target.value)}/></label>
          <label className="field">Stop loss<input type="number" step="any" value={stop} onChange={e=>setStop(e.target.value)}/></label>
          <label className="field">Take profit<input type="number" step="any" value={take} onChange={e=>setTake(e.target.value)}/></label>
          <label className="field">Risk %<input name="risk_percent" type="number" min="0" step="0.01" placeholder="1.00"/></label>
        </div>

        <div className="section-title assistant-section-title">2. Strategy confirmations</div>
        <div className="assistant-checks">{rules.map(rule=><label className={`assistant-check ${answers[rule.rule_key]?'checked':''}`} key={rule.rule_key}><input type="checkbox" checked={!!answers[rule.rule_key]} onChange={e=>setAnswers(v=>({...v,[rule.rule_key]:e.target.checked}))}/><span><strong>{rule.label}</strong><small>{rule.weight} weight {rule.is_required?'· Required':''}</small></span><CheckCircle2 size={18}/></label>)}</div>
        <label className="field assistant-notes">Setup notes<textarea name="notes" placeholder="What do you see? What would invalidate the setup?"/></label>
        {message&&<div className={message.includes('saved')?'save-note':'error'}>{message}</div>}
        <button className="button assistant-save" disabled={saving}><Save size={17}/>{saving?'Saving…':'Save Setup Analysis'}</button>
      </form>

      <aside className="assistant-score-column">
        <div className="card score-panel">
          <div className="score-ring" style={{'--score':`${score*3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><span>/ 100</span></div></div>
          <div className="score-copy"><span>Strategy compliance</span><h2>{gradeFrom(score)}</h2><p>{earned} of {totalWeight} weighted points confirmed</p></div>
        </div>
        <div className={`card recommendation-card ${recommendationTone}`}><Sparkles size={22}/><div><span>Assistant assessment</span><h2>{recommendation}</h2></div></div>
        <div className="card assistant-metrics">
          <div><Gauge size={18}/><span>Planned R:R<strong>{plannedRR===null?'—':`1:${plannedRR.toFixed(2)}`}</strong></span></div>
          <div><ClipboardCheck size={18}/><span>Rules confirmed<strong>{rules.filter(r=>answers[r.rule_key]).length}/{rules.length}</strong></span></div>
          <div><AlertTriangle size={18}/><span>Required missing<strong>{missingRequired.length}</strong></span></div>
        </div>
        {(missingRequired.length>0||riskWarning)&&<div className="card assistant-warnings"><div className="section-title">Before entering</div>{missingRequired.map(r=><p key={r.rule_key}><AlertTriangle size={15}/>{r.label}</p>)}{riskWarning&&<p><AlertTriangle size={15}/>Planned R:R is below 1:2.</p>}</div>}
      </aside>
    </div>

    <div className="card assistant-history">
      <div className="section-heading"><div><h2>Recent setup analyses</h2><p>Track whether you took or skipped each planned setup.</p></div><History size={20}/></div>
      {!recent.length?<div className="empty-state">No saved setup analyses yet.</div>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Pair</th><th>Direction</th><th>Score</th><th>R:R</th><th>Status</th><th></th></tr></thead><tbody>{recent.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</td><td><strong>{a.pair}</strong></td><td>{a.direction}</td><td>{a.setup_score}% · {a.setup_grade}</td><td>{a.planned_rr===null?'—':`1:${Number(a.planned_rr).toFixed(2)}`}</td><td><select value={a.status} onChange={e=>updateStatus(a.id,e.target.value as Analysis['status'])}><option>Planned</option><option>Taken</option><option>Skipped</option></select></td><td><button className="icon-button" onClick={()=>remove(a.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}
    </div>
  </>
}
