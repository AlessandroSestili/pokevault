'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

export function SettingsPage() {
  const [tg, setTg] = useState({ live: true, alerts: true, weekly: false, beta: true, anon: false })
  const flip = (k: keyof typeof tg) => setTg({ ...tg, [k]: !tg[k] })

  return (
    <div className="settings">
      <div className="panel">
        <h3>Mercato & Prezzi</h3>
        <p>Gestisci come PokeVault recupera e aggiorna i valori di mercato.</p>
        <div className="toggle-row">
          <div>
            <div className="lbl">Aggiornamento prezzi live</div>
            <div className="desc">Sincronizza con i marketplace ogni 6 ore.</div>
          </div>
          <button className={'swt' + (tg.live ? ' is-on' : '')} onClick={() => flip('live')} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="lbl">Avvisi prezzo</div>
            <div className="desc">Notifica quando una carta sale o scende oltre il 10%.</div>
          </div>
          <button className={'swt' + (tg.alerts ? ' is-on' : '')} onClick={() => flip('alerts')} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="lbl">Report settimanale</div>
            <div className="desc">Email con il riepilogo della collezione ogni lunedì.</div>
          </div>
          <button className={'swt' + (tg.weekly ? ' is-on' : '')} onClick={() => flip('weekly')} />
        </div>
      </div>

      <div className="panel">
        <h3>Privacy & Dati</h3>
        <p>Controlla la condivisione della tua collezione.</p>
        <div className="toggle-row">
          <div>
            <div className="lbl">Funzionalità beta</div>
            <div className="desc">Accesso anticipato ad analitiche avanzate e AI grading.</div>
          </div>
          <button className={'swt' + (tg.beta ? ' is-on' : '')} onClick={() => flip('beta')} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="lbl">Statistiche anonime</div>
            <div className="desc">Aiuta a migliorare le stime di mercato condividendo dati anonimizzati.</div>
          </div>
          <button className={'swt' + (tg.anon ? ' is-on' : '')} onClick={() => flip('anon')} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="lbl">Esporta backup</div>
            <div className="desc">Scarica un .csv completo della collezione e dello storico prezzi.</div>
          </div>
          <button className="btn">
            <FileText size={13} /> Esporta
          </button>
        </div>
      </div>
    </div>
  )
}
