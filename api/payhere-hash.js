// api/payhere-hash.js — Vercel serverless function (ES Module)
// Generates the PayHere payment hash securely on the server.
// The PAYHERE_MERCHANT_SECRET env var never reaches the browser.
//
// Hash formula (PayHere docs):
//   MD5( merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase() )
//
// IMPORTANT: PayHere shows the Merchant Secret in their dashboard as a base64 string.
// The actual secret used in the hash must be the DECODED plain-text value.
// This function auto-detects and decodes base64 automatically.

import crypto from 'crypto'

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

// PayHere shows merchant secret as base64 in their dashboard.
// We auto-decode so it works whether Vercel env has base64 or plain text.
function resolveSecret(raw) {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    // If decoded is purely numeric digits, it's a valid decoded PayHere secret
    if (/^\d+$/.test(decoded.trim())) {
      console.log('[PayHere] Merchant secret auto-decoded from base64')
      return decoded.trim()
    }
  } catch {}
  // Not base64 — use as-is
  return raw
}

export default function handler(req, res) {
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

  const rawSecret = process.env.PAYHERE_MERCHANT_SECRET
  if (!rawSecret) {
    console.error('[PayHere] PAYHERE_MERCHANT_SECRET not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // Auto-decode base64 if needed (PayHere dashboard shows base64-encoded secret)
  const merchantSecret  = resolveSecret(rawSecret)
  const hashedSecret    = md5(merchantSecret).toUpperCase()
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
