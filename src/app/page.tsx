import { AppShell } from '@/components/AppShell'
import { fetchCards } from '@/lib/queries'

export default async function HomePage() {
  let cards: Awaited<ReturnType<typeof fetchCards>> = []
  try {
    cards = await fetchCards()
  } catch {
    // Supabase not configured — empty state
  }

  return <AppShell initialCards={cards} />
}
