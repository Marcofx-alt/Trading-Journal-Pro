'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain, CalendarDays, Clock3, Flame, Focus, History,
  Leaf, Pause, Play, RefreshCw, RotateCcw, Sparkles, Waves
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type MeditationSession = {
  id: string
  user_id: string
  duration_minutes: number
  completed_minutes: number
  intention: string | null
  ambient_sound: string | null
  interval_bells: boolean
  completed_at: string
}

const PRESETS = [5, 10, 15, 30, 60]
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const TOOLKIT = [
  { icon: '🌬️', title: '60-second reset', text: 'Slow your breathing and clear urgency before you touch the chart.', minutes: 1 },
  { icon: '🎯', title: 'Pre-trade focus', text: 'Center attention on your rules, risk, and the one setup you are waiting for.', minutes: 5 },
  { icon: '🛡️', title: 'Loss recovery', text: 'Decompress after a loss so the next decision is not driven by revenge.', minutes: 10 },
  { icon: '🌙', title: 'Session cooldown', text: 'Close the trading day mentally and leave the market at the desk.', minutes: 10 },
]

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function SanctuaryPage() {
  const [duration, setDuration] = useState(10)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60)
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [intention, setIntention] = useState('journal every trade')
  const [intervalBells, setIntervalBells] = useState(true)
  const [ambientSound, setAmbientSound] = useState('off')
  const [sessions, setSessions] = useState<MeditationSession[]>([])
  const [loading, setLoading] = useState(true)
  const [dbReady, setDbReady] = useState(true)
  const [saving, setSaving] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastBellMinuteRef = useRef<number | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meditation_sessions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(100)

    if (error) {
      setDbReady(false)
      setSessions([])
    } else {
      setDbReady(true)
      setSessions((data || []) as MeditationSession[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  function bell() {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioCtxRef.current || new AudioCtx()
      audioCtxRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.85)
    } catch {}
  }

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        const next = Math.max(0, prev - 1)
        if (intervalBells && next > 0 && next % 300 === 0) {
          const minute = Math.floor(next / 60)
          if (lastBellMinuteRef.current !== minute) {
            lastBellMinuteRef.current = minute
            bell()
          }
        }
        if (next === 0) setRunning(false)
        return next
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running, intervalBells])

  useEffect(() => {
    if (secondsLeft === 0 && startedAt) {
      bell()
      void saveSession(duration)
      setStartedAt(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  function selectDuration(minutes: number) {
    if (running) return
    setDuration(minutes)
    setSecondsLeft(minutes * 60)
    setStartedAt(null)
    lastBellMinuteRef.current = null
  }

  function startPause() {
    if (!startedAt) setStartedAt(Date.now())
    setRunning(v => !v)
  }

  function resetTimer() {
    setRunning(false)
    setSecondsLeft(duration * 60)
    setStartedAt(null)
    lastBellMinuteRef.current = null
  }

  async function saveSession(completedMinutes: number) {
    if (saving || completedMinutes <= 0) return
    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setSaving(false)
      return
    }
    const { error } = await supabase.from('meditation_sessions').insert({
      user_id: auth.user.id,
      duration_minutes: duration,
      completed_minutes: Math.max(1, Math.round(completedMinutes)),
      intention: intention.trim() || null,
      ambient_sound: ambientSound,
      interval_bells: intervalBells,
    })
    setSaving(false)
    if (!error) {
      setDbReady(true)
      await loadSessions()
    } else {
      setDbReady(false)
    }
  }

  async function endEarly() {
    if (!startedAt) {
      resetTimer()
      return
    }
    const elapsed = Math.max(1, Math.round((duration * 60 - secondsLeft) / 60))
    setRunning(false)
    setStartedAt(null)
    await saveSession(elapsed)
    setSecondsLeft(duration * 60)
  }

  const today = new Date()
  const weekStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  }, [])

  const weekSessions = useMemo(() => sessions.filter(s => new Date(s.completed_at) >= weekStart), [sessions, weekStart])
  const minutesThisWeek = weekSessions.reduce((sum, s) => sum + (s.completed_minutes || 0), 0)
  const completedDayKeys = new Set(sessions.map(s => dayKey(new Date(s.completed_at))))

  const streak = useMemo(() => {
    let count = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    if (!completedDayKeys.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (completedDayKeys.has(dayKey(cursor))) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [sessions])

  const progressSeconds = duration * 60 - secondsLeft
  const progress = Math.min(100, Math.max(0, (progressSeconds / (duration * 60)) * 100))

  return <div className="sanctuary-page">
    <header className="sanctuary-header">
      <div>
        <div className="eyebrow"><Leaf size={14}/> Mindset & discipline</div>
        <h1>Sanctuary</h1>
        <p>Reset your mind before or after a trading session.</p>
      </div>
      <div className="sanctuary-header-badge"><Sparkles size={15}/> Protect the process before the P&amp;L.</div>
    </header>

    {!dbReady && <div className="card sanctuary-db-warning">
      <strong>Sanctuary history needs one setup step</strong>
      <span>Run <code>supabase/upgrade_v13_sanctuary.sql</code> in the Supabase SQL Editor. The timer still works now.</span>
    </div>}

    <section className="sanctuary-hero-grid">
      <div className="sanctuary-scene">
        <div className="sanctuary-orb orb-one"/><div className="sanctuary-orb orb-two"/><div className="sanctuary-orb orb-three"/>
        <div className="sanctuary-mountain mountain-one"/><div className="sanctuary-mountain mountain-two"/>

        <div className="sanctuary-timer-card">
          <div className="sanctuary-lotus">✦</div>
          <h2>Meditation Session</h2>

          <label className="sanctuary-intention">
            <span>Today I will</span>
            <input value={intention} onChange={e => setIntention(e.target.value)} placeholder="trade only my A+ setup" />
          </label>

          <div className="sanctuary-clock"><Clock3 size={22}/><strong>{formatClock(secondsLeft)}</strong></div>
          <div style={{height:4, borderRadius:999, background:'var(--panel2)', marginTop:8, overflow:'hidden'}}><div style={{width:`${progress}%`, height:'100%', background:'var(--accent)', transition:'width .3s linear'}}/></div>

          <div className="sanctuary-presets">
            {PRESETS.map(m => <button key={m} disabled={running} className={duration === m ? 'active' : ''} onClick={() => selectDuration(m)}>{m === 60 ? '1 hour' : `${m} min`}</button>)}
          </div>

          <div className="sanctuary-row">
            <span>Interval bells every 5 minutes</span>
            <button aria-label="Toggle interval bells" className={`toggle-pill ${intervalBells ? 'on' : ''}`} onClick={() => setIntervalBells(v => !v)}><span/></button>
          </div>

          <label className="sanctuary-select">
            <span><Waves size={14}/> Ambient sound</span>
            <select value={ambientSound} onChange={e => setAmbientSound(e.target.value)}>
              <option value="off">Off</option>
              <option value="white-noise">White Noise</option>
              <option value="rain">Rain</option>
              <option value="forest">Forest</option>
              <option value="ocean">Ocean</option>
            </select>
          </label>

          <div className="sanctuary-main-actions">
            <button className="button primary sanctuary-start" onClick={startPause}>{running ? <Pause size={18}/> : <Play size={18}/>} {running ? 'Pause' : startedAt ? 'Resume' : 'Start'}</button>
            <button className="button" onClick={resetTimer} title="Reset timer"><RotateCcw size={18}/></button>
          </div>
          {startedAt && <button className="sanctuary-end-early" onClick={endEarly}>End early &amp; save completed minutes</button>}
          <small>Use this as a reset tool, not another performance target.</small>
        </div>
      </div>

      <aside className="card sanctuary-progress">
        <div className="sanctuary-progress-block">
          <span>TODAY I WILL</span>
          <strong>{intention || 'Trade with intention'}</strong>
        </div>

        <div className="sanctuary-progress-block">
          <span>THIS WEEK</span>
          <div className="week-dots">
            {WEEK.map((label, i) => {
              const d = new Date(weekStart)
              d.setDate(weekStart.getDate() + i)
              return <div key={`${label}-${i}`}><i className={`${completedDayKeys.has(dayKey(d)) ? 'done' : ''} ${dayKey(d) === dayKey(today) ? 'today' : ''}`}/><b>{label}</b></div>
            })}
          </div>
        </div>

        <div className="sanctuary-stat"><Clock3 size={20}/><div><span>Minutes This Week</span><strong>{minutesThisWeek} m</strong></div></div>
        <div className="sanctuary-stat"><Flame size={20}/><div><span>Current Streak</span><strong>{streak} Day{streak === 1 ? '' : 's'}</strong></div></div>
        <div className="sanctuary-stat"><CalendarDays size={20}/><div><span>Total Sessions</span><strong>{sessions.length}</strong></div></div>
        <div className="sanctuary-progress-note"><Brain size={18}/><span>Consistency matters more than duration. A focused five-minute reset can be enough to prevent an impulsive trade.</span></div>
      </aside>
    </section>

    <section className="card sanctuary-toolkit">
      <div className="sanctuary-section-head"><div><Focus size={20}/><span><strong>Mental Toolkit</strong><small>Quick resets for common trading situations.</small></span></div></div>
      <div className="sanctuary-tool-grid">
        {TOOLKIT.map(tool => <article key={tool.title}>
          <div className="sanctuary-tool-icon">{tool.icon}</div>
          <div><strong>{tool.title}</strong><p>{tool.text}</p></div>
          <button onClick={() => { selectDuration(tool.minutes); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>USE</button>
        </article>)}
      </div>
    </section>

    <section className="card sanctuary-history">
      <div className="sanctuary-section-head"><div><History size={20}/><span><strong>Recent Sessions</strong><small>Your meditation and mindset reset history.</small></span></div><button className="button" onClick={loadSessions}><RefreshCw size={14}/> Refresh</button></div>
      {loading ? <div className="sanctuary-empty">Loading sessions…</div> : sessions.length === 0 ? <div className="sanctuary-empty">No sessions yet. Complete your first meditation to start building the habit.</div> :
        <div className="sanctuary-history-list">{sessions.slice(0, 12).map(s => <article key={s.id}>
          <div><strong>{new Date(s.completed_at).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })}</strong><small>{new Date(s.completed_at).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</small></div>
          <b>{s.completed_minutes} min</b>
          <span>{s.intention || 'Mindset reset'}</span>
          <small>{s.interval_bells ? 'Bells on' : 'Bells off'} · {s.ambient_sound || 'off'}</small>
        </article>)}</div>}
    </section>
  </div>
}
