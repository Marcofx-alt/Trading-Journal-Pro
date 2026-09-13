'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BookOpenCheck, Brain, Images, LayoutDashboard, PlusCircle, TestTube2,
  Settings, Sparkles, LogOut, Bot, FileUp, Target, ChartNoAxesCombined,
  Radar, BrainCircuit, ShieldCheck, FileText, PanelsTopLeft, FlaskConical,
  GitCompareArrows, Gauge, BellRing, Search, Lightbulb, BookMarked,
  ClipboardCheck, Landmark, Home, Clock4, NotebookPen, Newspaper, Leaf,
  CalendarDays
} from 'lucide-react'
import BrandLogo from './BrandLogo'
import { supabase } from '@/lib/supabase'

type NavItem = readonly [string, string, any]

type NavGroup = {
  label: string
  items: readonly NavItem[]
}

const groups: readonly NavGroup[] = [
  {
    label: 'Start',
    items: [
      ['/home', 'Home', Home],
      ['/institutional-dashboard', 'Institutional Dashboard', Landmark],
      ['/command-center', 'Command Center', Gauge],
      ['/session-guide', 'Session Guide', Clock4],
    ],
  },
  {
    label: 'Plan & Execute',
    items: [
      ['/trade-planner', 'Trade Planner', ClipboardCheck],
      ['/playbooks', 'Trading Plans', BookMarked],
      ['/news', 'News', Newspaper],
      ['/workspace', 'Trading Workspace', PanelsTopLeft],
      ['/trades/new', 'New Trade', PlusCircle],
      ['/trades', 'Trades', BookOpenCheck],
      ['/chart-library', 'Chart Library', Images],
      ['/live-assistant', 'Live Assistant', Radar],
      ['/risk-center', 'Risk Center', ShieldCheck],
      ['/smart-alerts', 'Smart Alerts', BellRing],
    ],
  },
  {
    label: 'Review & Improve',
    items: [
      ['/pnl-calendar', 'P&L Calendar', CalendarDays],
      ['/dashboard', 'Dashboard', LayoutDashboard],
      ['/analytics', 'Analytics Center', ChartNoAxesCombined],
      ['/intelligence', 'Trade Intelligence', BrainCircuit],
      ['/performance-insights', 'Performance Insights', Lightbulb],
      ['/reports', 'Reports Center', FileText],
      ['/notebook', 'Notebook', NotebookPen],
      ['/psychology', 'Psychology', Brain],
      ['/sanctuary', 'Sanctuary', Leaf],
      ['/ai-coach', 'Trading Journal AI', Bot],
    ],
  },
  {
    label: 'Research & System',
    items: [
      ['/backtesting', 'Backtesting', TestTube2],
      ['/strategy-comparison', 'Strategy Comparison', GitCompareArrows],
      ['/strategy-lab', 'Strategy Lab', FlaskConical],
      ['/broker-sync', 'Broker Sync', FileUp],
      ['/search', 'Global Search', Search],
      ['/goals', 'Goals', Target],
      ['/settings', 'Settings', Settings],
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/trades' && pathname.startsWith('/trades/') && pathname !== '/trades/new') return true
  return false
}

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
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map((group, groupIndex) => (
          <div className="sidebar-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                className={isActive(pathname, href) ? 'nav active' : 'nav'}
                aria-label={label}
                title={label}
                data-label={label}
              >
                <Icon size={20} />
                <span className="nav-label">{label}</span>
              </Link>
            ))}
            {groupIndex < groups.length - 1 && <div className="sidebar-group-divider" aria-hidden="true" />}
          </div>
        ))}
      </nav>
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
        <span>Version 23.2</span>
        <span>© 2026 Marco.N</span>
      </footer>
    </aside>
  )
}
