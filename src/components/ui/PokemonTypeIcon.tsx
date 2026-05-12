// Official Pokémon energy symbol from pokesprite (msikma/pokesprite on GitHub)
export function PokemonTypeIcon({ type, size = 20 }: { type?: string | null; size?: number }) {
  if (!type) return null
  const name = type.toLowerCase().trim()
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://raw.githubusercontent.com/msikma/pokesprite/master/misc/energy/small/${name}.png`}
      alt={name}
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, imageRendering: 'auto' }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
    />
  )
}
