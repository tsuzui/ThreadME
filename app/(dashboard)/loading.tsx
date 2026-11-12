export default function DashboardLoading() {
  return <div role="status" aria-live="polite" className="space-y-5" aria-busy="true">
    <p className="text-sm text-muted-foreground">Memuat halaman…</p>
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 motion-safe:animate-pulse">
      {[0, 1, 2].map(item => <div key={item} className="h-36 rounded-2xl border border-border bg-muted/30" />)}
    </div>
  </div>
}
