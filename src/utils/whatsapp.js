import { OWNER_WHATSAPP, SHOP_NAME } from './constants'

export function buildWhatsAppMessage(order) {
  const {
    customer_name, customer_phone, delivery_address,
    delivery_lat, delivery_lng, items, total_price, delivery_fee, note, order_id,
  } = order

  let lines = ''
  if (Array.isArray(items)) {
    items.forEach(i => {
      const q = i.is_weight_based ? i.weight_label : `x${i.qty}`
      lines += `  • ${i.name} (${q}) — Rs. ${Number(i.subtotal).toLocaleString()}\n`
    })
  }

  let locationStr = delivery_address || 'Not provided'
  if (delivery_lat && delivery_lng) {
    const mapLink = `https://maps.google.com/maps?q=${delivery_lat},${delivery_lng}`
    locationStr = `${delivery_address}\n📌 Map: ${mapLink}`
  }

  const subtotal = Number(total_price) - Number(delivery_fee || 0)

  return (
    `🛒 *NEW ORDER — ${SHOP_NAME}*\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `🆔 Order #${order_id || 'NEW'}\n` +
    `👤 *${customer_name}*\n` +
    `📞 ${customer_phone}\n` +
    `📍 *Delivery:*\n${locationStr}\n` +
    (note ? `📝 Note: ${note}\n` : '') +
    `━━━━━━━━━━━━━━━━━\n` +
    `*Items:*\n${lines}` +
    `━━━━━━━━━━━━━━━━━\n` +
    `🛍️ Subtotal: Rs. ${Number(subtotal).toLocaleString()}\n` +
    `🚚 Delivery: Rs. ${Number(delivery_fee || 0).toLocaleString()}\n` +
    `💰 *TOTAL: Rs. ${Number(total_price).toLocaleString()}*\n` +
    `\nPlease confirm & arrange delivery 🚚`
  )
}

export function openWhatsApp(message) {
  const url = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`
  const a   = document.createElement('a')
  a.href    = url
  a.target  = '_blank'
  a.rel     = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { try { document.body.removeChild(a) } catch {} }, 500)
}
