'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Search, Loader2, ChevronDown, Sparkles } from 'lucide-react'
import type { ScryfallCard, MagicColor, MagicCondition } from '@/types'
import { searchMagicCards, getScryfallImage, getScryfallPrice, getCardColors, parseCardType } from '@/lib/api/scryfall'
import { addMagicCardAction } from '@/lib/actions-magic'
import { MagicManaIcon } from '@/components/ui/MagicManaIcon'

const CONDITIONS: MagicCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
const CONDITION_LABEL: Record<MagicCondition, string> = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
}
const CONDITION_COLOR: Record<MagicCondition, string> = {
  NM: '#2DD881', LP: '#FFCB2E', MP: '#FF9A3B', HP: '#FF5B47', DMG: '#B07BFF',
}
const LANGUAGES = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES = ['Cardmarket', 'TCGPlayer', 'eBay', 'Negozio locale', 'Scambio', 'Asta', 'Altro']
const FORMATS = ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Commander', 'Vintage', 'Altro']

function useDebounce<T>(v: T, ms: number): T {
  const [d, setD] = useState(v)
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms)
    return () => clearTimeout(t)
  }, [v, ms])
  return d
}

type Form = {
  language: string
  condition: MagicCondition
  foil: boolean
  cost_basis: string
  source: string
  format: string
  notes: string
}

const DEFAULT_FORM: Form = {
  language: 'EN', condition: 'NM', foil: false,
  cost_basis: '', source: 'Cardmarket', format: 'Commander', notes: '',
}

