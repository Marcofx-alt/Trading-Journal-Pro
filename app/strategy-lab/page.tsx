'use client'

import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {supabase} from '@/lib/supabase'
import type {Strategy,StrategyRule,Trade,TradeReview} from '@/lib/types'
import {Activity,ArrowRight,BarChart3,Brain,CheckCircle2,Crown,FlaskConical,GitCompareArrows,ShieldAlert,Target,TrendingDown,TrendingUp} from 'lucide-react'

const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0
const pct=(n:number,d:number)=>d?Math.round(n/d*100):0
const formatR=(n:number)=>`${n>=0?'+':''}${n.toFixed(2)}R`
const formatMoney=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n)

type StrategyStats={
 strategy:Strategy
 trades:Trade[]
 reviews:TradeReview[]
 closed:number
 wins:number
 losses:number
 winRate:number
 avgR:number
 net:number
 profitFactor:number
 maxDrawdown:number
 compliance:number
 psychology:number
 discipline:number
 reviewRate:number
 requiredFailureRate:number
 bestPair:string
 bestPeriod:string
 score:number
}

function profitFactor(rows:Trade[]){
 const grossProfit=rows.reduce((sum,t)=>sum+Math.max(0,Number(t.profit_loss||0)),0)
 const grossLoss=Math.abs(rows.reduce((sum,t)=>sum+Math.min(0,Number(t.profit_loss||0)),0))
 return grossLoss?grossProfit/grossLoss:grossProfit>0?99:0
}

function maxDrawdown(rows:Trade[]){
 const ordered=[...rows].filter(t=>t.result!=='Open').sort((a,b)=>`${a.trade_date} ${a.exit_time||a.entry_time||''}`.localeCompare(`${b.trade_date} ${b.exit_time||b.entry_time||''}`))
 let equity=0,peak=0,worst=0
 for(const trade of ordered){equity+=Number(trade.profit_loss||0);peak=Math.max(peak,equity);worst=Math.max(worst,peak-equity)}
 return worst
}

function bestGroup(rows:Trade[],key:(trade:Trade)=>string){
 const groups=new Map<string,Trade[]>()
 rows.filter(t=>t.result!=='Open').forEach(t=>{const name=key(t)||'Not recorded';groups.set(name,[...(groups.get(name)||[]),t])})
 const ranked=[...groups.entries()].map(([name,trades])=>({name,count:trades.length,avg:average(trades.map(t=>Number(t.r_multiple)).filter(Number.isFinite)),net:trades.reduce((a,t)=>a+Number(t.profit_loss||0),0)})).filter(x=>x.count>0)
 return ranked.sort((a,b)=>(b.avg*10+b.net)-(a.avg*10+a.net))[0]?.name||'More data needed'
}

