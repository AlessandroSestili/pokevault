'use client'

import { useMemo, useId } from 'react'

export function AreaChart({
  values,
  color = '#FFCB2E',
  height = 130,
}: {
  values: number[]
  color?: string
  height?: number
}) {
  const id = useId()
  const gid = `ag-${id.replace(/:/g, '')}`
  const width = 800
  const pad = { l: 8, r: 8, t: 8, b: 18 }

  const pts = useMemo(() => {
    if (!values || values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const dx = (width - pad.l - pad.r) / (values.length - 1 || 1)
    const arr = values.map((v, i) => {
      const x = pad.l + i * dx
      const y = pad.t + (height - pad.t - pad.b) * (1 - (v - min) / range)
      return [x, y] as [number, number]
    })
    const line = arr.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ')
    const area = `${line} L${arr[arr.length - 1][0].toFixed(1)},${height - pad.b} L${arr[0][0].toFixed(1)},${height - pad.b} Z`
    return { line, area, arr }
  }, [values, height])

  if (!pts) return null
  const last = pts.arr[pts.arr.length - 1]

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(p => (
        <line
          key={p}
          x1={pad.l} x2={width - pad.r}
          y1={pad.t + (height - pad.t - pad.b) * p}
          y2={pad.t + (height - pad.t - pad.b) * p}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      ))}
      <path d={pts.area} fill={`url(#${gid})`} />
      <path className="line" d={pts.line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
      <circle cx={last[0]} cy={last[1]} r="8" fill={color} opacity="0.18" />
    </svg>
  )
}
