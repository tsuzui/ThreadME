'use client'

import { useState, useEffect } from 'react'
import { LogOut, Clock, ShieldCheck, Menu, X } from 'lucide-react'
import { logout } from '@/app/login/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface HeaderProps {
  userEmail?: string | null
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Daftar Postingan', href: '/posts' },
  { name: 'Kalender Konten', href: '/calendar' },
  { name: 'Topic Studio', href: '/topic-studio' },
  { name: 'Pengaturan', href: '/settings' },
  { name: 'System Logs', href: '/logs' },
]

export function Header({ userEmail }: HeaderProps) {
  const [wibTime, setWibTime] = useState<string>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now)
      setWibTime(`${timeStr} WIB`)
    }

    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/70 px-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
            {wibTime && (
              <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-mono text-muted-foreground sm:inline-flex">
                <Clock className="h-3.5 w-3.5" />
                {wibTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 text-xs sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">Single Admin</div>
              <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                {userEmail || 'admin@threadme'}
              </div>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30"
              title="Keluar dari sesi admin"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-card p-4 md:hidden">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
