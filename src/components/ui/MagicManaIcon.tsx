'use client'

// Inline SVG mana symbols — styled after official MTG mana pips
type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

const MANA: Record<ManaColor, { ring: string; bg: string; fg: string; shape: React.ReactNode }> = {
  W: {
    ring: '#C8B060', bg: '#F9F6DC', fg: '#C8A000',
    shape: (
      <>
        <circle cx="12" cy="12" r="4.5" fill="currentColor" opacity="0.25"/>
        {[0,60,120,180,240,300].map(a => {
          const r = (a * Math.PI) / 180
          return <line key={a} x1={12 + 3.5 * Math.cos(r)} y1={12 + 3.5 * Math.sin(r)} x2={12 + 6 * Math.cos(r)} y2={12 + 6 * Math.sin(r)} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        })}
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </>
    ),
  },
  U: {
    ring: '#3060A0', bg: '#3B9DFF', fg: '#C8E8FF',
    shape: (
      <path d="M12 5.5C9 5.5 7 8 7 10.5c0 1.8 1 3.5 2.5 4.5L12 18.5l2.5-3.5C16 14 17 12.3 17 10.5 17 8 15 5.5 12 5.5Z" fill="currentColor" opacity="0.9"/>
    ),
  },
  B: {
    ring: '#4A4060', bg: '#2D2540', fg: '#C8B8FF',
    shape: (
      <>
        <path d="M12 5c-1.5 0-4 1.5-4 5 0 2 1.5 3.5 3 4l-2 4.5h6l-2-4.5c1.5-.5 3-2 3-4 0-3.5-2.5-5-4-5Z" fill="currentColor" opacity="0.85"/>
      </>
    ),
  },
  R: {
    ring: '#A03020', bg: '#D04020', fg: '#FFD0A0',
    shape: (
      <path d="M12 4c0 0-3.5 3.5-3.5 7 0 1.2.4 2.5 1 3.5-1-1-1.5-1-2 0 0 1 .5 3 2 4.5 0-1.5 1-3 2.5-3.5 1.5.5 2.5 2 2.5 3.5 1.5-1.5 2-3.5 2-4.5-.5-1-1-1-2 0 .6-1 1-2.3 1-3.5C15.5 7.5 12 4 12 4Z" fill="currentColor" opacity="0.9"/>
    ),
  },
  G: {
    ring: '#306030', bg: '#2E7D32', fg: '#B8F0A0',
    shape: (
      <path d="M12 5C12 5 6 7.5 6 12.5c0 2 1 3.5 2.5 4.5 0-2 1-4 3-5-1 2-1.5 4-1 6h3c.5-2 0-4-1-6 2 1 3 3 3 5 1.5-1 2.5-2.5 2.5-4.5C18 7.5 12 5 12 5Z" fill="currentColor" opacity="0.9"/>
    ),
  },
  C: {
    ring: '#808080', bg: '#C0C0C0', fg: '#404040',
    shape: (
      <path d="M12 5l2.3 4.6 5.1.7-3.7 3.6.9 5.1L12 16.5l-4.6 2.5.9-5.1L4.6 10.3l5.1-.7z" fill="currentColor" opacity="0.85"/>
    ),
  },
}

export function MagicManaIcon({ color, size = 20 }: { color: string; size?: number }) {
  const m = MANA[color as ManaColor]
  if (!m) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={color}
    >
      <circle cx="12" cy="12" r="11.5" fill={m.bg}/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke={m.ring} strokeWidth="1.5"/>
      <g color={m.fg}>{m.shape}</g>
    </svg>
  )
}
