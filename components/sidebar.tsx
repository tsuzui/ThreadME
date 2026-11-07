'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Sparkles,
  Settings,
  ScrollText,
  Bot,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Daftar Postingan',
    href: '/posts',
    icon: FileText,
  },
  {
    name: 'Kalender Konten',
    href: '/calendar',
    icon: Calendar,
  },
  {
    name: 'Topic Studio',
    href: '/topic-studio',
    icon: Sparkles,
    badge: 'V1.1',
  },
  {
    name: 'Pengaturan',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'System Logs',
    href: '/logs',
    icon: ScrollText,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-foreground">
            ThreadMe
          </span>
          <span className="block text-xs text-muted-foreground font-medium">
            AI Content Engine
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-6">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform group-hover:scale-110',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Cadence Info Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Jadwal Harian 19:00 WIB</span>
          </div>
          <p className="mt-1 text-muted-foreground leading-relaxed">
            1 post per hari kalender Asia/Jakarta. Persiapan konten dimulai pukul 18:40 WIB.
          </p>
        </div>
      </div>
    </aside>
  )
}
