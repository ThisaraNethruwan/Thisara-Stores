// api/notify-telegram.js — Vercel Serverless Function
// Sends order notification to owner's Telegram instantly when order is placed.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.error('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Vercel env vars')
    return res.status(500).json({ error: 'Telegram not configured' })
  }

  const {
    orderId, customerName, customerPhone,
    deliveryAddress, deliveryLat, deliveryLng,
    items, subtotal, deliveryFee, totalPrice,
    paymentMethod, paymentStatus, note,
  } = req.body || {}

  if (!orderId || !customerName || !items) {
    return res.status(400).json({ error: 'Missing required order fields' })
  }

  // Build items list
  let itemLines = ''
  if (Array.isArray(items)) {
    items.forEach(i => {
      const qty = i.isWeightBased ? i.weightLabel : `x${i.qty}`
      itemLines += `  • ${i.name} (${qty}) — Rs. ${Number(i.subtotal).toLocaleString()}\n`
    })
  }

  // Build location block
  let locationBlock = deliveryAddress || 'Not provided'
  if (deliveryLat && deliveryLng) {
    const lat = Number(deliveryLat).toFixed(6)
    const lng = Number(deliveryLng).toFixed(6)
    locationBlock = `${deliveryAddress}\n📌 https://maps.google.com/?q=${lat},${lng}`
  }

  // Escape HTML special chars so Telegram HTML mode doesn't break
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  // Payment line
  const paymentLine = paymentMethod === 'card'
    ? `💳 Card (PayHere) — ${paymentStatus === 'paid' ? '✅ PAID' : '⏳ Pending'}`
    : `💵 Cash on Delivery`

  const message =
    `<b>NEW ORDER — Thisara Stores</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Order #${esc(orderId)}\n` +
    `<b>${esc(customerName)}</b>\n` +
    `${esc(customerPhone)}\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Delivery:</b>\n${esc(locationBlock)}\n` +
    (note ? `\n📝 Note: ${esc(note)}\n` : '') +
    `━━━━━━━━━━━━━━━━━\n` +
    `<b>Items:</b>\n${esc(itemLines)}` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Subtotal: Rs. ${Number(subtotal).toLocaleString()}\n` +
    `Delivery: Rs. ${Number(deliveryFee || 0).toLocaleString()}\n` +
    `<b>TOTAL: Rs. ${Number(totalPrice).toLocaleString()}</b>\n` +
    `${paymentLine}\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `<i>Please confirm &amp; arrange delivery 🚚</i>`

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    chatId,
          text:       message,
          parse_mode: 'HTML',
        }),
      }
    )

    const data = await response.json()

    if (!data.ok) {
      console.error('[Telegram] API error:', data)
      return res.status(500).json({ error: 'Telegram send failed', detail: data })
    }

    console.log(`[Telegram] Order #${orderId} notification sent ✅`)
    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('[Telegram] Fetch error:', err.message)
    return res.status(500).json({ error: 'Network error sending Telegram message' })
  }
}
