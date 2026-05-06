'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Search, Loader2, ChevronLeft, Upload } from 'lucide-react'
import type { PokemonTcgCard, Language, Source } from '@/types'
import { searchCards } from '@/lib/api/pokemontcg'
import { extractMarketPrice } from '@/lib/api/prices'
import { addCardAction, importCardsAction } from '@/lib/actions'
import { Sheet } from '@/components/ui/Sheet'

const LANGUAGES: Language[] = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES: Source[] = ['Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro']

type Step = 'search' | 'form' | 'csv'

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function CardSearchResult({ card, onSelect }: { card: PokemonTcgCard; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
    >
      {card.images?.small && (
        <div className="relative w-10 h-14 flex-shrink-0">
          <Image src={card.images.small} alt={card.name} fill sizes="40px" className="object-contain" unoptimized />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display font-medium text-[14px] truncate" style={{ color: 'var(--text-0)' }}>
          {card.name}
        </p>
        <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
          {card.set.name} · {card.number}/{card.set.printedTotal}
        </p>
        {card.cardmarket?.prices.trendPrice ? (
          <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--accent)' }}>
            ~€{card.cardmarket.prices.trendPrice.toFixed(2)}
          </p>
        ) : null}
      </div>
    </button>
  )
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] tracking-[1px] uppercase block mb-1.5" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  color: 'var(--text-0)',
  borderRadius: '12px',
  padding: '10px 12px',
  fontFamily: 'var(--font-jetbrains)',
  fontSize: '13px',
  width: '100%',
  outline: 'none',
}

