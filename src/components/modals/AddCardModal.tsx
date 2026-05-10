'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Search, Loader2, Plus, ChevronDown } from 'lucide-react'
import type { PokemonTcgCard, Language, Source } from '@/types'
import { searchCards } from '@/lib/api/pokemontcg'
import { extractMarketPrice } from '@/lib/api/prices'
import { addCardAction } from '@/lib/actions'

const LANGUAGES: Language[] = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES: Source[] = ['Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Secret Rare']

const ELEMENTS = [
  { key: 'fire',      color: '#FF5B47', glyph: '▲', label: 'Fire' },
  { key: 'water',     color: '#3B9DFF', glyph: '◐', label: 'Water' },
  { key: 'lightning', color: '#FFCB2E', glyph: '✦', label: 'Lightning' },
  { key: 'grass',     color: '#37C26B', glyph: '✿', label: 'Grass' },
  { key: 'psychic',   color: '#B07BFF', glyph: '✺', label: 'Psychic' },
  { key: 'darkness',  color: '#7A8AA0', glyph: '◆', label: 'Darkness' },
  { key: 'fairy',     color: '#FF7AC4', glyph: '❋', label: 'Fairy' },
]

const PAGE = 8

function useDebounce<T>(v: T, ms: number): T {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms])
  return d
}

const DEFAULT_FORM = {
  name: '',
  set_name: '',
  card_number: '',
  element: 'colorless',
  rarity: 'Holo Rare',
  condition: '9.5',
  language: 'EN' as Language,
  current: '',
  source: 'Cardmarket' as Source,
  date: new Date().toISOString().slice(0, 10),
  image_url: null as string | null,
  api_id: null as string | null,
}

