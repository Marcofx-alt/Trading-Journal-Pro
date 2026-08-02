'use client'

import Link from 'next/link'
import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {supabase} from '@/lib/supabase'
import type {Strategy,Trade,TradeReview} from '@/lib/types'
import {money} from '@/lib/utils'
import {BrainCircuit,CheckCircle2,GitCompareArrows,Lightbulb,ShieldAlert,Sparkles,Target,TrendingUp} from 'lucide-react'

type JoinedReview=TradeReview&{trade?:Trade}
type SimilarTrade={trade:Trade;review?:TradeReview;score:number;reasons:string[]}

const pct=(n:number,d:number)=>d?Math.round(n/d*100):0
const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0
const signed=(n:number)=>`${n>=0?'+':''}${n.toFixed(2)}R`

function resultRate(rows:Trade[]){const closed=rows.filter(t=>t.result!=='Open');return pct(closed.filter(t=>t.result==='Win').length,closed.length)}
function avgR(rows:Trade[]){return average(rows.map(t=>Number(t.r_multiple)).filter(Number.isFinite))}
function profitFactor(rows:Trade[]){const wins=rows.reduce((a,t)=>a+Math.max(0,Number(t.profit_loss||0)),0);const losses=Math.abs(rows.reduce((a,t)=>a+Math.min(0,Number(t.profit_loss||0)),0));return losses?wins/losses:wins>0?99:0}

function similarity(target:Trade,candidate:Trade,targetReview?:TradeReview,candidateReview?:TradeReview):SimilarTrade{
  let earned=0,total=0
  const reasons:string[]=[]
  const compare=(weight:number,match:boolean,label:string)=>{total+=weight;if(match){earned+=weight;reasons.push(label)}}
  compare(24,target.pair===candidate.pair,'same pair')
  compare(12,target.direction===candidate.direction,'same direction')
  compare(14,Boolean(target.strategy_id&&target.strategy_id===candidate.strategy_id),'same strategy')
  compare(10,Boolean(target.trading_period&&target.trading_period===candidate.trading_period),'same trading period')
  compare(8,Boolean(target.entry_timeframe&&target.entry_timeframe===candidate.entry_timeframe),'same timeframe')
  compare(8,Boolean(target.zone_type&&target.zone_type===candidate.zone_type),'same zone type')
  compare(5,target.valid_zone===candidate.valid_zone,'zone confirmation aligned')
  compare(5,target.liquidity_swept===candidate.liquidity_swept,'liquidity condition aligned')
  compare(5,target.fvg_present===candidate.fvg_present,'FVG condition aligned')
  compare(5,target.candle_confirmation===candidate.candle_confirmation,'candle confirmation aligned')
  compare(4,target.followed_plan===candidate.followed_plan,'execution behavior aligned')
  if(targetReview&&candidateReview){
    compare(10,Math.abs(targetReview.strategy_score-candidateReview.strategy_score)<=10,'similar strategy score')
    compare(6,Math.abs(targetReview.discipline_score-candidateReview.discipline_score)<=12,'similar discipline score')
    const targetRules=targetReview.rule_answers||{};const candidateRules=candidateReview.rule_answers||{}
    const keys=Object.keys(targetRules)
    if(keys.length){const same=keys.filter(k=>Boolean(targetRules[k])===Boolean(candidateRules[k])).length;const ruleMatch=same/keys.length;total+=12;earned+=12*ruleMatch;if(ruleMatch>=.75)reasons.push('similar checklist profile')}
  }
  return{trade:candidate,review:candidateReview,score:Math.round(earned/(total||1)*100),reasons:reasons.slice(0,4)}
}

