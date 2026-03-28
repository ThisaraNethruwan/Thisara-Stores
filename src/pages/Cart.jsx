import { useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../components/CartContext'
import { addOrder } from '../lib/firebase'
import LocationPicker from '../components/LocationPicker'
import { SHOP_NAME, DELIVERY_RATE_PER_KM, FREE_DELIVERY_THRESHOLD } from '../utils/constants'
import toast from 'react-hot-toast'

// ── Short Order ID: TS + 6 random alphanumeric chars  e.g. TS4X9K2M ──────────
function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `TS${suffix}`
}

const CAT_COLORS = {
  'Rice & Grains':        'linear-gradient(135deg,#f5e6b0,#e8d070)',
  'Vegetables & Fruits':  'linear-gradient(135deg,#b7f5c4,#52c47a)',
  'Drinks & Beverages':   'linear-gradient(135deg,#bfdbfe,#60a5fa)',
  'Spices & Dry Food':    'linear-gradient(135deg,#fecaca,#f87171)',
  'Dairy & Eggs':         'linear-gradient(135deg,#ede9fe,#a78bfa)',
  'Snacks & Biscuits':    'linear-gradient(135deg,#fef3c7,#fbbf24)',
  'Household & Cleaning': 'linear-gradient(135deg,#cffafe,#22d3ee)',
  'Personal Care':        'linear-gradient(135deg,#fce7f3,#f472b6)',
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

/* ── Cart item image component ─────────────────────────────────────────────── */
function ItemImage({ item }) {
  const [imgErr, setImgErr] = useState(false)
  const bg = CAT_COLORS[item.category] || 'linear-gradient(135deg,#d8f3dc,#b7e4c7)'

  if (item.image_url && !imgErr) {
    return (
      <img
        src={item.image_url}
        alt={item.name}
        onError={() => setImgErr(true)}
        style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '2px solid #e8ede9' }}
      />
    )
  }
  return (
    <div style={{
      width: 54, height: 54, borderRadius: 10, flexShrink: 0,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
    }}>
      {item.category_emoji || '🛒'}
    </div>
  )
}

/* ── Card Coming Soon Modal ─────────────────────────────────────────────────── */
function CardComingSoonModal({ onClose }) {
  return (
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm-card" onClick={e => e.stopPropagation()}>
        <button className="csm-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="csm-banner">
          <div className="csm-banner-rings">
            <div className="csm-ring csm-ring-1" />
            <div className="csm-ring csm-ring-2" />
            <div className="csm-ring csm-ring-3" />
          </div>
          <div className="csm-banner-icon">💳</div>
        </div>

        <div className="csm-body">
          <div className="csm-badge">Coming Soon</div>
          <h2 className="csm-title">Card Payment</h2>
          <p className="csm-desc">
            This feature is <strong>currently under development.</strong> We are working hard to bring you a
            <strong> seamless and secure</strong> online card payment option.
          </p>

          <div className="csm-features">
            <div className="csm-feat">
              <div className="csm-feat-icon csm-feat-blue">🔒</div>
              <div>
                <div className="csm-feat-title">Bank-level Security</div>
                <div className="csm-feat-sub">256-bit SSL encryption</div>
              </div>
            </div>
            <div className="csm-feat">
              <div className="csm-feat-icon csm-feat-purple">⚡</div>
              <div>
                <div className="csm-feat-title">Instant Payments</div>
                <div className="csm-feat-sub">Visa, Mastercard & more</div>
              </div>
            </div>
          </div>

          <div className="csm-divider" />

          <button className="csm-btn-ok" onClick={onClose}>
            Got it — use Cash on Delivery
          </button>
          <p className="csm-note">We'll notify you as soon as card payments go live 🎉</p>
        </div>
      </div>
    </div>
  )
}