export function AddCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PokemonTcgCard[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<PokemonTcgCard | null>(null)
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const dq = useDebounce(query, 400)

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setQuery(''); setResults([]); setSelected(null)
        setForm({ ...DEFAULT_FORM }); setError(null); setVisibleCount(PAGE)
      }, 300)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!dq.trim() || dq.length < 2) { setResults([]); return }
    setSearching(true)
    setVisibleCount(PAGE)
    searchCards(dq).then(r => { setResults(r); setSearching(false) })
  }, [dq])

  function selectCard(card: PokemonTcgCard) {
    setSelected(card)
    const price = extractMarketPrice(card, 'cardmarket') ?? extractMarketPrice(card, 'tcgplayer')
    setForm(f => ({
      ...f,
      name: card.name,
      set_name: card.set.name,
      card_number: `${card.number}/${card.set.printedTotal}`,
      element: (card.types?.[0] ?? 'colorless').toLowerCase(),
      rarity: card.rarity ?? 'Holo Rare',
      current: price ? price.toFixed(2) : f.current,
      image_url: card.images?.large ?? card.images?.small ?? null,
      api_id: card.id,
    }))
    setQuery('')
    setResults([])
  }

  function clearSelected() {
    setSelected(null)
    setForm(f => ({ ...f, name: '', set_name: '', card_number: '', image_url: null, api_id: null }))
  }

  function upd<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cond = parseFloat(form.condition)
    if (!form.name.trim()) { setError('Nome obbligatorio'); return }
    if (isNaN(cond) || cond < 1 || cond > 10) { setError('Grado non valido (1–10)'); return }

    startTransition(async () => {
      const id = await addCardAction({
        name: form.name,
        set_id: form.set_name.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        set_name: form.set_name,
        set_code: (form.set_name || '').toUpperCase().slice(0, 6),
        card_number: form.card_number,
        api_id: form.api_id,
        api_source: selected ? 'pokemontcg' : 'manual',
        image_url: form.image_url,
        element: form.element || null,
        rarity: form.rarity || null,
        language: form.language,
        condition: cond,
        cost_basis: 0,
        source: form.source,
        acquired_date: form.date,
        notes: null,
        is_favorite: false,
      })
      if (id) onClose()
      else setError('Errore durante il salvataggio')
    })
  }

  const visible = results.slice(0, visibleCount)
  const hasMore = results.length > visibleCount

  return (
    <div className={'modal' + (open ? ' is-open' : '')} onClick={onClose}>
      <div className="modal__inner" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h3>Aggiungi carta</h3>
            <p>Cerca una carta o inserisci manualmente i dati.</p>
          </div>
          <button className="sheet__close" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {/* Search */}
            <div className="field" style={{ position: 'relative' }}>
              <label>Cerca carta (opzionale)</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
                {searching && <Loader2 size={14} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', animation: 'spin 1s linear infinite' }} />}
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Nome, codice (sv6-012)..."
                  style={{ paddingLeft: 34, paddingRight: searching ? 34 : undefined }}
                />
              </div>
              {visible.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 10, zIndex: 50, maxHeight: 320, overflowY: 'auto', boxShadow: '0 14px 40px rgba(0,0,0,.5)' }}>
                  {visible.map(card => (
                    <div key={card.id} className="card-search-result" onClick={() => selectCard(card)}>
                      <div className="card-search-thumb">
                        {card.images?.small && <img src={card.images.small} alt={card.name} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-space)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-jetbrains)', marginTop: 2 }}>{card.set.name} · {card.number}</div>
                        {card.cardmarket?.prices.trendPrice && (
                          <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)', marginTop: 2 }}>~€{card.cardmarket.prices.trendPrice.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setVisibleCount(c => c + PAGE) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        width: '100%', padding: '10px 0',
                        fontFamily: 'var(--font-jetbrains)', fontSize: 11,
                        color: 'var(--ink-3)',
                        borderTop: '1px solid var(--line-2)',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronDown size={12} />
                      Carica altri ({results.length - visibleCount} rimasti)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Selected card preview */}
            {selected && form.image_url && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px',
                background: 'var(--bg-1)',
                border: '1px solid var(--line-2)',
                borderRadius: 10,
              }}>
                <img
                  src={form.image_url}
                  alt={form.name}
                  style={{ width: 54, height: 76, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-space)', fontWeight: 600, fontSize: 14, color: 'var(--ink-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.name}</div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{form.set_name} · {form.card_number}</div>
                  {form.rarity && <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{form.rarity}</div>}
                </div>
                <button
                  type="button"
                  onClick={clearSelected}
                  style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line-2)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cambia
                </button>
              </div>
            )}

            <div className="field">
              <label>Nome carta</label>
              <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="es. Charizard" required />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Set</label>
                <input value={form.set_name} onChange={e => upd('set_name', e.target.value)} placeholder="Base Set" />
              </div>
              <div className="field">
                <label>Numero</label>
                <input value={form.card_number} onChange={e => upd('card_number', e.target.value)} placeholder="4/102" />
              </div>
            </div>

            <div className="field">
              <label>Elemento</label>
              <div className="elem-picker">
                {ELEMENTS.map(el => (
                  <button
                    key={el.key}
                    type="button"
                    className={form.element === el.key ? 'is-active' : ''}
                    style={{ '--art-a': el.color } as React.CSSProperties}
                    onClick={() => upd('element', el.key)}
                  >
                    <span className="glyph">{el.glyph}</span>
                    <span>{el.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row3">
              <div className="field">
                <label>Rarità</label>
                <select value={form.rarity} onChange={e => upd('rarity', e.target.value)}>
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Grado</label>
                <input type="number" step="0.5" min="1" max="10" value={form.condition} onChange={e => upd('condition', e.target.value)} />
              </div>
              <div className="field">
                <label>Lingua</label>
                <select value={form.language} onChange={e => upd('language', e.target.value as Language)}>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Provenienza</label>
                <select value={form.source} onChange={e => upd('source', e.target.value as Source)}>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Data acquisto</label>
                <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} />
              </div>
            </div>

            {error && <p style={{ color: 'var(--neg)', fontFamily: 'var(--font-jetbrains)', fontSize: 12, textAlign: 'center', margin: '4px 0 0' }}>{error}</p>}
          </div>

          <div className="modal__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn btn--primary" disabled={isPending}>
              <Plus size={13} />
              {isPending ? 'Salvo...' : 'Aggiungi alla collezione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
