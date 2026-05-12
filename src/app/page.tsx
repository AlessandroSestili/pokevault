import { AppShell } from '@/components/AppShell'
import { fetchCards } from '@/lib/queries'
import { fetchMagicCards } from '@/lib/queries-magic'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [pokemonCards, magicCards] = await Promise.all([
    fetchCards().catch(() => []),
    fetchMagicCards().catch(() => []),
  ])

  return (
    <AppShell
      initialCards={pokemonCards}
      initialMagicCards={magicCards}
      user={user ? { id: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? user.email ?? '' } : null}
    />
  )
}
