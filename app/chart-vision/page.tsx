'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { AlertTriangle, BrainCircuit, Eye, FileImage, History, Save, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { pairs, timeframes } from '@/lib/utils'

type VisionResult={market_bias:string;confidence:number;trend_notes:string;market_structure:string;supply_zones:string[];demand_zones:string[];liquidity_notes:string[];fvg_notes:string[];bos_notes:string;choch_notes:string;support_resistance:string[];candle_observations:string[];confluences:string[];warnings:string[];review_summary:string}
type SavedVision={id:string;pair:string|null;timeframe:string|null;direction:string|null;image_path:string;analysis:VisionResult;notes:string|null;created_at:string}

const emptyResult:VisionResult={market_bias:'Unclear',confidence:0,trend_notes:'',market_structure:'',supply_zones:[],demand_zones:[],liquidity_notes:[],fvg_notes:[],bos_notes:'',choch_notes:'',support_resistance:[],candle_observations:[],confluences:[],warnings:[],review_summary:''}

async function imageUrl(path:string){const{data}=await supabase.storage.from('trade-screenshots').createSignedUrl(path,3600);return data?.signedUrl||''}

export default function ChartVisionPage(){
  const[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[pair,setPair]=useState('XAUUSD'),[timeframe,setTimeframe]=useState('H1'),[direction,setDirection]=useState('Watching'),[notes,setNotes]=useState('')
  const[result,setResult]=useState<VisionResult|null>(null),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[history,setHistory]=useState<SavedVision[]>([]),[historyImages,setHistoryImages]=useState<Record<string,string>>({})

  async function loadHistory(){const{data}=await supabase.from('chart_vision_analyses').select('*').order('created_at',{ascending:false}).limit(8);const rows=(data||[]) as SavedVision[];setHistory(rows);const urls=await Promise.all(rows.map(async r=>[r.id,await imageUrl(r.image_path)] as const));setHistoryImages(Object.fromEntries(urls))}
  useEffect(()=>{loadHistory()},[])
  function choose(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0]||null;if(!f)return;if(!f.type.startsWith('image/')){setMessage('Please choose a chart image.');return}if(f.size>6*1024*1024){setMessage('Use an image smaller than 6 MB.');return}setFile(f);setResult(null);setMessage('');const reader=new FileReader();reader.onload=()=>setPreview(String(reader.result));reader.readAsDataURL(f)}
  async function analyze(){if(!preview){setMessage('Upload a chart screenshot first.');return}setLoading(true);setMessage('');try{const response=await fetch('/api/chart-vision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:preview,pair,timeframe,direction,notes})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Analysis failed.');setResult({...emptyResult,...data.analysis});setMessage('Chart review complete. Verify every observation against the actual chart.')}catch(e:any){setMessage(e.message)}finally{setLoading(false)}}
  async function save(){if(!file||!result)return;setSaving(true);setMessage('');try{const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in first.');const ext=file.name.split('.').pop()||'png';const path=`${user.id}/vision-${crypto.randomUUID()}.${ext}`;const up=await supabase.storage.from('trade-screenshots').upload(path,file,{contentType:file.type});if(up.error)throw up.error;const ins=await supabase.from('chart_vision_analyses').insert({user_id:user.id,pair,timeframe,direction,image_path:path,analysis:result,notes:notes||null});if(ins.error)throw ins.error;setMessage('Vision review saved to your history.');await loadHistory()}catch(e:any){setMessage(e.message)}finally{setSaving(false)}}
  async function remove(id:string){if(!confirm('Delete this chart review?'))return;await supabase.from('chart_vision_analyses').delete().eq('id',id);await loadHistory()}
  function openSaved(item:SavedVision){setPair(item.pair||'XAUUSD');setTimeframe(item.timeframe||'H1');setDirection(item.direction||'Watching');setNotes(item.notes||'');setResult(item.analysis);setPreview(historyImages[item.id]||'');setFile(null);window.scrollTo({top:0,behavior:'smooth'})}

  return <>
    <div className="vision-hero"><div><div className="eyebrow">Sprint 8 · Intelligence workspace</div><h1 className="page-title">AI Chart Vision</h1><p className="muted">Upload a clean chart screenshot and receive a structured second opinion on visible market structure.</p></div><div className="vision-safety"><ShieldCheck size={19}/><span><strong>Review—not prediction</strong>Verify zones and structure yourself before making any decision.</span></div></div>
    <div className="vision-grid">
      <section className="card vision-input">
        <div className="section-heading"><div><h2>Chart workspace</h2><p>Use a screenshot with readable candles, prices and timeframe.</p></div><Eye size={21}/></div>
        <label className={`vision-drop ${preview?'has-image':''}`}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose}/>{preview?<img src={preview} alt="Uploaded trading chart"/>:<><Upload size={34}/><strong>Upload chart screenshot</strong><span>PNG, JPG or WEBP · maximum 6 MB</span></>}</label>
        <div className="form-grid vision-fields"><label className="field">Pair<select value={pair} onChange={e=>setPair(e.target.value)}>{pairs.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Timeframe<select value={timeframe} onChange={e=>setTimeframe(e.target.value)}>{timeframes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Your idea<select value={direction} onChange={e=>setDirection(e.target.value)}><option>Watching</option><option>Buy idea</option><option>Sell idea</option></select></label></div>
        <label className="field">Context for the review<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Example: Price swept yesterday's low. I am waiting for a demand reaction and confirmation candle."/></label>
        {message&&<div className={message.includes('complete')||message.includes('saved')?'save-note':'vision-message'}>{message}</div>}
        <div className="vision-actions"><button className="button" onClick={analyze} disabled={loading||!preview}><BrainCircuit size={18}/>{loading?'Reviewing chart…':'Analyze Chart'}</button><button className="button secondary" onClick={save} disabled={saving||!result||!file}><Save size={18}/>{saving?'Saving…':'Save Review'}</button></div>
      </section>
      <section className="vision-results">
        {!result?<div className="card empty-state vision-empty"><Sparkles size={38}/><h2>Your structured chart review appears here</h2><p>It will cover trend, structure, zones, liquidity, FVGs, BOS, CHOCH, candles, confluence and warnings.</p></div>:<>
          <div className="card vision-score"><div className="vision-bias"><span>Visual market bias</span><strong>{result.market_bias}</strong></div><div className="vision-confidence"><span>Interpretation confidence</span><strong>{result.confidence}%</strong><div><i style={{width:`${result.confidence}%`}}/></div></div></div>
          <ResultCard title="Trend & structure" icon={<Eye size={18}/>} paragraphs={[result.trend_notes,result.market_structure]}/>
          <div className="vision-two"><ResultCard title="Supply zones" items={result.supply_zones}/><ResultCard title="Demand zones" items={result.demand_zones}/></div>
          <div className="vision-two"><ResultCard title="Liquidity" items={result.liquidity_notes}/><ResultCard title="Fair Value Gaps" items={result.fvg_notes}/></div>
          <ResultCard title="Structure shifts" paragraphs={[result.bos_notes&&`BOS: ${result.bos_notes}`,result.choch_notes&&`CHOCH: ${result.choch_notes}`]} items={result.support_resistance}/>
          <ResultCard title="Candles & confluence" items={[...result.candle_observations,...result.confluences]}/>
          <ResultCard title="Warnings and missing evidence" icon={<AlertTriangle size={18}/>} items={result.warnings} warning/>
          <div className="card vision-summary"><Sparkles size={20}/><div><span>Review summary</span><p>{result.review_summary||'No summary returned.'}</p></div></div>
        </>}
      </section>
    </div>
    <section className="card vision-history"><div className="section-heading"><div><h2>Saved vision reviews</h2><p>Reopen your latest chart studies.</p></div><History size={20}/></div>{history.length===0?<div className="empty-state"><FileImage size={30}/><p>No chart vision reviews saved yet.</p></div>:<div className="vision-history-grid">{history.map(x=><article className="vision-history-card" key={x.id}><button className="vision-history-open" onClick={()=>openSaved(x)}>{historyImages[x.id]?<img src={historyImages[x.id]} alt="Saved chart"/>:<div/>}<span><strong>{x.pair||'Chart'} · {x.timeframe||'—'}</strong><small>{x.analysis.market_bias} · {x.analysis.confidence}% confidence</small><small>{new Date(x.created_at).toLocaleDateString('en-US')}</small></span></button><button className="icon-button" onClick={()=>remove(x.id)} aria-label="Delete review"><Trash2 size={17}/></button></article>)}</div>}</section>
  </>
}

function ResultCard({title,items=[],paragraphs=[],icon,warning=false}:{title:string;items?:string[];paragraphs?:Array<string|false|null|undefined>;icon?:React.ReactNode;warning?:boolean}){const cleanItems=items.filter(Boolean),cleanParagraphs=paragraphs.filter(Boolean) as string[];return <div className={`card vision-result-card ${warning?'warning':''}`}><div className="vision-result-title">{icon}<h3>{title}</h3></div>{cleanParagraphs.map((p,i)=><p key={i}>{p}</p>)}{cleanItems.length?<ul>{cleanItems.map((x,i)=><li key={i}>{x}</li>)}</ul>:!cleanParagraphs.length?<p className="muted">No clear evidence identified.</p>:null}</div>}