export default function IntelligencePage(){
  const searchParams=useSearchParams()
  const[trades,setTrades]=useState<Trade[]>([])
  const[reviews,setReviews]=useState<TradeReview[]>([])
  const[strategies,setStrategies]=useState<Strategy[]>([])
  const[selected,setSelected]=useState('')
  const[loading,setLoading]=useState(true)

  useEffect(()=>{(async()=>{
    const[{data:t},{data:r},{data:s}]=await Promise.all([
      supabase.from('trades').select('*').order('trade_date',{ascending:false}),
      supabase.from('trade_reviews').select('*').order('updated_at',{ascending:false}),
      supabase.from('strategies').select('*')
    ])
    const all=(t||[]) as Trade[]
    setTrades(all);setReviews((r||[]) as TradeReview[]);setStrategies((s||[]) as Strategy[])
    const requested=searchParams.get('trade');setSelected((requested&&all.some(x=>x.id===requested)?requested:null)||all.find(x=>x.result!=='Open')?.id||all[0]?.id||'');setLoading(false)
  })()},[searchParams])

  const reviewByTrade=useMemo(()=>new Map(reviews.map(r=>[r.trade_id,r])),[reviews])
  const strategyById=useMemo(()=>new Map(strategies.map(s=>[s.id,s])),[strategies])
  const target=trades.find(t=>t.id===selected)
  const targetReview=target?reviewByTrade.get(target.id):undefined
  const similar=useMemo(()=>{
    if(!target)return[]
    return trades.filter(t=>t.id!==target.id&&t.result!=='Open')
      .map(t=>similarity(target,t,targetReview,reviewByTrade.get(t.id)))
      .filter(x=>x.score>=35).sort((a,b)=>b.score-a.score).slice(0,10)
  },[target,targetReview,trades,reviewByTrade])
  const similarTrades=similar.map(x=>x.trade)

  const psychology=useMemo(()=>{
    const joined:JoinedReview[]=reviews.map(r=>({...r,trade:trades.find(t=>t.id===r.trade_id)})).filter(x=>x.trade)
    const buckets=[
      {label:'FOMO recorded',rows:joined.filter(x=>x.fomo)},
      {label:'Followed plan',rows:joined.filter(x=>x.followed_plan)},
      {label:'High discipline (80+)',rows:joined.filter(x=>x.discipline_score>=80)},
      {label:'High stress (8+)',rows:joined.filter(x=>x.stress>=8)},
    ]
    return buckets.map(b=>({label:b.label,count:b.rows.length,winRate:resultRate(b.rows.map(x=>x.trade!)),avgR:avgR(b.rows.map(x=>x.trade!))}))
  },[reviews,trades])

  const strongestPattern=useMemo(()=>{
    const groups=new Map<string,Trade[]>()
    trades.filter(t=>t.result!=='Open').forEach(t=>{
      const key=`${t.pair} · ${t.trading_period||'No period'} · ${t.direction}`
      groups.set(key,[...(groups.get(key)||[]),t])
    })
    return [...groups.entries()].filter(([,rows])=>rows.length>=2).map(([name,rows])=>({name,rows,winRate:resultRate(rows),avgR:avgR(rows),net:rows.reduce((a,t)=>a+Number(t.profit_loss||0),0)})).sort((a,b)=>(b.winRate+b.avgR*10)-(a.winRate+a.avgR*10))[0]
  },[trades])

  const reviewRate=pct(reviews.length,trades.filter(t=>t.result!=='Open').length)
  const strategyAverage=Math.round(average(reviews.map(r=>r.strategy_score)))||0
  const disciplineAverage=Math.round(average(reviews.map(r=>r.discipline_score)))||0
  const missingRequired=targetReview?Object.entries(targetReview.rule_answers||{}).filter(([,v])=>!v).map(([k])=>k.replaceAll('_',' ')):[]

  const insight=useMemo(()=>{
    if(!target)return'Choose a trade to connect it with your historical data.'
    if(similar.length<3)return'Your journal needs more comparable closed trades before this pattern becomes reliable. Keep reviewing trades consistently.'
    const wr=resultRate(similarTrades),r=avgR(similarTrades)
    const caution=targetReview&&targetReview.strategy_score<70?' The selected trade has weaker strategy compliance than your normal A-grade process.':''
    return `The ${similar.length} closest historical matches produced a ${wr}% win rate and ${signed(r)} average result. Treat this as context from your own journal, not a prediction.${caution}`
  },[target,similar,targetReview,similarTrades])

  if(loading)return <div className="card">Building your intelligence model…</div>
  return <>
    <div className="intelligence-hero">
      <div><div className="eyebrow">Version 9 · Connected Intelligence</div><h1 className="page-title">Trade Intelligence Engine</h1><p className="muted">Connect strategy, history, psychology and execution into one evidence-based review.</p></div>
      <div className="intelligence-shield"><BrainCircuit size={22}/><span><strong>Decision support</strong>Not a guaranteed signal</span></div>
    </div>

    <div className="intelligence-stats">
      <div className="card intelligence-stat"><Sparkles/><span>Journal coverage</span><strong>{reviewRate}%</strong><small>{reviews.length} reviewed trades</small></div>
      <div className="card intelligence-stat"><Target/><span>Strategy alignment</span><strong>{strategyAverage}%</strong><small>Average across reviews</small></div>
      <div className="card intelligence-stat"><CheckCircle2/><span>Discipline</span><strong>{disciplineAverage}%</strong><small>Execution quality average</small></div>
      <div className="card intelligence-stat"><TrendingUp/><span>Strongest pattern</span><strong>{strongestPattern?.winRate??0}%</strong><small>{strongestPattern?.name||'More data needed'}</small></div>
    </div>

    <section className="card intelligence-selector">
      <div><div className="section-title">Select a trade to investigate</div><div className="muted">The engine ranks historical trades by structural and behavioral similarity.</div></div>
      <select value={selected} onChange={e=>setSelected(e.target.value)}>{trades.map(t=><option key={t.id} value={t.id}>{t.trade_date} · {t.pair} · {t.direction} · {t.result}</option>)}</select>
    </section>

    {target&&<div className="intelligence-layout">
      <main className="intelligence-main">
        <section className="card intelligence-summary">
          <div className="intelligence-title-row"><div><span>Selected trade</span><h2>{target.pair} · {target.direction}</h2><p>{target.trade_date} · {target.trading_period||'No period'} · {target.result}</p></div><div className={`intelligence-result ${target.result.toLowerCase()}`}>{money(target.profit_loss||0)}<small>{target.r_multiple??'—'}R</small></div></div>
          <div className="intelligence-chips"><span>{strategyById.get(target.strategy_id||'')?.name||'No strategy selected'}</span><span>{target.entry_timeframe||'No timeframe'}</span><span>{target.zone_type||'No zone type'}</span>{targetReview&&<span>{targetReview.grade} review</span>}</div>
        </section>

        <section className="card intelligence-message"><Lightbulb size={23}/><div><strong>Connected insight</strong><p>{insight}</p></div></section>

        <section className="card">
          <div className="section-heading"><div><div className="section-title">Closest historical matches</div><p>Similarity combines pair, direction, strategy, period, timeframe, setup confirmations and review profile.</p></div><GitCompareArrows/></div>
          <div className="similar-list">{similar.map(x=><div className="similar-row" key={x.trade.id}>
            <div className="similar-score"><strong>{x.score}%</strong><span>match</span></div>
            <div className="similar-body"><strong>{x.trade.pair} · {x.trade.direction} · {x.trade.trade_date}</strong><span>{x.reasons.join(' · ')||'general structural similarity'}</span></div>
            <div className="similar-outcome"><b className={x.trade.result.toLowerCase()}>{x.trade.result}</b><span>{x.trade.r_multiple??'—'}R</span></div>
            <Link href={`/trades/${x.trade.id}/review`} className="review-link">Review</Link>
          </div>)}{!similar.length&&<div className="empty">No sufficiently similar closed trades yet.</div>}</div>
        </section>
      </main>

      <aside className="intelligence-side">
        <section className="card comparable-card"><div className="section-title">Comparable sample</div><div className="comparable-grid"><div><span>Matches</span><strong>{similar.length}</strong></div><div><span>Win rate</span><strong>{resultRate(similarTrades)}%</strong></div><div><span>Average R</span><strong>{signed(avgR(similarTrades))}</strong></div><div><span>Profit factor</span><strong>{profitFactor(similarTrades).toFixed(2)}</strong></div></div></section>
        <section className="card"><div className="section-title">Psychology correlations</div><div className="psych-list">{psychology.map(p=><div key={p.label}><span>{p.label}<small>{p.count} trades</small></span><strong>{p.winRate}% · {signed(p.avgR)}</strong></div>)}</div></section>
        <section className="card"><div className="section-title">Current review gaps</div>{!targetReview?<div className="warning-box"><ShieldAlert size={18}/><span>This trade has not been reviewed yet.</span></div>:missingRequired.length?<div className="gap-list">{missingRequired.slice(0,6).map(x=><span key={x}>{x}</span>)}</div>:<div className="success-box"><CheckCircle2 size={18}/>All recorded checklist rules were confirmed.</div>}<Link href={`/trades/${target.id}/review`} className="button secondary intelligence-review-button">{targetReview?'Update review':'Analyze trade'}</Link></section>
      </aside>
    </div>}
  </>
}
