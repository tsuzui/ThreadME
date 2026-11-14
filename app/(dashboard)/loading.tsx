export default function DashboardLoading() {
  return <div role="status" aria-live="polite" className="space-y-5" aria-busy="true">
    <p className="text-sm text-muted-foreground">Memuat halaman…</p>
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 motion-safe:animate-pulse">
      {[0, 1, 2, 3].map(item => <div key={item} className="h-36 rounded-2xl border border-border bg-card" />)}
    </div>
    <div aria-hidden="true" className="h-72 rounded-2xl border border-border bg-card motion-safe:animate-pulse" />
  </div>
}
