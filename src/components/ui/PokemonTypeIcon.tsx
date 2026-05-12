'use client'

// Inline SVG energy symbols — no external CDN dependency
const TYPES: Record<string, { bg: string; fg: string; shape: React.ReactNode }> = {
  fire: {
    bg: '#D32F2F', fg: '#FFCB2E',
    shape: (
      <path d="M12 3c0 0-3 4-3 7.5 0 1.2.5 2 1.2 2.5C10 11 10 9.5 11 8.5c0 2 1 3.5 1 5 0 1.1-.5 2-1.2 2.5C12 19 14 17 14 14.5c0-1.5-.8-3-1-3.5.8 1 1.5 1 1.5 1S16 10 12 3Z" fill="currentColor"/>
    ),
  },
  water: {
    bg: '#1565C0', fg: '#90CAF9',
    shape: (
      <path d="M12 4C12 4 6 11 6 14.5a6 6 0 0 0 12 0C18 11 12 4 12 4Z" fill="currentColor"/>
    ),
  },
  lightning: {
    bg: '#F57F17', fg: '#FFF176',
    shape: (
      <path d="M13 3L7 13h5l-2 8 8-11h-5l2-7z" fill="currentColor"/>
    ),
  },
  grass: {
    bg: '#2E7D32', fg: '#A5D6A7',
    shape: (
      <path d="M12 4C8 4 5 8 5 12c0 1 .2 2 .5 2.8C7 10 10 8 12 8c-1 2-2 4-2 6 0 1 .3 2 .8 2.8.4-.8.8-1.8.8-2.8 0-2 1-4 2-6 2 0 5 2 6.5 6.8.3-.8.5-1.8.5-2.8 0-4-3-8-7-8Z" fill="currentColor"/>
    ),
  },
  psychic: {
    bg: '#6A1B9A', fg: '#E1BEE7',
    shape: (
      <>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
        <path d="M12 6l1 3-1 .5-1-.5z M12 18l1-3-1-.5-1 .5z M6 12l3 1 .5-1-.5-1z M18 12l-3 1-.5-1 .5-1z" fill="currentColor" opacity="0.7"/>
        <circle cx="12" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
        <circle cx="12" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
        <circle cx="7" cy="12" r="1.2" fill="currentColor" opacity="0.6"/>
        <circle cx="17" cy="12" r="1.2" fill="currentColor" opacity="0.6"/>
      </>
    ),
  },
  darkness: {
    bg: '#263238', fg: '#90A4AE',
    shape: (
      <path d="M14.5 4C10 4 6 8 6 12s4 8 8.5 8c1.5 0 2.8-.4 4-.9C16.5 20.3 14.4 21 12 21c-5 0-9-4-9-9s4-9 9-9c2.4 0 4.5.9 6.2 2.3-1-.8-2.3-1.3-3.7-1.3Z" fill="currentColor"/>
    ),
  },
  fairy: {
    bg: '#AD1457', fg: '#F8BBD9',
    shape: (
      <>
        <path d="M12 4l1.5 5.5L19 8l-4 4 1.5 5.5L12 15l-4.5 2.5L9 12l-4-4 5.5 1.5z" fill="currentColor"/>
      </>
    ),
  },
  fighting: {
    bg: '#BF360C', fg: '#FFCCBC',
    shape: (
      <path d="M8 6c0 0 1 2 0 4 1 0 2-1 3-1 0 1-1 2-1 3 1-1 3-2 4-1-1 1-2 3-1 4 1-2 3-3 4-3-1 2-1 4 0 5 1-3 2-5 2-5s-2-1-2-3c0-2 2-4 1-5-1 1-3 1-4 0-1-2-4-2-6-1l.2 2Z" fill="currentColor"/>
    ),
  },
  metal: {
    bg: '#546E7A', fg: '#CFD8DC',
    shape: (
      <path d="M12 4l2.5 6.5H21l-5.5 4 2 6.5L12 17l-5.5 4 2-6.5L3 10.5h6.5z" fill="currentColor"/>
    ),
  },
  dragon: {
    bg: '#4527A0', fg: '#B39DDB',
    shape: (
      <path d="M12 4c-1 2-3 3-4 3 1 1 2 3 1 5 1-1 2-1 3-1-1 2-1 4 0 6 1-2 2-4 4-4-1 1-1 3 0 4 1-3 3-5 3-7 0-3-3-6-7-6Z" fill="currentColor"/>
    ),
  },
  colorless: {
    bg: '#757575', fg: '#EEEEEE',
    shape: (
      <path d="M12 4l2 4 4.5.5-3.3 3.2.8 4.5L12 14l-4 2.2.8-4.5L5.5 8.5 10 8z" fill="currentColor"/>
    ),
  },
}

export function PokemonTypeIcon({ type, size = 20 }: { type?: string | null; size?: number }) {
  if (!type) return null
  const key = type.toLowerCase().trim()
  const t = TYPES[key]
  if (!t) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', flexShrink: 0, borderRadius: '50%' }}
      aria-label={key}
    >
      <circle cx="12" cy="12" r="12" fill={t.bg}/>
      <g color={t.fg}>{t.shape}</g>
    </svg>
  )
}