/* ── Delivery Info Modal ────────────────────────────────────────────────────── */
function DeliveryInfoModal({ grandTotal, onConfirm, onClose, submitting }) {
  return (
    <div className="dim-overlay" onClick={() => !submitting && onClose()}>
      <div className="dim-card" onClick={e => e.stopPropagation()}>
        <button className="dim-close" onClick={() => !submitting && onClose()} aria-label="Close">✕</button>
        <div className="dim-header">
          <h2 className="dim-title">Delivery Info</h2>
          <p className="dim-subtitle">Please read before placing your order</p>
        </div>
        <div className="dim-cards">
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
          <div className="dim-info-card dim-card-green">
            <div className="dim-info-body">
              <div className="dim-info-title">Delivery Timing</div>
              <div className="dim-info-badge dim-badge-green">All Deliveries After 5:00 PM</div>
              <p className="dim-info-text">
                We deliver every evening after <strong>5:00 PM</strong>.
                Make sure someone is available to receive your order.
              </p>
            </div>
          </div>
        </div>
        <div className="dim-divider" />
        <div className="dim-total-row">
          <span className="dim-total-label">Order Total</span>
          <span className="dim-total-value">Rs. {grandTotal.toLocaleString()}</span>
        </div>
        <div className="dim-actions">
          <button className="dim-btn-confirm" onClick={onConfirm} disabled={submitting}>
            {submitting ? <><span className="dim-spinner" />Processing…</> : <>Confirm Order</>}
          </button>
        </div>
        <p className="dim-note">By confirming, you agree to our delivery schedule above.</p>
      </div>
    </div>
  )
}

