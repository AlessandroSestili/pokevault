'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Trash2, Pencil, Heart, ChevronLeft } from 'lucide-react'
import type { CollectionCardWithPrice, Language, Source } from '@/types'
import { formatEur, formatPct, formatCondition } from '@/lib/formats'
import { deleteCardAction, editCardAction } from '@/lib/actions'
import { Sheet } from '@/components/ui/Sheet'
import { Sparkline } from '@/components/ui/Sparkline'

const LANGUAGES: Language[] = ['EN', 'IT', 'JP', 'DE', 'FR', 'ES', 'PT', 'KO', 'ZH']
const SOURCES: Source[] = ['Cardmarket', 'eBay', 'TCGPlayer', 'Negozio locale', 'Scambio', 'Asta', 'Altro']

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="font-mono text-[11px] tracking-[0.5px] uppercase" style={{ color: 'var(--text-2)' }}>
        {label}
      </span>
      <span className="font-mono text-[13px]" style={{ color: 'var(--text-0)' }}>
        {value}
      </span>
    </div>
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

export function CardDetailSheet({
  card,
  open,
  onClose,
}: {
  card: CollectionCardWithPrice | null
  open: boolean
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [condition, setCondition] = useState('')
  const [language, setLanguage] = useState<Language>('EN')
  const [source, setSource] = useState<Source>('Cardmarket')
  const [acquiredDate, setAcquiredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!card) return null

  const sparkData = card.price_history.map(p => p.price_eur)
  const sparkPositive = sparkData.length >= 2 ? sparkData[sparkData.length - 1] >= sparkData[0] : true

  function openEdit() {
    setCondition(String(card!.condition))
    setLanguage(card!.language as Language)
    setSource(card!.source as Source)
    setAcquiredDate(card!.acquired_date)
    setNotes(card!.notes ?? '')
    setError(null)
    setEditing(true)
  }

  function handleDelete() {
    const id = card!.id
    startTransition(async () => {
      await deleteCardAction(id)
      onClose()
    })
  }

  function handleToggleFavorite() {
    const { id, is_favorite } = card!
    startTransition(async () => {
      await editCardAction(id, { is_favorite: !is_favorite })
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const conditionNum = parseFloat(condition)
    if (isNaN(conditionNum) || conditionNum < 1 || conditionNum > 10) {
      setError('Condizione non valida (1–10)')
      return
    }
    const id = card!.id
    startTransition(async () => {
      const ok = await editCardAction(id, {
        condition: conditionNum,
        language,
        source,
        acquired_date: acquiredDate,
        notes: notes.trim() || null,
      })
      if (ok) setEditing(false)
      else setError('Errore durante il salvataggio')
    })
  }

  return (
    <Sheet open={open} onClose={() => { setEditing(false); onClose() }}>
      {editing ? (
        <form onSubmit={handleSave} className="px-4 py-4 space-y-4">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 font-mono text-[11px] mb-2"
            style={{ color: 'var(--text-2)' }}
          >
            <ChevronLeft size={13} /> Indietro
          </button>

          {/* Card preview */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            {card.image_url && (
              <div className="relative w-10 h-14 flex-shrink-0">
                <Image src={card.image_url} alt={card.name} fill sizes="40px" className="object-contain" unoptimized />
              </div>
            )}
            <div>
              <p className="font-display font-medium text-[14px]" style={{ color: 'var(--text-0)' }}>{card.name}</p>
              <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{card.set_name}</p>
            </div>
          </div>

          <InputField label="Condizione (PSA)">
            <input
              type="number" min="1" max="10" step="0.5"
              value={condition} onChange={e => setCondition(e.target.value)}
              style={inputStyle} required
            />
          </InputField>

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
            <input
              type="date" value={acquiredDate}
              onChange={e => setAcquiredDate(e.target.value)}
              style={inputStyle} required
            />
          </InputField>

          <InputField label="Note (opzionale)">
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} style={{ ...inputStyle, resize: 'none' }}
            />
          </InputField>

          {error && (
            <p className="font-mono text-[12px] text-center" style={{ color: 'var(--neg)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 rounded-2xl font-display font-semibold text-[14px] text-black transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {isPending ? 'Salvo...' : 'Salva modifiche'}
          </button>
        </form>
      ) : (
        <div className="px-5 pt-4 pb-8">
          {card.image_url && (
            <div className="flex justify-center mb-5">
              <div className="relative w-40 aspect-[2.5/3.5] drop-shadow-2xl">
                <Image src={card.image_url} alt={card.name} fill sizes="160px" className="object-contain rounded-xl" unoptimized />
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] tracking-[1.5px] uppercase mb-1" style={{ color: 'var(--text-2)' }}>
                  {card.set_code} · {card.card_number}
                </p>
                <h2 className="font-display font-semibold text-[20px] tracking-[-0.4px] leading-tight" style={{ color: 'var(--text-0)' }}>
                  {card.name}
                </h2>
                <p className="font-mono text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>{card.set_name}</p>
              </div>
              <button
                onClick={handleToggleFavorite}
                disabled={isPending}
                className="mt-1 p-2 rounded-full flex-shrink-0"
                style={{ background: 'var(--bg-2)' }}
              >
                <Heart
                  size={16}
                  style={{ color: card.is_favorite ? 'var(--neg)' : 'var(--text-2)' }}
                  fill={card.is_favorite ? 'var(--neg)' : 'none'}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-2)' }}>
                  Valore di mercato
                </p>
                <p className="font-display font-semibold text-[26px] tracking-[-0.6px] leading-none" style={{ color: 'var(--text-0)' }}>
                  {card.market_price != null ? formatEur(card.market_price) : '—'}
                </p>
              </div>
            </div>
            {sparkData.length >= 2 && (
              <Sparkline data={sparkData} color={sparkPositive ? 'var(--pos)' : 'var(--neg)'} height={40} />
            )}
          </div>

          <div className="mb-5">
            <Row label="Condizione" value={formatCondition(card.condition)} />
            <Row label="Lingua" value={card.language} />
            {card.rarity && <Row label="Rarità" value={card.rarity} />}
            {card.element && <Row label="Tipo" value={card.element} />}
            <Row label="Acquistato" value={card.acquired_date} />
            <Row label="Fonte" value={card.source} />
            {card.notes && <Row label="Note" value={card.notes} />}
          </div>

          <div className="flex gap-3">
            <button
              onClick={openEdit}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-mono text-[13px] font-medium transition-opacity disabled:opacity-50"
              style={{ background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            >
              <Pencil size={14} />
              Modifica
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-mono text-[13px] font-medium transition-opacity disabled:opacity-50"
              style={{ background: 'var(--neg-dim)', color: 'var(--neg)', border: '1px solid rgba(255,91,71,0.2)' }}
            >
              <Trash2 size={14} />
              Elimina
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
