import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata = {
  title: 'Trading Journal Pro — Marco.N',
  description: 'Professional trading analytics and performance journal built by Marco.N',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>
}