export function AddMagicCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ScryfallCard | null>(null)
  const [form, setForm] = useState<Form>(DEFAULT_FORM)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const debouncedQ = useDebounce(query, 350)

  // Scryfall search
  useEffect(() => {
    if (!open || !debouncedQ.trim() || debouncedQ.length < 2) return
    let cancelled = false
    setLoading(true)
    searchMagicCards(debouncedQ, 12).then(r => {
      if (!cancelled) { setResults(r); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [debouncedQ, open])

  // Reset when modal closes (delayed to allow close animation)
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setQuery(''); setResults([]); setSelected(null)
        setForm(DEFAULT_FORM); setError(null); setSuccess(false)
      }, 300)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function selectCard(card: ScryfallCard) {
    const price = getScryfallPrice(card, form.foil)
    setSelected(card)
    setForm(f => ({ ...f, cost_basis: price != null ? price.toFixed(2) : f.cost_basis }))
    setResults([])
    setQuery('')
  }

  function setFoil(foil: boolean) {
    setForm(f => {
      const price = selected ? getScryfallPrice(selected, foil) : null
      return { ...f, foil, cost_basis: price != null ? price.toFixed(2) : f.cost_basis }
    })
  }

  function handleSubmit() {
    if (!selected) return
    setError(null)
    const colors = getCardColors(selected)
    const imageUrl = getScryfallImage(selected, 'normal')
    const imageBack = selected.card_faces?.[1]?.image_uris?.normal ?? null

    startTransition(async () => {
      const id = await addMagicCardAction({
        name: selected.name,
        set_id: selected.set,
        set_name: selected.set_name,
        collector_number: selected.collector_number,
        api_id: selected.id,
        image_url: imageUrl,
        image_url_back: imageBack,
        colors,
        mana_cost: selected.mana_cost,
        cmc: selected.cmc,
        type_line: selected.type_line,
        card_type: parseCardType(selected.type_line),
        rarity: selected.rarity,
        foil: form.foil,
        language: form.language,
        condition: form.condition,
        cost_basis: parseFloat(form.cost_basis) || 0,
        source: form.source,
        format: form.format || null,
        acquired_date: new Date().toISOString().slice(0, 10),
        notes: form.notes || null,
        is_favorite: false,
      })

      if (!id) { setError('Errore durante il salvataggio. Riprova.'); return }
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSelected(null)
        setForm(DEFAULT_FORM)
      }, 1200)
    })
  }

  if (!open) return null

  // Derive display values — avoids synchronous setState in effects
  const displayResults = debouncedQ.length >= 2 ? results : []
  const displayLoading = loading && debouncedQ.length >= 2
  const scryfallImage = selected ? getScryfallImage(selected, 'normal') : null
  const selectedColors = selected ? getCardColors(selected) : []

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 100, backdropFilter: 'blur(4px)',
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '92vw', maxWidth: 720, maxHeight: '90vh',
        background: 'var(--bg-1)', border: '1px solid var(--line-2)',
        borderRadius: 20, zIndex: 101,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'radial-gradient(circle at 35% 30%, #A5B4FC 0%, #7B7CF7 45%, #4F46E5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>✦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-0)' }}>Aggiungi carta Magic</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Cerca su Scryfall · tutti i set</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            <X size={16} style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Left: search */}
          <div style={{
            width: selected ? 280 : '100%', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderRight: selected ? '1px solid var(--line)' : 'none',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Nome carta, set… oppure SLD-2013"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  style={{
                    width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                    background: 'var(--bg-2)', border: '1px solid var(--line)',
                    borderRadius: 10, color: 'var(--ink-0)', fontSize: 13, outline: 'none',
                  }}
                />
                {displayLoading && (
                  <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {selected && !query && (
                <div onClick={() => { setSelected(null); setQuery('') }}
                  style={{ padding: '8px 10px', fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 8, marginBottom: 4 }}>
                  ← Cambia carta
                </div>
              )}
              {displayResults.map(card => (
                <ScryfallRow key={card.id} card={card} selected={selected?.id === card.id} onClick={() => selectCard(card)} />
              ))}
              {!displayLoading && debouncedQ.length >= 2 && displayResults.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Nessuna carta trovata</div>
              )}
              {!query && !selected && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  <Sparkles size={24} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  Cerca una carta per nome o set
                </div>
              )}
            </div>
          </div>

          {/* Right: form */}
          {selected && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Card preview */}
              <div style={{ padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start', borderBottom: '1px solid var(--line)' }}>
                <div style={{ width: 80, flexShrink: 0, aspectRatio: '5/7', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)' }}>
                  {scryfallImage
                    ? <img src={scryfallImage} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✦</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-0)', marginBottom: 3 }}>{selected.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{selected.set_name} · #{selected.collector_number}</div>
                  {selected.mana_cost && <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{selected.mana_cost}</div>}
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 8 }}>{selected.type_line}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {selectedColors.map(c => (
                      <MagicManaIcon key={c} color={c} size={20} />
                    ))}
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'var(--bg-2)', color: 'var(--ink-3)', textTransform: 'capitalize' }}>
                      {selected.rarity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Foil */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Foil</span>
                  <button onClick={() => setFoil(!form.foil)} style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: form.foil ? 'linear-gradient(90deg, #FFCB2E, #B07BFF)' : 'var(--bg-3)',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: form.foil ? 23 : 3, transition: 'left 0.2s',
                    }} />
                  </button>
                </div>

                {/* Condition */}
                <div>
                  <FieldLabel>Condizione</FieldLabel>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {CONDITIONS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, condition: c }))} title={CONDITION_LABEL[c]} style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: form.condition === c ? CONDITION_COLOR[c] + '22' : 'var(--bg-2)',
                        border: `1px solid ${form.condition === c ? CONDITION_COLOR[c] : 'var(--line)'}`,
                        color: form.condition === c ? CONDITION_COLOR[c] : 'var(--ink-2)',
                        cursor: 'pointer',
                      }}>{c}</button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <FieldLabel>Costo acquisto (€)</FieldLabel>
                  <input
                    type="number" step="0.01" value={form.cost_basis}
                    onChange={e => setForm(f => ({ ...f, cost_basis: e.target.value }))}
                    placeholder="0.00"
                    style={{
                      marginTop: 6, width: '100%', padding: '9px 12px',
                      background: 'var(--bg-2)', border: '1px solid var(--line)',
                      borderRadius: 10, color: 'var(--ink-0)', fontSize: 13, outline: 'none',
                    }}
                  />
                  {selected.prices.eur && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                      Scryfall: €{selected.prices.eur}{selected.prices.eur_foil ? ` · Foil: €${selected.prices.eur_foil}` : ''}
                    </div>
                  )}
                </div>

                {/* Language + Source */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <FieldLabel>Lingua</FieldLabel>
                    <SelectField value={form.language} onChange={v => setForm(f => ({ ...f, language: v }))} options={LANGUAGES} />
                  </div>
                  <div>
                    <FieldLabel>Fonte</FieldLabel>
                    <SelectField value={form.source} onChange={v => setForm(f => ({ ...f, source: v }))} options={SOURCES} />
                  </div>
                </div>

                {/* Format */}
                <div>
                  <FieldLabel>Formato principale</FieldLabel>
                  <SelectField value={form.format} onChange={v => setForm(f => ({ ...f, format: v }))} options={FORMATS} />
                </div>

                {/* Notes */}
                <div>
                  <FieldLabel>Note (opzionale)</FieldLabel>
                  <textarea
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Nessuna nota..." rows={2}
                    style={{
                      marginTop: 6, width: '100%', padding: '9px 12px',
                      background: 'var(--bg-2)', border: '1px solid var(--line)',
                      borderRadius: 10, color: 'var(--ink-0)', fontSize: 13, outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ color: '#FF5B47', fontSize: 12, background: 'rgba(255,91,71,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                    {error}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--line)' }}>
                <button onClick={handleSubmit} disabled={isPending || success} style={{
                  width: '100%', padding: '11px',
                  background: success ? '#2DD881' : 'linear-gradient(135deg, #7B7CF7, #4F46E5)',
                  border: 'none', borderRadius: 12,
                  color: success ? '#000' : '#fff',
                  fontWeight: 700, fontSize: 14, cursor: isPending ? 'wait' : 'pointer',
                  transition: 'background 0.2s',
                }}>
                  {success ? '✓ Aggiunta!' : isPending ? 'Aggiunta…' : 'Aggiungi alla collezione'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ScryfallRow({ card, selected, onClick }: { card: ScryfallCard; selected: boolean; onClick: () => void }) {
  const colors = card.colors ?? card.color_identity ?? []
  const imgUrl = card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small

  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 10, alignItems: 'center',
      padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
      background: selected ? 'rgba(123,124,247,0.12)' : 'transparent',
      border: `1px solid ${selected ? '#7B7CF7' : 'transparent'}`,
      transition: 'background 120ms, border-color 120ms', marginBottom: 2,
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-2)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {imgUrl
        ? <img src={imgUrl} alt={card.name} style={{ width: 36, height: 50, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 36, height: 50, borderRadius: 5, background: 'var(--bg-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✦</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.set_name} · #{card.collector_number}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 5, alignItems: 'center' }}>
          {colors.slice(0, 5).map(c => (
            <MagicManaIcon key={c} color={c} size={14} />
          ))}
          {card.prices.eur && (
            <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>€{card.prices.eur}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</div>
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '9px 30px 9px 12px', appearance: 'none',
        background: 'var(--bg-2)', border: '1px solid var(--line)',
        borderRadius: 10, color: 'var(--ink-0)', fontSize: 13, outline: 'none', cursor: 'pointer',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
    </div>
  )
}
