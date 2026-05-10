'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Upload, FileText, Check } from 'lucide-react'
import { importCardsAction } from '@/lib/actions'

const HEADERS = ['nome', 'set_name', 'numero', 'costo', 'lingua', 'fonte', 'data']
const SAMPLE = [
  { nome: 'Charizard', set_name: 'Base Set', numero: '4/102', costo: '150.00', lingua: 'EN', fonte: 'eBay', data: '2025-01-15' },
  { nome: 'Pikachu', set_name: 'Jungle', numero: '60/64', costo: '22.00', lingua: 'EN', fonte: 'Cardmarket', data: '2025-03-10' },
  { nome: 'Mewtwo', set_name: 'Base Set', numero: '10/102', costo: '85.00', lingua: 'JP', fonte: 'Asta', data: '2025-06-22' },
  { nome: 'Blastoise', set_name: 'Base Set', numero: '2/102', costo: '120.00', lingua: 'EN', fonte: 'Cardmarket', data: '2025-08-04' },
  { nome: 'Venusaur', set_name: 'Base Set', numero: '15/102', costo: '95.00', lingua: 'EN', fonte: 'Scambio', data: '2025-09-18' },
]

function downloadTemplate() {
  const csv = [HEADERS.join(','), ...SAMPLE.map(r => HEADERS.map(h => r[h as keyof typeof r]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'pokevault_template.csv'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fmtBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState<{ name: string; size: number; rows: Array<Record<string, string>> } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<number | null>(null)

  useEffect(() => {
    if (!open) { setTimeout(() => { setFile(null); setDone(null) }, 300) }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  function handleClick() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv,text/csv'
    input.onchange = () => { const f = input.files?.[0]; if (f) readFile(f) }
    input.click()
  }

  function readFile(f: File) {
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCsv(ev.target?.result as string)
      setFile({ name: f.name, size: f.size, rows })
    }
    reader.readAsText(f)
  }

  function handleImport() {
    if (!file) return
    startTransition(async () => {
      const mapped = file.rows.map(r => ({
        name: r['nome'] ?? r['name'] ?? '',
        set_name: r['set_name'] ?? '',
        card_number: r['numero'] ?? r['card_number'] ?? '',
        condition: r['condition'] ?? '7',
        cost: r['costo'] ?? r['cost'] ?? '0',
        language: r['lingua'] ?? r['language'] ?? 'EN',
        source: r['fonte'] ?? r['source'] ?? 'Altro',
        acquired_date: r['data'] ?? r['acquired_date'] ?? '',
        notes: r['note'] ?? r['notes'] ?? '',
      }))
      const count = await importCardsAction(mapped)
      setDone(count)
      setFile(null)
    })
  }

  return (
    <div className={'modal' + (open ? ' is-open' : '')} onClick={onClose}>
      <div className="modal__inner modal__inner--md" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ flex: 1 }}>
            <h3>Importa CSV</h3>
            <p>{file ? `${file.name} · ${fmtBytes(file.size)} · ${file.rows.length} righe` : 'Carica il tuo file CSV. Solo un formato, semplice.'}</p>
          </div>
          <button className="sheet__close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal__body">
          {done != null ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(45,216,129,.15)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--pos)' }}>
                <Check size={24} />
              </div>
              <div style={{ fontFamily: 'var(--font-space)', fontSize: 22, fontWeight: 600, color: 'var(--pos)', marginBottom: 6 }}>{done} carte importate</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>La collezione è stata aggiornata.</div>
            </div>
          ) : !file ? (
            <>
              <div className="tpl-banner">
                <div className="tpl-banner__left">
                  <div className="tpl-banner__t">Hai bisogno del formato?</div>
                  <div className="tpl-banner__d">Scarica il template, riempilo con le tue carte, ricaricalo qui.</div>
                </div>
                <button className="btn btn--primary" onClick={downloadTemplate}>
                  <FileText size={13} /> Scarica template
                </button>
              </div>

              <div
                className={'dropzone' + (drag ? ' is-drag' : '')}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                <div className="dropzone__icon"><Upload size={22} /></div>
                <h4>Trascina il file CSV qui</h4>
                <p>oppure clicca per selezionarlo dal computer</p>
              </div>

              <div className="format-info">
                <div className="format-info__t">Colonne attese</div>
                <div className="format-info__cols">
                  {HEADERS.map(h => <span key={h} className="format-info__col">{h}</span>)}
                </div>
                <div className="format-info__d">
                  Separatore <code>,</code> · prima riga = intestazioni · valori senza virgolette.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bigfile-bar">
                <div className="bigfile-bar__icon"><FileText size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-space)', fontSize: 15, fontWeight: 600 }}>{file.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-jetbrains)' }}>
                    {fmtBytes(file.size)} · {file.rows.length} righe pronte
                  </div>
                </div>
                <span className="badge" style={{ color: 'var(--pos)', borderColor: 'rgba(45,216,129,.3)' }}>
                  <Check size={11} /> Formato OK
                </span>
                <button className="btn btn--ghost" onClick={() => setFile(null)}>Cambia</button>
              </div>

              <div className="prev-title">Anteprima — prime {Math.min(file.rows.length, 5)} righe</div>
              <div className="simple-prev">
                <div className="simple-prev__head">
                  {HEADERS.map(h => <div key={h}>{h}</div>)}
                </div>
                {file.rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="simple-prev__row">
                    {HEADERS.map(h => (
                      <div key={h} className={['costo', 'data', 'numero'].includes(h) ? 'mono' : ''}>
                        {r[h] ?? r[h === 'nome' ? 'name' : h === 'numero' ? 'card_number' : h === 'costo' ? 'cost' : h === 'lingua' ? 'language' : h === 'fonte' ? 'source' : h === 'data' ? 'acquired_date' : h] ?? '—'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal__foot">
          <button className="btn btn--ghost" onClick={onClose}>
            {done != null ? 'Chiudi' : 'Annulla'}
          </button>
          <div style={{ flex: 1 }} />
          {file && (
            <button className="btn btn--primary" disabled={isPending} onClick={handleImport}>
              <Upload size={13} />
              {isPending ? 'Importo...' : `Importa ${file.rows.length} carte`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
