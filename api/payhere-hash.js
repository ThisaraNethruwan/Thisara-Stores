// api/payhere-hash.js — Vercel serverless function
// Generates the PayHere payment hash securely on the server side.
// The MERCHANT_SECRET never reaches the browser.
//
// PayHere hash formula:
//   MD5( merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase() )
//
// Docs: https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout#2-hash-generation

import crypto from 'crypto'

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { merchant_id, order_id, amount, currency } = req.body

  // Validate required fields
  if (!merchant_id || !order_id || !amount || !currency) {
    return res.status(400).json({ error: 'Missing required fields: merchant_id, order_id, amount, currency' })
  }

  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET
  if (!merchantSecret) {
    console.error('[PayHere Hash] PAYHERE_MERCHANT_SECRET is not set in environment variables')
    return res.status(500).json({ error: 'Payment configuration error. Please contact support.' })
  }

  // Step 1: MD5 of the merchant secret (uppercase)
  const hashedSecret = md5(merchantSecret).toUpperCase()

  // Step 2: Final hash
  const hash = md5(
    merchant_id +
    order_id +
    Number(amount).toFixed(2) +
    currency +
    hashedSecret
  ).toUpperCase()

  return res.status(200).json({ hash })
}