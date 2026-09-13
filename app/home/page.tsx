'use client'

import Link from 'next/link'
import {
  ArrowRight, BarChart3, BookOpenCheck, Bot, BrainCircuit, CalendarDays,
  ClipboardCheck, Clock4, Newspaper, NotebookPen, Quote, ShieldCheck,
  Sparkles, Target, TrendingUp
} from 'lucide-react'

const quotes = [
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The goal of a successful trader is to make the best trades. Money is secondary.', author: 'Alexander Elder' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
]

const coreTools = [
  ['/session-guide', 'Session Guide', 'Know when your markets are most active.', Clock4],
  ['/news', 'News', 'Check the economic calendar before you trade.', Newspaper],
  ['/pnl-calendar', 'P&L Calendar', 'See green days, red days, R and monthly progress.', CalendarDays],
  ['/notebook', 'Notebook', 'Journal reviews, notes and reusable templates.', NotebookPen],
  ['/ai-coach', 'Trading Journal AI', 'Ask questions about your own journal and backtests.', Bot],
  ['/strategy-comparison', 'Strategy Comparison', 'Compare Strategy A and Strategy B statistically.', BarChart3],
] as const

export default function HomePage() {
  const quote = quotes[new Date().getDate() % quotes.length]

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <div className="landing-kicker"><Sparkles size={15}/> Your trading operating system</div>
          <h1>Build discipline.<br/><span>Trade with purpose.</span></h1>
          <p>Plan the session, protect your risk, record the trade, and review the evidence. Everything in Trading Journal Pro now follows one repeatable workflow.</p>
          <div className="landing-actions">
            <Link className="button" href="/trade-planner">Plan today’s trade <ArrowRight size={17}/></Link>
            <Link className="button secondary" href="/pnl-calendar">Open P&amp;L calendar</Link>
          </div>
          <div className="landing-principles">
            <span><ShieldCheck size={16}/> Protect capital</span>
            <span><ClipboardCheck size={16}/> Follow the plan</span>
            <span><BrainCircuit size={16}/> Review and improve</span>
          </div>
        </div>
        <div className="landing-visual" aria-label="Trading market illustration">
          <img src="/trading-success.svg" alt="Professional trading desk with rising market charts"/>
          <div className="visual-badge"><TrendingUp size={17}/><span><small>Today’s focus</small><strong>Process over outcome</strong></span></div>
        </div>
      </section>

      <section className="quote-banner">
        <Quote size={28}/><blockquote>“{quote.text}”</blockquote><span>— {quote.author}</span>
      </section>

      <section className="landing-section landing-tools-section">
        <div className="section-heading">
          <div><span className="eyebrow">Core workspace</span><h2>Everything you use most</h2></div>
          <p>Your key planning, journaling, analysis, psychology, and review tools are now grouped around the trading process.</p>
        </div>
        <div className="core-tools-grid">
          {coreTools.map(([href, title, description, Icon]) => (
            <Link href={href} className="core-tool-card" key={href}>
              <span className="core-tool-icon"><Icon size={20}/></span>
              <div><strong>{title}</strong><p>{description}</p></div>
              <ArrowRight size={17}/>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <div><span className="eyebrow">Daily workflow</span><h2>Your repeatable success path</h2></div>
          <p>Consistency is created before the trade, protected during the trade, and strengthened after the trade.</p>
        </div>
        <div className="success-grid">
          <Link href="/trade-planner" className="success-card"><span>01</span><ClipboardCheck/><h3>Plan</h3><p>Define bias, entry, invalidation, risk, session, and confirmation before execution.</p></Link>
          <Link href="/risk-center" className="success-card"><span>02</span><ShieldCheck/><h3>Protect</h3><p>Size every position responsibly and respect your daily and weekly risk limits.</p></Link>
          <Link href="/trades/new" className="success-card"><span>03</span><BookOpenCheck/><h3>Record</h3><p>Capture the setup, decision, emotion, screenshot, and outcome while details are fresh.</p></Link>
          <Link href="/pnl-calendar" className="success-card"><span>04</span><BarChart3/><h3>Review</h3><p>Study your P&amp;L, R, behavior and strategy statistics instead of judging one trade.</p></Link>
        </div>
      </section>

      <section className="motivation-panel">
        <div><Target size={30}/><span className="eyebrow">Remember</span><h2>You do not need to win every trade.</h2><p>You need a repeatable process, controlled risk, and enough data to know whether your edge is actually working.</p></div>
        <Link href="/goals" className="button">Review your goals <ArrowRight size={17}/></Link>
      </section>
    </div>
  )
}
