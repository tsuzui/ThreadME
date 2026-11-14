'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | null, formData: FormData) => {
      const res = await login(formData)
      return res || null
    },
    null
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-10">
        <div className="text-center">
          <Image src="/brand/threadme-logo.webp" alt="ThreadMe" width={960} height={254} priority className="mx-auto h-auto w-full max-w-[280px]" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            Masuk ke workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistem otomatisasi konten Threads pribadi. Akses dibatasi khusus pemilik akun.
          </p>
        </div>

        {state?.error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="font-medium">{state.error}</div>
          </div>
        )}

        <form action={formAction} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Admin
            </label>
            <div className="relative mt-2 rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@threadme.internal"
                className="block w-full rounded-lg border border-input bg-background/50 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kata Sandi
            </label>
            <div className="relative mt-2 rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="block w-full rounded-lg border border-input bg-background/50 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Memverifikasi...
              </span>
            ) : (
              <>
                Masuk ke Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-border pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Hanya 1 akun terotorisasi dalam tabel <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">admin_users</code> yang dapat masuk. Pendaftaran publik dinonaktifkan.
          </p>
        </div>
      </div>
    </div>
  )
}
