import { useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../components/CartContext'
import { addOrder, db } from '../lib/firebase'
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import LocationPicker from '../components/LocationPicker'
import { SHOP_NAME, DELIVERY_RATE_PER_KM, FREE_DELIVERY_THRESHOLD } from '../utils/constants'
import toast from 'react-hot-toast'

const EMOJI = {
  'Rice & Grains':'🌾','Drinks & Beverages':'🥤','Spices & Dry Food':'🌶️',
  'Vegetables & Fruits':'🥦','Dairy & Eggs':'🥛','Snacks & Biscuits':'🍪',
  'Household & Cleaning':'🧴','Personal Care':'🧼',
}

const PAYHERE_MERCHANT_ID = import.meta.env.VITE_PAYHERE_MERCHANT_ID || ''
const PAYHERE_MODE        = import.meta.env.VITE_PAYHERE_MODE || 'sandbox'
const PAYHERE_SDK_URL     = 'https://www.payhere.lk/lib/payhere.js'

function loadPayHereSDK() {
  return new Promise((resolve, reject) => {
    if (window.payhere && typeof window.payhere.startPayment === 'function') { resolve(); return }
    const old = document.querySelector(`script[src="${PAYHERE_SDK_URL}"]`)
    if (old) old.remove()
    const script = document.createElement('script')
    script.src  = PAYHERE_SDK_URL
    script.type = 'text/javascript'
    const timeout = setTimeout(() => { script.remove(); reject(new Error('PayHere SDK timed out')) }, 20000)
    script.onload = () => {
      clearTimeout(timeout)
      setTimeout(() => {
        if (window.payhere && typeof window.payhere.startPayment === 'function') resolve()
        else reject(new Error('PayHere SDK did not initialise'))
      }, 500)
    }
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Failed to load PayHere SDK')) }
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
  } catch (err) { return { success: false, reason: 'error', message: 'Payment setup failed — please try again.' } }

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

export default function Cart() {
  const { cart, removeFromCart, updateQty, clearCart, total, count } = useCart()
  const navigate = useNavigate()
  const [form, setForm]             = useState({ name: '', phone: '', note: '' })
  const [location, setLocation]     = useState({ address: '', lat: null, lng: null, distKm: null, fee: null })
  const [errors, setErrors]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')

  const isLocalhost = useMemo(() => {
    const h = window.location.hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
  }, [])

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
    else if (!/^0\d{9}$/.test(phone)) e.phone = 'Enter valid Sri Lankan number (07XXXXXXXX)'
    if (!location.address.trim()) e.address = 'Please set your delivery location'
    setErrors(e); return Object.keys(e).length === 0
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
    if (!validate()) { toast.error('Please fill all required fields'); return }
    setSubmitting(true)
    const fee = deliveryFee ?? 0
    const tot = total + fee
    const id  = `TS${Math.floor(Math.random() * 90000) + 10000}`
    const payload = buildPayload(fee, tot, id, 'cod_pending')
    try { await addOrder(payload) } catch (e) { console.error('Firebase error:', e) }
    await sendTelegramNotification(payload)
    clearCart()
    toast.success('Order placed! We\'ll contact you shortly 🎉')
    navigate('/order-success', { state: { name: form.name, orderId: id, method: 'cod' } })
    setSubmitting(false)
  }

  const handleOrder = () => {
    if (paymentMethod === 'card') return
    handleCODOrder()
  }

  if (cart.length === 0) return (
    <main style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24, background:'#fffbf0' }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:80, marginBottom:16 }}>🛒</div>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:30, fontWeight:900, marginBottom:12 }}>Your cart is empty</h2>
        <p style={{ color:'#666', marginBottom:28, lineHeight:1.7 }}>Browse our fresh products and add items to your cart!</p>
        <Link to="/shop" className="btn-primary" style={{ fontSize:16, padding:'14px 32px' }}>Browse Products →</Link>
      </div>
    </main>
  )

  return (
    <>
      <style>{`
        .cp{padding-bottom:80px;background:#fffbf0}
        .cp-hdr{background:linear-gradient(135deg,#1a3d28,#1e6641);padding:32px 0 44px}
        .cp-hdr-in{max-width:1160px;margin:0 auto;padding:0 20px}
        .cp-hdr h1{font-family:'Fraunces',serif;font-size:clamp(26px,5vw,44px);font-weight:900;color:#fff;margin-bottom:4px}
        .cp-hdr p{color:rgba(255,255,255,.8);font-size:15px}
        .cp-body{max-width:1160px;margin:0 auto;padding:28px 20px 0}
        .cp-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start}
        .cp-card{background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(0,0,0,.07);overflow:hidden}
        .cp-card-hdr{display:flex;justify-content:space-between;align-items:center;padding:18px 20px 14px;border-bottom:2px solid #f0faf3}
        .cp-card-hdr h2{font-family:'Fraunces',serif;font-size:18px;font-weight:900}
        .items-list{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
        .ci{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f9fdf9;border-radius:12px}
        .ci:hover{background:#f0faf3}
        .ci-emoji{font-size:30px;flex-shrink:0}
        .ci-info{flex:1;min-width:0}
        .ci-name{font-weight:700;font-size:14px;color:#111}
        .ci-price{font-size:12px;color:#888;margin-top:2px}
        .ci-ctrl{display:flex;align-items:center;gap:10px;flex-shrink:0}
        .qty-box{display:flex;align-items:center;gap:6px;background:#fff;border-radius:50px;padding:4px 10px;border:2px solid #e8ede9}
        .qty-btn{background:none;border:none;color:#1e6641;font-size:18px;font-weight:900;cursor:pointer;line-height:1;width:22px;text-align:center}
        .ci-sub{font-family:'Fraunces',serif;font-weight:900;font-size:14px;color:#1e6641;min-width:72px;text-align:right}
        .ci-rm{background:none;border:none;color:#ccc;font-size:15px;cursor:pointer}
        .ci-rm:hover{color:#e63946}
        .notice{margin:0 16px 12px;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:600;line-height:1.6;display:flex;gap:8px;align-items:flex-start}
        .notice-free{background:#d8f3dc;color:#1e6641}
        .notice-pending{background:#fff9ec;color:#b45309}
        .notice-has{background:#f0faf3;color:#1e6641}
        .totals{padding:14px 16px 18px}
        .trow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0faf3}
        .trow:last-of-type{border-bottom:none}
        .gtbox{background:linear-gradient(135deg,#1a3d28,#1e6641);border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;margin-top:10px;color:#fff}
        .fc{background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(0,0,0,.07);padding:24px 22px;position:sticky;top:80px}
        .fc h2{font-family:'Fraunces',serif;font-size:18px;font-weight:900;margin-bottom:20px}
        .ff{margin-bottom:15px}
        .ff label{display:block;font-size:13px;font-weight:700;color:#444;margin-bottom:6px}
        .ff input{width:100%;padding:11px 14px;border:2px solid #e8ede9;border-radius:10px;font-size:14px;outline:none;background:#fff;font-family:'Nunito',sans-serif;transition:border-color .2s;box-sizing:border-box}
        .ff input:focus{border-color:#52b788}
        .ff input.err{border-color:#e63946}
        .ferr{font-size:12px;color:#e63946;margin-top:4px}
        .pm-toggle{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
        .pm-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border-radius:14px;border:2px solid #e8ede9;background:#fff;cursor:pointer;transition:all .2s;font-family:'Nunito',sans-serif}
        .pm-btn:hover{border-color:#52b788;background:#f9fdf9}
        .pm-btn.active{border-color:#1e6641;background:#f0faf3}
        .pm-btn-icon{font-size:26px}
        .pm-btn-label{font-size:13px;font-weight:800;color:#222}
        .pm-btn-sub{font-size:11px;color:#888}
        .pm-btn.active .pm-btn-label{color:#1e6641}
        .info-box{border-radius:12px;padding:11px 14px;font-size:13px;font-weight:600;margin-bottom:18px;display:flex;gap:8px;align-items:flex-start;line-height:1.6}
        .info-green{background:#f0fff4;border:1.5px solid #86efac;color:#166534}
        .coming-soon-box{background:#ffffff;border:2px solid #083982;border-radius:14px;padding:18px 16px;margin-bottom:18px;text-align:center}
        .coming-soon-title{font-size:15px;font-weight:800;color:#083982;margin-bottom:4px}
        .coming-soon-desc{font-size:12px;color:#083982;line-height:1.6;font-weight:500}
        .coming-soon-badge{display:inline-flex;align-items:center;gap:5px;background:#d5e2ff;color:#083982;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:800;margin-top:10px;letter-spacing:.4px}
        .order-btn{width:100%;padding:16px;border-radius:12px;font-weight:800;font-size:16px;border:none;cursor:pointer;margin-bottom:10px;font-family:'Nunito',sans-serif;transition:all .2s}
        .order-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(30,102,65,.3)}
        .order-btn:disabled{background:#d1d5db!important;color:#9ca3af!important;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}
        @media(max-width:900px){.cp-grid{grid-template-columns:1fr!important}.fc{position:static}}
        @media(max-width:540px){.ci{flex-wrap:wrap;gap:8px}.ci-ctrl{width:100%;justify-content:space-between}}
      `}</style>

      <main className="cp">
        <div className="cp-hdr">
          <div className="cp-hdr-in">
            <h1>My Cart</h1>
            <p>{count} item{count !== 1 ? 's' : ''} · Rs. {total.toLocaleString()}</p>
          </div>
        </div>

        <div className="cp-body">
          <div className="cp-grid">
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="cp-card">
                <div className="cp-card-hdr">
                  <h2>🛒 Order Items ({count})</h2>
                  <button onClick={() => { if (window.confirm('Clear cart?')) clearCart() }} style={{ background:'none', border:'1.5px solid #e8ede9', color:'#888', padding:'5px 14px', borderRadius:50, fontSize:12, cursor:'pointer' }}>Clear All</button>
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
                          <span style={{ fontWeight:800, fontSize:14, minWidth:18, textAlign:'center' }}>{item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.cartKey, item.qty + 1)}>+</button>
                        </div>
                        <div className="ci-sub">Rs. {Number(item.subtotal).toLocaleString()}</div>
                        <button className="ci-rm" onClick={() => removeFromCart(item.cartKey)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                {total >= FREE_DELIVERY_THRESHOLD ? (
                  <div className="notice notice-free"><span>🎉</span><span>Free delivery on orders Rs. {FREE_DELIVERY_THRESHOLD.toLocaleString()}+!</span></div>
                ) : !location.lat ? (
                  <div className="notice notice-pending"><span>📍</span><span>Pin your location to see delivery fee (Rs. {DELIVERY_RATE_PER_KM}/km).</span></div>
                ) : deliveryFee !== null ? (
                  <div className="notice notice-has"><span>🚚</span><span>{location.distKm?.toFixed(1)} km · {deliveryFee === 0 ? 'Free delivery! 🎉' : `Rs. ${deliveryFee.toLocaleString()} delivery fee`}</span></div>
                ) : null}
                <div className="totals">
                  <div className="trow">
                    <span>Subtotal</span>
                    <span style={{ fontWeight:700 }}>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div className="trow">
                    <span>Delivery fee</span>
                    <span style={{ fontWeight:700 }}>
                      {total >= FREE_DELIVERY_THRESHOLD
                        ? <span style={{ background:'#d8f3dc', color:'#1e6641', padding:'2px 10px', borderRadius:50, fontSize:11, fontWeight:800 }}>🎉 FREE</span>
                        : deliveryFee !== null
                          ? `Rs. ${deliveryFee.toLocaleString()}`
                          : <span style={{ color:'#b45309', fontSize:12 }}>📍 Pin location</span>}
                    </span>
                  </div>
                  <div className="gtbox">
                    <div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginBottom:2 }}>Grand Total</div>
                      <div style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:900 }}>Rs. {grandTotal.toLocaleString()}</div>
                    </div>
                    <span style={{ fontSize:32 }}>💰</span>
                  </div>
                </div>
              </div>
              <Link to="/shop" style={{ color:'#1e6641', fontWeight:700, fontSize:14 }}>← Continue Shopping</Link>
            </div>

            <div className="fc">
              <h2>📦 Delivery Details</h2>
              <div className="ff">
                <label>Name *</label>
                <input name="name" className={errors.name ? 'err' : ''} value={form.name} onChange={handleChange} placeholder="Your name" autoComplete="name" />
                {errors.name && <div className="ferr">⚠️ {errors.name}</div>}
              </div>
              <div className="ff">
                <label>Phone Number *</label>
                <input name="phone" className={errors.phone ? 'err' : ''} value={form.phone} onChange={handleChange} placeholder="07XXXXXXXX" type="tel" inputMode="tel" autoComplete="tel" />
                {errors.phone && <div className="ferr">⚠️ {errors.phone}</div>}
              </div>
              <div className="ff">
                <label>Delivery Location * <span style={{ fontSize:11, color:'#888', fontWeight:500 }}>(pin map or type)</span></label>
                <LocationPicker onLocationSelect={handleLocationSelect} initialAddress={location.address} cartTotal={total} />
                {errors.address && <div className="ferr">⚠️ {errors.address}</div>}
              </div>
              {location.lat && deliveryFee !== null && deliveryFee > 0 && (
                <div style={{ background:'#f0faf3', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:13 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'#555' }}>Items</span>
                    <span style={{ fontWeight:700 }}>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'#555' }}>Delivery ({location.distKm?.toFixed(1)} km)</span>
                    <span style={{ fontWeight:700 }}>Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1.5px solid #d8f3dc', paddingTop:6, marginTop:4 }}>
                    <span style={{ fontWeight:800, color:'#1e6641' }}>Total</span>
                    <span style={{ fontWeight:900, color:'#1e6641', fontSize:16 }}>Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {total >= FREE_DELIVERY_THRESHOLD && (
                <div style={{ background:'#d8f3dc', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#1e6641', fontWeight:700, display:'flex', gap:6, alignItems:'center' }}>
                  🎉 Free delivery applied!
                </div>
              )}
              <div className="ff">
                <label>Special Note (Optional)</label>
                <input name="note" value={form.note} onChange={handleChange} placeholder="Any special requests..." />
              </div>
              <div style={{ marginBottom:6 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#444', marginBottom:10 }}>Payment Method *</label>
                <div className="pm-toggle">
                  <button type="button" className={`pm-btn${paymentMethod === 'cod' ? ' active' : ''}`} onClick={() => setPaymentMethod('cod')}>
                    <span className="pm-btn-icon">💵</span>
                    <span className="pm-btn-label">Cash on Delivery</span>
                    <span className="pm-btn-sub">Pay when delivered</span>
                  </button>
                  <button type="button" className={`pm-btn${paymentMethod === 'card' ? ' active' : ''}`} onClick={() => setPaymentMethod('card')}>
                    <span className="pm-btn-icon">💳</span>
                    <span className="pm-btn-label">Pay by Card</span>
                    <span className="pm-btn-sub">Visa / Mastercard</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'cod' ? (
                <>
                  <div className="info-box info-green">
                    <span>Your order will be confirmed instantly. We'll call you to arrange delivery!</span>
                  </div>
                  <button
                    className="order-btn"
                    onClick={handleOrder}
                    disabled={submitting}
                    style={{ background: submitting ? '#ccc' : '#086129', color:'#fff' }}
                  >
                    {submitting ? '⏳ Processing...' : `🛒 Place Order — Rs. ${grandTotal.toLocaleString()}`}
                  </button>
                  <p style={{ fontSize:12, color:'#999', textAlign:'center', lineHeight:1.6 }}>
                    We'll contact you to confirm your delivery 📞
                  </p>
                </>
              ) : (
                <>
                  <div className="coming-soon-box">
                    <div className="coming-soon-title">Card Payment Not Available Yet</div>
                    <div className="coming-soon-desc">
                      Online card payment is currently under development.<br />
                      We're working hard to bring you a secure and seamless payment experience very soon!
                    </div>
                    <span className="coming-soon-badge">Coming Soon</span>
                  </div>
                  <button
                    className="order-btn"
                    disabled={true}
                    style={{ background:'#d1d5db', color:'#9ca3af' }}
                  >
                    💳 Pay by Card — Coming Soon
                  </button>
                  <p style={{ fontSize:12, color:'#b45309', textAlign:'center', lineHeight:1.6, fontWeight:600 }}>
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
