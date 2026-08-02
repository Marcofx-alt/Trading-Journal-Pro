'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function InstallAppPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    const handler = (incoming: Event) => {
      incoming.preventDefault()
      setEvent(incoming as InstallEvent)
      setHidden(false)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!event) return
    await event.prompt()
    await event.userChoice
    setEvent(null)
    setHidden(true)
  }

  if (hidden || !event) return null

  return (
    <aside className="install-prompt" aria-label="Install Trading Journal Pro">
      <div className="install-prompt-icon"><Download size={20} /></div>
      <div><strong>Install Trading Journal Pro</strong><span>Open it like an app from your home screen.</span></div>
      <button className="button" onClick={install}>Install</button>
      <button className="install-close" onClick={() => setHidden(true)} aria-label="Dismiss install prompt"><X size={18} /></button>
    </aside>
  )
}
