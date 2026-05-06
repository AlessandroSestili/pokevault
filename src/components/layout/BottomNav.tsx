'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Search, BarChart2, Plus } from 'lucide-react'

const NAV = [
  { href: '/', icon: LayoutGrid, label: 'Collection' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/stats', icon: BarChart2, label: 'Stats' },
]

export function BottomNav({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-end"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="w-full flex items-center justify-around px-4 border-t"
        style={{
          height: 'var(--bottom-nav-h)',
          background: 'rgba(13, 15, 22, 0.92)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
        }}
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-1 px-4"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? 'var(--accent)' : 'var(--text-2)' }}
              />
              <span
                className="font-mono text-[10px] tracking-[0.5px]"
                style={{ color: active ? 'var(--accent)' : 'var(--text-2)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}

        {onAdd && (
          <button onClick={onAdd} className="flex flex-col items-center gap-1 py-1 px-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Plus size={18} strokeWidth={2.5} className="text-black" />
            </div>
          </button>
        )}
      </div>
    </nav>
  )
}
