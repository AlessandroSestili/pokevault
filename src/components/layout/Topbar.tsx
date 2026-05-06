import Link from 'next/link'
import { LayoutGrid, Search, BarChart2 } from 'lucide-react'

const NAV = [
  { href: '/', icon: LayoutGrid, label: 'Collection' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/stats', icon: BarChart2, label: 'Stats' },
]

export function Topbar({ pathname }: { pathname: string }) {
  return (
    <header
      className="hidden md:flex items-center justify-between px-8 h-14 border-b sticky top-0 z-40"
      style={{
        background: 'rgba(13, 15, 22, 0.9)',
        backdropFilter: 'blur(20px)',
        borderColor: 'var(--border)',
      }}
    >
      <span
        className="font-display font-semibold text-[17px] tracking-[-0.4px]"
        style={{ color: 'var(--accent)' }}
      >
        PokeVault
      </span>

      <nav className="flex items-center gap-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-sans text-[13px] font-medium transition-colors"
              style={{
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-1)',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