function buildStats(strategy:Strategy,trades:Trade[],reviews:TradeReview[],rules:StrategyRule[]):StrategyStats{
 const strategyTrades=trades.filter(t=>t.strategy_id===strategy.id)
 const closedRows=strategyTrades.filter(t=>t.result!=='Open')
 const strategyReviews=reviews.filter(r=>r.strategy_id===strategy.id||strategyTrades.some(t=>t.id===r.trade_id))
 const wins=closedRows.filter(t=>t.result==='Win').length
 const losses=closedRows.filter(t=>t.result==='Loss').length
 const required=rules.filter(r=>r.strategy_id===strategy.id&&r.is_required)
 let requiredChecks=0,requiredFailures=0
 strategyReviews.forEach(review=>required.forEach(rule=>{requiredChecks++;if(!review.rule_answers?.[rule.rule_key])requiredFailures++}))
 const winRate=pct(wins,closedRows.length)
 const avgR=average(closedRows.map(t=>Number(t.r_multiple)).filter(Number.isFinite))
 const compliance=average(strategyReviews.map(r=>Number(r.strategy_score||0)))
 const psychology=average(strategyReviews.map(r=>Number(r.psychology_score||0)))
 const discipline=average(strategyReviews.map(r=>Number(r.discipline_score||0)))
 const reviewRate=pct(strategyReviews.length,closedRows.length)
 const requiredFailureRate=pct(requiredFailures,requiredChecks)
 const pf=profitFactor(closedRows)
 const dd=maxDrawdown(closedRows)
 const sampleFactor=Math.min(1,closedRows.length/20)
 const normalizedPF=Math.min(100,pf*25)
 const normalizedR=Math.max(0,Math.min(100,50+avgR*20))
 const drawdownPenalty=closedRows.reduce((a,t)=>a+Math.abs(Number(t.profit_loss||0)),0)?Math.min(30,dd/(closedRows.reduce((a,t)=>a+Math.abs(Number(t.profit_loss||0)),0))*100):0
 const score=Math.round(Math.max(0,Math.min(100,(winRate*.2+normalizedR*.22+normalizedPF*.14+compliance*.18+discipline*.12+reviewRate*.08+(100-requiredFailureRate)*.06-drawdownPenalty)*(.65+.35*sampleFactor))))
 return{strategy,trades:strategyTrades,reviews:strategyReviews,closed:closedRows.length,wins,losses,winRate,avgR,net:closedRows.reduce((a,t)=>a+Number(t.profit_loss||0),0),profitFactor:pf,maxDrawdown:dd,compliance,psychology,discipline,reviewRate,requiredFailureRate,bestPair:bestGroup(closedRows,t=>t.pair),bestPeriod:bestGroup(closedRows,t=>t.trading_period||'Not recorded'),score}
}

function Metric({label,a,b,format=(n:number)=>String(Math.round(n)),higher=true}:{label:string;a:number;b:number;format?:(n:number)=>string;higher?:boolean}){
 const aWins=higher?a>b:a<b;const bWins=higher?b>a:b<a
 return <div className="lab-compare-row"><span>{label}</span><strong className={aWins?'winner':''}>{format(a)}</strong><strong className={bWins?'winner':''}>{format(b)}</strong></div>
}

