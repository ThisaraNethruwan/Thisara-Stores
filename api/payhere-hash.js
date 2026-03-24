// api/payhere-hash.js — Vercel Serverless Function
// Generates PayHere payment hash securely server-side.
//
// Official PayHere hash formula:
//   hash = MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase()).toUpperCase()
//
// IMPORTANT: PAYHERE_MERCHANT_SECRET in Vercel must be the RAW NUMBER (not base64).
// Get it by decoding the base64 shown in PayHere dashboard.

import crypto from 'crypto'

function md5upper(str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
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

  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET
  if (!merchantSecret) {
    console.error('[PayHere] PAYHERE_MERCHANT_SECRET not set in Vercel env vars!')
    return res.status(500).json({ error: 'Server config error' })
  }

  const amountStr    = Number(amount).toFixed(2)
  const hashedSecret = md5upper(merchantSecret)
  const hash         = md5upper(String(merchant_id) + String(order_id) + amountStr + String(currency) + hashedSecret)

  console.log(`[PayHere] Hash OK for order: ${order_id}`)
  return res.status(200).json({ hash })
}
