'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { X, Search, Loader2, Plus, ChevronDown, Camera } from 'lucide-react'
import type { Language, Source } from '@/types'
import type { MarketCard } from '@/lib/api/market'
import { searchMarketCards, fetchBlueprintPrice } from '@/lib/api/market'
import { addCardAction, uploadCardImageAction } from '@/lib/actions'

const LANGUAGES: Language[] = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES: Source[] = ['CardTrader', 'Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro']
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

export function AddCardModal({
  open,
  onClose,
  preselected,
}: {
  open: boolean
  onClose: () => void
  preselected?: MarketCard | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketCard[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const [searching, setSearching] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [selected, setSelected] = useState<MarketCard | null>(null)
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dq = useDebounce(query, 400)

  useEffect(() => {
    if (open && preselected) {
      selectCard(preselected)
    }
    if (!open) {
      setTimeout(() => {
        setQuery(''); setResults([]); setSelected(null)
        setForm({ ...DEFAULT_FORM }); setError(null); setVisibleCount(PAGE)
        setImageUploading(false); setFetchingPrice(false)
      }, 300)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    searchMarketCards(dq, 40).then(r => { setResults(r); setSearching(false) })
  }, [dq])

  async function selectCard(card: MarketCard) {
    setError(null)
    setSelected(card)
    setQuery('')
    setResults([])
    setForm(f => ({
      ...f,
      name: card.name,
      set_name: card.set_name,
      card_number: card.number ?? '',
      rarity: card.rarity ?? f.rarity,
      current: '',
      image_url: card.image_url,
      api_id: card.id,
      language: (card.language?.toUpperCase() as Language) ?? f.language,
      source: 'CardTrader' as Source,
    }))

    // Fetch live price from CT marketplace
    if (card.cardtrader_blueprint_id) {
      setFetchingPrice(true)
      const price = await fetchBlueprintPrice(card.cardtrader_blueprint_id)
      if (price !== null) setForm(f => ({ ...f, current: price.toFixed(2) }))
      setFetchingPrice(false)
    }
  }

  function clearSelected() {
    setSelected(null)
    setForm(f => ({ ...f, name: '', set_name: '', card_number: '', current: '', image_url: null, api_id: null }))
  }

  function upd<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const url = await uploadCardImageAction(fd)
    if (url) setForm(f => ({ ...f, image_url: url }))
    setImageUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cond = parseFloat(form.condition)
    const price = parseFloat(form.current)
    if (!form.name.trim()) { setError('Nome obbligatorio'); return }
    if (isNaN(cond) || cond < 1 || cond > 10) { setError('Grado non valido (1–10)'); return }
    if (isNaN(price) || price <= 0) { setError('Valore obbligatorio (€ > 0)'); return }

    startTransition(async () => {
      const manualPrice = !isNaN(price) && price > 0 ? price : undefined
      const id = await addCardAction({
        name: form.name,
        set_id: form.set_name.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        set_name: form.set_name,
        set_code: (form.set_name || '').toUpperCase().slice(0, 6),
        card_number: form.card_number,
        api_id: form.api_id,
        api_source: form.api_id ? 'cardtrader' : 'manual',
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
      }, manualPrice)
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
            <p>Cerca nel catalogo CardTrader o inserisci manualmente.</p>
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
                  placeholder="Nome (Charizard), codice (PAR-191), numero (193/182)..."
                  style={{ paddingLeft: 34, paddingRight: searching ? 34 : undefined }}
                />
              </div>

              {visible.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 10, zIndex: 50, maxHeight: 320, overflowY: 'auto', boxShadow: '0 14px 40px rgba(0,0,0,.5)' }}>
                  {visible.map(card => (
                    <div key={card.id} className="card-search-result" onClick={() => selectCard(card)}>
                      <div className="card-search-thumb">
                        {card.image_url
                          ? <img src={card.image_url} alt={card.name} />
                          : <span style={{ fontSize: 18 }}>🃏</span>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-space)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-jetbrains)', marginTop: 2 }}>
                          {card.set_name}{card.set_code ? ` (${card.set_code})` : ''}{card.number ? ` · ${card.number}` : ''}{card.rarity ? ` · ${card.rarity}` : ''}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-jetbrains)', marginTop: 2 }}>
                          {card.language}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setVisibleCount(c => c + PAGE) }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '10px 0', fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--ink-3)', borderTop: '1px solid var(--line-2)', background: 'transparent', cursor: 'pointer' }}
                    >
                      <ChevronDown size={12} />
                      Carica altri ({results.length - visibleCount} rimasti)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Card preview */}
            {selected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg-1)', border: '1px solid var(--line-2)', borderRadius: 10 }}>
                <div
                  role="button" tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  title="Carica foto"
                  style={{ width: 54, height: 76, flexShrink: 0, borderRadius: 6, overflow: 'hidden', position: 'relative', cursor: 'pointer', background: 'var(--bg-2)', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {imageUploading ? (
                    <Loader2 size={18} style={{ color: 'var(--ink-3)', animation: 'spin 1s linear infinite' }} />
                  ) : form.image_url ? (
                    <>
                      <img src={form.image_url} alt={form.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <Camera size={16} style={{ color: '#fff' }} />
                      </div>
                    </>
                  ) : (
                    <Camera size={18} style={{ color: 'var(--ink-3)' }} />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-space)', fontWeight: 600, fontSize: 14, color: 'var(--ink-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.name}</div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{form.set_name}{form.card_number ? ` · ${form.card_number}` : ''}</div>
                  {form.rarity && <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{form.rarity}</div>}
                </div>
                <button type="button" onClick={clearSelected} style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line-2)', background: 'transparent', cursor: 'pointer' }}>
                  Cambia
                </button>
              </div>
            )}

            <div className="field">
              <label>Nome carta</label>
              <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="es. Charizard" required />
            </div>

            {/* Manual image upload when no card selected */}
            {!selected && (
              <div className="field">
                <label>Foto carta</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {form.image_url && <img src={form.image_url} alt="carta" style={{ width: 48, height: 68, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--line-2)' }} />}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line-2)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: 'var(--ink-2)' }}
                  >
                    {imageUploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} />}
                    {form.image_url ? 'Cambia foto' : 'Carica foto'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                </div>
              </div>
            )}

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
                  <button key={el.key} type="button" className={form.element === el.key ? 'is-active' : ''} style={{ '--art-a': el.color } as React.CSSProperties} onClick={() => upd('element', el.key)}>
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

            <div className="field">
              <label>
                Valore corrente (€)
                {fetchingPrice && <span style={{ color: 'var(--ink-3)', marginLeft: 6, fontSize: 10 }}>· carico prezzo CT...</span>}
                {selected && form.current && !fetchingPrice && <span style={{ color: 'var(--pos)', marginLeft: 6, fontSize: 10 }}>· da CardTrader live</span>}
                {selected && !form.current && !fetchingPrice && <span style={{ color: 'var(--lightning, #FFCB2E)', marginLeft: 6, fontSize: 10 }}>· inserisci manualmente</span>}
              </label>
              <input
                type="number" step="0.01" min="0"
                value={form.current}
                onChange={e => upd('current', e.target.value)}
                placeholder="es. 12.50"
                disabled={fetchingPrice}
                style={selected && !form.current && !fetchingPrice ? { borderColor: '#FFCB2E' } : undefined}
              />
            </div>

            {error && <p style={{ color: 'var(--neg)', fontFamily: 'var(--font-jetbrains)', fontSize: 12, textAlign: 'center', margin: '4px 0 0' }}>{error}</p>}
          </div>

          <div className="modal__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn btn--primary" disabled={isPending || fetchingPrice}>
              <Plus size={13} />
              {isPending ? 'Salvo...' : 'Aggiungi alla collezione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
