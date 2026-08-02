'use client'

import Link from 'next/link'
import { ArrowRight, BookOpenCheck, BrainCircuit, ChartNoAxesCombined, ClipboardCheck, Quote, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react'

const quotes = [
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The goal of a successful trader is to make the best trades. Money is secondary.', author: 'Alexander Elder' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
]

export default function HomePage() {
  const quote = quotes[new Date().getDate() % quotes.length]

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <div className="landing-kicker"><Sparkles size={15}/> Your journey to trading excellence</div>
          <h1>Build discipline.<br/><span>Trade with purpose.</span></h1>
          <p>Welcome back to your private performance system. Plan carefully, execute patiently, and let every recorded trade move you closer to consistency.</p>
          <div className="landing-actions">
            <Link className="button" href="/trade-planner">Plan today’s trade <ArrowRight size={17}/></Link>
            <Link className="button secondary" href="/institutional-dashboard">View performance</Link>
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
        <Quote size={28}/>
        <blockquote>“{quote.text}”</blockquote>
        <span>— {quote.author}</span>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <div><span className="eyebrow">Start with intention</span><h2>Your daily success path</h2></div>
          <p>Consistency is created before the trade, protected during the trade, and strengthened after the trade.</p>
        </div>
        <div className="success-grid">
          <Link href="/trade-planner" className="success-card"><span>01</span><ClipboardCheck/><h3>Plan</h3><p>Define your bias, entry, invalidation, risk, and confirmations before execution.</p></Link>
          <Link href="/risk-center" className="success-card"><span>02</span><ShieldCheck/><h3>Protect</h3><p>Size every position responsibly and respect your daily and weekly limits.</p></Link>
          <Link href="/trades/new" className="success-card"><span>03</span><BookOpenCheck/><h3>Record</h3><p>Capture the setup, decision, emotion, screenshot, and outcome while details are fresh.</p></Link>
          <Link href="/intelligence" className="success-card"><span>04</span><ChartNoAxesCombined/><h3>Improve</h3><p>Turn your journal history into evidence-backed lessons and stronger habits.</p></Link>
        </div>
      </section>

      <section className="motivation-panel">
        <div><Target size={30}/><span className="eyebrow">Remember</span><h2>You do not need to win every trade.</h2><p>You need a repeatable process, controlled risk, and the patience to let your edge play out over many trades.</p></div>
        <Link href="/goals" className="button">Review your goals <ArrowRight size={17}/></Link>
      </section>
    </div>
  )
}
