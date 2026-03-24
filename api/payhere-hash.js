// api/payhere-hash.js — Vercel serverless function (ES Module)
// Generates the PayHere payment hash securely on the server.
// The PAYHERE_MERCHANT_SECRET env var never reaches the browser.
//
// Hash formula (PayHere docs):
//   MD5( merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase() )

import crypto from 'crypto'

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

export default function handler(req, res) {
  // CORS headers so the browser fetch works
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { merchant_id, order_id, amount, currency } = req.body || {}

  if (!merchant_id || !order_id || !amount || !currency) {
    return res.status(400).json({
      error: 'Missing fields',
      required: ['merchant_id', 'order_id', 'amount', 'currency'],
      received: { merchant_id, order_id, amount, currency },
    })
  }

  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET
  if (!merchantSecret) {
    console.error('[PayHere] PAYHERE_MERCHANT_SECRET not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const hashedSecret = md5(merchantSecret).toUpperCase()
  const amountFormatted = Number(amount).toFixed(2)

  const hash = md5(
    String(merchant_id) +
    String(order_id) +
    amountFormatted +
    String(currency) +
    hashedSecret
  ).toUpperCase()

  console.log('[PayHere] Hash generated for order:', order_id)

  return res.status(200).json({ hash })
}