/* ── Cart Page ──────────────────────────────────────────────────────────────── */
export default function Cart() {
  const { cart, removeFromCart, updateQty, clearCart, total, count } = useCart()
  const navigate = useNavigate()

  const [form, setForm]                           = useState({ name: '', phone: '', note: '' })
  const [location, setLocation]                   = useState({ address: '', lat: null, lng: null, distKm: null, fee: null })
  const [errors, setErrors]                       = useState({})
  const [submitting, setSubmitting]               = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [paymentMethod, setPaymentMethod]         = useState('cod')
  const [showCardModal, setShowCardModal]         = useState(false)

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
    if (!location.address.trim()) e.address = 'Please set your delivery location on the map'
    if (location.lat && deliveryFee === null) e.address = 'Location fee could not be calculated — please re-pin'
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

  const buildPayload = (fee, tot, id) => ({
    orderId: id,
    customerName:    form.name.trim(),
    customerPhone:   form.phone.replace(/\s/g, ''),
    deliveryAddress: location.address,
    deliveryLat:     location.lat,
    deliveryLng:     location.lng,
    note:            form.note.trim(),
    items: cart.map(i => ({
      id:            i.id,
      name:          i.name,
      category:      i.category,
      image_url:     i.image_url || '',
      qty:           i.qty,
      price:         i.price || i.price_per_kg,
      isWeightBased: i.is_weight_based,
      weightValue:   i.weight_value || null,
      weightLabel:   i.weight_label || null,
      subtotal:      i.subtotal,
    })),
    subtotal:      tot - fee,
    deliveryFee:   fee,
    totalPrice:    tot,
    paymentMethod: 'cod',
    paymentStatus: 'cod_pending',
    status:        'pending',
  })

  const handleCODOrder = async () => {
    setSubmitting(true)
    const fee     = deliveryFee ?? 0
    const tot     = total + fee
    const id      = generateOrderId()
    const payload = buildPayload(fee, tot, id)
    try {
      await addOrder(payload)
    } catch (e) {
      console.error('Firebase order error:', e)
    }
    await sendTelegramNotification(payload)
    clearCart()
    toast.success("Your order has been placed! We'll be in touch shortly 🎉")
    navigate('/order-success', { state: { name: form.name, orderId: id, method: 'cod', total: tot } })
    setSubmitting(false)
  }

  const handleOrderClick = () => {
    if (!validate()) { toast.error('Please fill in all required fields'); return }
    setShowDeliveryModal(true)
  }

  const handleConfirmOrder = () => {
    setShowDeliveryModal(false)
    handleCODOrder()
  }

  /* ── Empty cart ── */
  if (cart.length === 0) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 24, background: '#fffbf0' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 76, marginBottom: 16 }}>🛒</div>
        <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 30, fontWeight: 900, marginBottom: 12 }}>Your cart is empty</h2>
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
        .cp { padding-bottom: 80px; background: #fffbf0; }
        .cp-hdr { background: linear-gradient(135deg, #1a3d28, #1e6641); padding: 32px 0 44px; }
        .cp-hdr-in { max-width: 1160px; margin: 0 auto; padding: 0 20px; }
        .cp-hdr h1 { font-family:'Fraunces',serif; font-size:clamp(26px,5vw,44px); font-weight:900; color:#fff; margin-bottom:4px; }
        .cp-hdr p { color:rgba(255,255,255,.8); font-size:15px; }
        .cp-body { max-width:1160px; margin:0 auto; padding:28px 20px 0; }
        .cp-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:24px; align-items:start; }
        .cp-card { background:#fff; border-radius:18px; box-shadow:0 2px 16px rgba(0,0,0,.07); overflow:hidden; }
        .cp-card-hdr { display:flex; justify-content:space-between; align-items:center; padding:18px 20px 14px; border-bottom:2px solid #f0faf3; }
        .cp-card-hdr h2 { font-family:'Fraunces',serif; font-size:18px; font-weight:900; }
        .items-list { padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
        .ci { display:flex; align-items:center; gap:12px; padding:10px 12px; background:#f9fdf9; border-radius:12px; transition:background .18s; }
        .ci:hover { background:#f0faf3; }
        .ci-info { flex:1; min-width:0; }
        .ci-name { font-weight:700; font-size:14px; color:#111; }
        .ci-price { font-size:12px; color:#888; margin-top:2px; }
        .ci-ctrl { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .qty-box { display:flex; align-items:center; gap:6px; background:#fff; border-radius:50px; padding:4px 10px; border:2px solid #e8ede9; }
        .qty-btn { background:none; border:none; color:#1e6641; font-size:18px; font-weight:900; cursor:pointer; line-height:1; width:22px; text-align:center; }
        .ci-sub { font-family:'Fraunces',serif; font-weight:900; font-size:14px; color:#1e6641; min-width:72px; text-align:right; }
        .ci-rm { background:none; border:none; color:#ccc; font-size:15px; cursor:pointer; transition:color .15s; }
        .ci-rm:hover { color:#e63946; }
        .totals { padding:14px 16px 18px; }
        .trow { display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:14px; color:#555; border-bottom:1px solid #f0faf3; }
        .trow:last-of-type { border-bottom:none; }
        .gtbox { background:linear-gradient(135deg,#1a3d28,#1e6641); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center; margin-top:10px; color:#fff; }
        .fc { background:#fff; border-radius:18px; box-shadow:0 2px 16px rgba(0,0,0,.07); padding:24px 22px; position:sticky; top:80px; }
        .fc h2 { font-family:'Fraunces',serif; font-size:18px; font-weight:900; margin-bottom:20px; }
        .ff { margin-bottom:15px; }
        .ff label { display:block; font-size:13px; font-weight:700; color:#444; margin-bottom:6px; }
        .ff input { width:100%; padding:11px 14px; border:2px solid #e8ede9; border-radius:10px; font-size:14px; outline:none; background:#fff; font-family:'Nunito',sans-serif; transition:border-color .2s; box-sizing:border-box; }
        .ff input:focus { border-color:#52b788; }
        .ff input.err { border-color:#e63946; }
        .ferr { font-size:12px; color:#e63946; margin-top:4px; }
        .info-box { border-radius:12px; padding:11px 14px; font-size:13px; font-weight:600; margin-bottom:18px; display:flex; gap:8px; align-items:flex-start; line-height:1.6; }
        .info-green { background:#f0fff4; border:1.5px solid #86efac; color:#166534; }
        .order-btn { width:100%; padding:16px; border-radius:14px; font-weight:800; font-size:16px; border:none; cursor:pointer; margin-bottom:10px; font-family:'Nunito',sans-serif; transition:all .2s; }
        .order-btn:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(30,102,65,.3); }
        .order-btn:disabled { background:#d1d5db !important; color:#9ca3af !important; cursor:not-allowed !important; transform:none !important; box-shadow:none !important; }
        /* ── iOS touch fix ── */
.order-btn,
.pay-opt,
.qty-btn,
.ci-rm {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
        @media(max-width:900px) { .cp-grid { grid-template-columns:1fr !important; } .fc { position:static; } }
        @media(max-width:540px) { .ci { flex-wrap:wrap; gap:8px; } .ci-ctrl { width:100%; justify-content:space-between; } }

        /* ── Payment Method Selector ── */
        .pay-wrap { margin-bottom:18px; }
        .pay-label { font-size:13px; font-weight:700; color:#444; margin-bottom:10px; display:block; }
        .pay-options { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .pay-opt { position:relative; border:2px solid #e8ede9; border-radius:14px; padding:14px 12px 12px; cursor:pointer; transition:all .22s; background:#fafafa; display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; user-select:none; }
        .pay-opt:hover { border-color:#52b788; background:#f0fdf4; }
        .pay-opt.active { border-color:#1e6641; background:#f0fdf4; box-shadow:0 0 0 3px rgba(30,102,65,.1); }
        .pay-opt.card-opt { cursor:pointer; }
        .pay-opt-icon { font-size:28px; line-height:1; }
        .pay-opt-name { font-size:13px; font-weight:800; color:#1a1a1a; }
        .pay-opt-sub { font-size:11px; color:#888; font-weight:500; line-height:1.4; }
        .pay-opt-check { position:absolute; top:8px; right:8px; width:18px; height:18px; border-radius:50%; background:#1e6641; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .18s, transform .18s; transform:scale(.6); }
        .pay-opt.active .pay-opt-check { opacity:1; transform:scale(1); }
        .pay-opt-check::after { content:'✓'; color:#fff; font-size:10px; font-weight:900; }
        .pay-opt-badge { position:absolute; top:-8px; left:50%; transform:translateX(-50%); background:#06159d; color:#fff; font-size:10px; font-weight:800; padding:2px 10px; border-radius:50px; white-space:nowrap; letter-spacing:.3px; }
        @media(max-width:380px) { .pay-options { grid-template-columns:1fr; } }

        /* ── Delivery Modal ── */
        .dim-overlay { position:fixed; inset:0; z-index:9999; background:rgba(10,30,18,.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; animation:dimFadeIn .22s ease; }
        @keyframes dimFadeIn { from{opacity:0} to{opacity:1} }
        .dim-card { background:#fff; border-radius:24px; width:100%; max-width:460px; box-shadow:0 24px 60px rgba(0,0,0,.22); position:relative; overflow:hidden; animation:dimSlideUp .28s cubic-bezier(0.34,1.36,0.64,1); }
        @keyframes dimSlideUp { from{transform:translateY(40px) scale(.96);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        .dim-close { position:absolute; top:14px; right:14px; background:rgba(255,255,255,.25); border:none; width:32px; height:32px; border-radius:50%; font-size:13px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:2; }
        .dim-header { background:linear-gradient(135deg,#1a3d28,#1e6641); padding:28px 24px 22px; text-align:center; }
        .dim-title { font-family:'Fraunces',serif; font-size:32px; font-weight:900; color:#fff; margin:0 0 4px; }
        .dim-subtitle { font-size:11px; color:rgba(255,255,255,.72); margin:0; }
        .dim-cards { padding:16px 18px 4px; display:flex; flex-direction:column; gap:12px; }
        .dim-info-card { display:flex; gap:14px; align-items:flex-start; border-radius:14px; padding:14px 16px; border-left:4px solid transparent; }
        .dim-card-yellow { background:#fffbeb; border-left-color:#f59e0b; }
        .dim-card-green  { background:#f0fdf4; border-left-color:#16a34a; }
        .dim-info-body { flex:1; }
        .dim-info-title { font-size:13px; font-weight:800; color:#1a1a1a; margin-bottom:5px; }
        .dim-info-badge { display:inline-block; font-size:11px; font-weight:800; padding:3px 10px; border-radius:50px; margin-bottom:7px; }
        .dim-badge-yellow { background:#fef3c7; color:#92400e; }
        .dim-badge-green  { background:#dcfce7; color:#166534; }
        .dim-info-text { font-size:12.5px; color:#555; line-height:1.65; margin:0; }
        .dim-info-text strong { color:#1a1a1a; font-weight:800; }
        .dim-divider { height:1px; background:#f0f0f0; margin:14px 18px 0; }
        .dim-total-row { display:flex; justify-content:space-between; align-items:center; padding:12px 20px 0; }
        .dim-total-label { font-size:13px; color:#888; font-weight:600; }
        .dim-total-value { font-family:'Fraunces',serif; font-size:20px; font-weight:900; color:#1e6641; }
        .dim-actions { padding:14px 18px 6px; }
        .dim-btn-confirm { width:100%; padding:15px; border-radius:12px; background:linear-gradient(135deg,#1a3d28,#1e6641); color:#fff; border:none; font-size:15px; font-weight:800; cursor:pointer; font-family:'Nunito',sans-serif; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
        .dim-btn-confirm:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(30,102,65,.35); }
        .dim-btn-confirm:disabled { opacity:.7; cursor:not-allowed; transform:none; }
        .dim-spinner { width:16px; height:16px; border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .dim-note { font-size:11px; color:#aaa; text-align:center; padding:6px 18px 18px; line-height:1.5; margin:0; }
        @media(max-width:480px) { .dim-card{border-radius:20px} .dim-header{padding:24px 20px 18px} .dim-cards{padding:14px 14px 4px;gap:10px} .dim-total-row{padding:10px 16px 0} .dim-actions{padding:12px 14px 6px} .dim-note{padding:6px 14px 16px} }

        /* ── Card Coming Soon Modal ── */
        .csm-overlay { position:fixed; inset:0; z-index:9999; background:rgba(8,8,20,.6); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:16px; animation:dimFadeIn .22s ease; }
        .csm-card { background:#fff; border-radius:26px; width:100%; max-width:420px; box-shadow:0 28px 70px rgba(0,0,0,.25); position:relative; overflow:hidden; animation:dimSlideUp .3s cubic-bezier(0.34,1.36,0.64,1); }
        .csm-close { position:absolute; top:14px; right:14px; background:rgba(255,255,255,.2); border:none; width:32px; height:32px; border-radius:50%; font-size:13px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; transition:background .15s; }
        .csm-close:hover { background:rgba(255,255,255,.35); }
        .csm-banner { background:#06159d; padding:10px 12px 14px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .csm-banner-rings { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
        .csm-ring { position:absolute; border-radius:50%; border:1.5px solid rgba(255,255,255,.12); }
        .csm-ring-1 { width:120px; height:120px; animation:ringPulse 3s ease-in-out infinite; }
        .csm-ring-2 { width:180px; height:180px; animation:ringPulse 3s ease-in-out .6s infinite; }
        .csm-ring-3 { width:240px; height:240px; animation:ringPulse 3s ease-in-out 1.2s infinite; }
        @keyframes ringPulse { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.5;transform:scale(1.04)} }
        .csm-banner-icon { font-size:68px; position:relative; z-index:1; filter:drop-shadow(0 4px 16px rgba(0,0,0,.3)); animation:iconFloat 3s ease-in-out infinite; }
        @keyframes iconFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .csm-body { padding:22px 22px 20px; }
        .csm-badge { display:inline-block; background:#06159d; color:#fff; font-size:11px; font-weight:800; padding:4px 14px; border-radius:50px; letter-spacing:.5px; margin-bottom:10px; }
        .csm-title { font-family:'Fraunces',serif; font-size:28px; font-weight:900; color:#1a1a1a; margin:0 0 10px; }
        .csm-desc { font-size:14px; color:#555; line-height:1.7; margin:0 0 18px; }
        .csm-desc strong { color:#1a1a1a; font-weight:800; }
        .csm-features { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
        .csm-feat { display:flex; align-items:center; gap:12px; background:#f8f9ff; border-radius:12px; padding:11px 14px; }
        .csm-feat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .csm-feat-blue   { background:#eff6ff; }
        .csm-feat-purple { background:#f5f3ff; }
        .csm-feat-green  { background:#f0fdf4; }
        .csm-feat-title { font-size:13px; font-weight:800; color:#1a1a1a; }
        .csm-feat-sub   { font-size:11.5px; color:#888; margin-top:1px; }
        .csm-divider { height:1px; background:#f0f0f0; margin:0 0 16px; }
        .csm-btn-ok { width:100%; padding:15px; border-radius:13px; background:linear-gradient(135deg,#1a3d28,#1e6641); color:#fff; border:none; font-size:15px; font-weight:800; cursor:pointer; font-family:'Nunito',sans-serif; transition:all .2s; margin-bottom:8px; }
        .csm-btn-ok:hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(30,102,65,.3); }
        .csm-note { font-size:11.5px; color:#aaa; text-align:center; margin:0; line-height:1.5; padding-bottom:4px; }
        @media(max-width:480px) { .csm-card{border-radius:20px} .csm-banner{padding:8px 12px 6px} .csm-banner-icon{font-size:58px} .csm-title{font-size:24px} .csm-body{padding:10px 18px 13px} }
      `}</style>

      {showDeliveryModal && (
        <DeliveryInfoModal
          grandTotal={grandTotal}
          onConfirm={handleConfirmOrder}
          onClose={() => !submitting && setShowDeliveryModal(false)}
          submitting={submitting}
        />
      )}

      {showCardModal && (
        <CardComingSoonModal onClose={() => setShowCardModal(false)} />
      )}

      <main className="cp">
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
                  <h2>Order Items ({count})</h2>
                  <button
                    onClick={() => { if (window.confirm('Clear entire cart?')) clearCart() }}
                    style={{ background: 'none', border: '1.5px solid #e8ede9', color: '#888', padding: '5px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >Clear All</button>
                </div>

                <div className="items-list">
                  {cart.map(item => (
                    <div key={item.cartKey} className="ci">
                      <ItemImage item={item} />
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
                        <button className="ci-rm" onClick={() => removeFromCart(item.cartKey)} aria-label="Remove">✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                {total >= FREE_DELIVERY_THRESHOLD ? (
                  <div style={{ margin: '0 16px 12px', background: '#d8f3dc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e6641', fontWeight: 700, display: 'flex', gap: 6 }}>
                    🎉 Free delivery on orders over Rs. {FREE_DELIVERY_THRESHOLD.toLocaleString()}!
                  </div>
                ) : !location.lat ? (
                  <div style={{ margin: '0 16px 12px', background: '#fff9ec', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', fontWeight: 600, display: 'flex', gap: 6 }}>
                    📍 Pin your location below to see the delivery fee (Rs. {DELIVERY_RATE_PER_KM}/km).
                  </div>
                ) : null}

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
                          : <span style={{ color: '#b45309', fontSize: 12 }}>📍 Set location first</span>}
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

              <Link to="/shop" style={{ color: '#1e6641', fontWeight: 700, fontSize: 14, display: 'inline-block' }}>
                ← Continue Shopping
              </Link>
            </div>

            {/* ── Right: delivery form ── */}
            <div className="fc">
              <h2>Delivery Details</h2>

              <div className="ff">
                <label>Your Name *</label>
                <input name="name" className={errors.name ? 'err' : ''} value={form.name}
                  onChange={handleChange} placeholder="Full name" autoComplete="name" />
                {errors.name && <div className="ferr">⚠️ {errors.name}</div>}
              </div>

              <div className="ff">
                <label>Phone Number *</label>
                <input name="phone" className={errors.phone ? 'err' : ''} value={form.phone}
                  onChange={handleChange} placeholder="07XXXXXXXX" type="tel" inputMode="tel" autoComplete="tel" />
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
                <div style={{ background: '#d8f3dc', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1e6641', fontWeight: 700, display: 'flex', gap: 6 }}>
                  🎉 Free delivery applied!
                </div>
              )}

              <div className="ff">
                <label>Special Request <span style={{ fontWeight: 500, color: '#aaa' }}>(optional)</span></label>
                <input name="note" value={form.note} onChange={handleChange}
                  placeholder="Any special instructions…" />
              </div>

              {/* ── Payment Method Selector ── */}
              <div className="pay-wrap">
                <span className="pay-label">Payment Method *</span>
                <div className="pay-options">

                  {/* Cash on Delivery */}
                  <div
                    className={`pay-opt${paymentMethod === 'cod' ? ' active' : ''}`}
                    onClick={() => setPaymentMethod('cod')}
                    role="radio"
                    aria-checked={paymentMethod === 'cod'}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setPaymentMethod('cod')}
                  >
                    <div className="pay-opt-check" />
                    <div className="pay-opt-icon">💵</div>
                    <div className="pay-opt-name">Cash on Delivery</div>
                    <div className="pay-opt-sub">Pay when your order arrives</div>
                  </div>

                  {/* Card Payment */}
                  <div
                    className={`pay-opt card-opt${paymentMethod === 'card' ? ' active' : ''}`}
                    onClick={() => { setPaymentMethod('card'); setShowCardModal(true) }}
                    role="radio"
                    aria-checked={paymentMethod === 'card'}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && (setPaymentMethod('card'), setShowCardModal(true))}
                  >
                    <div className="pay-opt-badge">Coming Soon</div>
                    <div className="pay-opt-check" />
                    <div className="pay-opt-icon">💳</div>
                    <div className="pay-opt-name">Card Payment</div>
                    <div className="pay-opt-sub">Visa, Mastercard & more</div>
                  </div>

                </div>
              </div>

              <div className="info-box info-green">
                <span>Your order will be confirmed and delivered to your doorstep!</span>
              </div>

              <button
                className="order-btn"
                onClick={handleOrderClick}
                disabled={submitting || paymentMethod === 'card'}
                style={{ background: submitting || paymentMethod === 'card' ? undefined : '#1e6641', color: '#fff' }}
              >
                {submitting
                  ? '⏳ Processing your order…'
                  : paymentMethod === 'card'
                  ? '💳 Card Payment — Coming Soon'
                  : `Place Order — Rs. ${grandTotal.toLocaleString()}`}
              </button>
              <p style={{ fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 1.6 }}>
                We'll call to confirm your delivery time 📞
              </p>
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