export default function StrategyLabPage(){
 const[strategies,setStrategies]=useState<Strategy[]>([])
 const[rules,setRules]=useState<StrategyRule[]>([])
 const[trades,setTrades]=useState<Trade[]>([])
 const[reviews,setReviews]=useState<TradeReview[]>([])
 const[left,setLeft]=useState('')
 const[right,setRight]=useState('')
 const[loading,setLoading]=useState(true)
 const[message,setMessage]=useState('')

 useEffect(()=>{(async()=>{
  const[{data:s,error:se},{data:r,error:re},{data:t,error:te},{data:v,error:ve}]=await Promise.all([
   supabase.from('strategies').select('*').order('created_at'),
   supabase.from('strategy_rules').select('*').order('sort_order'),
   supabase.from('trades').select('*').order('trade_date'),
   supabase.from('trade_reviews').select('*').order('updated_at')
  ])
  const error=se||re||te||ve
  if(error)setMessage(error.message)
  const strategyRows=(s||[]) as Strategy[]
  setStrategies(strategyRows);setRules((r||[]) as StrategyRule[]);setTrades((t||[]) as Trade[]);setReviews((v||[]) as TradeReview[])
  setLeft(strategyRows.find(x=>x.is_default)?.id||strategyRows[0]?.id||'')
  setRight(strategyRows.find(x=>x.id!==(strategyRows.find(y=>y.is_default)?.id||strategyRows[0]?.id))?.id||strategyRows[0]?.id||'')
  setLoading(false)
 })()},[])

 const stats=useMemo(()=>strategies.map(s=>buildStats(s,trades,reviews,rules)).sort((a,b)=>b.score-a.score),[strategies,trades,reviews,rules])
 const a=stats.find(x=>x.strategy.id===left)
 const b=stats.find(x=>x.strategy.id===right)
 const leader=stats.find(x=>x.closed>=3)||stats[0]
 const totalClosed=trades.filter(t=>t.result!=='Open').length
 const linkedClosed=trades.filter(t=>t.result!=='Open'&&t.strategy_id).length
 const coverage=pct(linkedClosed,totalClosed)

 const verdict=useMemo(()=>{
  if(!a||!b)return'Choose two strategies to compare.'
  if(a.strategy.id===b.strategy.id)return'Choose two different strategies for a meaningful comparison.'
  if(a.closed<3||b.closed<3)return'One or both strategies have fewer than three closed trades. The comparison is available, but the sample is too small for a strong conclusion.'
  const winner=a.score===b.score?null:a.score>b.score?a:b
  if(!winner)return'Both strategies currently have the same lab score. Review drawdown, required-rule failures and sample size before choosing between them.'
  const edge=Math.abs(a.score-b.score)
  return `${winner.strategy.name} v${winner.strategy.version} leads by ${edge} lab point${edge===1?'':'s'}. It currently has the stronger balance of results, process quality and risk control in your journal. This is historical evidence, not a prediction of future performance.`
 },[a,b])

 if(loading)return <div className="card">Preparing Strategy Lab…</div>
 return <>
  <div className="lab-hero">
   <div><div className="eyebrow">Version 11 · Evidence-Based Strategy Testing</div><h1 className="page-title">Strategy Lab</h1><p className="muted">Compare strategy versions using your actual trades, reviews, psychology and execution quality.</p></div>
   <div className="lab-badge"><FlaskConical size={22}/><span><strong>{strategies.length} strategies</strong>{coverage}% of closed trades linked</span></div>
  </div>

  {message&&<div className="error">{message}</div>}
  {!strategies.length?<section className="card empty-state"><FlaskConical size={30}/><h2>No strategies yet</h2><p>Create a strategy and assign it to trades before using the lab.</p><Link className="button" href="/strategies">Open Strategy Builder</Link></section>:<>
   <div className="lab-summary-grid">
    <div className="card lab-summary"><Crown/><span>Current leader</span><strong>{leader?`${leader.strategy.name} v${leader.strategy.version}`:'More data needed'}</strong><small>{leader?.closed||0} closed trades · Lab score {leader?.score||0}</small></div>
    <div className="card lab-summary"><Target/><span>Strategy coverage</span><strong>{coverage}%</strong><small>{linkedClosed} of {totalClosed} closed trades linked</small></div>
    <div className="card lab-summary"><CheckCircle2/><span>Best compliance</span><strong>{Math.round([...stats].sort((x,y)=>y.compliance-x.compliance)[0]?.compliance||0)}%</strong><small>{[...stats].sort((x,y)=>y.compliance-x.compliance)[0]?.strategy.name||'More reviews needed'}</small></div>
    <div className="card lab-summary"><ShieldAlert/><span>Lowest drawdown</span><strong>{formatMoney([...stats].filter(x=>x.closed).sort((x,y)=>x.maxDrawdown-y.maxDrawdown)[0]?.maxDrawdown||0)}</strong><small>{[...stats].filter(x=>x.closed).sort((x,y)=>x.maxDrawdown-y.maxDrawdown)[0]?.strategy.name||'More trades needed'}</small></div>
   </div>

   <section className="card lab-comparison">
    <div className="section-heading"><div><div className="section-title">Head-to-head comparison</div><p>Select two strategies or versions. Green values lead that metric.</p></div><GitCompareArrows size={22}/></div>
    <div className="lab-selectors">
     <label className="field">Strategy A<select value={left} onChange={e=>setLeft(e.target.value)}>{strategies.map(s=><option key={s.id} value={s.id}>{s.name} · v{s.version}</option>)}</select></label>
     <div className="lab-versus">VS</div>
     <label className="field">Strategy B<select value={right} onChange={e=>setRight(e.target.value)}>{strategies.map(s=><option key={s.id} value={s.id}>{s.name} · v{s.version}</option>)}</select></label>
    </div>
    {a&&b&&<>
     <div className="lab-compare-head"><span>Metric</span><strong>{a.strategy.name}<small>v{a.strategy.version} · {a.closed} trades</small></strong><strong>{b.strategy.name}<small>v{b.strategy.version} · {b.closed} trades</small></strong></div>
     <div className="lab-compare-table">
      <Metric label="Lab score" a={a.score} b={b.score}/>
      <Metric label="Win rate" a={a.winRate} b={b.winRate} format={n=>`${Math.round(n)}%`}/>
      <Metric label="Average R" a={a.avgR} b={b.avgR} format={formatR}/>
      <Metric label="Profit factor" a={a.profitFactor} b={b.profitFactor} format={n=>n>=99?'∞':n.toFixed(2)}/>
      <Metric label="Net profit" a={a.net} b={b.net} format={formatMoney}/>
      <Metric label="Maximum drawdown" a={a.maxDrawdown} b={b.maxDrawdown} format={formatMoney} higher={false}/>
      <Metric label="Strategy compliance" a={a.compliance} b={b.compliance} format={n=>`${Math.round(n)}%`}/>
      <Metric label="Discipline score" a={a.discipline} b={b.discipline} format={n=>`${Math.round(n)}%`}/>
      <Metric label="Psychology score" a={a.psychology} b={b.psychology} format={n=>`${Math.round(n)}%`}/>
      <Metric label="Review completion" a={a.reviewRate} b={b.reviewRate} format={n=>`${Math.round(n)}%`}/>
      <Metric label="Required-rule failures" a={a.requiredFailureRate} b={b.requiredFailureRate} format={n=>`${Math.round(n)}%`} higher={false}/>
     </div>
     <div className="lab-verdict"><Brain size={22}/><div><strong>Lab interpretation</strong><p>{verdict}</p></div></div>
    </>}
   </section>

   <section className="lab-rank-section">
    <div className="section-heading"><div><div className="section-title">Strategy leaderboard</div><p>The score balances performance, process, risk and sample size.</p></div><BarChart3 size={22}/></div>
    <div className="lab-rank-grid">{stats.map((item,index)=><article className="card lab-rank-card" key={item.strategy.id}>
     <div className="lab-rank-top"><span className="lab-rank-number">#{index+1}</span><div><h3>{item.strategy.name}</h3><p>Version {item.strategy.version} · {item.closed} closed trades</p></div><strong className="lab-score">{item.score}</strong></div>
     <div className="lab-mini-grid"><div><span>Win rate</span><strong>{item.winRate}%</strong></div><div><span>Average R</span><strong>{formatR(item.avgR)}</strong></div><div><span>Profit factor</span><strong>{item.profitFactor>=99?'∞':item.profitFactor.toFixed(2)}</strong></div><div><span>Drawdown</span><strong>{formatMoney(item.maxDrawdown)}</strong></div></div>
     <div className="lab-bars"><div><span>Compliance <b>{Math.round(item.compliance)}%</b></span><i><em style={{width:`${Math.min(100,item.compliance)}%`}}/></i></div><div><span>Discipline <b>{Math.round(item.discipline)}%</b></span><i><em style={{width:`${Math.min(100,item.discipline)}%`}}/></i></div></div>
     <div className="lab-patterns"><span><TrendingUp size={14}/>Best pair: <b>{item.bestPair}</b></span><span><Activity size={14}/>Best period: <b>{item.bestPeriod}</b></span>{item.requiredFailureRate>20&&<span className="lab-warning"><TrendingDown size={14}/>Required-rule failures: <b>{item.requiredFailureRate}%</b></span>}</div>
     <Link href={`/trades?strategy=${item.strategy.id}`} className="lab-card-link">Review linked trades <ArrowRight size={14}/></Link>
    </article>)}</div>
   </section>
  </>}
 </>
}
