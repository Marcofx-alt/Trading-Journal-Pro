'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(pathname !== '/login')

  useEffect(() => {
    let active = true

    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (!active) return

      const signedIn = Boolean(data.session)
      if (!signedIn && pathname !== '/login') {
        router.replace('/login')
        return
      }
      if (signedIn && pathname === '/login') {
        router.replace('/home')
        return
      }
      setChecking(false)
    }

    checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== '/login') router.replace('/login')
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [pathname, router])

  if (checking) {
    return (
      <main className="auth-checking" aria-live="polite">
        <div className="auth-spinner" />
        <p>Opening your journal…</p>
      </main>
    )
  }

  return <>{children}</>
}
