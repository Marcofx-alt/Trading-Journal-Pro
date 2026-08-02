'use client'
import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowRight, BarChart3, Brain, ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

export default function Login(){
  const [mode,setMode]=useState<'login'|'signup'>('login')
  const [message,setMessage]=useState('')
  const router=useRouter()
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault()
    const f=new FormData(e.currentTarget)
    const email=String(f.get('email'))
    const password=String(f.get('password'))
    const res=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password})
    if(res.error)setMessage(res.error.message)
    else{setMessage(mode==='signup'?'Check your email to confirm your account.':'Signed in.');if(mode==='login')router.push('/home')}
  }
  return <div className="login-layout">
    <section className="login-hero">
      <BrandLogo />
      <div className="login-copy">
        <div className="eyebrow">Professional trading analytics</div>
        <h1>Turn every trade into a better decision.</h1>
        <p>Track your execution, psychology, screenshots, backtests, and performance in one focused workspace.</p>
      </div>
      <div className="feature-stack">
        <div><BarChart3 size={20}/><span><strong>Performance analytics</strong><small>Know what is actually working.</small></span></div>
        <div><Brain size={20}/><span><strong>Psychology tracking</strong><small>Spot emotional patterns early.</small></span></div>
        <div><ShieldCheck size={20}/><span><strong>Private cloud journal</strong><small>Your data stays tied to your account.</small></span></div>
      </div>
      <div className="login-credit">Created by <strong>Marco.N</strong> · © 2026</div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="login-mobile-brand"><BrandLogo compact /></div>
        <div className="eyebrow">Welcome</div>
        <h2>{mode==='login'?'Sign in to your journal':'Create your account'}</h2>
        <p className="muted">{mode==='login'?'Continue reviewing and improving your trading.':'Start building a disciplined trading record.'}</p>
        <form onSubmit={submit} className="form-grid login-form">
          <label className="field full">Email<input name="email" type="email" placeholder="you@example.com" required/></label>
          <label className="field full">Password<input name="password" type="password" placeholder="At least 6 characters" minLength={6} required/></label>
          <button className="button full">{mode==='login'?'Sign in':'Create account'} <ArrowRight size={17}/></button>
        </form>
        {message && <p className="login-message">{message}</p>}
        <button className="text-button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'New here? Create an account':'Already have an account? Sign in'}</button>
      </div>
    </section>
  </div>
}
