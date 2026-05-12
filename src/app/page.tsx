import { AppShell } from '@/components/AppShell'
import { fetchCards } from '@/lib/queries'
import { fetchMagicCards } from '@/lib/queries-magic'

export default async function HomePage() {
  const [pokemonCards, magicCards] = await Promise.all([
    fetchCards().catch(() => []),
    fetchMagicCards().catch(() => []),
  ])

  return (
    <AppShell
      initialCards={pokemonCards}
      initialMagicCards={magicCards}
    />
  )
}
