'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PenSquare, FileText, Calendar, Sparkles, Settings, ScrollText, Bot, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Buat Postingan', href: '/posts/new', icon: PenSquare },
  { name: 'Daftar Postingan', href: '/posts', icon: FileText },
  { name: 'Kalender Konten', href: '/calendar', icon: Calendar },
  { name: 'Topic Studio', href: '/topic-studio', icon: Sparkles },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
  { name: 'System Logs', href: '/logs', icon: ScrollText },
]

export function isNavigationActive(pathname: string, href: string) {
  if (href === '/posts') return pathname === href || (pathname.startsWith('/posts/') && pathname !== '/posts/new')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex xl:w-64">
      <Link href="/dashboard" className="flex h-24 items-center gap-3 px-7" aria-label="ThreadMe Dashboard">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bot className="h-6 w-6" />
        </span>
        <span className="text-xl font-bold tracking-tight">ThreadMe<span className="block text-[10px] font-medium tracking-[0.15em] text-muted-foreground">CONTENT WORKSPACE</span></span>
      </Link>

      <div className="px-7 pb-3 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
      <nav aria-label="Navigasi utama" className="flex-1 space-y-1.5 overflow-y-auto px-4">
        {navItems.map((item, index) => {
          const active = isNavigationActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
              className={cn('flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-colors', index === 5 && '!mt-7', active ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-5">
        <div className="rounded-2xl bg-accent p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary"><Sparkles className="h-4 w-4" /></div>
          <p className="text-sm font-semibold">Ruang untuk ide Anda</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Siapkan draf, tinjau, lalu terbitkan sesuai jadwal WIB.</p>
          <Link href="/settings" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">Atur jadwal <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">ThreadMe · Personal content engine</p>
      </div>
    </aside>
  )
}
