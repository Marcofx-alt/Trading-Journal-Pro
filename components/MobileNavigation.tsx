'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BarChart3, BellRing, BookOpenCheck, Bot, BrainCircuit, ChartNoAxesCombined,
  ChevronDown, ClipboardCheck, Clock4, FileUp, Gauge, Home, Images, Landmark,
  LayoutDashboard, ListChecks, LogOut, Menu, MoreHorizontal, PlusCircle,
  Radar, ScanSearch, Search, Settings, ShieldCheck, Target, TestTube2, X
} from 'lucide-react'
import BrandLogo from './BrandLogo'
import { supabase } from '@/lib/supabase'

const primary = [
  ['/home', 'Home', Home],
  ['/trade-planner', 'Planner', ClipboardCheck],
  ['/trades/new', 'New', PlusCircle],
  ['/trades', 'Trades', BookOpenCheck],
] as const

const moreItems = [
  ['/institutional-dashboard', 'Institutional Dashboard', Landmark],
  ['/command-center', 'Command Center', Gauge],
  ['/session-guide', 'Session Guide', Clock4],
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/chart-library', 'Chart Library', Images],
  ['/backtesting', 'Backtesting', TestTube2],
  ['/ai-coach', 'AI Coach', Bot],
  ['/strategies', 'Strategy Builder', ListChecks],
  ['/broker-sync', 'Broker Sync', FileUp],
  ['/analytics', 'Analytics Center', ChartNoAxesCombined],
  ['/live-assistant', 'Live Assistant', Radar],
  ['/chart-vision', 'AI Chart Vision', ScanSearch],
  ['/intelligence', 'Trade Intelligence', BrainCircuit],
  ['/risk-center', 'Risk Center', ShieldCheck],
  ['/smart-alerts', 'Smart Alerts', BellRing],
  ['/search', 'Global Search', Search],
  ['/goals', 'Goals', Target],
  ['/reviews/weekly', 'Weekly Review', BarChart3],
  ['/settings', 'Settings', Settings],
] as const

export default function MobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <header className="mobile-topbar">
        <BrandLogo compact />
        <button className="mobile-icon-button" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu size={22} />
        </button>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {primary.map(([href, label, Icon]) => (
          <Link key={href} href={href} className={pathname === href ? 'mobile-tab active' : 'mobile-tab'}>
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
        <button className={open ? 'mobile-tab active' : 'mobile-tab'} onClick={() => setOpen(true)}>
          <MoreHorizontal size={22} />
          <span>More</span>
        </button>
      </nav>

      {open && (
        <div className="mobile-sheet-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section className="mobile-sheet" role="dialog" aria-modal="true" aria-label="All app sections" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-head">
              <div>
                <span>Trading Journal Pro</span>
                <strong>All tools</strong>
              </div>
              <button className="mobile-icon-button" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={21} /></button>
            </div>
            <div className="mobile-sheet-grid">
              {moreItems.map(([href, label, Icon]) => (
                <Link key={href} href={href} className={pathname === href ? 'mobile-tool active' : 'mobile-tool'}>
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
            <button className="mobile-signout" onClick={signOut} disabled={signingOut}>
              <LogOut size={19} /> {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </section>
        </div>
      )}
    </>
  )
}
