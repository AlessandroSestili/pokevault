// Game logo SVG icons — Pokéball, MTG tap symbol, YGO Eye of Wdjat
export function GameLogo({ game, size = 20 }: { game: 'pokemon' | 'magic' | 'yugioh'; size?: number }) {
  if (game === 'pokemon') return <PokeBall size={size} />
  if (game === 'magic')   return <MtgSymbol size={size} />
  return <YgoEye size={size} />
}

function PokeBall({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      {/* Red top */}
      <path d="M12 2C6.477 2 2 6.477 2 12h20C22 6.477 17.523 2 12 2Z" fill="#EE1515"/>
      {/* White bottom */}
      <path d="M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10H2Z" fill="#f0f0f0"/>
      {/* Outer ring */}
      <circle cx="12" cy="12" r="10" fill="none" stroke="#1a1a1a" strokeWidth="1.8"/>
      {/* Divider */}
      <line x1="2" y1="12" x2="22" y2="12" stroke="#1a1a1a" strokeWidth="1.8"/>
      {/* Button outer */}
      <circle cx="12" cy="12" r="3.5" fill="#1a1a1a"/>
      {/* Button inner */}
      <circle cx="12" cy="12" r="2" fill="#f0f0f0"/>
    </svg>
  )
}

function MtgSymbol({ size }: { size: number }) {
  // MTG 5-color pentagon (WUBRG) — the classic card-back symbol
  const cx = 12, cy = 12, R = 9.5, r = 4
  // Vertices of a pentagon (top-pointing)
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
  })
  const inner = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  const COLORS = ['#F9FAF4', '#3B9DFF', '#4a3b2e', '#FF4500', '#2D8B4E']
  // Each segment: outer-edge i→i+1 + inner vertex i+1 + inner vertex i (a wedge)
  const segs = pts.map((p, i) => {
    const p2 = pts[(i + 1) % 5]
    const q1 = inner[i]
    const q2 = inner[(i + 1) % 5]
    return `M${cx},${cy} L${p.x},${p.y} L${p2.x},${p2.y} Z`
  })

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      {segs.map((d, i) => (
        <path key={i} d={d} fill={COLORS[i]} stroke="#111" strokeWidth="0.5"/>
      ))}
      <circle cx={cx} cy={cy} r={r} fill="#111"/>
      <circle cx={cx} cy={cy} r={r - 0.8} fill="#1e1e1e"/>
      <circle cx={cx} cy={cy} r="10" fill="none" stroke="#333" strokeWidth="1"/>
    </svg>
  )
}

function YgoEye({ size }: { size: number }) {
  // Eye of Wdjat — stylized eye
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      {/* Outer eye outline */}
      <path d="M2 12 C6 6, 18 6, 22 12 C18 18, 6 18, 2 12Z" fill="#1a1400" stroke="#7B6B00" strokeWidth="1"/>
      {/* Iris */}
      <circle cx="12" cy="12" r="4.5" fill="#C8A000"/>
      {/* Pupil */}
      <circle cx="12" cy="12" r="2.5" fill="#1a1400"/>
      {/* Highlight */}
      <circle cx="10.5" cy="10.5" r="1" fill="rgba(255,230,100,0.6)"/>
      {/* Top lashes */}
      <path d="M8 8.5 L7 5.5" stroke="#1a1400" strokeWidth="1" strokeLinecap="round"/>
      <path d="M12 7.5 L12 4.5" stroke="#1a1400" strokeWidth="1" strokeLinecap="round"/>
      <path d="M16 8.5 L17 5.5" stroke="#1a1400" strokeWidth="1" strokeLinecap="round"/>
      {/* Bottom tear mark */}
      <path d="M12 16.5 C12 16.5, 11 18.5, 10 20" stroke="#C8A000" strokeWidth="1" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
