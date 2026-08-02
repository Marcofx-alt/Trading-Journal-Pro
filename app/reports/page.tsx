'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trade, TradeReview } from '@/lib/types'
import { money } from '@/lib/utils'
import { Download, FileText, Printer } from 'lucide-react'

type Period='month'|'quarter'|'year'|'all'
const esc=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`

export default function ReportsPage(){
 const[trades,setTrades]=useState<Trade[]>([]),[reviews,setReviews]=useState<TradeReview[]>([]),[period,setPeriod]=useState<Period>('month')
 useEffect(()=>{Promise.all([supabase.from('trades').select('*').order('trade_date',{ascending:true}),supabase.from('trade_reviews').select('*')]).then(([a,b])=>{setTrades((a.data||[]) as Trade[]);setReviews((b.data||[]) as TradeReview[])})},[])
 const filtered=useMemo(()=>{const now=new Date();return trades.filter(t=>{if(t.result==='Open')return false;if(period==='all')return true;const d=new Date(`${t.trade_date}T00:00:00`);if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();if(period==='quarter')return Math.floor(d.getMonth()/3)===Math.floor(now.getMonth()/3)&&d.getFullYear()===now.getFullYear();return d.getFullYear()===now.getFullYear()})},[trades,period])
 const m=useMemo(()=>{const wins=filtered.filter(t=>t.result==='Win'),losses=filtered.filter(t=>t.result==='Loss');const gp=filtered.reduce((s,t)=>s+Math.max(Number(t.profit_loss)||0,0),0),gl=Math.abs(filtered.reduce((s,t)=>s+Math.min(Number(t.profit_loss)||0,0),0));const reviewed=new Set(reviews.map(r=>r.trade_id));return{net:gp-gl,wins:wins.length,losses:losses.length,winRate:filtered.length?wins.length/filtered.length*100:0,avgR:filtered.length?filtered.reduce((s,t)=>s+(Number(t.r_multiple)||0),0)/filtered.length:0,pf:gl?gp/gl:gp?Infinity:0,reviewRate:filtered.length?filtered.filter(t=>reviewed.has(t.id)).length/filtered.length*100:0}},[filtered,reviews])
 const pairRows=useMemo(()=>{const map:Record<string,{pair:string,trades:number,net:number,wins:number}>={};filtered.forEach(t=>{map[t.pair]||={pair:t.pair,trades:0,net:0,wins:0};map[t.pair].trades++;map[t.pair].net+=Number(t.profit_loss)||0;if(t.result==='Win')map[t.pair].wins++});return Object.values(map).sort((a,b)=>b.net-a.net)},[filtered])
 function exportCsv(){const headers=['Date','Pair','Direction','Result','Profit/Loss','R Multiple','Setup Score','Trading Period'];const rows=filtered.map(t=>[t.trade_date,t.pair,t.direction,t.result,t.profit_loss,t.r_multiple,t.setup_score,t.trading_period].map(esc).join(','));const blob=new Blob([[headers.join(','),...rows].join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`MarcoN-trading-report-${period}.csv`;a.click();URL.revokeObjectURL(url)}
 return <div className="report-page">
  <div className="report-hero no-print"><div><div className="eyebrow">Professional reporting</div><h1 className="page-title">Reports Center</h1><p className="muted">Create a branded performance summary and export the underlying trade data.</p></div><div className="report-actions"><select value={period} onChange={e=>setPeriod(e.target.value as Period)}><option value="month">Current month</option><option value="quarter">Current quarter</option><option value="year">Current year</option><option value="all">All time</option></select><button className="button secondary" onClick={exportCsv}><Download size={16}/> Export CSV</button><button className="button" onClick={()=>window.print()}><Printer size={16}/> Print / Save PDF</button></div></div>
  <article className="card printable-report">
   <header className="report-brand"><div><h2>Trading Journal Pro</h2><span>Built by Marco.N</span></div><FileText size={34}/></header>
   <div className="report-period"><span>Performance report</span><strong>{period==='month'?'Current Month':period==='quarter'?'Current Quarter':period==='year'?'Current Year':'All Time'}</strong><small>Generated {new Date().toLocaleDateString('en-US')}</small></div>
   <div className="report-metrics"><div><span>Net P/L</span><strong>{money(m.net)}</strong></div><div><span>Trades</span><strong>{filtered.length}</strong></div><div><span>Win rate</span><strong>{m.winRate.toFixed(1)}%</strong></div><div><span>Average R</span><strong>{m.avgR.toFixed(2)}</strong></div><div><span>Profit factor</span><strong>{m.pf===Infinity?'∞':m.pf.toFixed(2)}</strong></div><div><span>Review rate</span><strong>{m.reviewRate.toFixed(1)}%</strong></div></div>
   <section><h3>Pair performance</h3>{pairRows.length?<table className="report-table"><thead><tr><th>Pair</th><th>Trades</th><th>Win rate</th><th>Net P/L</th></tr></thead><tbody>{pairRows.map(r=><tr key={r.pair}><td>{r.pair}</td><td>{r.trades}</td><td>{(r.wins/r.trades*100).toFixed(1)}%</td><td>{money(r.net)}</td></tr>)}</tbody></table>:<p className="muted">No closed trades in this period.</p>}</section>
   <section><h3>Recent trades</h3><table className="report-table"><thead><tr><th>Date</th><th>Pair</th><th>Direction</th><th>Result</th><th>P/L</th><th>R</th></tr></thead><tbody>{filtered.slice(-12).reverse().map(t=><tr key={t.id}><td>{t.trade_date}</td><td>{t.pair}</td><td>{t.direction}</td><td>{t.result}</td><td>{money(Number(t.profit_loss)||0)}</td><td>{Number(t.r_multiple||0).toFixed(2)}</td></tr>)}</tbody></table></section>
   <footer className="report-footer">Trading Journal Pro · Built by Marco.N · This report summarizes recorded journal data.</footer>
  </article>
 </div>
}
