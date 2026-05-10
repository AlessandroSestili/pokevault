'use client'

import { useMemo, useId } from 'react'

function buildPath(values: number[], w: number, h: number, pad = 2) {
  if (!values || values.length === 0) return { line: '', area: '' }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const dx = (w - pad * 2) / (values.length - 1 || 1)
  const pts = values.map((v, i) => {
    const x = pad + i * dx
    const y = pad + (h - pad * 2) * (1 - (v - min) / range)
    return [x, y] as [number, number]
  })
  const line = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`
  return { line, area }
}

export function Sparkline({ values, width = 220, height = 32 }: { values: number[]; width?: number; height?: number }) {
  const id = useId()
  const { line, area } = useMemo(() => buildPath(values, width, height, 2), [values, width, height])
  const positive = values.length > 1 ? values[values.length - 1] >= values[0] : true
  const c = positive ? '#2DD881' : '#FF5B47'
  const gid = `sg-${id.replace(/:/g, '')}`
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.35" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path className="line" d={line} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
