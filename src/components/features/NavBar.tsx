'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Team } from '@/types'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/asta', label: 'Asta' },
  { href: '/formazione', label: 'Formazione' },
  { href: '/classifica', label: 'Classifica' },
  { href: '/mercato', label: 'Mercato' },
]

export default function NavBar({ team, userEmail }: { team: Team | null; userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-black text-red-500">F1</span>
          <span className="font-bold text-white hidden sm:block">FantaFormula1</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {team && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-zinc-400">{team.name}</span>
              <Badge variant="outline" className="border-red-600 text-red-400 font-mono">
                {team.fantamilioni}M
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white"
          >
            Esci
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex overflow-x-auto border-t border-zinc-800 px-4 py-1 gap-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  )
}
