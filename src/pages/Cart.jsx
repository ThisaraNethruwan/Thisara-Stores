import { useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../components/CartContext'
import { addOrder } from '../lib/firebase'
import LocationPicker from '../components/LocationPicker'
import { SHOP_NAME, DELIVERY_RATE_PER_KM, FREE_DELIVERY_THRESHOLD } from '../utils/constants'
import toast from 'react-hot-toast'

const EMOJI = {
  'Rice & Grains': '🌾', 'Drinks & Beverages': '🥤', 'Spices & Dry Food': '🌶️',
  'Vegetables & Fruits': '🥦', 'Dairy & Eggs': '🥛', 'Snacks & Biscuits': '🍪',
  'Household & Cleaning': '🧴', 'Personal Care': '🧼',
}

const PAYHERE_MERCHANT_ID = import.meta.env.VITE_PAYHERE_MERCHANT_ID || ''
const PAYHERE_MODE        = import.meta.env.VITE_PAYHERE_MODE || 'sandbox'
const PAYHERE_SDK_URL     = 'https://www.payhere.lk/lib/payhere.js'

function loadPayHereSDK() {
  return new Promise((resolve, reject) => {
    if (window.payhere && typeof window.payhere.startPayment === 'function') { resolve(); return }
    const old = document.querySelector(`script[src="${PAYHERE_SDK_URL}"]`)
    if (old) old.remove()
    const script    = document.createElement('script')
    script.src      = PAYHERE_SDK_URL
    script.type     = 'text/javascript'
    const timeout   = setTimeout(() => { script.remove(); reject(new Error('PayHere SDK timed out')) }, 20000)
    script.onload   = () => {
      clearTimeout(timeout)
      setTimeout(() => {
        if (window.payhere && typeof window.payhere.startPayment === 'function') resolve()
        else reject(new Error('PayHere SDK did not initialise'))
      }, 500)
    }
    script.onerror  = () => { clearTimeout(timeout); script.remove(); reject(new Error('Failed to load PayHere SDK')) }
    document.head.appendChild(script)
  })
}

async function launchPayHere({ orderId, amount, customerName, customerPhone }) {
  try { await loadPayHereSDK() } catch (err) { return { success: false, reason: 'error', message: err.message } }
  let hash
  try {
    const res = await fetch('/api/payhere-hash', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: PAYHERE_MERCHANT_ID, order_id: String(orderId), amount: Number(amount).toFixed(2), currency: 'LKR' }),
    })
    if (!res.ok) throw new Error(`Hash API error ${res.status}`)
    const data = await res.json()
    if (!data.hash) throw new Error('Hash missing')
    hash = data.hash
  } catch { return { success: false, reason: 'error', message: 'Payment setup failed — please try again.' } }

  return new Promise((resolve) => {
    window.payhere.onCompleted = (id) => resolve({ success: true, orderId: id })
    window.payhere.onDismissed = () => resolve({ success: false, reason: 'dismissed' })
    window.payhere.onError     = (e) => resolve({ success: false, reason: 'error', message: String(e) })
    window.payhere.startPayment({
      sandbox: PAYHERE_MODE !== 'live', merchant_id: String(PAYHERE_MERCHANT_ID),
      return_url: undefined, cancel_url: undefined, notify_url: undefined,
      order_id: String(orderId), items: `${SHOP_NAME} Order #${orderId}`,
      amount: Number(amount).toFixed(2), currency: 'LKR', hash,
      first_name: customerName.split(' ')[0] || customerName,
      last_name:  customerName.split(' ').slice(1).join(' ') || '.',
      email: 'customer@thisarastores.com', phone: String(customerPhone),
      address: 'Sri Lanka', city: 'Ragama', country: 'Sri Lanka',
    })
  })
}

