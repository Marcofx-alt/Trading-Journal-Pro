'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Backtest, Trade } from '@/lib/types'
import {
  Bot, BrainCircuit, ChevronLeft, MessageSquare, Mic, Plus, Search, Send,
  Sparkles, SquarePen, Target, Trash2, TrendingUp
} from 'lucide-react'

type Thread = { id: string; user_id: string; title: string; created_at: string; updated_at: string }
type ChatMessage = { id: string; thread_id: string; user_id: string; role: 'user' | 'assistant'; content: string; created_at: string }

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

const starters = [
  'Review my recent trading performance',
  'Compare Strategy A vs Strategy B',
  'What mistake is repeating in my trades?',
  'Help me prepare for my next trading session',
]

function pct(n: number) { return `${n.toFixed(1)}%` }
function signedR(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}R` }

function summarizeTradingData(trades: Trade[], backtests: Backtest[]) {
  const closed = trades.filter(t => t.result !== 'Open')
  const wins = closed.filter(t => t.result === 'Win')
  const losses = closed.filter(t => t.result === 'Loss')
  const net = closed.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0)
  const totalR = closed.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0)
  const planned = closed.map(t => Number(t.planned_rr)).filter(Number.isFinite)
  const followed = closed.filter(t => t.followed_plan).length
  const pairMap: Record<string, { trades: number; r: number }> = {}
  const sessionMap: Record<string, { trades: number; r: number }> = {}
  closed.forEach(t => {
    const p = t.pair || 'Unknown'
    pairMap[p] ||= { trades: 0, r: 0 }
    pairMap[p].trades++; pairMap[p].r += Number(t.r_multiple) || 0
    const s = t.trading_period || 'Unknown'
    sessionMap[s] ||= { trades: 0, r: 0 }
    sessionMap[s].trades++; sessionMap[s].r += Number(t.r_multiple) || 0
  })

  const cleanBacktests = backtests.filter(b => b.result !== 'Skipped')
  const strategyStats = (key: 'strategy_a' | 'strategy_b') => {
    const rows = cleanBacktests.filter(b => b.strategy_key === key)
    const w = rows.filter(b => b.result === 'Win').length
    const l = rows.filter(b => b.result === 'Loss').length
    const r = rows.reduce((s, b) => s + (Number(b.r_multiple) || 0), 0)
    return { trades: rows.length, wins: w, losses: l, winRate: w + l ? w / (w + l) * 100 : 0, totalR: r, expectancy: rows.length ? r / rows.length : 0 }
  }

  const recent = closed.slice(0, 12).map(t => ({
    date: t.trade_date, pair: t.pair, direction: t.direction, result: t.result,
    pnl: Number(t.profit_loss) || 0, r: Number(t.r_multiple) || 0, session: t.trading_period,
    grade: t.trade_grade, followedPlan: t.followed_plan, mistake: t.mistake, lesson: t.lesson_learned,
    entryReason: t.reason_for_entry, exitReason: t.reason_for_exit,
  }))

  return JSON.stringify({
    liveJournal: {
      closedTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: wins.length + losses.length ? pct(wins.length / (wins.length + losses.length) * 100) : '0%',
      netPnL: net.toFixed(2), totalR: signedR(totalR),
      averagePlannedRR: planned.length ? (planned.reduce((a, b) => a + b, 0) / planned.length).toFixed(2) : null,
      planFollowingRate: closed.length ? pct(followed / closed.length * 100) : '0%',
      byPair: pairMap, bySession: sessionMap,
    },
    backtests: {
      strategyA: strategyStats('strategy_a'),
      strategyB: strategyStats('strategy_b'),
      totalRecorded: backtests.length,
    },
    recentClosedTrades: recent,
  }, null, 2)
}

export default function TradingJournalAI() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [backtests, setBacktests] = useState<Backtest[]>([])
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { void initialize() }, [])
  useEffect(() => { if (selectedThread) void loadMessages(selectedThread); else setMessages([]) }, [selectedThread])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function initialize() {
    setLoading(true)
    const [{ data: threadRows }, { data: tradeRows }, { data: btRows }] = await Promise.all([
      supabase.from('ai_chat_threads').select('*').order('updated_at', { ascending: false }),
      supabase.from('trades').select('*').order('trade_date', { ascending: false }).limit(150),
      supabase.from('backtests').select('*').order('historical_trade_date', { ascending: false }).limit(300),
    ])
    const t = (threadRows || []) as Thread[]
    setThreads(t)
    setTrades((tradeRows || []) as Trade[])
    setBacktests((btRows || []) as Backtest[])
    if (t.length) setSelectedThread(t[0].id)
    setLoading(false)
  }

  async function loadMessages(threadId: string) {
    const { data } = await supabase.from('ai_chat_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true })
    setMessages((data || []) as ChatMessage[])
  }

  async function newChat() {
    setSelectedThread(null)
    setMessages([])
    setQuery('')
    setError('')
  }

  async function removeThread(id: string) {
    if (!confirm('Delete this AI chat?')) return
    await supabase.from('ai_chat_threads').delete().eq('id', id)
    const next = threads.filter(t => t.id !== id)
    setThreads(next)
    setSelectedThread(next[0]?.id || null)
  }

  async function ensureThread(firstMessage: string) {
    if (selectedThread) return selectedThread
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) throw new Error('You must be signed in.')
    const title = firstMessage.replace(/\s+/g, ' ').trim().slice(0, 54) || 'New chat'
    const { data, error } = await supabase.from('ai_chat_threads').insert({ user_id: userId, title }).select('*').single()
    if (error) throw error
    const thread = data as Thread
    setThreads(prev => [thread, ...prev])
    setSelectedThread(thread.id)
    return thread.id
  }

  async function sendMessage(event?: FormEvent, starter?: string) {
    event?.preventDefault()
    const text = (starter ?? query).trim()
    if (!text || sending) return
    setError('')
    setSending(true)
    try {
      const threadId = await ensureThread(text)
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('You must be signed in.')

      const { data: insertedUser, error: userError } = await supabase.from('ai_chat_messages').insert({ thread_id: threadId, user_id: userId, role: 'user', content: text }).select('*').single()
      if (userError) throw userError
      const userMsg = insertedUser as ChatMessage
      setMessages(prev => [...prev, userMsg])
      setQuery('')

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Your session expired. Please sign in again.')

      const history = [...messages, userMsg].slice(-12).map(m => ({ role: m.role, content: m.content }))
      const response = await fetch('/api/trading-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history, context: summarizeTradingData(trades, backtests) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'AI request failed.')

      const { data: assistantRow, error: assistantError } = await supabase.from('ai_chat_messages').insert({ thread_id: threadId, user_id: userId, role: 'assistant', content: data.reply }).select('*').single()
      if (assistantError) throw assistantError
      setMessages(prev => [...prev, assistantRow as ChatMessage])
      await supabase.from('ai_chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, updated_at: new Date().toISOString() } : t).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  function startVoice() {
    const w = window as any
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Recognition) { setError('Voice input is not supported in this browser.'); return }
    const recognition: SpeechRecognitionLike = new Recognition()
    recognition.lang = 'en-CA'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      setQuery(prev => `${prev}${prev ? ' ' : ''}${transcript}`)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); setError('Voice input could not start.') }
    setListening(true)
    recognition.start()
  }

  const visibleThreads = useMemo(() => threads.filter(t => t.title.toLowerCase().includes(search.toLowerCase())), [threads, search])
  const journalSummary = useMemo(() => {
    const closed = trades.filter(t => t.result !== 'Open')
    const totalR = closed.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0)
    return { closed: closed.length, totalR, backtests: backtests.length }
  }, [trades, backtests])

  return <div className="ai-chat-page">
    <header className="ai-chat-header">
      <div><div className="eyebrow">MARCO.N INTELLIGENCE</div><h1>Trading Journal Pro AI</h1><p>Ask about your journal, strategies, risk, psychology, sessions, and backtesting.</p></div>
      <button className="button secondary ai-new-chat" onClick={newChat}><Plus size={17}/> New Chat</button>
    </header>

    <div className="ai-chat-shell">
      <aside className="ai-chat-rail">
        <div className="ai-chat-rail-head"><span>CHATS</span><button onClick={newChat} aria-label="New chat"><Plus size={17}/></button></div>
        <div className="ai-chat-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" /></div>
        <div className="ai-thread-list">
          {visibleThreads.map(t => <div className={`ai-thread-row ${selectedThread === t.id ? 'active' : ''}`} key={t.id}>
            <button onClick={() => setSelectedThread(t.id)}><MessageSquare size={15}/><span>{t.title}</span></button>
            <button className="ai-thread-delete" onClick={() => removeThread(t.id)} aria-label="Delete chat"><Trash2 size={14}/></button>
          </div>)}
          {!loading && !visibleThreads.length && <div className="ai-chat-empty-rail"><MessageSquare size={28}/><span>No chats yet</span><button className="button secondary" onClick={newChat}><Plus size={15}/> New Chat</button></div>}
        </div>
        <div className="ai-context-card"><BrainCircuit size={17}/><div><strong>Journal context connected</strong><span>{journalSummary.closed} closed trades · {journalSummary.backtests} backtests · {signedR(journalSummary.totalR)}</span></div></div>
      </aside>

      <main className="ai-chat-main">
        {!messages.length && !sending ? <section className="ai-welcome">
          <div className="ai-welcome-orb"><Sparkles size={26}/></div>
          <h2>Welcome to Trading Journal Pro AI</h2>
          <p>Turn your own trading data into clearer rules, reviews, and performance insights.</p>
          <div className="ai-starter-grid">
            {starters.map((s, i) => <button key={s} onClick={() => sendMessage(undefined, s)}>
              {i === 0 ? <TrendingUp size={18}/> : i === 1 ? <Target size={18}/> : i === 2 ? <BrainCircuit size={18}/> : <SquarePen size={18}/>}
              <span>{s}</span>
            </button>)}
          </div>
        </section> : <div className="ai-message-stream">
          {messages.map(m => <article key={m.id} className={`ai-message ${m.role}`}>
            <div className="ai-message-avatar">{m.role === 'assistant' ? <Bot size={17}/> : 'M'}</div>
            <div><div className="ai-message-role">{m.role === 'assistant' ? 'Trading Journal Pro AI' : 'You'}</div><div className="ai-message-content">{m.content}</div></div>
          </article>)}
          {sending && <article className="ai-message assistant"><div className="ai-message-avatar"><Bot size={17}/></div><div><div className="ai-message-role">Trading Journal Pro AI</div><div className="ai-thinking"><i/><i/><i/></div></div></article>}
          <div ref={bottomRef}/>
        </div>}

        {error && <div className="ai-chat-error">{error}</div>}
        <form className="ai-composer" onSubmit={e => sendMessage(e)}>
          <textarea value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }} placeholder="Ask about your journal, market regime, risk, psychology, or strategy performance…" rows={3}/>
          <div className="ai-composer-actions">
            <span>Shift + Enter for a new line</span>
            <div><button type="button" className={listening ? 'active' : ''} onClick={startVoice} aria-label="Voice input"><Mic size={18}/></button><button type="submit" disabled={!query.trim() || sending} aria-label="Send"><Send size={18}/></button></div>
          </div>
        </form>
        <div className="ai-disclaimer">For education, journaling, and performance review only — not financial advice. Markets involve risk.</div>
      </main>
    </div>
  </div>
}
