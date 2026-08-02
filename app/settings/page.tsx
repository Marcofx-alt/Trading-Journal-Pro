'use client'
import {useEffect,useState} from 'react'
import {applyTheme,defaultTheme,loadTheme,type Theme} from '@/components/ThemeProvider'
import {Download, Palette, RotateCcw, Settings2, Upload} from 'lucide-react'

const fields:[keyof Theme,string][]=[['accent','Buttons and highlights'],['chart','Chart bars and lines'],['positive','Wins and positive values'],['negative','Losses and negative values'],['bg','Main background'],['panel','Cards and panels'],['panel2','Selected navigation'],['border','Borders'],['text','Main text'],['muted','Secondary text']]
type Preferences={displayName:string;currency:string;timezone:string;defaultRisk:number;weekStartsOn:string}
const defaults:Preferences={displayName:'Marco.N',currency:'USD',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,defaultRisk:1,weekStartsOn:'Monday'}

export default function SettingsPage(){
 const[t,setT]=useState<Theme>(defaultTheme),[prefs,setPrefs]=useState<Preferences>(defaults),[message,setMessage]=useState('')
 useEffect(()=>{setT(loadTheme());try{const p=localStorage.getItem('tjp-preferences');if(p)setPrefs({...defaults,...JSON.parse(p)})}catch{}},[])
 function change(k:keyof Theme,v:string){const n={...t,[k]:v};setT(n);applyTheme(n);localStorage.setItem('tjp-theme',JSON.stringify(n))}
 function update<K extends keyof Preferences>(k:K,v:Preferences[K]){const n={...prefs,[k]:v};setPrefs(n);localStorage.setItem('tjp-preferences',JSON.stringify(n));setMessage('Preferences saved')}
 function reset(){setT(defaultTheme);applyTheme(defaultTheme);localStorage.removeItem('tjp-theme')}
 function exportSettings(){const payload={theme:t,preferences:prefs,risk:JSON.parse(localStorage.getItem('tjp-risk-settings')||'null'),workspaceNote:localStorage.getItem('tjp-workspace-note')};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='MarcoN-app-settings-backup.json';a.click();URL.revokeObjectURL(url)}
 async function importSettings(file:File){try{const data=JSON.parse(await file.text());if(data.theme){setT(data.theme);applyTheme(data.theme);localStorage.setItem('tjp-theme',JSON.stringify(data.theme))}if(data.preferences){setPrefs({...defaults,...data.preferences});localStorage.setItem('tjp-preferences',JSON.stringify(data.preferences))}if(data.risk)localStorage.setItem('tjp-risk-settings',JSON.stringify(data.risk));if(typeof data.workspaceNote==='string')localStorage.setItem('tjp-workspace-note',data.workspaceNote);setMessage('Settings restored successfully')}catch{setMessage('The backup file could not be read.')}finally{setTimeout(()=>setMessage(''),3000)}}
 return <>
  <div className="settings-hero"><div><div className="eyebrow">Personalize your platform</div><h1 className="page-title">Settings Center</h1><p className="muted">Manage your profile preferences, colors and local app backup.</p></div><Settings2/></div>
  <div className="settings-grid">
   <section className="card"><div className="section-heading"><div><h2>Profile & defaults</h2><p>Saved automatically on this device.</p></div><Settings2/></div><div className="form-grid">
    <label className="field"><span>Display name</span><input value={prefs.displayName} onChange={e=>update('displayName',e.target.value)}/></label>
    <label className="field"><span>Currency</span><select value={prefs.currency} onChange={e=>update('currency',e.target.value)}><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option><option>ZAR</option></select></label>
    <label className="field"><span>Time zone</span><input value={prefs.timezone} onChange={e=>update('timezone',e.target.value)}/></label>
    <label className="field"><span>Default risk (%)</span><input type="number" step="0.1" value={prefs.defaultRisk} onChange={e=>update('defaultRisk',Number(e.target.value))}/></label>
    <label className="field"><span>Week starts on</span><select value={prefs.weekStartsOn} onChange={e=>update('weekStartsOn',e.target.value)}><option>Monday</option><option>Sunday</option></select></label>
   </div>{message&&<span className="save-note">{message}</span>}</section>
   <section className="card"><div className="section-heading"><div><h2>Backup & restore</h2><p>Exports local preferences, colors, risk limits and your workspace note.</p></div><Download/></div><div className="settings-backup-actions"><button className="button secondary" onClick={exportSettings}><Download size={16}/> Export settings</button><label className="button secondary"><Upload size={16}/> Restore settings<input hidden type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&importSettings(e.target.files[0])}/></label></div><p className="helper">Trade data remains protected in Supabase and is not included in this local settings file.</p></section>
  </div>
  <section className="card theme-card"><div className="section-heading"><div><h2>Colors & theme</h2><p>Changes save automatically on this device.</p></div><Palette/></div><div className="theme-grid">{fields.map(([k,l])=><label className="color-field" key={k}><span>{l}</span><div><input type="color" value={t[k]} onChange={e=>change(k,e.target.value)}/><code>{t[k]}</code></div></label>)}</div><button className="button secondary" onClick={reset}><RotateCcw size={16}/> Reset default colors</button></section>
 </>
}
