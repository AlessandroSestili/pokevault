'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Search, Loader2, Plus } from 'lucide-react'
import type { PokemonTcgCard } from '@/types'
import { searchCards } from '@/lib/api/pokemontcg'
import { AddCardModal } from '@/components/collection/AddCardModal'

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

export function SearchShell() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PokemonTcgCard[]>([])
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [preselected, setPreselected] = useState<PokemonTcgCard | null>(null)

  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) { setResults([]); return }
    setSearching(true)
    searchCards(debouncedQuery).then(r => {
      setResults(r.slice(0, 24))
      setSearching(false)
    })
  }, [debouncedQuery])

  function openAdd(card: PokemonTcgCard) {
    setPreselected(card)
    setAddOpen(true)
  }

  return (
    <>
      <div className="flex-1 pb-nav">
        {/* Mobile topbar */}
        <div
          className="sticky top-0 z-40 md:hidden px-4 pt-4 pb-3"
          style={{ background: 'rgba(11, 13, 18, 0.95)', backdropFilter: 'blur(20px)' }}
        >
          <span className="font-display font-semibold text-[18px] tracking-[-0.4px] block mb-3" style={{ color: 'var(--accent)' }}>
            Cerca
          </span>
          <SearchInput query={query} setQuery={setQuery} searching={searching} />
        </div>

        <div className="px-4 md:px-8 py-4 max-w-[1400px] mx-auto space-y-5">
          {/* Desktop search */}
          <div className="hidden md:block">
            <SearchInput query={query} setQuery={setQuery} searching={searching} />
          </div>

          {results.length === 0 && debouncedQuery.length >= 2 && !searching && (
            <p className="text-center font-mono text-[13px] py-16" style={{ color: 'var(--text-2)' }}>
              Nessun risultato per &quot;{debouncedQuery}&quot;
            </p>
          )}

          {results.length === 0 && debouncedQuery.length < 2 && (
            <p className="text-center font-mono text-[13px] py-16" style={{ color: 'var(--text-2)' }}>
              Cerca una carta per nome o set
            </p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {results.map(card => (
                <SearchCard key={card.id} card={card} onAdd={() => openAdd(card)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddCardModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setPreselected(null) }}
        preselected={preselected}
      />
    </>
  )
}

function SearchInput({
  query, setQuery, searching,
}: {
  query: string
  setQuery: (v: string) => void
  searching: boolean
}) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-2)' }} />
      {searching && (
        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-2)' }} />
      )}
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Cerca carta per nome..."
        className="w-full pl-8 pr-8 py-2.5 rounded-xl font-mono text-[13px] outline-none"
        style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-0)' }}
      />
    </div>
  )
}

function SearchCard({ card, onAdd }: { card: PokemonTcgCard; onAdd: () => void }) {
  return (
    <div
      className="glass rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '1px solid var(--border)' }}
    >
      {card.images?.small ? (
        <div className="relative w-full aspect-[2.5/3.5] bg-white/[0.02]">
          <Image src={card.images.small} alt={card.name} fill sizes="200px" className="object-contain p-2" unoptimized />
        </div>
      ) : (
        <div className="w-full aspect-[2.5/3.5] flex items-center justify-center" style={{ background: 'var(--bg-2)' }}>
          <span className="text-3xl">🃏</span>
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-display font-medium text-[13px] leading-snug" style={{ color: 'var(--text-0)' }}>{card.name}</p>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            {card.set.name} · {card.number}
          </p>
          {card.cardmarket?.prices.trendPrice ? (
            <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--accent)' }}>
              ~€{card.cardmarket.prices.trendPrice.toFixed(2)}
            </p>
          ) : null}
        </div>
        <button
          onClick={onAdd}
          className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-mono text-[11px] transition-colors"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(255,203,46,0.2)' }}
        >
          <Plus size={12} />
          Aggiungi
        </button>
      </div>
    </div>
  )
}
