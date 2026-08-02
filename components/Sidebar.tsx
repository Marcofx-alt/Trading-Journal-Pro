'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, BookOpenCheck, Brain, CalendarDays, Images, LayoutDashboard, PlusCircle, TestTube2, Settings, Sparkles, LogOut, Bot, ListChecks, FileUp, Target, ChartNoAxesCombined, Radar, ScanSearch, BrainCircuit, ShieldCheck, FileText, PanelsTopLeft, FlaskConical, Gauge, BellRing, Search, Lightbulb, ArchiveRestore, BookMarked, CandlestickChart, ClipboardCheck, GalleryHorizontalEnd, Landmark, Home, Clock4 } from 'lucide-react'
import BrandLogo from './BrandLogo'
import { supabase } from '@/lib/supabase'

const items = [
  ['/home', 'Home', Home],
  ['/institutional-dashboard', 'Institutional Dashboard', Landmark],
  ['/command-center', 'Command Center', Gauge],
  ['/session-guide', 'Session Guide', Clock4],
  ['/trade-planner', 'Trade Planner', ClipboardCheck],
  ['/playbooks', 'Playbook Library', BookMarked],
  ['/multi-chart', 'Multi-Chart Workspace', GalleryHorizontalEnd],
  ['/replay', 'Replay Mode', CandlestickChart],
  ['/workspace', 'Trading Workspace', PanelsTopLeft],
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/trades', 'Trades', BookOpenCheck],
  ['/trades/new', 'New Trade', PlusCircle],
  ['/chart-library', 'Chart Library', Images],
  ['/backtesting', 'Backtesting', TestTube2],
  ['/psychology', 'Psychology', Brain],
  ['/ai-coach', 'AI Coach', Bot],
  ['/strategies', 'Strategy Builder', ListChecks],
  ['/broker-sync', 'Broker Sync', FileUp],
  ['/analytics', 'Analytics Center', ChartNoAxesCombined],
  ['/live-assistant', 'Live Assistant', Radar],
  ['/chart-vision', 'AI Chart Vision', ScanSearch],
  ['/intelligence', 'Trade Intelligence', BrainCircuit],
  ['/risk-center', 'Risk Center', ShieldCheck],
  ['/strategy-lab', 'Strategy Lab', FlaskConical],
  ['/performance-insights', 'Performance Insights', Lightbulb],
  ['/smart-alerts', 'Smart Alerts', BellRing],
  ['/search', 'Global Search', Search],
  ['/reports', 'Reports Center', FileText],
  ['/backup-center', 'Backup & Recovery', ArchiveRestore],
  ['/goals', 'Goals', Target],
  ['/reviews/weekly', 'Weekly Review', CalendarDays],
  ['/reviews/monthly', 'Monthly Review', BarChart3],
  ['/settings', 'Settings', Settings],
] as const

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert(`Could not sign out: ${error.message}`)
      setSigningOut(false)
      return
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><BrandLogo /></div>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-nav">
        {items.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? 'nav active' : 'nav'}
            aria-label={label}
            title={label}
            data-label={label}
          >
            <Icon size={20} />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <button
        className="nav sign-out-button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label={signingOut ? 'Signing out' : 'Sign out'}
        title={signingOut ? 'Signing out' : 'Sign out'}
        data-label={signingOut ? 'Signing out…' : 'Sign out'}
      >
        <LogOut size={18} />
        <span className="nav-label">{signingOut ? 'Signing out…' : 'Sign out'}</span>
      </button>
      <div className="sidebar-callout">
        <Sparkles size={17} />
        <div><strong>Marco.N Edition</strong><span>Your private performance system.</span></div>
      </div>
      <footer className="sidebar-footer">
        <span>Version 20.3</span>
        <span>© 2026 Marco.N</span>
      </footer>
    </aside>
  )
}
