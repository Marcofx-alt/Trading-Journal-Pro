export default function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return <div className="card stat-card"><div className="muted">{label}</div><div className="stat-value">{value}</div>{helper && <div className="helper">{helper}</div>}</div>
}
