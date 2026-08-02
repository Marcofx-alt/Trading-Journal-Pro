import { TrendingUp } from 'lucide-react'

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand-lockup compact' : 'brand-lockup'}>
      <div className="brand-mark" aria-hidden="true"><TrendingUp size={22} strokeWidth={2.6} /></div>
      <div>
        <div className="brand-name">Trading Journal Pro</div>
        <div className="brand-byline">Built by Marco.N</div>
      </div>
    </div>
  )
}
