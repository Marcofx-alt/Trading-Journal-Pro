'use client'

import {useEffect,useMemo,useState} from 'react'
import {ArchiveRestore,CheckCircle2,Database,Download,FileJson,HardDrive,RefreshCw,ShieldCheck,Trash2,Upload,AlertTriangle} from 'lucide-react'
import {supabase} from '@/lib/supabase'

type TableName='trades'|'backtests'|'psychology_entries'|'weekly_reviews'|'monthly_reviews'|'trade_reviews'|'strategies'|'strategy_rules'|'trade_imports'|'goals'|'live_trade_analyses'|'chart_vision_analyses'|'broker_accounts'|'import_profiles'
type BackupFile={app:string;version:string;created_at:string;user_id:string;tables:Partial<Record<TableName,any[]>>;local_settings:Record<string,string|null>;counts:Record<string,number>}
type HistoryItem={id:string;created_at:string;file_name:string;version:string;records:number;note:string;status:'Created'|'Restored'}

const tables:TableName[]=['trades','backtests','psychology_entries','weekly_reviews','monthly_reviews','trade_reviews','strategies','strategy_rules','trade_imports','goals','live_trade_analyses','chart_vision_analyses','broker_accounts','import_profiles']
const localKeys=['tjp-theme','tjp-preferences','tjp-risk-settings','tjp-workspace-note','tjp-command-watchlist','tjp-command-events','tjp-smart-alert-settings']
const labels:Record<TableName,string>={trades:'Trades',backtests:'Backtests',psychology_entries:'Psychology entries',weekly_reviews:'Weekly reviews',monthly_reviews:'Monthly reviews',trade_reviews:'Trade reviews',strategies:'Strategies',strategy_rules:'Strategy rules',trade_imports:'Import history',goals:'Goals',live_trade_analyses:'Live analyses',chart_vision_analyses:'Chart vision analyses',broker_accounts:'Broker accounts',import_profiles:'Import profiles'}

function download(name:string,text:string,type='application/json'){
 const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)
}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-')}

