import { CollectionShell } from '@/components/collection/CollectionShell'
import { Topbar } from '@/components/layout/Topbar'
import { fetchCards } from '@/lib/queries'

export default async function HomePage() {
  let cards: Awaited<ReturnType<typeof fetchCards>> = []
  try {
    cards = await fetchCards()
  } catch {
    // Supabase not configured yet — empty state
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar pathname="/" />
      <CollectionShell cards={cards} />
    </div>
  )
}
