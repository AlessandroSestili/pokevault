// Official MTG mana symbols from Scryfall CDN
const LABEL: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
}

export function MagicManaIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://svgs.scryfall.io/card-symbols/${color}.svg`}
      alt={LABEL[color] ?? color}
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}
