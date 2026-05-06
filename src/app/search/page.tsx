import { Topbar } from '@/components/layout/Topbar'
import { SearchShell } from '@/components/search/SearchShell'
import { BottomNav } from '@/components/layout/BottomNav'

export const metadata = { title: 'Cerca — PokeVault' }

export default function SearchPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar pathname="/search" />
      <SearchShell />
      <BottomNav />
    </div>
  )
}
