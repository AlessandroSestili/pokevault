'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { getAlertForCard, upsertAlert, deleteAlert } from '@/lib/actions-alerts'

export function PriceAlertWidget({
  cardId,
  game,
  currentPrice,
}: {
  cardId: string
  game: 'pokemon' | 'magic'
  currentPrice: number | null
}) {
  const [threshold, setThreshold] = useState('')
  const [hasAlert, setHasAlert] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getAlertForCard(cardId).then(alert => {
      if (alert) {
        setHasAlert(true)
        setThreshold(String(alert.threshold_eur))
      } else {
        setHasAlert(false)
        setThreshold(currentPrice ? String(Math.ceil(currentPrice * 1.2)) : '')
      }
      setLoading(false)
    })
  }, [cardId, currentPrice])

  async function save() {
    const val = parseFloat(threshold.replace(',', '.'))
    if (isNaN(val) || val <= 0) { setFeedback('Inserisci un valore valido'); return }
    setSaving(true)
    const ok = await upsertAlert(cardId, game, val)
    setSaving(false)
    if (ok) { setHasAlert(true); setFeedback('Alert salvato ✓') }
    else setFeedback('Errore nel salvataggio')
    setTimeout(() => setFeedback(null), 2500)
  }

  async function remove() {
    setSaving(true)
    const ok = await deleteAlert(cardId)
    setSaving(false)
    if (ok) { setHasAlert(false); setThreshold(''); setFeedback('Alert rimosso') }
    setTimeout(() => setFeedback(null), 2500)
  }

  if (loading) return null

  return (
    <div style={{
      margin: '0 20px',
      background: hasAlert ? 'rgba(45,216,129,0.06)' : 'var(--bg-2)',
      border: `1px solid ${hasAlert ? 'rgba(45,216,129,0.25)' : 'var(--line)'}`,
      borderRadius: 12, padding: '14px 16px',
      transition: 'background 200ms, border-color 200ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {hasAlert
          ? <Bell size={13} style={{ color: '#2DD881', flexShrink: 0 }} />
          : <BellOff size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
        }
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Alert prezzo
        </span>
        {hasAlert && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#2DD881', fontWeight: 600 }}>
            Attivo
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: 'var(--ink-3)', pointerEvents: 'none',
          }}>€</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
            placeholder="es. 25.00"
            style={{
              width: '100%', padding: '8px 10px 8px 22px',
              background: 'var(--bg-1)', border: '1px solid var(--line)',
              borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-mono)',
              color: 'var(--ink-0)', outline: 'none',
            }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: saving ? 'default' : 'pointer',
            background: '#2DD881', color: '#0a1a0f', fontSize: 12, fontWeight: 700,
            opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : null}
          {hasAlert ? 'Aggiorna' : 'Attiva'}
        </button>

        {hasAlert && (
          <button
            onClick={remove}
            disabled={saving}
            style={{
              padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
              cursor: saving ? 'default' : 'pointer',
              background: 'transparent', color: 'var(--ink-3)', fontSize: 12, flexShrink: 0,
            }}
          >
            <BellOff size={12} />
          </button>
        )}
      </div>

      {feedback && (
        <div style={{ marginTop: 8, fontSize: 11, color: feedback.includes('✓') || feedback.includes('rimosso') ? '#2DD881' : '#FF5B47' }}>
          {feedback}
        </div>
      )}

      {!hasAlert && currentPrice && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ink-3)' }}>
          Prezzo attuale: <span style={{ fontFamily: 'var(--font-mono)' }}>€{currentPrice.toFixed(2)}</span>
          {' · '}suggerito +20%
        </div>
      )}
    </div>
  )
}
