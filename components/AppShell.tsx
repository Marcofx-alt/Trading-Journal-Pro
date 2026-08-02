'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ThemeProvider from './ThemeProvider'
import AuthGuard from './AuthGuard'
import EnvironmentSetup from './EnvironmentSetup'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const authPage = pathname === '/login'

  if (!isSupabaseConfigured) return <EnvironmentSetup />

  return (
    <>
      <ThemeProvider />
      <AuthGuard>
        {authPage ? <main className="auth-shell">{children}</main> : (
          <div className="app-shell">
            <Sidebar />
            <main className="content">
              <div className="content-glow" aria-hidden="true" />
              <div className="content-inner">{children}</div>
              <footer className="mobile-footer">Trading Journal Pro · Built by Marco.N</footer>
            </main>
          </div>
        )}
      </AuthGuard>
    </>
  )
}
