// api/payhere-hash.js — Vercel Serverless Function
// Generates PayHere hash server-side so merchant secret never goes to browser.
//
// Official PayHere hash formula:
//   hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
//
// The Merchant Secret shown in PayHere dashboard is base64-encoded.
// This function handles BOTH cases automatically.

import crypto from 'crypto'

function md5upper(str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
}

function resolveSecret(raw) {
  // PayHere dashboard displays the secret as base64. Decode if it looks base64.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    if (/^\d{30,}$/.test(decoded.trim())) {
      return decoded.trim()  // It was base64 — use the decoded number
    }
  } catch {}
  return raw  // Already plain text — use as-is
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { merchant_id, order_id, amount, currency } = req.body || {}
  if (!merchant_id || !order_id || !amount || !currency) {
    return res.status(400).json({ error: 'Missing: merchant_id, order_id, amount, currency' })
  }

  const rawSecret = process.env.PAYHERE_MERCHANT_SECRET
  if (!rawSecret) {
    console.error('[PayHere] PAYHERE_MERCHANT_SECRET env var not set in Vercel!')
    return res.status(500).json({ error: 'Server config error: merchant secret missing' })
  }

  const secret          = resolveSecret(rawSecret)
  const amountStr       = Number(amount).toFixed(2)
  const hashedSecret    = md5upper(secret)
  const hash            = md5upper(merchant_id + order_id + amountStr + currency + hashedSecret)

  console.log(`[PayHere] Hash OK — order: ${order_id}, amount: ${amountStr}`)
  return res.status(200).json({ hash })
}
