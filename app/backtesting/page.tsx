'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Backtest } from '@/lib/types'
import { pairs, timeframes, scoreFrom, grade, plannedRR } from '@/lib/utils'
import StatCard from '@/components/StatCard'

type BacktestOutcome = 'Take Profit Hit' | 'Stop Loss Hit' | 'Breakeven' | 'No Entry / Skipped'
type StrategyKey = 'strategy_a' | 'strategy_b'

const strategyLabels: Record<StrategyKey,string> = {
  strategy_a: 'Strategy A — Normal Strategy',
  strategy_b: 'Strategy B — FVG + Confirmation Candle',
}
const sessions = ['Asia','London','New York','London + New York Overlap','Other']
const confirmationTypes = ['Bullish engulfing','Bearish engulfing','Pin bar / rejection','Displacement candle','Inside-bar break','Structure break candle','Other']

function outcomeToResult(outcome: BacktestOutcome) {
  if (outcome === 'Take Profit Hit') return 'Win' as const
  if (outcome === 'Stop Loss Hit') return 'Loss' as const
  if (outcome === 'Breakeven') return 'Breakeven' as const
  return 'Skipped' as const
}
function localDateValue(){const d=new Date();const o=d.getTimezoneOffset()*60000;return new Date(d.getTime()-o).toISOString().slice(0,10)}
function outcomeToR(outcome: BacktestOutcome, achievedR: number | null) {if(outcome==='Take Profit Hit')return achievedR;if(outcome==='Stop Loss Hit')return -1;if(outcome==='Breakeven')return 0;return null}
async function uploadScreenshot(file:File|null,userId:string){if(!file||!file.size)return null;const ext=file.name.split('.').pop()||'png';const path=`${userId}/backtest-${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('trade-screenshots').upload(path,file,{contentType:file.type});if(error)throw error;return path}

export default function Backtesting(){
 const[data,setData]=useState<Backtest[]>([]),[show,setShow]=useState(false),[pair,setPair]=useState('All'),[outcome,setOutcome]=useState<BacktestOutcome>('Take Profit Hit'),[strategy,setStrategy]=useState<StrategyKey>('strategy_a'),[saving,setSaving]=useState(false)
 async function load(){const{data}=await supabase.from('backtests').select('*').order('historical_trade_date',{ascending:false});setData((data||[]) as Backtest[])}
 useEffect(()=>{load()},[])
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);try{
  const f=new FormData(e.currentTarget);const{data:{user}}=await supabase.auth.getUser();if(!user)return
  const num=(k:string)=>f.get(k)?Number(f.get(k)):null
  const selectedOutcome=String(f.get('trade_outcome')) as BacktestOutcome;const result=outcomeToResult(selectedOutcome)
  const entry=num('entry_price'),sl=num('stop_loss'),tp=num('take_profit');const calculatedRR=plannedRR(entry,sl,tp)
  const achievedR=f.get('achieved_r')?Number(f.get('achieved_r')):null;const rMultiple=outcomeToR(selectedOutcome,achievedR)
  if(selectedOutcome==='Take Profit Hit'&&(!achievedR||achievedR<=0)){alert('Enter the R achieved for the winning backtest.');return}
  const screenshot=await uploadScreenshot(f.get('screenshot') as File,user.id)
  const score=scoreFrom(f,false)
  const payload:any={user_id:user.id,date_tested:f.get('date_tested'),historical_trade_date:f.get('historical_trade_date'),pair:f.get('pair'),direction:f.get('direction'),strategy_key:f.get('strategy_key'),higher_timeframe_trend:f.get('higher_timeframe_trend'),entry_timeframe:f.get('entry_timeframe'),zone_type:f.get('zone_type'),entry_price:entry,stop_loss:sl,take_profit:tp,risk_percent:num('risk_percent'),planned_rr:calculatedRR,result,r_multiple:rMultiple,trading_session:f.get('trading_session')||null,screenshot_url:screenshot,notes:f.get('notes')||null,setup_score:score,trade_grade:grade(score),lesson_learned:f.get('lesson_learned')||null,fvg_type:strategy==='strategy_b'?f.get('fvg_type'):null,fvg_timeframe:strategy==='strategy_b'?f.get('fvg_timeframe'):null,confirmation_timeframe:strategy==='strategy_b'?f.get('confirmation_timeframe'):null,confirmation_candle_type:strategy==='strategy_b'?f.get('confirmation_candle_type'):null,price_respected_fvg:strategy==='strategy_b'?f.get('price_respected_fvg')==='on':null,confirmation_notes:strategy==='strategy_b'?(f.get('confirmation_notes')||null):null}
  ;['valid_zone','liquidity_marked','liquidity_swept','fvg_present','fvg_mitigated','candle_confirmation'].forEach(k=>payload[k]=f.get(k)==='on')
  const{error}=await supabase.from('backtests').insert(payload);if(error)throw error;setShow(false);setOutcome('Take Profit Hit');setStrategy('strategy_a');await load()
 }catch(err:any){alert(err.message)}finally{setSaving(false)}}
 const rows=useMemo(()=>data.filter(x=>pair==='All'||x.pair===pair),[data,pair]);const completed=rows.filter(x=>x.result!=='Skipped');const wins=completed.filter(x=>x.result==='Win').length;const rRows=completed.filter(x=>x.r_multiple!=null);const totalR=rRows.reduce((s,x)=>s+Number(x.r_multiple||0),0)
 const autoResult=outcomeToResult(outcome);const autoR=outcome==='Stop Loss Hit'?'-1R':outcome==='Breakeven'?'0R':outcome==='No Entry / Skipped'?'—':'Enter achieved R'
 return <>
  <div className="top-row"><div><h1 className="page-title">Backtesting</h1><div className="muted">Test Strategy A and Strategy B independently while keeping every setup attached to its strategy.</div></div><div className="top-actions"><a className="button secondary link-button" href="/strategy-comparison">Compare Strategies</a><button className="button" onClick={()=>setShow(!show)}>{show?'Close form':'Add Backtest'}</button></div></div>
  <div className="grid stats compact"><StatCard label="Total backtests" value={rows.length}/><StatCard label="Win rate" value={`${completed.length?(wins/completed.length*100).toFixed(1):0}%`}/><StatCard label="Average R" value={`${rRows.length?(totalR/rRows.length).toFixed(2):'0.00'}R`}/><StatCard label="Total R" value={`${totalR>=0?'+':''}${totalR.toFixed(2)}R`}/></div>
  {show&&<form className="card form-card" onSubmit={submit}><div className="form-grid">
   <label className="field full">Strategy<select name="strategy_key" value={strategy} onChange={e=>setStrategy(e.target.value as StrategyKey)}><option value="strategy_a">{strategyLabels.strategy_a}</option><option value="strategy_b">{strategyLabels.strategy_b}</option></select></label>
   <label className="field">Date tested<input name="date_tested" type="date" defaultValue={localDateValue()} required/></label><label className="field">Historical trade date<input name="historical_trade_date" type="date" required/></label><label className="field">Market / Pair<select name="pair">{pairs.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="field">Long / Short<select name="direction"><option value="Buy">Long</option><option value="Sell">Short</option></select></label><label className="field">Trading session<select name="trading_session">{sessions.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">HTF trend<select name="higher_timeframe_trend"><option>Bullish</option><option>Bearish</option><option>Ranging</option></select></label>
   <label className="field">Entry timeframe<select name="entry_timeframe">{timeframes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Zone type<select name="zone_type"><option>Demand</option><option>Supply</option></select></label><label className="field">Risk %<input name="risk_percent" type="number" min="0" step="0.01" placeholder="1"/></label>
   <label className="field">Entry price<input name="entry_price" type="number" step="any"/></label><label className="field">Stop Loss<input name="stop_loss" type="number" step="any"/></label><label className="field">Take Profit<input name="take_profit" type="number" step="any"/></label>
   <label className="field">Trade outcome<select name="trade_outcome" value={outcome} onChange={e=>setOutcome(e.target.value as BacktestOutcome)}><option>Take Profit Hit</option><option>Stop Loss Hit</option><option>Breakeven</option><option>No Entry / Skipped</option></select></label>
   {outcome==='Take Profit Hit'&&<label className="field">P&amp;L in R<input name="achieved_r" type="number" min="0.01" step="0.01" placeholder="Example: 2" required/></label>}
   <div className="field"><span>Automatic result</span><div className="auto-result-box"><strong>{autoResult}</strong><small>{autoR}</small></div></div>
   {strategy==='strategy_b'&&<><div className="field full strategy-b-banner"><strong>Strategy B — FVG + Confirmation Candle</strong><span>Record the FVG and confirmation details so they can be filtered and analyzed separately.</span></div><label className="field">FVG type / direction<select name="fvg_type"><option>Bullish FVG</option><option>Bearish FVG</option><option>Inverse FVG</option><option>Other</option></select></label><label className="field">FVG timeframe<select name="fvg_timeframe">{timeframes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Confirmation timeframe<select name="confirmation_timeframe">{timeframes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Confirmation candle type<select name="confirmation_candle_type">{confirmationTypes.map(x=><option key={x}>{x}</option>)}</select></label><label className="check field-checkbox"><input name="price_respected_fvg" type="checkbox"/> Price respected the FVG</label><label className="field full">Confirmation notes<textarea name="confirmation_notes" placeholder="What did the confirmation candle show?"/></label></>}
   <div className="field full"><div className="checks">{[['valid_zone','Valid zone'],['liquidity_marked','Liquidity marked'],['liquidity_swept','Liquidity swept'],['fvg_present','FVG present'],['fvg_mitigated','FVG mitigated'],['candle_confirmation','Candle confirmation']].map(([k,l])=><label className="check" key={k}><input name={k} type="checkbox"/>{l}</label>)}</div></div>
   <label className="field">Screenshot<input name="screenshot" type="file" accept="image/*"/></label><label className="field full">Notes<textarea name="notes"/></label><label className="field full">Lesson learned<textarea name="lesson_learned"/></label>
  </div><button className="button" disabled={saving}>{saving?'Saving…':'Save Backtest'}</button></form>}
  <div className="filters"><select value={pair} onChange={e=>setPair(e.target.value)}><option>All</option>{pairs.map(x=><option key={x}>{x}</option>)}</select><a className="button secondary link-button" href="/strategy-comparison">Open A vs B Comparison</a></div>
  <div className="table-wrap"><table className="table"><thead><tr><th>Historical date</th><th>Strategy</th><th>Pair</th><th>Direction</th><th>Session</th><th>Result</th><th>R</th><th>RR</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.historical_trade_date}</td><td>{x.strategy_key==='strategy_b'?'Strategy B':'Strategy A'}</td><td>{x.pair}</td><td>{x.direction==='Buy'?'Long':'Short'}</td><td>{x.trading_session||'—'}</td><td>{x.result}</td><td>{x.r_multiple==null?'—':`${x.r_multiple>0?'+':''}${x.r_multiple}R`}</td><td>{x.planned_rr?`1:${x.planned_rr.toFixed(2)}`:'—'}</td></tr>)}{!rows.length&&<tr><td colSpan={8} className="empty">No backtests yet.</td></tr>}</tbody></table></div>
 </>
}