async function sendTelegramNotification(payload) {
  try {
    const res = await fetch('/api/notify-telegram', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) console.error('[Telegram] Failed:', await res.json())
    else console.log('[Telegram] Notification sent ✅')
  } catch (err) { console.error('[Telegram] Error:', err.message) }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Delivery Info Modal
   ───────────────────────────────────────────────────────────────────────────── */
function DeliveryInfoModal({ grandTotal, onConfirm, onClose, submitting }) {
  return (
    <div className="dim-overlay" onClick={onClose}>
      <div className="dim-card" onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button className="dim-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="dim-header">
          <h2 className="dim-title">Delivery Info</h2>
          <p className="dim-subtitle">Please read before placing your order</p>
        </div>

        {/* Info Cards */}
        <div className="dim-cards">

          {/* Tuesday notice */}
          <div className="dim-info-card dim-card-yellow">
            <div className="dim-info-body">
              <div className="dim-info-title">Tuesday Schedule</div>
              <div className="dim-info-badge dim-badge-yellow">No Deliveries on Tuesdays</div>
              <p className="dim-info-text">
                We don't deliver on Tuesdays. If your order falls on a Tuesday,
                we'll kindly deliver it on <strong>Wednesday</strong> instead.
              </p>
            </div>
          </div>

          {/* Timing notice */}
          <div className="dim-info-card dim-card-green">
            <div className="dim-info-body">
              <div className="dim-info-title">Delivery Timing</div>
              <div className="dim-info-badge dim-badge-green">All Deliveries After 5:00 PM</div>
              <p className="dim-info-text">
                We deliver every evening after <strong>5:00 PM</strong>.
                Make sure someone available to receive your order.
                Thank you for understanding!
              </p>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="dim-divider" />

        {/* Total row */}
        <div className="dim-total-row">
          <span className="dim-total-label">Order Total</span>
          <span className="dim-total-value">Rs. {grandTotal.toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="dim-actions">

          <button className="dim-btn-confirm" onClick={onConfirm} disabled={submitting}>
            {submitting
              ? <><span className="dim-spinner" />Processing…</>
              : <> Confirm Order</>}
          </button>
        </div>

        <p className="dim-note">By confirming, you agree to our delivery schedule above.</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Cart Page
   ───────────────────────────────────────────────────────────────────────────── */
export default function Cart() {
  const { cart, removeFromCart, updateQty, clearCart, total, count } = useCart()
  const navigate = useNavigate()

  const [form, setForm]             = useState({ name: '', phone: '', note: '' })
  const [location, setLocation]     = useState({ address: '', lat: null, lng: null, distKm: null, fee: null })
  const [errors, setErrors]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)

  const locationPickerKey = useMemo(() => `lp-${Date.now()}`, [])

  const deliveryFee = useMemo(() => {
    if (total >= FREE_DELIVERY_THRESHOLD) return 0
    if (location.fee !== null && location.fee !== undefined) return location.fee
    return null
  }, [total, location.fee])

  const grandTotal = deliveryFee !== null ? total + deliveryFee : total

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your full name'
    const phone = form.phone.replace(/\s/g, '')
    if (!phone) e.phone = 'Please enter your phone number'
    else if (!/^0\d{9}$/.test(phone)) e.phone = 'Enter a valid Sri Lankan number (07XXXXXXXX)'
    if (!location.address.trim()) e.address = 'Please set your delivery location'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(err => ({ ...err, [e.target.name]: undefined }))
  }

  const handleLocationSelect = useCallback((loc) => {
    setLocation(loc)
    setErrors(err => ({ ...err, address: undefined }))
  }, [])

  const buildPayload = (fee, tot, id, paymentStatus) => ({
    orderId: id,
    customerName: form.name.trim(),
    customerPhone: form.phone.replace(/\s/g, ''),
    deliveryAddress: location.address,
    deliveryLat: location.lat,
    deliveryLng: location.lng,
    note: form.note.trim(),
    items: cart.map(i => ({
      id: i.id, name: i.name, category: i.category, qty: i.qty,
      price: i.price || i.price_per_kg,
      isWeightBased: i.is_weight_based,
      weightValue: i.weight_value || null,
      weightLabel: i.weight_label || null,
      subtotal: i.subtotal,
    })),
    subtotal: tot - fee,
    deliveryFee: fee,
    totalPrice: tot,
    paymentMethod,
    paymentStatus,
    status: 'pending',
  })

  const handleCODOrder = async () => {
    setSubmitting(true)
    const fee = deliveryFee ?? 0
    const tot = total + fee
    const id  = `TS${Math.floor(Math.random() * 90000) + 10000}`
    const payload = buildPayload(fee, tot, id, 'cod_pending')
    try { await addOrder(payload) } catch (e) { console.error('Firebase error:', e) }
    await sendTelegramNotification(payload)
    clearCart()
    toast.success("Your order has been placed! We'll be in touch shortly 🎉")
    navigate('/order-success', { state: { name: form.name, orderId: id, method: 'cod' } })
    setSubmitting(false)
  }

  const handleOrderClick = () => {
    if (paymentMethod === 'card') return
    if (!validate()) { toast.error('Please fill in all required fields before continuing'); return }
    setShowDeliveryModal(true)
  }

  const handleConfirmOrder = () => {
    setShowDeliveryModal(false)
    handleCODOrder()
  }

  /* ── Empty cart ── */
  if (cart.length === 0) return (
    <main style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '70vh', padding: 24, background: '#fffbf0',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 76, marginBottom: 16 }}>🛒</div>
        <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 30, fontWeight: 900, marginBottom: 12 }}>
          Your cart is empty
        </h2>
        <p style={{ color: '#666', marginBottom: 28, lineHeight: 1.7 }}>
          Looks like you haven't added anything yet. Browse our fresh products and fill it up!
        </p>
        <Link to="/shop" className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
          Browse Products →
        </Link>
      </div>
    </main>
  )

  return (
    <>
      <style>{`
        /* ── Page shell ── */
        .cp { padding-bottom: 80px; background: #fffbf0; }

        /* ── Header ── */
        .cp-hdr {
          background: linear-gradient(135deg, #1a3d28, #1e6641);
          padding: 32px 0 44px;
        }
        .cp-hdr-in { max-width: 1160px; margin: 0 auto; padding: 0 20px; }
        .cp-hdr h1 {
          font-family: 'Fraunces', serif;
          font-size: clamp(26px, 5vw, 44px); font-weight: 900; color: #fff; margin-bottom: 4px;
        }
        .cp-hdr p { color: rgba(255,255,255,.8); font-size: 15px; }

        /* ── Body grid ── */
        .cp-body { max-width: 1160px; margin: 0 auto; padding: 28px 20px 0; }
        .cp-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; align-items: start; }

        /* ── Cards ── */
        .cp-card {
          background: #fff; border-radius: 18px;
          box-shadow: 0 2px 16px rgba(0,0,0,.07); overflow: hidden;
        }
        .cp-card-hdr {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 20px 14px; border-bottom: 2px solid #f0faf3;
        }
        .cp-card-hdr h2 { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 900; }

        /* ── Item list ── */
        .items-list { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
        .ci {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: #f9fdf9; border-radius: 12px;
          transition: background 0.18s;
        }
        .ci:hover { background: #f0faf3; }
        .ci-emoji { font-size: 30px; flex-shrink: 0; }
        .ci-info { flex: 1; min-width: 0; }
        .ci-name { font-weight: 700; font-size: 14px; color: #111; }
        .ci-price { font-size: 12px; color: #888; margin-top: 2px; }
        .ci-ctrl { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .qty-box {
          display: flex; align-items: center; gap: 6px;
          background: #fff; border-radius: 50px;
          padding: 4px 10px; border: 2px solid #e8ede9;
        }
        .qty-btn {
          background: none; border: none; color: #1e6641;
          font-size: 18px; font-weight: 900; cursor: pointer;
          line-height: 1; width: 22px; text-align: center;
        }
        .ci-sub {
          font-family: 'Fraunces', serif; font-weight: 900; font-size: 14px;
          color: #1e6641; min-width: 72px; text-align: right;
        }
        .ci-rm {
          background: none; border: none; color: #ccc;
          font-size: 15px; cursor: pointer; transition: color 0.15s;
        }
        .ci-rm:hover { color: #e63946; }

        /* ── Totals ── */
        .totals { padding: 14px 16px 18px; }
        .trow {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; font-size: 14px; color: #555; border-bottom: 1px solid #f0faf3;
        }
        .trow:last-of-type { border-bottom: none; }
        .gtbox {
          background: linear-gradient(135deg, #1a3d28, #1e6641);
          border-radius: 12px; padding: 16px;
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 10px; color: #fff;
        }

        /* ── Checkout form column ── */
        .fc {
          background: #fff; border-radius: 18px;
          box-shadow: 0 2px 16px rgba(0,0,0,.07);
          padding: 24px 22px; position: sticky; top: 80px;
        }
        .fc h2 { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 900; margin-bottom: 20px; }

        /* ── Form fields ── */
        .ff { margin-bottom: 15px; }
        .ff label { display: block; font-size: 13px; font-weight: 700; color: #444; margin-bottom: 6px; }
        .ff input {
          width: 100%; padding: 11px 14px; border: 2px solid #e8ede9; border-radius: 10px;
          font-size: 14px; outline: none; background: #fff;
          font-family: 'Nunito', sans-serif;
          transition: border-color .2s; box-sizing: border-box;
        }
        .ff input:focus { border-color: #52b788; }
        .ff input.err   { border-color: #e63946; }
        .ferr { font-size: 12px; color: #e63946; margin-top: 4px; }

        /* ── Payment toggle ── */
        .pm-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        .pm-btn {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 14px 10px; border-radius: 14px;
          border: 2px solid #e8ede9; background: #fff;
          cursor: pointer; transition: all .2s; font-family: 'Nunito', sans-serif;
        }
        .pm-btn:hover           { border-color: #52b788; background: #f9fdf9; }
        .pm-btn.active          { border-color: #1e6641; background: #f0faf3; }
        .pm-btn-icon            { font-size: 26px; }
        .pm-btn-label           { font-size: 13px; font-weight: 800; color: #222; }
        .pm-btn-sub             { font-size: 11px; color: #888; }
        .pm-btn.active .pm-btn-label { color: #1e6641; }

        /* ── Info boxes ── */
        .info-box {
          border-radius: 12px; padding: 11px 14px; font-size: 13px;
          font-weight: 600; margin-bottom: 18px;
          display: flex; gap: 8px; align-items: flex-start; line-height: 1.6;
        }
        .info-green { background: #f0fff4; border: 1.5px solid #86efac; color: #166534; }

        /* ── Coming soon box ── */
        .coming-soon-box {
          background: #fff; border: 2px solid #083982;
          border-radius: 14px; padding: 18px 16px;
          margin-bottom: 18px; text-align: center;
        }
        .coming-soon-title { font-size: 15px; font-weight: 800; color: #083982; margin-bottom: 4px; }
        .coming-soon-desc  { font-size: 12px; color: #083982; line-height: 1.6; font-weight: 500; }
        .coming-soon-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: #d5e2ff; color: #083982;
          padding: 4px 12px; border-radius: 50px;
          font-size: 11px; font-weight: 800; margin-top: 10px; letter-spacing: .4px;
        }

        /* ── Order button ── */
        .order-btn {
          width: 100%; padding: 16px; border-radius: 14px;
          font-weight: 800; font-size: 16px; border: none; cursor: pointer;
          margin-bottom: 10px; font-family: 'Nunito', sans-serif; transition: all .2s;
        }
        .order-btn:not(:disabled):hover  { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(30,102,65,.3); }
        .order-btn:disabled {
          background: #d1d5db !important; color: #9ca3af !important;
          cursor: not-allowed !important; transform: none !important; box-shadow: none !important;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .cp-grid { grid-template-columns: 1fr !important; }
          .fc { position: static; }
        }
        @media (max-width: 540px) {
          .ci { flex-wrap: wrap; gap: 8px; }
          .ci-ctrl { width: 100%; justify-content: space-between; }
        }

        /* ══════════════════════════════════════════
           DELIVERY INFO MODAL
        ══════════════════════════════════════════ */

        /* Overlay */
        .dim-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(10, 30, 18, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: dimFadeIn 0.22s ease;
        }
        @keyframes dimFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Modal card */
        .dim-card {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          position: relative;
          overflow: hidden;
          animation: dimSlideUp 0.28s cubic-bezier(0.34, 1.36, 0.64, 1);
        }
        @keyframes dimSlideUp {
          from { transform: translateY(40px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }

        /* Close btn */
        .dim-close {
          position: absolute; top: 14px; right: 14px;
          background: rgba(252, 247, 247, 0.31); border: none;
          width: 32px; height: 32px; border-radius: 50%;
          font-size: 13px; color: #171616; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          z-index: 2;
        }
        .dim-close:hover { background: rgba(0,0,0,0.13); }

        /* Header */
        .dim-header {
          background: linear-gradient(135deg, #1a3d28 0%, #1e6641 100%);
          padding: 28px 24px 22px;
          text-align: center;
        }
        .dim-header-icon {
          font-size: 38px; margin-bottom: 8px;
          animation: dimBounce 0.6s ease 0.3s both;
        }
        @keyframes dimBounce {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .dim-title {
          font-family: 'Fraunces', serif;
          font-size: 28px; font-weight: 900;
          color: #fff; margin: 0 0 4px;
        }
        .dim-subtitle {
          font-size: 11px; color: rgba(255,255,255,0.72);
          margin: 0;
        }

        /* Info cards area */
        .dim-cards {
          padding: 16px 18px 4px;
          display: flex; flex-direction: column; gap: 12px;
        }

        .dim-info-card {
          display: flex; gap: 14px; align-items: flex-start;
          border-radius: 14px; padding: 14px 16px;
          border-left: 4px solid transparent;
        }
        .dim-card-yellow {
          background: #fffbeb;
          border-left-color: #f59e0b;
        }
        .dim-card-green {
          background: #f0fdf4;
          border-left-color: #16a34a;
        }

        .dim-info-icon {
          font-size: 28px; flex-shrink: 0;
          margin-top: 2px;
        }

        .dim-info-body { flex: 1; }

        .dim-info-title {
          font-size: 13px; font-weight: 800; color: #1a1a1a;
          margin-bottom: 5px; letter-spacing: 0.2px;
        }

        .dim-info-badge {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          padding: 3px 10px; border-radius: 50px;
          margin-bottom: 7px; letter-spacing: 0.3px;
        }
        .dim-badge-yellow {
          background: #fef3c7; color: #92400e;
        }
        .dim-badge-green {
          background: #dcfce7; color: #166534;
        }

        .dim-info-text {
          font-size: 12.5px; color: #555; line-height: 1.65;
          margin: 0;
        }
        .dim-info-text strong { color: #1a1a1a; font-weight: 800; }

        /* Divider */
        .dim-divider {
          height: 1px; background: #f0f0f0;
          margin: 14px 18px 0;
        }

        /* Total row */
        .dim-total-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 20px 0;
        }
        .dim-total-label {
          font-size: 13px; color: #888; font-weight: 600;
        }
        .dim-total-value {
          font-family: 'Fraunces', serif;
          font-size: 20px; font-weight: 900; color: #1e6641;
        }

        /* Action buttons */
        .dim-actions {
          display: grid; grid-template-columns: 1fr 1.6fr;
          gap: 10px; padding: 14px 18px 6px;
        }
        .dim-btn-cancel {
          padding: 14px; border-radius: 12px;
          background: #f5f5f5; color: #555;
          border: none; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: 'Nunito', sans-serif;
          transition: background 0.15s;
        }
        .dim-btn-cancel:hover:not(:disabled) { background: #ebebeb; }
        .dim-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        .dim-btn-confirm {
          padding: 14px; border-radius: 12px;
          background: linear-gradient(135deg, #1a3d28, #1e6641);
          color: #fff; border: none;
          font-size: 14px; font-weight: 800;
          cursor: pointer; font-family: 'Nunito', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
        }
        .dim-btn-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(30,102,65,0.35);
        }
        .dim-btn-confirm:disabled {
          opacity: 0.7; cursor: not-allowed; transform: none;
        }

        /* Spinner */
        .dim-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Fine print */
        .dim-note {
          font-size: 11px; color: #aaa;
          text-align: center; padding: 6px 18px 18px;
          line-height: 1.5; margin: 0;
        }

        /* Mobile modal tweaks */
        @media (max-width: 480px) {
          .dim-card { border-radius: 20px; }
          .dim-header { padding: 24px 20px 18px; }
          .dim-cards { padding: 14px 14px 4px; gap: 10px; }
          .dim-actions { grid-template-columns: 1fr; padding: 12px 14px 6px; }
          .dim-btn-cancel { padding: 12px; }
          .dim-btn-confirm { padding: 14px; }
          .dim-total-row { padding: 10px 16px 0; }
          .dim-note { padding: 6px 14px 16px; }
        }
      `}</style>

      {/* Delivery info modal */}
      {showDeliveryModal && (
        <DeliveryInfoModal
          grandTotal={grandTotal}
          onConfirm={handleConfirmOrder}
          onClose={() => !submitting && setShowDeliveryModal(false)}
          submitting={submitting}
        />
      )}

      <main className="cp">
        {/* Header */}
        <div className="cp-hdr">
          <div className="cp-hdr-in">
            <h1>My Cart</h1>
            <p>{count} item{count !== 1 ? 's' : ''} · Rs. {total.toLocaleString()}</p>
          </div>
        </div>

        <div className="cp-body">
          <div className="cp-grid">

            {/* ── Left: items + totals ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="cp-card">
                <div className="cp-card-hdr">
                  <h2>🛒 Order Items ({count})</h2>
                  <button
                    onClick={() => { if (window.confirm('Are you sure you want to clear your cart?')) clearCart() }}
                    style={{ background: 'none', border: '1.5px solid #e8ede9', color: '#888', padding: '5px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer' }}
                  >Clear All</button>
                </div>

                <div className="items-list">
                  {cart.map(item => (
                    <div key={item.cartKey} className="ci">
                      <div className="ci-emoji">{EMOJI[item.category] || '🛒'}</div>
                      <div className="ci-info">
                        <div className="ci-name">{item.name}</div>
                        <div className="ci-price">
                          {item.is_weight_based
                            ? `⚖️ ${item.weight_label} · Rs. ${Number(item.price_per_kg).toLocaleString()}/kg`
                            : `Rs. ${Number(item.price).toLocaleString()}${item.unit ? ` per ${item.unit}` : ''}`}
                        </div>
                      </div>
                      <div className="ci-ctrl">
                        <div className="qty-box">
                          <button className="qty-btn" onClick={() => updateQty(item.cartKey, item.qty - 1)}>−</button>
                          <span style={{ fontWeight: 800, fontSize: 14, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.cartKey, item.qty + 1)}>+</button>
                        </div>
                        <div className="ci-sub">Rs. {Number(item.subtotal).toLocaleString()}</div>
                        <button className="ci-rm" onClick={() => removeFromCart(item.cartKey)} aria-label="Remove item">✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery notice */}
                {total >= FREE_DELIVERY_THRESHOLD ? (
                  <div className="notice notice-free">
                    <span>🎉</span>
                    <span>Wonderful — you've qualified for free delivery on orders over Rs. {FREE_DELIVERY_THRESHOLD.toLocaleString()}!</span>
                  </div>
                ) : !location.lat ? (
                  <div className="notice notice-pending">
                    <span>📍</span>
                    <span>Please pin your location to see the delivery fee (Rs. {DELIVERY_RATE_PER_KM}/km).</span>
                  </div>
                ) : deliveryFee !== null ? (
                  <div className="notice notice-has">
                    <span>🚚</span>
                    <span>
                      {location.distKm?.toFixed(1)} km away · {deliveryFee === 0
                        ? 'Free delivery — enjoy! 🎉'
                        : `Delivery fee: Rs. ${deliveryFee.toLocaleString()}`}
                    </span>
                  </div>
                ) : null}

                {/* Totals */}
                <div className="totals">
                  <div className="trow">
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 700 }}>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div className="trow">
                    <span>Delivery fee</span>
                    <span style={{ fontWeight: 700 }}>
                      {total >= FREE_DELIVERY_THRESHOLD
                        ? <span style={{ background: '#d8f3dc', color: '#1e6641', padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 800 }}>🎉 FREE</span>
                        : deliveryFee !== null
                          ? `Rs. ${deliveryFee.toLocaleString()}`
                          : <span style={{ color: '#b45309', fontSize: 12 }}>📍 Pin your location first</span>}
                    </span>
                  </div>
                  <div className="gtbox">
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>Grand Total</div>
                      <div style={{ fontFamily: 'Fraunces,serif', fontSize: 24, fontWeight: 900 }}>
                        Rs. {grandTotal.toLocaleString()}
                      </div>
                    </div>
                    <span style={{ fontSize: 32 }}>💰</span>
                  </div>
                </div>
              </div>

              <Link to="/shop" style={{ color: '#1e6641', fontWeight: 700, fontSize: 14 }}>← Continue Shopping</Link>
            </div>

            {/* ── Right: delivery form ── */}
            <div className="fc">
              <h2>📦 Delivery Details</h2>

              <div className="ff">
                <label>Your Name *</label>
                <input
                  name="name"
                  className={errors.name ? 'err' : ''}
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  autoComplete="name"
                />
                {errors.name && <div className="ferr">⚠️ {errors.name}</div>}
              </div>

              <div className="ff">
                <label>Phone Number *</label>
                <input
                  name="phone"
                  className={errors.phone ? 'err' : ''}
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="07XXXXXXXX"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
                {errors.phone && <div className="ferr">⚠️ {errors.phone}</div>}
              </div>

              <div className="ff">
                <label>
                  Delivery Location *{' '}
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>(pin on map or type)</span>
                </label>
                <LocationPicker
                  key={locationPickerKey}
                  onLocationSelect={handleLocationSelect}
                  initialAddress={location.address}
                  cartTotal={total}
                />
                {errors.address && <div className="ferr">⚠️ {errors.address}</div>}
              </div>

              {/* Inline fee summary */}
              {location.lat && deliveryFee !== null && deliveryFee > 0 && (
                <div style={{ background: '#f0faf3', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#555' }}>Items</span>
                    <span style={{ fontWeight: 700 }}>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#555' }}>Delivery ({location.distKm?.toFixed(1)} km)</span>
                    <span style={{ fontWeight: 700 }}>Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #d8f3dc', paddingTop: 6, marginTop: 4 }}>
                    <span style={{ fontWeight: 800, color: '#1e6641' }}>Total</span>
                    <span style={{ fontWeight: 900, color: '#1e6641', fontSize: 16 }}>Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {total >= FREE_DELIVERY_THRESHOLD && (
                <div style={{ background: '#d8f3dc', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1e6641', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                  🎉 Free delivery applied to your order!
                </div>
              )}

              <div className="ff">
                <label>Special Request <span style={{ fontWeight: 500, color: '#aaa' }}>(optional)</span></label>
                <input
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Any special instructions for your order…"
                />
              </div>

              {/* Payment method */}
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 10 }}>
                  Payment Method *
                </label>
                <div className="pm-toggle">
                  <button
                    type="button"
                    className={`pm-btn${paymentMethod === 'cod' ? ' active' : ''}`}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    <span className="pm-btn-icon">💵</span>
                    <span className="pm-btn-label">Cash on Delivery</span>
                    <span className="pm-btn-sub">Pay when delivered</span>
                  </button>
                  <button
                    type="button"
                    className={`pm-btn${paymentMethod === 'card' ? ' active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <span className="pm-btn-icon">💳</span>
                    <span className="pm-btn-label">Pay by Card</span>
                    <span className="pm-btn-sub">Visa / Mastercard</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'cod' ? (
                <>
                  <div className="info-box info-green">
                    <span>💚</span>
                    <span>
                      Your order will be confirmed right away, and we'll give you a call to arrange delivery!
                    </span>
                  </div>
                  <button
                    className="order-btn"
                    onClick={handleOrderClick}
                    disabled={submitting}
                    style={{ background: submitting ? '#ccc' : '#086129', color: '#fff' }}
                  >
                    {submitting ? '⏳ Processing your order…' : `🛒 Place Order — Rs. ${grandTotal.toLocaleString()}`}
                  </button>
                  <p style={{ fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 1.6 }}>
                    We'll reach out to confirm your delivery time 📞
                  </p>
                </>
              ) : (
                <>
                  <div className="coming-soon-box">
                    <div className="coming-soon-title">Card Payment Coming Soon</div>
                    <div className="coming-soon-desc">
                      We're working hard to bring you a secure and seamless online payment experience.
                      In the meantime, please use Cash on Delivery — we appreciate your patience!
                    </div>
                    <span className="coming-soon-badge">⚙️ Coming Soon</span>
                  </div>
                  <button className="order-btn" disabled style={{ background: '#d1d5db', color: '#9ca3af' }}>
                    💳 Card Payment — Coming Soon
                  </button>
                  <p style={{ fontSize: 12, color: '#b45309', textAlign: 'center', lineHeight: 1.6, fontWeight: 600 }}>
                    Please use Cash on Delivery for now 💵
                  </p>
                </>
              )}
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
