'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/lib/types'
import { money } from '@/lib/utils'
import { AlertTriangle, Calculator, Gauge, ShieldCheck, TrendingDown } from 'lucide-react'

type RiskSettings = { balance:number; riskPercent:number; dailyLossLimit:number; weeklyLossLimit:number; monthlyLossLimit:number; maxTradesDay:number; contractValue:number }
const defaults:RiskSettings={balance:10000,riskPercent:1,dailyLossLimit:300,weeklyLossLimit:750,monthlyLossLimit:1500,maxTradesDay:3,contractValue:1}

export default function RiskCenterPage(){
 const[trades,setTrades]=useState<Trade[]>([])
 const[settings,setSettings]=useState<RiskSettings>(defaults)
 const[entry,setEntry]=useState(0),[stop,setStop]=useState(0)
 useEffect(()=>{
   try{const saved=localStorage.getItem('tjp-risk-settings');if(saved)setSettings({...defaults,...JSON.parse(saved)})}catch{}
   supabase.from('trades').select('*').order('trade_date',{ascending:false}).limit(500).then(({data})=>setTrades((data||[]) as Trade[]))
 },[])
 function update<K extends keyof RiskSettings>(key:K,value:number){const next={...settings,[key]:value};setSettings(next);localStorage.setItem('tjp-risk-settings',JSON.stringify(next))}
 const riskAmount=settings.balance*settings.riskPercent/100
 const stopDistance=Math.abs(entry-stop)
 const positionSize=stopDistance>0&&settings.contractValue>0?riskAmount/(stopDistance*settings.contractValue):0
 const stats=useMemo(()=>{
  const now=new Date(),today=now.toISOString().slice(0,10),month=today.slice(0,7)
  const day=trades.filter(t=>t.trade_date===today)
  const startWeek=new Date(now);startWeek.setDate(now.getDate()-((now.getDay()+6)%7));startWeek.setHours(0,0,0,0)
  const week=trades.filter(t=>new Date(`${t.trade_date}T00:00:00`)>=startWeek)
  const monthRows=trades.filter(t=>t.trade_date.startsWith(month))
  const loss=(rows:Trade[])=>Math.abs(rows.reduce((s,t)=>s+Math.min(Number(t.profit_loss)||0,0),0))
  const consecutive=(()=>{let n=0;for(const t of trades){if(t.result==='Loss')n++;else if(t.result==='Win')break}return n})()
  return{day,dayLoss:loss(day),weekLoss:loss(week),monthLoss:loss(monthRows),consecutive}
 },[trades])
 const checks=[
  {label:'Daily loss limit',used:stats.dayLoss,limit:settings.dailyLossLimit},
  {label:'Weekly loss limit',used:stats.weekLoss,limit:settings.weeklyLossLimit},
  {label:'Monthly loss limit',used:stats.monthLoss,limit:settings.monthlyLossLimit}
 ]
 return <>
  <div className="risk-hero"><div><div className="eyebrow">Capital protection</div><h1 className="page-title">Risk Management Center</h1><p className="muted">Calculate position size and keep your loss limits visible before every trade.</p></div><div className="risk-status"><ShieldCheck/><span><strong>Process first</strong><small>Limits are decision-support controls.</small></span></div></div>
  <div className="risk-layout">
   <section className="card risk-calculator"><div className="section-heading"><div><h2>Position size calculator</h2><p>Uses account risk divided by stop distance.</p></div><Calculator/></div>
    <div className="form-grid">
     <label className="field"><span>Account balance</span><input type="number" value={settings.balance} onChange={e=>update('balance',Number(e.target.value))}/></label>
     <label className="field"><span>Risk per trade (%)</span><input type="number" step="0.1" value={settings.riskPercent} onChange={e=>update('riskPercent',Number(e.target.value))}/></label>
     <label className="field"><span>Value per price unit</span><input type="number" step="0.01" value={settings.contractValue} onChange={e=>update('contractValue',Number(e.target.value))}/></label>
     <label className="field"><span>Entry price</span><input type="number" step="any" value={entry||''} onChange={e=>setEntry(Number(e.target.value))}/></label>
     <label className="field"><span>Stop-loss price</span><input type="number" step="any" value={stop||''} onChange={e=>setStop(Number(e.target.value))}/></label>
    </div>
    <div className="risk-result-grid"><div><span>Dollar risk</span><strong>{money(riskAmount)}</strong></div><div><span>Stop distance</span><strong>{stopDistance.toFixed(4)}</strong></div><div><span>Calculated size</span><strong>{positionSize.toFixed(4)}</strong></div></div>
    <p className="helper">Confirm the contract value and lot conventions with your broker before using the calculated size.</p>
   </section>
   <section className="card risk-limits"><div className="section-heading"><div><h2>Risk guardrails</h2><p>Saved locally on this device.</p></div><Gauge/></div>
    <div className="risk-limit-fields">
     <label><span>Daily loss limit</span><input type="number" value={settings.dailyLossLimit} onChange={e=>update('dailyLossLimit',Number(e.target.value))}/></label>
     <label><span>Weekly loss limit</span><input type="number" value={settings.weeklyLossLimit} onChange={e=>update('weeklyLossLimit',Number(e.target.value))}/></label>
     <label><span>Monthly loss limit</span><input type="number" value={settings.monthlyLossLimit} onChange={e=>update('monthlyLossLimit',Number(e.target.value))}/></label>
     <label><span>Maximum trades per day</span><input type="number" value={settings.maxTradesDay} onChange={e=>update('maxTradesDay',Number(e.target.value))}/></label>
    </div>
   </section>
  </div>
  <div className="risk-monitor-grid">
   {checks.map(c=>{const pct=c.limit?Math.min(c.used/c.limit*100,100):0;const breached=c.limit>0&&c.used>=c.limit;return <div className={`card risk-monitor ${breached?'breached':''}`} key={c.label}><div><TrendingDown/><span>{c.label}</span></div><strong>{money(c.used)} / {money(c.limit)}</strong><div className="risk-bar"><i style={{width:`${pct}%`}}/></div><small>{breached?'Limit reached — stop and review.':`${Math.max(0,100-pct).toFixed(0)}% remaining`}</small></div>})}
   <div className={`card risk-monitor ${stats.day.length>=settings.maxTradesDay?'breached':''}`}><div><AlertTriangle/><span>Trades today</span></div><strong>{stats.day.length} / {settings.maxTradesDay}</strong><small>{stats.day.length>=settings.maxTradesDay?'Daily trade cap reached.':'Within daily trade cap.'}</small></div>
   <div className={`card risk-monitor ${stats.consecutive>=3?'breached':''}`}><div><AlertTriangle/><span>Consecutive losses</span></div><strong>{stats.consecutive}</strong><small>{stats.consecutive>=3?'Pause and review the last trades.':'No loss-streak warning.'}</small></div>
  </div>
 </>
}
