'use client'

import { useState, useEffect } from 'react'
import { LogOut, Clock, ShieldCheck, Menu, X } from 'lucide-react'
import { logout } from '@/app/login/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems, isNavigationActive } from './sidebar'

interface HeaderProps {
  userEmail?: string | null
}

export function Header({ userEmail }: HeaderProps) {
  const [wibTime, setWibTime] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const currentPage = navItems.find(item => isNavigationActive(pathname, item.href))?.name || 'Workspace'

  useEffect(() => {
    function updateClock() {
      setWibTime(`${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date())} WIB`)
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight sm:text-lg">{currentPage}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Personal content workspace</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 lg:gap-6">
          {wibTime && <span className="hidden items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground lg:inline-flex"><Clock className="h-4 w-4" />{wibTime}</span>}
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0df] text-[#9c642d]"><ShieldCheck className="h-5 w-5" /></span>
            <div><p className="text-xs font-semibold">Administrator</p><p className="mt-0.5 max-w-[160px] truncate text-[11px] text-muted-foreground">{userEmail || 'Admin ThreadMe'}</p></div>
          </div>
          <form action={logout}>
            <button type="submit" aria-label="Keluar dari sesi admin" title="Keluar dari sesi admin" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"><LogOut className="h-4 w-4" /></button>
          </form>
        </div>
      </header>
      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Navigasi mobile" className="sticky top-20 z-30 space-y-1 border-b border-border bg-card p-4 shadow-sm md:hidden">
          {navItems.map(item => {
            const active = isNavigationActive(pathname, item.href)
            const Icon = item.icon
            return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)} className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}><Icon className="h-4 w-4" />{item.name}</Link>
          })}
        </nav>
      )}
    </>
  )
}
