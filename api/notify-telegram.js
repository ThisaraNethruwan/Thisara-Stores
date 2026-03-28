// api/notify-telegram.js — Vercel Serverless Function
// Sends a detailed order notification to the owner's Telegram when an order is placed.

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

  // Escape HTML special chars so Telegram HTML mode doesn't break
  const esc = (s) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // ── Build items list ─────────────────────────────────────────────────────────
  // Weight-based:  ⚖️ Basmati Rice — 2.5 kg × 3 packs  →  Rs. 1,875
  // Regular:       🛒 Coconut Milk — x2               →  Rs. 480
  let itemLines = ''
  let itemCount = 0

  if (Array.isArray(items)) {
    itemCount = items.length
    items.forEach((i, idx) => {
      const num     = idx + 1
      const name    = esc(i.name)
      const sub     = Number(i.subtotal).toLocaleString()

      let qtyPart
      if (i.isWeightBased) {
        // Show weight label (e.g. "2.5 kg") AND how many packs/units were ordered
        const weightLabel = esc(i.weightLabel || `${i.weightValue} kg`)
        const packs       = i.qty > 1 ? ` × ${i.qty}` : ''
        qtyPart = `⚖️ ${weightLabel}${packs}`
      } else {
        qtyPart = `x${i.qty}`
      }

      itemLines += `  ${num}. <b>${name}</b>\n`
      itemLines += `      ${qtyPart}  →  Rs. ${sub}\n`
    })
  }

  // ── Build location block ──────────────────────────────────────────────────────
  let locationBlock = esc(deliveryAddress || 'Not provided')
  if (deliveryLat && deliveryLng) {
    const lat = Number(deliveryLat).toFixed(6)
    const lng = Number(deliveryLng).toFixed(6)
    locationBlock = `${esc(deliveryAddress)}\n📌 https://maps.google.com/?q=${lat},${lng}`
  }

  // ── Payment line ─────────────────────────────────────────────────────────────
  const paymentLine = paymentMethod === 'card'
    ? `💳 Card (PayHere) — ${paymentStatus === 'paid' ? '✅ PAID' : '⏳ Pending'}`
    : `💵 Cash on Delivery`

  // ── Delivery fee line ─────────────────────────────────────────────────────────
  const feeNum    = Number(deliveryFee || 0)
  const feeLine   = feeNum === 0
    ? `Delivery:  🎉 FREE`
    : `Delivery:  Rs. ${feeNum.toLocaleString()}`

  // ── Note line ────────────────────────────────────────────────────────────────
  const noteLine = note ? `\n📝 <b>Note:</b> ${esc(note)}\n` : ''

  // ── Compose message ──────────────────────────────────────────────────────────
  const message =
    `🛒 <b>NEW ORDER — Thisara Stores</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔖 Order ID:  <b>${esc(orderId)}</b>\n` +
    `👤 Customer:  <b>${esc(customerName)}</b>\n` +
    `📞 Phone:     <b>${esc(customerPhone)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Delivery Address:</b>\n${locationBlock}\n` +
    `${noteLine}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🧾 <b>Order Items (${itemCount}):</b>\n` +
    `${itemLines}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Subtotal:  Rs. ${Number(subtotal).toLocaleString()}\n` +
    `🚚 ${feeLine}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏷️ <b>TOTAL:  Rs. ${Number(totalPrice).toLocaleString()}</b>\n` +
    `💳 Payment:  ${paymentLine}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Please confirm &amp; arrange delivery 🚚</i>`

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method:  'POST',
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

    console.log(`[Telegram] Order ${orderId} notification sent ✅`)
    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('[Telegram] Fetch error:', err.message)
    return res.status(500).json({ error: 'Network error sending Telegram message' })
  }
}