// CSV expected columns: name,set_name,card_number,condition,cost,language,source,acquired_date,notes
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function AddCardModal({
  open,
  onClose,
  preselected = null,
}: {
  open: boolean
  onClose: () => void
  preselected?: PokemonTcgCard | null
}) {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PokemonTcgCard[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<PokemonTcgCard | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [condition, setCondition] = useState('8')
  const [cost, setCost] = useState('')
  const [language, setLanguage] = useState<Language>('EN')
  const [source, setSource] = useState<Source>('Cardmarket')
  const [acquiredDate, setAcquiredDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  // CSV state
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvImported, setCsvImported] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 400)

  // If a card is preselected (from /search page), jump straight to form
  useEffect(() => {
    if (open && preselected) {
      selectCard(preselected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselected])

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) { setResults([]); return }
    setSearching(true)
    searchCards(debouncedQuery).then(r => {
      setResults(r.slice(0, 12))
      setSearching(false)
    })
  }, [debouncedQuery])

  function reset() {
    setStep('search')
    setQuery('')
    setResults([])
    setSelected(null)
    setCondition('8')
    setCost('')
    setLanguage('EN')
    setSource('Cardmarket')
    setNotes('')
    setError(null)
    setCsvRows([])
    setCsvError(null)
    setCsvImported(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function selectCard(card: PokemonTcgCard) {
    setSelected(card)
    const price = extractMarketPrice(card, 'cardmarket') ?? extractMarketPrice(card, 'tcgplayer')
    if (price) setCost(price.toFixed(2))
    setStep('form')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)

    const conditionNum = parseFloat(condition)
    const costNum = parseFloat(cost)
    if (isNaN(conditionNum) || conditionNum < 1 || conditionNum > 10) {
      setError('Condizione non valida (1–10)')
      return
    }
    if (isNaN(costNum) || costNum < 0) {
      setError('Costo non valido')
      return
    }

    startTransition(async () => {
      const id = await addCardAction({
        name: selected.name,
        set_id: selected.set.id,
        set_name: selected.set.name,
        set_code: selected.set.id.toUpperCase(),
        card_number: `${selected.number}/${selected.set.printedTotal}`,
        api_id: selected.id,
        api_source: 'pokemontcg',
        image_url: selected.images?.large ?? selected.images?.small ?? null,
        element: selected.types?.[0] ?? null,
        rarity: selected.rarity ?? null,
        language,
        condition: conditionNum,
        cost_basis: costNum,
        source,
        acquired_date: acquiredDate,
        notes: notes.trim() || null,
        is_favorite: false,
      })
      if (id) handleClose()
      else setError('Errore durante il salvataggio')
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)
    setCsvImported(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setCsvError('File vuoto o formato non valido')
        return
      }
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  function handleCsvImport() {
    if (csvRows.length === 0) return
    setCsvError(null)
    startTransition(async () => {
      const count = await importCardsAction(csvRows)
      if (count > 0) {
        setCsvImported(count)
        setCsvRows([])
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setCsvError('Nessuna carta importata. Controlla il formato del file.')
      }
    })
  }

  const csvStep = step === 'csv'
  const formStep = step === 'form'

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={formStep ? (selected?.name ?? 'Dettagli') : csvStep ? 'Importa CSV' : 'Aggiungi carta'}
    >
      {formStep ? (
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <button
            type="button"
            onClick={() => setStep('search')}
            className="flex items-center gap-1 font-mono text-[11px] mb-2"
            style={{ color: 'var(--text-2)' }}
          >
            <ChevronLeft size={13} /> Indietro
          </button>

          {selected && (
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              {selected.images?.small && (
                <div className="relative w-10 h-14 flex-shrink-0">
                  <Image src={selected.images.small} alt={selected.name} fill sizes="40px" className="object-contain" unoptimized />
                </div>
              )}
              <div>
                <p className="font-display font-medium text-[14px]" style={{ color: 'var(--text-0)' }}>{selected.name}</p>
                <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {selected.set.name} · {selected.number}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <InputField label="Condizione (PSA)">
              <input type="number" min="1" max="10" step="0.5" value={condition} onChange={e => setCondition(e.target.value)} style={inputStyle} required />
            </InputField>
            <InputField label="Costo (€)">
              <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" style={inputStyle} required />
            </InputField>
          </div>

          <InputField label="Lingua">
            <select value={language} onChange={e => setLanguage(e.target.value as Language)} style={inputStyle}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </InputField>

          <InputField label="Fonte">
            <select value={source} onChange={e => setSource(e.target.value as Source)} style={inputStyle}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </InputField>

          <InputField label="Data acquisto">
            <input type="date" value={acquiredDate} onChange={e => setAcquiredDate(e.target.value)} style={inputStyle} required />
          </InputField>

          <InputField label="Note (opzionale)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Signed, mint pack fresh..." style={{ ...inputStyle, resize: 'none' }} />
          </InputField>

          {error && <p className="font-mono text-[12px] text-center" style={{ color: 'var(--neg)' }}>{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 rounded-2xl font-display font-semibold text-[14px] text-black transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {isPending ? 'Salvo...' : 'Aggiungi alla collezione'}
          </button>
        </form>
      ) : csvStep ? (
        <div className="px-4 py-4 space-y-4">
          <button
            type="button"
            onClick={() => setStep('search')}
            className="flex items-center gap-1 font-mono text-[11px] mb-2"
            style={{ color: 'var(--text-2)' }}
          >
            <ChevronLeft size={13} /> Indietro
          </button>

          {/* Format hint */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] tracking-[1px] uppercase mb-2" style={{ color: 'var(--text-2)' }}>Formato CSV atteso</p>
            <p className="font-mono text-[10px] break-all" style={{ color: 'var(--text-1)' }}>
              name, set_name, card_number, condition, cost, language, source, acquired_date, notes
            </p>
            <p className="font-mono text-[10px] break-all" style={{ color: 'var(--text-2)' }}>
              Charizard, Base Set, 4/102, 8, 150, EN, eBay, 2024-01-15,
            </p>
          </div>

          <InputField label="File CSV">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{ ...inputStyle, padding: '8px 12px', cursor: 'pointer' }}
            />
          </InputField>

          {csvRows.length > 0 && (
            <p className="font-mono text-[12px]" style={{ color: 'var(--text-1)' }}>
              {csvRows.length} carte pronte all&apos;importazione
            </p>
          )}

          {csvError && <p className="font-mono text-[12px]" style={{ color: 'var(--neg)' }}>{csvError}</p>}

          {csvImported != null && (
            <p className="font-mono text-[12px]" style={{ color: 'var(--pos)' }}>
              ✓ {csvImported} carte importate con successo
            </p>
          )}

          <button
            onClick={handleCsvImport}
            disabled={csvRows.length === 0 || isPending}
            className="w-full py-3.5 rounded-2xl font-display font-semibold text-[14px] text-black transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {isPending ? 'Importo...' : `Importa ${csvRows.length > 0 ? csvRows.length + ' carte' : ''}`}
          </button>
        </div>
      ) : (
        <div>
          {/* Search input */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-2)' }} />
              {searching && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-2)' }} />
              )}
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cerca nome carta..."
                style={{ ...inputStyle, paddingLeft: '32px', paddingRight: '32px' }}
              />
            </div>
          </div>

          {/* Results */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {results.length === 0 && debouncedQuery.length >= 2 && !searching && (
              <p className="px-4 py-8 text-center font-mono text-[12px]" style={{ color: 'var(--text-2)' }}>
                Nessun risultato
              </p>
            )}
            {results.map(card => (
              <CardSearchResult key={card.id} card={card} onSelect={() => selectCard(card)} />
            ))}
          </div>

          {/* Bottom actions */}
          <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setStep('form')}
              className="w-full py-2.5 rounded-xl font-mono text-[12px] transition-colors"
              style={{ background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            >
              Aggiungi manualmente
            </button>
            <button
              onClick={() => setStep('csv')}
              className="w-full py-2.5 rounded-xl font-mono text-[12px] flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            >
              <Upload size={12} />
              Importa da CSV
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
