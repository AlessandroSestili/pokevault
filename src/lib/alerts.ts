import { createAdminClient } from './supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

export async function checkAndSendAlerts(
  game: 'pokemon' | 'magic',
  supabase: AdminClient,
  today: string
) {
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('game', game)

  if (!alerts?.length) return

  const triggered: { alert: typeof alerts[0]; price: number; cardName: string }[] = []

  for (const alert of alerts) {
    const { data: snap } = await supabase
      .from('price_snapshots')
      .select('price_eur')
      .eq('card_id', alert.card_id)
      .eq('date', today)
      .single()

    const currentPrice = snap?.price_eur
    if (!currentPrice) continue

    const wasBelow = !alert.last_triggered_price || alert.last_triggered_price < alert.threshold_eur
    const isNowAbove = currentPrice >= alert.threshold_eur

    if (wasBelow && isNowAbove) {
      // Fetch card name
      const table = game === 'pokemon' ? 'cards' : 'magic_cards'
      const { data: cardData } = await supabase.from(table).select('name, image_url').eq('id', alert.card_id).single()
      triggered.push({ alert, price: currentPrice, cardName: cardData?.name ?? 'Carta sconosciuta' })

      await supabase
        .from('price_alerts')
        .update({ last_triggered_price: currentPrice, updated_at: new Date().toISOString() })
        .eq('id', alert.id)
    } else if (currentPrice < alert.threshold_eur && alert.last_triggered_price) {
      // Reset: scesa sotto soglia, può triggerare di nuovo al prossimo superamento
      await supabase
        .from('price_alerts')
        .update({ last_triggered_price: null, updated_at: new Date().toISOString() })
        .eq('id', alert.id)
    }
  }

  if (triggered.length) {
    await sendAlertDigest(triggered, supabase)
  }
}

async function sendAlertDigest(
  triggered: { alert: { user_id: string; threshold_eur: number }; price: number; cardName: string }[],
  supabase: AdminClient
) {
  if (!process.env.RESEND_API_KEY) return

  const byUser = new Map<string, typeof triggered>()
  for (const t of triggered) {
    const arr = byUser.get(t.alert.user_id) ?? []
    arr.push(t)
    byUser.set(t.alert.user_id, arr)
  }

  for (const [userId, items] of byUser) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (!email) continue

    const rows = items.map(({ cardName, price, alert }) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #1e2330;font-weight:600">${cardName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e2330;font-family:monospace;color:#e8eaf0">€${price.toFixed(2)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e2330;font-family:monospace;color:#2DD881">€${Number(alert.threshold_eur).toFixed(2)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e2330;font-family:monospace;color:${price - alert.threshold_eur >= 0 ? '#2DD881' : '#FF5B47'}">
          +€${(price - alert.threshold_eur).toFixed(2)}
        </td>
      </tr>`).join('')

    const html = `
      <div style="background:#0b0d12;color:#e8eaf0;font-family:-apple-system,sans-serif;padding:32px;max-width:560px;margin:0 auto;border-radius:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:40px;height:40px;background:#7B7CF7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">🔔</div>
          <div>
            <div style="font-size:18px;font-weight:700;color:#e8eaf0">Alert prezzi · TCG Vault</div>
            <div style="font-size:12px;color:#8b90a0">${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <p style="color:#8b90a0;margin:0 0 20px;font-size:14px">
          ${items.length === 1 ? 'Una carta ha' : `${items.length} carte hanno`} superato la soglia impostata oggi:
        </p>

        <table style="width:100%;border-collapse:collapse;background:#131620;border-radius:10px;overflow:hidden">
          <thead>
            <tr style="background:#1a1f30">
              <th style="padding:10px 14px;text-align:left;font-size:10px;color:#8b90a0;text-transform:uppercase;letter-spacing:.08em">Carta</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;color:#8b90a0;text-transform:uppercase;letter-spacing:.08em">Prezzo</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;color:#8b90a0;text-transform:uppercase;letter-spacing:.08em">Soglia</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;color:#8b90a0;text-transform:uppercase;letter-spacing:.08em">Margine</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <p style="margin:24px 0 0;font-size:11px;color:#4a5060;text-align:center">
          TCG Vault · aggiornamento prezzi automatico giornaliero
        </p>
      </div>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TCG Vault <onboarding@resend.dev>',
        to: [email],
        subject: `🔔 ${items.length} carta${items.length > 1 ? 'e' : ''} sopra soglia — TCG Vault`,
        html,
      }),
    })
  }
}
