import './globals.css'
import type { Metadata, Viewport } from 'next'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Trading Journal Pro — Marco.N',
  description: 'Professional trading analytics and performance journal built by Marco.N',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Journal Pro', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#7c9cff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>
}