export default function BackupCenter(){
 const[selected,setSelected]=useState<TableName[]>(tables),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[history,setHistory]=useState<HistoryItem[]>([]),[preview,setPreview]=useState<BackupFile|null>(null),[restoreSelected,setRestoreSelected]=useState<TableName[]>([]),[health,setHealth]=useState<any>(null)
 useEffect(()=>{try{setHistory(JSON.parse(localStorage.getItem('tjp-backup-history')||'[]'))}catch{}},[])
 function saveHistory(item:HistoryItem){const next=[item,...history].slice(0,30);setHistory(next);localStorage.setItem('tjp-backup-history',JSON.stringify(next))}
 async function user(){const {data}=await supabase.auth.getUser();if(!data.user)throw new Error('You must be signed in.');return data.user}
 async function createBackup(){setBusy(true);setMessage('Creating verified backup…');try{const u=await user();const payload:BackupFile={app:'Trading Journal Pro — Built by Marco.N',version:'19.0',created_at:new Date().toISOString(),user_id:u.id,tables:{},local_settings:{},counts:{}}
  for(const table of selected){const {data,error}=await supabase.from(table).select('*').eq('user_id',u.id);if(error)throw new Error(`${labels[table]}: ${error.message}`);payload.tables[table]=data||[];payload.counts[table]=(data||[]).length}
  for(const key of localKeys)payload.local_settings[key]=localStorage.getItem(key)
  const records=Object.values(payload.counts).reduce((a,b)=>a+b,0),fileName=`Trading-Journal-Pro-backup-${stamp()}.json`;download(fileName,JSON.stringify(payload,null,2));saveHistory({id:crypto.randomUUID(),created_at:payload.created_at,file_name:fileName,version:'19.0',records,note:`${selected.length} data groups`,status:'Created'});setMessage(`Backup verified: ${records} records exported.`)
 }catch(e:any){setMessage(e.message||'Backup failed.')}finally{setBusy(false)}}
 async function loadBackup(file:File){setMessage('');try{const data=JSON.parse(await file.text()) as BackupFile;if(!data.tables||!data.created_at||!data.version)throw new Error('This is not a valid Trading Journal Pro backup.');setPreview(data);setRestoreSelected(Object.keys(data.tables) as TableName[]);setMessage('Backup loaded. Review the preview before restoring.')}catch(e:any){setMessage(e.message||'Could not read backup file.')}}
 async function restoreBackup(){if(!preview||!confirm('Restore the selected backup data? Existing records with the same IDs will be updated.'))return;setBusy(true);setMessage('Restoring backup…');try{const u=await user();if(preview.user_id!==u.id)throw new Error('This backup belongs to a different user account.');let restored=0
  for(const table of restoreSelected){const rows=(preview.tables[table]||[]).map(row=>({...row,user_id:u.id}));if(!rows.length)continue;const {error}=await supabase.from(table).upsert(rows,{onConflict:'id'});if(error)throw new Error(`${labels[table]}: ${error.message}`);restored+=rows.length}
  Object.entries(preview.local_settings||{}).forEach(([k,v])=>{if(typeof v==='string')localStorage.setItem(k,v)})
  saveHistory({id:crypto.randomUUID(),created_at:new Date().toISOString(),file_name:'Imported backup',version:preview.version,records:restored,note:`Restored from ${new Date(preview.created_at).toLocaleString()}`,status:'Restored'});setMessage(`Restore complete: ${restored} records applied.`);setPreview(null)
 }catch(e:any){setMessage(e.message||'Restore failed.')}finally{setBusy(false)}}
 async function runHealth(){setBusy(true);setMessage('Running health check…');try{const u=await user();const {data:trades,error}=await supabase.from('trades').select('*').eq('user_id',u.id);if(error)throw error;const rows=trades||[],seen=new Set<string>();let duplicates=0,missingImages=0,openTrades=0
  for(const t of rows){const key=t.import_fingerprint||[t.trade_date,t.pair,t.direction,t.entry_price,t.profit_loss].join('|');if(seen.has(key))duplicates++;else seen.add(key);if(!t.screenshot_before_url&&!t.screenshot_after_url)missingImages++;if(t.result==='Open')openTrades++}
  const {data:{session}}=await supabase.auth.getSession();setHealth({database:!!session,total:rows.length,duplicates,missingImages,openTrades,checkedAt:new Date().toLocaleString()});setMessage('Health check complete.')
 }catch(e:any){setMessage(e.message||'Health check failed.')}finally{setBusy(false)}}
 function exportTradesCSV(){supabase.auth.getUser().then(async({data})=>{if(!data.user)return;const {data:rows}=await supabase.from('trades').select('*').eq('user_id',data.user.id);if(!rows?.length){setMessage('No trades available to export.');return}const headers=Object.keys(rows[0]);const csv=[headers.join(','),...rows.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))].join('\n');download(`trades-${stamp()}.csv`,csv,'text/csv')})}
 const previewCount=useMemo(()=>preview?restoreSelected.reduce((n,t)=>n+(preview.tables[t]?.length||0),0):0,[preview,restoreSelected])
 return <>
  <div className="settings-hero"><div><div className="eyebrow">Data protection and portability</div><h1 className="page-title">Backup & Recovery Center</h1><p className="muted">Create full recovery points, restore selected data, export records and verify journal health.</p></div><ShieldCheck/></div>
  {message&&<div className="card backup-message">{message}</div>}
  <div className="backup-grid">
   <section className="card"><div className="section-heading"><div><h2>Backup manager</h2><p>Select the information to include in your recovery file.</p></div><Database/></div>
    <div className="backup-check-grid">{tables.map(t=><label key={t} className="backup-check"><input type="checkbox" checked={selected.includes(t)} onChange={e=>setSelected(e.target.checked?[...selected,t]:selected.filter(x=>x!==t))}/><span>{labels[t]}</span></label>)}</div>
    <div className="button-row"><button className="button" disabled={busy||!selected.length} onClick={createBackup}><Download size={16}/>{busy?'Working…':'Create full backup'}</button><button className="button secondary" onClick={exportTradesCSV}><FileJson size={16}/>Export trades CSV</button></div>
    <p className="helper">The JSON backup includes selected Supabase records and local preferences. It does not include passwords or Supabase keys.</p>
   </section>
   <section className="card"><div className="section-heading"><div><h2>Restore center</h2><p>Preview a backup and restore only the data groups you choose.</p></div><ArchiveRestore/></div>
    <label className="backup-drop"><Upload size={22}/><strong>Choose backup file</strong><span>Trading Journal Pro JSON backup</span><input hidden type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&loadBackup(e.target.files[0])}/></label>
    {preview&&<div className="restore-preview"><div><strong>Version {preview.version}</strong><span>{new Date(preview.created_at).toLocaleString()}</span></div><div className="backup-check-grid">{(Object.keys(preview.tables) as TableName[]).map(t=><label key={t} className="backup-check"><input type="checkbox" checked={restoreSelected.includes(t)} onChange={e=>setRestoreSelected(e.target.checked?[...restoreSelected,t]:restoreSelected.filter(x=>x!==t))}/><span>{labels[t]||t} ({preview.tables[t]?.length||0})</span></label>)}</div><button className="button" disabled={busy||!restoreSelected.length} onClick={restoreBackup}><ArchiveRestore size={16}/>Restore {previewCount} records</button></div>}
   </section>
  </div>
  <div className="backup-grid">
   <section className="card"><div className="section-heading"><div><h2>System health check</h2><p>Inspect common data-quality and recovery risks.</p></div><HardDrive/></div><button className="button secondary" disabled={busy} onClick={runHealth}><RefreshCw size={16}/>Run health check</button>
    {health&&<div className="health-grid"><div><CheckCircle2/><strong>{health.database?'Connected':'Disconnected'}</strong><span>Database</span></div><div><Database/><strong>{health.total}</strong><span>Total trades</span></div><div className={health.duplicates?'health-warning':''}><AlertTriangle/><strong>{health.duplicates}</strong><span>Possible duplicates</span></div><div className={health.missingImages?'health-warning':''}><AlertTriangle/><strong>{health.missingImages}</strong><span>Missing screenshots</span></div><div><RefreshCw/><strong>{health.openTrades}</strong><span>Open trades</span></div></div>}
   </section>
   <section className="card"><div className="section-heading"><div><h2>Version history</h2><p>Recovery actions saved on this device.</p></div><ArchiveRestore/></div>{history.length?<div className="backup-history">{history.map(h=><div key={h.id}><div><strong>{h.status} · {h.records} records</strong><span>{new Date(h.created_at).toLocaleString()} · v{h.version}</span><small>{h.file_name}</small></div><button title="Remove history entry" onClick={()=>{const n=history.filter(x=>x.id!==h.id);setHistory(n);localStorage.setItem('tjp-backup-history',JSON.stringify(n))}}><Trash2 size={16}/></button></div>)}</div>:<p className="muted">No backup or restore history yet.</p>}</section>
  </div>
 </>
}
