import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import {
  db,
  uploadToCloudinary,
  fetchOrders, fetchAllProducts, fetchCategories, fetchAllReviews,
  addProduct, updateProduct, deleteProduct,
  addCategory, updateCategory, deleteCategory,
  updateOrderStatus, updateReview, deleteReview,
  invalidateCache,
} from '../lib/firebase'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'

const STATUS_COLOR = { pending:'#f4a322', confirmed:'#2563eb', delivered:'#1e6641', cancelled:'#e63946' }
const STATUS_BG    = { pending:'#fff9ec', confirmed:'#eff6ff', delivered:'#f0faf3', cancelled:'#fff5f5' }
const STATUS_ICON  = { pending:'⏳', confirmed:'✅', delivered:'🚚', cancelled:'❌' }

const PAYMENT_META = {
  cod:          { label:'💵 Cash on Delivery', color:'#92400e', bg:'#fffbeb', border:'#fcd34d' },
  card_paid:    { label:'💳 Card — Paid',       color:'#065f46', bg:'#ecfdf5', border:'#6ee7b7' },
  card_pending: { label:'💳 Card — Pending',    color:'#1e40af', bg:'#eff6ff', border:'#93c5fd' },
}

function getPaymentKey(order) {
  if (order.paymentMethod === 'card') return order.paymentStatus === 'paid' ? 'card_paid' : 'card_pending'
  return 'cod'
}

const EMPTY_PRODUCT = { name:'', category:'', price:'', price_per_kg:'', is_weight_based:false, max_weight:'', unit:'', stock:'99', description:'', badge:'', active:true, image_url:'' }
const EMPTY_CAT = { name:'', emoji:'🛒', color:'#1e6641', sort_order:0 }

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:800, color:'#555', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</label>
      {children}
    </div>
  )
}
const inp = { width:'100%', padding:'10px 14px', border:'2px solid #e8ede9', borderRadius:10, fontSize:14, outline:'none', fontFamily:"'Nunito',sans-serif", background:'#fff', boxSizing:'border-box', transition:'border-color .2s' }

// ── DELETE ORDER ──────────────────────────────────────────────────────────────
async function deleteOrder(id) {
  return deleteDoc(doc(db, 'orders', id))
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading, signOut, user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]                     = useState('overview')
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [orders, setOrders]               = useState([])
  const [products, setProducts]           = useState([])
  const [categories, setCategories]       = useState([])
  const [reviews, setReviews]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [stats, setStats]                 = useState({ total:0, pending:0, delivered:0, revenue:0 })
  const [orderFilter, setOrderFilter]     = useState('all')
  const [orderSearch, setOrderSearch]     = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [showPF, setShowPF]               = useState(false)
  const [editPId, setEditPId]             = useState(null)
  const [pForm, setPForm]                 = useState(EMPTY_PRODUCT)
  const [uploading, setUploading]         = useState(false)
  const [showCF, setShowCF]               = useState(false)
  const [editCId, setEditCId]             = useState(null)
  const [cForm, setCForm]                 = useState(EMPTY_CAT)
  const [deletingOrder, setDeletingOrder] = useState(null)

  // Auth guard
  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) navigate('/admin/login', { replace:true })
  }, [authLoading, isAdmin, navigate])

  // Load data per tab
  useEffect(() => {
    if (tab === 'overview' || tab === 'orders')   loadOrders()
    if (tab === 'overview' || tab === 'products') loadProducts()
    if (tab === 'categories') loadCategories()
    if (tab === 'reviews')    loadReviews()
  }, [tab])

  // Realtime orders
  useEffect(() => {
    if (!isAdmin) return
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const o = d.data()
        return { id: d.id, ...o, created_at: o.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() }
      })
      setOrders(data)
      calcStats(data)
    })
    return () => unsub()
  }, [isAdmin])

  // Realtime reviews
  useEffect(() => {
    if (!isAdmin) return
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const r = d.data()
        return { id: d.id, ...r, created_at: r.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() }
      })
      setReviews(data)
    })
    return () => unsub()
  }, [isAdmin])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const calcStats = (data) => setStats({
    total:     data.length,
    pending:   data.filter(o => o.status === 'pending').length,
    delivered: data.filter(o => o.status === 'delivered').length,
    revenue:   data.filter(o => o.status !== 'cancelled').reduce((s,o) => s + Number(o.totalPrice||o.total_price||0), 0),
  })

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOrders()
      const normalized = data.map(o => ({
        ...o,
        created_at: o.createdAt || o.created_at || new Date().toISOString(),
        customer_name: o.customerName || o.customer_name,
        customer_phone: o.customerPhone || o.customer_phone,
        delivery_address: o.deliveryAddress || o.delivery_address,
        delivery_lat: o.deliveryLat || o.delivery_lat,
        delivery_lng: o.deliveryLng || o.delivery_lng,
        total_price: o.totalPrice || o.total_price,
        delivery_fee: o.deliveryFee || o.delivery_fee,
      }))
      setOrders(normalized)
      calcStats(normalized)
    } catch(e) { toast.error('Could not load orders') }
    setLoading(false)
  }, [])

  const loadProducts   = useCallback(async () => { try { const d = await fetchAllProducts(); setProducts(d) } catch {} }, [])
  const loadCategories = useCallback(async () => { try { const d = await fetchCategories(); setCategories(d) } catch {} }, [])
  const loadReviews    = useCallback(async () => {
    try { const d = await fetchAllReviews(); setReviews(d.map(r => ({ ...r, created_at: r.createdAt || r.created_at || new Date().toISOString() }))) } catch {}
  }, [])

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status)
      setOrders(prev => { const u = prev.map(o => o.id === id ? {...o, status} : o); calcStats(u); return u })
      toast.success(`Order marked as ${status}`)
    } catch { toast.error('Failed to update status') }
  }

  const handleDeleteOrder = async (id) => {
    setDeletingOrder(id)
    try {
      await deleteOrder(id)
      setOrders(prev => { const u = prev.filter(o => o.id !== id); calcStats(u); return u })
      setExpandedOrder(null)
      toast.success('Order deleted')
    } catch { toast.error('Failed to delete order') }
    setDeletingOrder(null)
  }

  const uploadImage = async (file) => {
    if (!file) return null
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      setUploading(false)
      toast.success('Image uploaded! ✅')
      return url
    } catch(e) {
      setUploading(false)
      toast.error('Image upload failed: ' + e.message)
      return null
    }
  }

  const saveProduct = async () => {
    if (!pForm.name.trim() || !pForm.category) { toast.error('Name and category required'); return }
    const payload = {
      name: pForm.name.trim(), category: pForm.category,
      category_emoji: categories.find(c => c.name === pForm.category)?.emoji || '🛒',
      price: pForm.is_weight_based ? null : (Number(pForm.price)||null),
      price_per_kg: pForm.is_weight_based ? (Number(pForm.price_per_kg)||null) : null,
      is_weight_based: pForm.is_weight_based,
      max_weight: pForm.max_weight ? Number(pForm.max_weight) : null,
      unit: pForm.unit || '', stock: Number(pForm.stock)||99,
      description: pForm.description||'', badge: pForm.badge||'',
      image_url: pForm.image_url||'', active: pForm.active,
    }
    try {
      if (editPId) { await updateProduct(editPId, payload); toast.success('Product updated!') }
      else          { await addProduct(payload); toast.success('Product added!') }
      invalidateCache('products')
      setShowPF(false); loadProducts()
    } catch { toast.error('Save failed') }
  }

  const saveCategory = async () => {
    if (!cForm.name.trim()) { toast.error('Category name required'); return }
    const payload = { name: cForm.name.trim(), emoji: cForm.emoji||'🛒', color: cForm.color||'#1e6641', sort_order: Number(cForm.sort_order)||0 }
    try {
      if (editCId) { await updateCategory(editCId, payload); toast.success('Category updated!') }
      else          { await addCategory(payload); toast.success('Category added!') }
      invalidateCache('categories')
      setShowCF(false); loadCategories()
    } catch { toast.error('Save failed') }
  }

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return
    await deleteProduct(id)
    setProducts(prev => prev.filter(p => p.id !== id))
    invalidateCache('products')
    toast.success('Product deleted')
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return
    await deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
    invalidateCache('categories')
    toast.success('Category deleted')
  }

  const handleToggleProduct = async (id, active) => {
    await updateProduct(id, { active })
    setProducts(prev => prev.map(p => p.id === id ? {...p, active} : p))
    invalidateCache('products')
  }

  const handleApproveReview = async (id, approved) => {
    await updateReview(id, { approved })
    setReviews(prev => prev.map(r => r.id === id ? {...r, approved} : r))
    toast.success(approved ? 'Review published!' : 'Review hidden')
  }

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return
    await deleteReview(id)
    setReviews(prev => prev.filter(r => r.id !== id))
    toast.success('Deleted')
  }

  const openNewProduct  = () => { setPForm({...EMPTY_PRODUCT, category: categories[0]?.name||''}); setEditPId(null); setShowPF(true) }
  const openEditProduct = (p) => { setPForm({...p, price:p.price||'', price_per_kg:p.price_per_kg||'', max_weight:p.max_weight||''}); setEditPId(p.id); setShowPF(true) }
  const handleTabChange = (t) => { setTab(t); setSidebarOpen(false); setExpandedOrder(null) }
  const handleLogout    = async () => { await signOut(); toast.success('Logged out') }

  const filteredOrders = orders.filter(o => {
    const matchStatus = orderFilter === 'all' || o.status === orderFilter
    const q = orderSearch.toLowerCase()
    const matchSearch = !q || (o.customer_name||o.customerName||'').toLowerCase().includes(q) || (o.customer_phone||o.customerPhone||'').includes(q) || (o.id||'').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })
  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase()))
    : products
  const pendingReviews = reviews.filter(r => !r.approved)

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f2d1c' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:44, animation:'spin 1s linear infinite', display:'inline-block', marginBottom:12 }}>🌿</div>
        <div style={{ fontFamily:'Nunito,sans-serif', color:'#52b788', fontSize:14 }}>Loading dashboard...</div>
      </div>
    </div>
  )
  if (!isAdmin) return null

  const TABS = [
    { id:'overview',   icon:'📊', label:'Overview' },
    { id:'orders',     icon:'📦', label:'Orders',     badge: stats.pending > 0 ? stats.pending : null },
    { id:'products',   icon:'🛒', label:'Products' },
    { id:'categories', icon:'🏷️', label:'Categories' },
    { id:'reviews',    icon:'⭐', label:'Reviews',    badge: pendingReviews.length > 0 ? pendingReviews.length : null },
  ]

  // ── PAYMENT BADGE COMPONENT ───────────────────────────────────────────────
  const PaymentBadge = ({ order, style = {} }) => {
    const key  = getPaymentKey(order)
    const meta = PAYMENT_META[key]
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:4,
        background:meta.bg, color:meta.color,
        border:`1.5px solid ${meta.border}`,
        padding:'3px 10px', borderRadius:50,
        fontSize:11, fontWeight:700, whiteSpace:'nowrap',
        ...style,
      }}>
        {meta.label}
      </span>
    )
  }

  // ── STATUS SELECT (dropdown) ──────────────────────────────────────────────
  const StatusSelect = ({ order }) => (
    <select
      value={order.status}
      onChange={e => handleUpdateStatus(order.id, e.target.value)}
      style={{
        border:`2px solid ${STATUS_COLOR[order.status]||'#ccc'}`,
        background:STATUS_BG[order.status]||'#f5f5f5',
        color:STATUS_COLOR[order.status]||'#555',
        borderRadius:8, padding:'5px 10px',
        fontSize:12, fontWeight:700,
        cursor:'pointer', outline:'none',
        fontFamily:"'Nunito',sans-serif",
        width:'100%',
      }}
    >
      {['pending','confirmed','delivered','cancelled'].map(s => (
        <option key={s} value={s}>{STATUS_ICON[s]} {s.charAt(0).toUpperCase()+s.slice(1)}</option>
      ))}
    </select>
  )

  // ── SIDEBAR ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:28 }}>🏪</span>
          <div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:900, color:'#fff' }}>Thisara Stores</div>
            <div style={{ fontSize:11, color:'#52b788' }}>Admin Panel</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'10px 8px', flex:1, overflowY:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'11px 14px', borderRadius:10, border:'none',
            background: tab===t.id ? 'rgba(82,183,136,.18)' : 'transparent',
            color: tab===t.id ? '#52b788' : '#8aab98',
            fontSize:14, fontWeight: tab===t.id ? 700 : 500,
            cursor:'pointer', marginBottom:2, fontFamily:"'Nunito',sans-serif", textAlign:'left',
            transition:'all .15s',
          }}>
            <span style={{ fontSize:17, width:22, flexShrink:0 }}>{t.icon}</span>
            <span style={{ flex:1 }}>{t.label}</span>
            {t.badge && (
              <span style={{ background:'#f4a322', color:'#111', borderRadius:'50%', minWidth:22, height:22, fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}

        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', marginTop:10, paddingTop:10 }}>
          {[['/', '🏠', 'Home'],['/shop','🛒','Shop'],['/about','ℹ️','About']].map(([to,icon,label]) => (
            <Link key={to} to={to} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, color:'#8aab98', fontSize:13, textDecoration:'none', transition:'color .15s' }}>
              <span>{icon}</span>{label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding:'14px 12px', borderTop:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
        <div style={{ fontSize:11, color:'#4a6b58', marginBottom:8, lineHeight:1.5 }}>
          Signed in as:<br />
          <span style={{ color:'#8aab98', wordBreak:'break-all' }}>{user?.email}</span>
        </div>
        <button onClick={handleLogout} style={{ width:'100%', background:'rgba(230,57,70,.2)', color:'#f87171', border:'1.5px solid rgba(230,57,70,.3)', padding:'9px', borderRadius:10, fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:13, transition:'all .2s' }}
          onMouseEnter={e => { e.target.style.background='#e63946'; e.target.style.color='#fff' }}
          onMouseLeave={e => { e.target.style.background='rgba(230,57,70,.2)'; e.target.style.color='#f87171' }}>
          🚪 Sign Out
        </button>
      </div>
    </>
  )

  // ── ORDER CARD (mobile accordion) ────────────────────────────────────────
  const OrderCard = ({ order }) => {
    const isOpen   = expandedOrder === order.id
    const name     = order.customer_name || order.customerName || ''
    const phone    = order.customer_phone || order.customerPhone || ''
    const address  = order.delivery_address || order.deliveryAddress || ''
    const lat      = order.delivery_lat || order.deliveryLat
    const lng      = order.delivery_lng || order.deliveryLng
    const total    = order.total_price || order.totalPrice || 0
    const fee      = order.delivery_fee || order.deliveryFee || 0
    const items    = order.items || []
    const isDel    = deletingOrder === order.id
    const date     = new Date(order.created_at || order.createdAt || Date.now())
      .toLocaleDateString('en-LK', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

    return (
      <div className="oc-wrap">
        <div className="oc-head" onClick={() => setExpandedOrder(isOpen ? null : order.id)}>
          <div className="oc-head-left">
            <div className="oc-id">#{order.id?.slice(0,8)}</div>
            <div className="oc-name">{name}</div>
            <div className="oc-meta">{phone} · {date}</div>
          </div>
          <div className="oc-head-right">
            <div className="oc-total">Rs. {Number(total).toLocaleString()}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end', marginTop:4 }}>
              <span style={{ background:STATUS_BG[order.status]||'#f5f5f5', color:STATUS_COLOR[order.status]||'#555', padding:'2px 9px', borderRadius:50, fontSize:10, fontWeight:700 }}>
                {STATUS_ICON[order.status]} {order.status}
              </span>
              <PaymentBadge order={order} style={{ fontSize:10, padding:'2px 8px' }} />
            </div>
            <span style={{ fontSize:14, color:'#ccc', marginTop:4, display:'block', textAlign:'right' }}>{isOpen ? '▲' : '▼'}</span>
          </div>
        </div>

        {isOpen && (
          <div className="oc-body">
            <div className="oc-section">
              <div className="oc-section-label">📍 Delivery Location</div>
              <div style={{ fontSize:13, color:'#444', lineHeight:1.6 }}>{address || '—'}</div>
              {lat && (
                <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="oc-map-btn">
                  🗺️ Open in Google Maps
                </a>
              )}
            </div>

            <div className="oc-section">
              <div className="oc-section-label">📦 Items ({items.length})</div>
              {items.map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
                  <span style={{ color:'#444' }}>
                    {item.name}
                    <span style={{ color:'#999', fontSize:11, marginLeft:6 }}>
                      ({item.isWeightBased||item.is_weight_based ? item.weightLabel||item.weight_label : `×${item.qty}`})
                    </span>
                  </span>
                  <span style={{ fontWeight:700, color:'#1e6641' }}>Rs. {Number(item.subtotal).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, paddingTop:6, borderTop:'2px solid #e8ede9' }}>
                <span style={{ fontSize:12, color:'#888' }}>Delivery fee</span>
                <span style={{ fontWeight:700, fontSize:12 }}>Rs. {Number(fee).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ fontWeight:800, color:'#1e6641' }}>Total</span>
                <span style={{ fontWeight:900, color:'#1e6641', fontSize:15 }}>Rs. {Number(total).toLocaleString()}</span>
              </div>
            </div>

            <div className="oc-section">
              <div className="oc-section-label">💳 Payment</div>
              <PaymentBadge order={order} style={{ fontSize:13 }} />
            </div>

            {order.note && (
              <div style={{ background:'#fff9ec', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#92400e' }}>
                📝 {order.note}
              </div>
            )}

            <div className="oc-section">
              <div className="oc-section-label">🔄 Update Status</div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                {['pending','confirmed','delivered','cancelled'].map(s => (
                  <button key={s} onClick={() => handleUpdateStatus(order.id, s)} style={{
                    padding:'7px 13px', borderRadius:8, border:'2px solid',
                    borderColor: order.status===s ? STATUS_COLOR[s] : '#e8ede9',
                    background: order.status===s ? STATUS_BG[s] : '#fff',
                    color: order.status===s ? STATUS_COLOR[s] : '#888',
                    fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:"'Nunito',sans-serif",
                    flex: '1 1 auto',
                    transition:'all .15s',
                  }}>
                    {STATUS_ICON[s]} {s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { if (window.confirm(`Delete order #${order.id?.slice(0,8)}? This cannot be undone.`)) handleDeleteOrder(order.id) }}
              disabled={isDel}
              style={{ width:'100%', marginTop:4, background:'rgba(230,57,70,.08)', color:'#e63946', border:'1.5px solid rgba(230,57,70,.2)', borderRadius:10, padding:'10px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
              {isDel ? '⏳ Deleting...' : '🗑️ Delete This Order'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes popIn { from{transform:scale(.94);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        /* ── LAYOUT ── */
        .adm { display:flex; height:100vh; overflow:hidden; background:#f3f6f3; font-family:'Nunito',sans-serif; }
        .adm-sidebar { width:232px; background:linear-gradient(180deg,#0a1f12 0%,#0f2d1c 50%,#1a3d28 100%); display:flex; flex-direction:column; flex-shrink:0; }
        .adm-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
        .adm-topbar { background:#fff; border-bottom:1.5px solid #e8ede9; padding:0 20px; height:58px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; box-shadow:0 1px 6px rgba(0,0,0,.05); gap:12px; }
        .adm-topbar-title { font-family:'Fraunces',serif; font-size:17px; font-weight:900; color:#1e3a2a; white-space:nowrap; }
        .adm-content { flex:1; overflow-y:auto; padding:20px; }

        /* ── STATS ── */
        .adm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
        .adm-stat { background:#fff; border-radius:16px; padding:18px 16px; box-shadow:0 2px 10px rgba(0,0,0,.05); position:relative; overflow:hidden; }
        .adm-stat::before { content:''; position:absolute; top:0; left:0; bottom:0; width:4px; border-radius:16px 0 0 16px; background:var(--stat-color); }
        .adm-stat-val { font-family:'Fraunces',serif; font-size:28px; font-weight:900; margin-bottom:2px; color:var(--stat-color); }
        .adm-stat-lbl { font-size:11px; color:#888; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
        .adm-stat-icon { position:absolute; top:12px; right:14px; font-size:26px; opacity:.18; }

        /* ── CARD ── */
        .adm-card { background:#fff; border-radius:18px; box-shadow:0 2px 14px rgba(0,0,0,.06); overflow:hidden; margin-bottom:20px; animation:fadeIn .2s ease; }
        .adm-card-hdr { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1.5px solid #f0faf3; flex-wrap:wrap; gap:10px; }
        .adm-card-hdr h2 { font-family:'Fraunces',serif; font-size:16px; font-weight:900; color:#1e3a2a; }

        /* ── TABLE ── */
        .adm-table { width:100%; border-collapse:collapse; }
        .adm-table th { background:#f8faf8; padding:11px 14px; text-align:left; font-size:10.5px; font-weight:800; color:#777; letter-spacing:.5px; text-transform:uppercase; border-bottom:1.5px solid #e8ede9; white-space:nowrap; }
        .adm-table td { padding:13px 14px; border-bottom:1px solid #f5f5f5; vertical-align:middle; }
        .adm-table tr:last-child td { border-bottom:none; }
        .adm-table tr:hover td { background:#fafcfa; }

        /* ── BUTTONS & SEARCH ── */
        .adm-btn { padding:7px 13px; border-radius:8px; border:none; cursor:pointer; font-size:12px; font-weight:700; font-family:'Nunito',sans-serif; transition:all .15s; white-space:nowrap; }
        .adm-btn-green  { background:#f0faf3; color:#1e6641; } .adm-btn-green:hover  { background:#d8f3dc; }
        .adm-btn-red    { background:#fff5f5; color:#e63946; } .adm-btn-red:hover    { background:#ffe5e7; }
        .adm-btn-primary { background:#1e6641; color:#fff; padding:9px 18px; } .adm-btn-primary:hover { background:#2d8653; }
        
        .search-wrap { display:flex; gap:8px; flex-wrap:wrap; align-items:center; flex:1; justify-content:flex-end; }
        .adm-search { border:2px solid #e8ede9; border-radius:9px; padding:8px 13px; font-size:13px; outline:none; font-family:'Nunito',sans-serif; transition:border-color .2s; background:#fafcfa; width: 200px; }
        .adm-search:focus { border-color:#52b788; background:#fff; }

        /* ── ORDER FILTERS ── */
        .order-filter-row { padding:12px 20px; border-bottom:1.5px solid #f0faf3; display:flex; gap:7px; flex-wrap:wrap; align-items:center; }
        .of-pill { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:50px; border:1.5px solid #e8ede9; background:#fff; color:#666; font-size:12px; font-weight:700; cursor:pointer; font-family:'Nunito',sans-serif; transition:all .15s; }
        .of-pill.active { background:#1e6641; color:#fff; border-color:#1e6641; }
        .of-pill-cnt { background:rgba(255,255,255,.3); border-radius:50px; padding:0 7px; font-size:11px; font-weight:800; }
        .of-pill:not(.active) .of-pill-cnt { background:#f0faf3; color:#1e6641; }
        
        /* Mobile Order Filter Dropdown */
        .mob-filter-select { display:none; width:100%; padding:12px 14px; border:2px solid #e8ede9; border-radius:10px; font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; color:#444; background:#fff; outline:none; margin-bottom:12px; }

        /* ── DELETE CONFIRM ── */
        .del-btn-inline { padding:5px 10px; background:#fff5f5; color:#e63946; border:1.5px solid #fca5a5; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer; font-family:'Nunito',sans-serif; transition:all .15s; white-space:nowrap; }
        .del-btn-inline:hover { background:#e63946; color:#fff; border-color:#e63946; }

        /* ── MOBILE CARDS ── */
        .oc-wrap { background:#fff; border-radius:14px; border:1.5px solid #e8ede9; margin-bottom:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.04); }
        .oc-head { padding:14px 16px; cursor:pointer; display:flex; align-items:flex-start; gap:12px; }
        .oc-head:hover { background:#fafcfa; }
        .oc-head-left { flex:1; min-width:0; }
        .oc-head-right { text-align:right; flex-shrink:0; }
        .oc-id { font-size:11px; font-weight:800; color:#52b788; letter-spacing:.3px; margin-bottom:2px; }
        .oc-name { font-weight:800; font-size:14px; color:#111; }
        .oc-meta { font-size:11px; color:#888; margin-top:2px; }
        .oc-total { font-family:'Fraunces',serif; font-weight:900; font-size:16px; color:#1e6641; }
        .oc-body { border-top:1.5px solid #f0faf3; padding:14px 16px; animation:slideDown .18s ease; }
        .oc-section { margin-bottom:14px; }
        .oc-section-label { font-size:10px; font-weight:800; color:#888; letter-spacing:.6px; text-transform:uppercase; margin-bottom:6px; }
        .oc-map-btn { display:inline-flex; align-items:center; gap:6px; margin-top:8px; background:'#1e6641'; color:'#fff'; padding:'7px 14px'; border-radius:50px; font-weight:700; font-size:12px; text-decoration:none; }

        /* Product Mobile Card */
        .product-card-mob { display:none; background:#fff; border-radius:14px; border:1.5px solid #e8ede9; margin-bottom:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,.04); }
        
        /* ── OVERVIEW GRID ── */
        .overview-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }

        /* ── HAMBURGER / MOBILE SIDEBAR ── */
        .adm-hamburger { display:none; background:none; border:none; cursor:pointer; padding:6px; flex-direction:column; gap:5px; align-items:center; justify-content:center; border-radius:8px; }
        .adm-hamburger span { display:block; width:21px; height:2.5px; background:#1e6641; border-radius:2px; transition:all .3s; }
        .adm-mobile-overlay { display:none; position:fixed; inset:0; z-index:1999; background:rgba(0,0,0,.5); }
        .adm-mobile-overlay.on { display:block; }
        .adm-mobile-sidebar { position:fixed; top:0; left:0; bottom:0; width:232px; z-index:2000; background:linear-gradient(180deg,#0a1f12,#1a3d28); display:flex; flex-direction:column; transform:translateX(-100%); transition:transform .28s cubic-bezier(.4,0,.2,1); }
        .adm-mobile-sidebar.on { transform:translateX(0); }

        /* ── MODAL ── */
        .modal-overlay { position:fixed; inset:0; z-index:3000; background:rgba(0,0,0,.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
        .modal-box { background:#fff; border-radius:20px; padding:24px 20px; max-width:520px; width:100%; position:relative; box-shadow:0 24px 64px rgba(0,0,0,.2); max-height:90vh; overflow-y:auto; animation:popIn .22s ease; }
        .modal-close { position:absolute; top:14px; right:14px; background:#f0faf3; border:none; width:32px; height:32px; border-radius:50%; font-size:15px; cursor:pointer; color:#1e6641; display:flex; align-items:center; justify-content:center; }
        .fm-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

        /* ── RESPONSIVE ── */
        @media(max-width:1100px) {
          .adm-stats { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:900px) {
          .adm-sidebar { display:none; }
          .adm-hamburger { display:flex; }
          .adm-content { padding:14px; }
          .adm-stats { grid-template-columns:repeat(2,1fr); gap:12px; }
          .overview-grid { grid-template-columns:1fr; }
          .fm-row { grid-template-columns:1fr; }
          .search-wrap { width:100%; margin-top:10px; }
          .adm-search { width: 100%; flex: 1; }
          .adm-btn-primary { width: 100%; text-align: center; }
          
          /* Hide desktop components, show mobile */
          .desk-only { display:none !important; }
          .mob-only { display:block !important; }
          .mob-filter-select { display:block; }
          .product-card-mob { display:flex; flex-direction:column; gap:12px; }
        }
        @media(max-width:500px) {
          .adm-stats { gap:8px; }
          .adm-stat { padding:14px 12px; }
          .adm-stat-val { font-size:22px; }
          .adm-content { padding:10px; }
        }
        .mob-only { display:none; }

        /* ── LIVE DOT ── */
        .live-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block; box-shadow:0 0 0 0 rgba(34,197,94,.4); animation:pulse-ring 2s ease infinite; }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 70%{box-shadow:0 0 0 8px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }
      `}</style>

      <div className="adm">
        <div className="adm-sidebar"><SidebarContent /></div>

        <div className="adm-main">
          <div className="adm-topbar">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="adm-hamburger" onClick={() => setSidebarOpen(true)}>
                <span/><span/><span/>
              </button>
              <div className="adm-topbar-title">
                {TABS.find(t=>t.id===tab)?.icon} {TABS.find(t=>t.id===tab)?.label}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0faf3', border:'1.5px solid #d8f3dc', color:'#1e6641', padding:'4px 12px', borderRadius:50, fontSize:11, fontWeight:700 }}>
                <span className="live-dot"/> Live
              </div>
              <div style={{ fontSize:12, color:'#888', display:'none' }} className="desk-only">{user?.email}</div>
            </div>
          </div>

          <div className="adm-content">

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                <div className="adm-stats">
                  {[
                    { label:'Total Orders', val:stats.total,     color:'#2563eb', icon:'📦' },
                    { label:'Pending',      val:stats.pending,   color:'#f4a322', icon:'⏳' },
                    { label:'Delivered',    val:stats.delivered, color:'#1e6641', icon:'✅' },
                    { label:'Revenue',      val:`Rs. ${stats.revenue.toLocaleString()}`, color:'#7c3aed', icon:'💰' },
                  ].map((s,i) => (
                    <div key={i} className="adm-stat" style={{ '--stat-color':s.color }}>
                      <div className="adm-stat-icon">{s.icon}</div>
                      <div className="adm-stat-val">{s.val}</div>
                      <div className="adm-stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="overview-grid">
                  <div className="adm-card">
                    <div className="adm-card-hdr">
                      <h2>🕐 Recent Orders</h2>
                      <button className="adm-btn adm-btn-green desk-only" onClick={() => handleTabChange('orders')}>View All →</button>
                    </div>
                    {orders.length === 0 ? (
                      <div style={{ padding:'32px 20px', textAlign:'center', color:'#aaa' }}>No orders yet 📦</div>
                    ) : (
                      <div style={{ overflowX:'auto' }}>
                        <table className="adm-table">
                          <thead>
                            <tr><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {orders.slice(0,6).map(o => (
                              <tr key={o.id}>
                                <td>
                                  <div style={{ fontWeight:700, fontSize:13 }}>{o.customer_name||o.customerName}</div>
                                  <div style={{ fontSize:11, color:'#888' }}>{o.customer_phone||o.customerPhone}</div>
                                </td>
                                <td style={{ fontWeight:700, color:'#1e6641', fontSize:13, whiteSpace:'nowrap' }}>Rs. {Number(o.total_price||o.totalPrice||0).toLocaleString()}</td>
                                <td><PaymentBadge order={o} /></td>
                                <td><span style={{ background:STATUS_BG[o.status]||'#f5f5f5', color:STATUS_COLOR[o.status]||'#555', padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700 }}>{STATUS_ICON[o.status]} {o.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <button className="adm-btn adm-btn-green mob-only" style={{ width:'100%', borderRadius:'0 0 18px 18px', padding:'12px' }} onClick={() => handleTabChange('orders')}>View All Recent Orders →</button>
                  </div>

                  <div className="adm-card">
                    <div className="adm-card-hdr">
                      <h2>⭐ Pending Reviews</h2>
                      <button className="adm-btn adm-btn-green desk-only" onClick={() => handleTabChange('reviews')}>View All →</button>
                    </div>
                    {pendingReviews.length === 0 ? (
                      <div style={{ padding:'32px 20px', textAlign:'center', color:'#aaa', fontSize:14 }}>All reviews approved ✅</div>
                    ) : (
                      <div style={{ padding:'10px 16px' }}>
                        {pendingReviews.slice(0,3).map(r => (
                          <div key={r.id} style={{ padding:'10px 0', borderBottom:'1px solid #f0faf3' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                              <div>
                                <span style={{ fontWeight:700, fontSize:13 }}>{r.user_name}</span>
                                <span style={{ color:'#f4a322', marginLeft:6, fontSize:12 }}>{'★'.repeat(r.rating)}</span>
                              </div>
                              <button className="adm-btn adm-btn-green" style={{ fontSize:11 }} onClick={() => handleApproveReview(r.id, true)}>Approve</button>
                            </div>
                            <p style={{ fontSize:12, color:'#666', marginTop:4, lineHeight:1.5 }}>{r.text?.slice(0,80)}…</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingReviews.length > 0 && <button className="adm-btn adm-btn-green mob-only" style={{ width:'100%', borderRadius:'0 0 18px 18px', padding:'12px' }} onClick={() => handleTabChange('reviews')}>Manage All Reviews →</button>}
                  </div>
                </div>
              </>
            )}

            {/* ── ORDERS ── */}
            {tab === 'orders' && (
              <div className="adm-card" style={{ background: 'transparent', boxShadow: 'none' }}>
                <div className="adm-card-hdr" style={{ background: '#fff', borderRadius: '18px 18px 0 0', borderBottom: '1.5px solid #f0faf3' }}>
                  <h2>📦 All Orders ({filteredOrders.length})</h2>
                  <div className="search-wrap">
                    <input
                      className="adm-search"
                      placeholder="🔍 Name, phone or ID..."
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                    />
                    <button className="adm-btn adm-btn-green" onClick={loadOrders}> Refresh</button>
                  </div>
                </div>

                {/* Mobile Specific Dropdown Filter */}
                <div className="mob-only" style={{ background: '#fff', padding: '12px 16px', borderBottom: '1.5px solid #e8ede9' }}>
                   <select 
                      className="mob-filter-select" 
                      value={orderFilter} 
                      onChange={e => setOrderFilter(e.target.value)}
                      style={{ marginBottom: 0 }}
                    >
                      <option value="all">📋 All Orders ({orders.length})</option>
                      <option value="pending">⏳ Pending ({orders.filter(o=>o.status==='pending').length})</option>
                      <option value="confirmed">✅ Confirmed ({orders.filter(o=>o.status==='confirmed').length})</option>
                      <option value="delivered">🚚 Delivered ({orders.filter(o=>o.status==='delivered').length})</option>
                      <option value="cancelled">❌ Cancelled ({orders.filter(o=>o.status==='cancelled').length})</option>
                   </select>
                </div>

                {/* Desktop Specific Pill Filters */}
                <div className="order-filter-row desk-only" style={{ background: '#fff' }}>
                  {['all','pending','confirmed','delivered','cancelled'].map(f => {
                    const cnt = f === 'all' ? orders.length : orders.filter(o => o.status === f).length
                    return (
                      <button key={f} className={`of-pill${orderFilter===f?' active':''}`} onClick={() => setOrderFilter(f)}>
                        {f === 'all' ? '📋' : STATUS_ICON[f]}
                        {f.charAt(0).toUpperCase()+f.slice(1)}
                        <span className="of-pill-cnt">{cnt}</span>
                      </button>
                    )
                  })}
                </div>

                {loading ? (
                  <div style={{ padding:48, textAlign:'center', color:'#888', background:'#fff', borderRadius:'0 0 18px 18px' }}>
                    <div style={{ fontSize:32, marginBottom:10, animation:'spin 1s linear infinite', display:'inline-block' }}>⏳</div>
                    <div>Loading orders...</div>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div style={{ padding:48, textAlign:'center', color:'#aaa', background:'#fff', borderRadius:'0 0 18px 18px' }}>
                    <div style={{ fontSize:44, marginBottom:12 }}>📭</div>
                    <div style={{ fontWeight:700 }}>No orders found</div>
                  </div>
                ) : (
                  <>
                    <div className="desk-only" style={{ overflowX:'auto', background:'#fff', borderRadius:'0 0 18px 18px' }}>
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>#ID</th>
                            <th>Customer</th>
                            <th>Location</th>
                            <th>Items</th>
                            <th>Payment</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(order => {
                            const items   = order.items || []
                            const name    = order.customer_name || order.customerName || ''
                            const phone   = order.customer_phone || order.customerPhone || ''
                            const address = order.delivery_address || order.deliveryAddress || ''
                            const lat     = order.delivery_lat || order.deliveryLat
                            const lng     = order.delivery_lng || order.deliveryLng
                            const total   = order.total_price || order.totalPrice || 0
                            const isDel   = deletingOrder === order.id

                            return (
                              <tr key={order.id}>
                                <td>
                                  <span style={{ fontWeight:800, color:'#52b788', fontSize:12 }}>
                                    #{order.id?.slice(0,8)}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontWeight:700, fontSize:13 }}>{name}</div>
                                  <div style={{ fontSize:11, color:'#888' }}>{phone}</div>
                                </td>
                                <td style={{ maxWidth:150 }}>
                                  <div style={{ fontSize:12, color:'#555', lineHeight:1.5 }}>
                                    {address?.slice(0,45)}{address?.length>45?'…':''}
                                  </div>
                                  {lat && (
                                    <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer"
                                      style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:4, background:'#1e6641', color:'#fff', padding:'3px 9px', borderRadius:50, fontWeight:700, fontSize:10, textDecoration:'none' }}>
                                      🗺️ Map
                                    </a>
                                  )}
                                </td>
                                <td style={{ maxWidth:160 }}>
                                  {items.slice(0,2).map((item,i) => (
                                    <div key={i} style={{ fontSize:11, color:'#555' }}>
                                      • {item.name} ({item.isWeightBased||item.is_weight_based ? item.weightLabel||item.weight_label : `×${item.qty}`})
                                    </div>
                                  ))}
                                  {items.length > 2 && <div style={{ fontSize:11, color:'#999' }}>+{items.length-2} more</div>}
                                </td>
                                <td><PaymentBadge order={order} /></td>
                                <td style={{ fontWeight:700, color:'#1e6641', whiteSpace:'nowrap', fontSize:13 }}>
                                  Rs. {Number(total).toLocaleString()}
                                </td>
                                <td style={{ minWidth:130 }}>
                                  <StatusSelect order={order} />
                                </td>
                                <td style={{ fontSize:11, color:'#999', whiteSpace:'nowrap' }}>
                                  {new Date(order.created_at||order.createdAt||Date.now()).toLocaleDateString('en-LK',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                                </td>
                                <td>
                                  <button
                                    className="del-btn-inline"
                                    disabled={isDel}
                                    onClick={() => { if (window.confirm(`Delete order #${order.id?.slice(0,8)}? Cannot be undone.`)) handleDeleteOrder(order.id) }}>
                                    {isDel ? '⏳' : '🗑️ Delete'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mob-only" style={{ paddingTop:'12px' }}>
                      {filteredOrders.map(order => <OrderCard key={order.id} order={order} />)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {tab === 'products' && (
              <div className="adm-card" style={{ background: 'transparent', boxShadow: 'none' }}>
                <div className="adm-card-hdr" style={{ background: '#fff', borderRadius: '18px 18px 0 0', borderBottom: '1.5px solid #f0faf3' }}>
                  <h2>🛒 Products ({filteredProducts.length})</h2>
                  <div className="search-wrap">
                    <input className="adm-search" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="🔍 Search products..." />
                    <button className="adm-btn adm-btn-primary" onClick={openNewProduct}>+ Add Product</button>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="desk-only" style={{ overflowX:'auto', background:'#fff', borderRadius:'0 0 18px 18px' }}>
                  <table className="adm-table">
                    <thead>
                      <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {p.image_url
                                ? <img src={p.image_url} alt={p.name} style={{ width:38, height:38, borderRadius:9, objectFit:'cover', flexShrink:0, border:'2px solid #e8ede9' }} />
                                : <div style={{ width:38, height:38, borderRadius:9, background:'#f0faf3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{p.category_emoji||'🛒'}</div>
                              }
                              <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                                {p.badge && <span style={{ background:'#f4a322', color:'#111', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:50 }}>{p.badge}</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:12, color:'#555' }}>{p.category_emoji} {p.category}</td>
                          <td style={{ fontWeight:700, color:'#1e6641', fontSize:13, whiteSpace:'nowrap' }}>
                            {p.is_weight_based ? `Rs. ${Number(p.price_per_kg).toLocaleString()}/kg` : `Rs. ${Number(p.price).toLocaleString()}`}
                          </td>
                          <td>
                            <span style={{ background:p.stock===0?'#fff5f5':p.stock<5?'#fffbeb':'#f0faf3', color:p.stock===0?'#e63946':p.stock<5?'#b45309':'#1e6641', padding:'2px 9px', borderRadius:50, fontSize:11, fontWeight:700 }}>
                              {p.stock===0?'Out':p.stock}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleToggleProduct(p.id, !p.active)} style={{ background:p.active?'#f0faf3':'#fff5f5', color:p.active?'#1e6641':'#e63946', border:`1.5px solid ${p.active?'#b7e4c7':'#fca5a5'}`, padding:'4px 10px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                              {p.active?'✅ Active':'❌ Hidden'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="adm-btn adm-btn-green" onClick={() => openEditProduct(p)}>✏️ Edit</button>
                              <button className="adm-btn adm-btn-red" onClick={() => handleDeleteProduct(p.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && <div style={{ padding:'40px 20px', textAlign:'center', color:'#aaa' }}>No products found</div>}
                </div>

                {/* Mobile Cards View */}
                <div className="mob-only" style={{ paddingTop:'12px' }}>
                  {filteredProducts.length === 0 && <div style={{ padding:'40px 20px', textAlign:'center', color:'#aaa', background:'#fff', borderRadius:'14px' }}>No products found</div>}
                  {filteredProducts.map(p => (
                    <div key={p.id} className="product-card-mob">
                      <div style={{ display:'flex', gap:'12px' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width:64, height:64, borderRadius:12, objectFit:'cover', border:'2px solid #e8ede9' }} />
                          : <div style={{ width:64, height:64, borderRadius:12, background:'#f0faf3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{p.category_emoji||'🛒'}</div>
                        }
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:800, fontSize:15, color:'#111' }}>
                            {p.name} 
                            {p.badge && <span style={{ background:'#f4a322', color:'#111', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:50, marginLeft:6, verticalAlign:'middle' }}>{p.badge}</span>}
                          </div>
                          <div style={{ fontSize:12, color:'#666', marginTop:3 }}>{p.category_emoji} {p.category}</div>
                          <div style={{ fontWeight:800, color:'#1e6641', fontSize:14, marginTop:6 }}>
                            {p.is_weight_based ? `Rs. ${Number(p.price_per_kg).toLocaleString()}/kg` : `Rs. ${Number(p.price).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1.5px solid #f0faf3', paddingTop:'10px', marginTop:'2px' }}>
                        <span style={{ background:p.stock===0?'#fff5f5':p.stock<5?'#fffbeb':'#f0faf3', color:p.stock===0?'#e63946':p.stock<5?'#b45309':'#1e6641', padding:'4px 12px', borderRadius:50, fontSize:12, fontWeight:800 }}>
                          Stock: {p.stock===0?'Out':p.stock}
                        </span>
                        <button onClick={() => handleToggleProduct(p.id, !p.active)} style={{ background:p.active?'#f0faf3':'#fff5f5', color:p.active?'#1e6641':'#e63946', border:`1.5px solid ${p.active?'#b7e4c7':'#fca5a5'}`, padding:'4px 12px', borderRadius:50, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          {p.active?'✅ Active':'❌ Hidden'}
                        </button>
                      </div>

                      <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                        <button className="adm-btn adm-btn-green" style={{ flex:1, padding:'10px' }} onClick={() => openEditProduct(p)}>✏️ Edit</button>
                        <button className="adm-btn adm-btn-red" style={{ flex:1, padding:'10px' }} onClick={() => handleDeleteProduct(p.id)}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CATEGORIES ── */}
            {tab === 'categories' && (
              <div className="adm-card">
                <div className="adm-card-hdr">
                  <h2>🏷️ Categories ({categories.length})</h2>
                  <div className="search-wrap">
                    <button className="adm-btn adm-btn-primary" onClick={() => { setCForm(EMPTY_CAT); setEditCId(null); setShowCF(true) }}>+ Add Category</button>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, padding:20 }}>
                  {categories.map(cat => (
                    <div key={cat.id} style={{ background:'#f9fdf9', borderRadius:14, padding:16, border:'1.5px solid #e8ede9', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:(cat.color||'#1e6641')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{cat.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{cat.name}</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Sort: {cat.sort_order}</div>
                      </div>
                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <button className="adm-btn adm-btn-green" onClick={() => { setCForm(cat); setEditCId(cat.id); setShowCF(true) }}>✏️</button>
                        <button className="adm-btn adm-btn-red" onClick={() => handleDeleteCategory(cat.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── REVIEWS ── */}
            {tab === 'reviews' && (
              <div className="adm-card">
                <div className="adm-card-hdr">
                  <h2>⭐ Reviews ({reviews.length})</h2>
                  <div style={{ fontSize:13, color:'#888', fontWeight:600 }}>{pendingReviews.length} pending approval</div>
                </div>
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background:r.approved?'#f9fdf9':'#fffbf0', border:`1.5px solid ${r.approved?'#e8ede9':'#fcd34d'}`, borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                        <div>
                          <span style={{ fontWeight:800, fontSize:14 }}>{r.user_name}</span>
                          <span style={{ color:'#f4a322', marginLeft:8, fontSize:14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                          <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                            {new Date(r.created_at||r.createdAt||Date.now()).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'})}
                          </div>
                        </div>
                        <span style={{ background:r.approved?'#f0faf3':'#fff9ec', color:r.approved?'#1e6641':'#b45309', padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {r.approved?'✅ Published':'⏳ Pending'}
                        </span>
                      </div>
                      <p style={{ fontSize:13, color:'#444', lineHeight:1.65, margin:'10px 0' }}>{r.text}</p>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="adm-btn adm-btn-green" onClick={() => handleApproveReview(r.id, !r.approved)}>
                          {r.approved?'Hide':'✅ Approve'}
                        </button>
                        <button className="adm-btn adm-btn-red" onClick={() => handleDeleteReview(r.id)}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && <div style={{ textAlign:'center', padding:'40px 20px', color:'#aaa' }}>No reviews yet</div>}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <div className={`adm-mobile-overlay${sidebarOpen?' on':''}`} onClick={() => setSidebarOpen(false)} />
      <div className={`adm-mobile-sidebar${sidebarOpen?' on':''}`}><SidebarContent /></div>

      {/* ── PRODUCT MODAL ── */}
      {showPF && (
        <div className="modal-overlay" onClick={() => setShowPF(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPF(false)}>✕</button>
            <h3 style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:900, marginBottom:20 }}>
              {editPId ? '✏️ Edit Product' : '➕ New Product'}
            </h3>
            <div className="fm-row">
              <Field label="Product Name *">
                <input style={inp} value={pForm.name} onChange={e => setPForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Samba Rice" />
              </Field>
              <Field label="Category *">
                <select style={inp} value={pForm.category} onChange={e => setPForm(f=>({...f,category:e.target.value}))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14, fontWeight:600 }}>
                <input type="checkbox" checked={pForm.is_weight_based} onChange={e => setPForm(f=>({...f,is_weight_based:e.target.checked}))} style={{ width:16, height:16 }} />
                Weight-based pricing (rice, spices, etc.)
              </label>
            </div>
            <div className="fm-row">
              {pForm.is_weight_based ? (
                <>
                  <Field label="Price per kg (Rs.) *">
                    <input type="number" style={inp} value={pForm.price_per_kg} onChange={e => setPForm(f=>({...f,price_per_kg:e.target.value}))} placeholder="180" />
                  </Field>
                  <Field label="Max weight (kg)">
                    <input type="number" style={inp} value={pForm.max_weight} onChange={e => setPForm(f=>({...f,max_weight:e.target.value}))} placeholder="10" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Price (Rs.) *">
                    <input type="number" style={inp} value={pForm.price} onChange={e => setPForm(f=>({...f,price:e.target.value}))} placeholder="250" />
                  </Field>
                  <Field label="Unit">
                    <input style={inp} value={pForm.unit} onChange={e => setPForm(f=>({...f,unit:e.target.value}))} placeholder="pack / bottle" />
                  </Field>
                </>
              )}
            </div>
            <div className="fm-row">
              <Field label="Stock">
                <input type="number" style={inp} value={pForm.stock} onChange={e => setPForm(f=>({...f,stock:e.target.value}))} placeholder="99" />
              </Field>
              <Field label="Badge">
                <select style={inp} value={pForm.badge} onChange={e => setPForm(f=>({...f,badge:e.target.value}))}>
                  <option value="">None</option>
                  <option value="Hot">🔥 Hot</option>
                  <option value="New">✨ New</option>
                  <option value="Sale">🏷️ Sale</option>
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea style={{...inp,resize:'none'}} value={pForm.description} onChange={e => setPForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Short description..." />
            </Field>
            <Field label="Product Image">
              <input type="file" accept="image/*" style={{ fontSize:13 }} onChange={async e => { const url = await uploadImage(e.target.files[0]); if(url) setPForm(f=>({...f,image_url:url})) }} />
              {uploading && (
                <div style={{ fontSize:12, color:'#1e6641', marginTop:6, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⏳</span>
                  Uploading to Cloudinary...
                </div>
              )}
              {!uploading && pForm.image_url && (
                <div style={{ marginTop:8 }}>
                  <img src={pForm.image_url} alt="preview" style={{ height:70, borderRadius:8, objectFit:'cover', border:'2px solid #d8f3dc' }} />
                  <div style={{ fontSize:11, color:'#1e6641', marginTop:4, fontWeight:600 }}>✅ Image ready</div>
                </div>
              )}
            </Field>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14, fontWeight:600 }}>
                <input type="checkbox" checked={pForm.active} onChange={e => setPForm(f=>({...f,active:e.target.checked}))} style={{ width:16, height:16 }} />
                Product is active (visible in shop)
              </label>
            </div>
            <button onClick={saveProduct} style={{ width:'100%', background:'#1e6641', color:'#fff', padding:14, borderRadius:12, fontWeight:800, fontSize:15, border:'none', cursor:'pointer', fontFamily:"'Nunito',sans-serif", opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⏳ Uploading image...' : editPId ? '💾 Update Product' : '✅ Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* ── CATEGORY MODAL ── */}
      {showCF && (
        <div className="modal-overlay" onClick={() => setShowCF(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
            <button className="modal-close" onClick={() => setShowCF(false)}>✕</button>
            <h3 style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:900, marginBottom:20 }}>
              {editCId ? '✏️ Edit Category' : '➕ New Category'}
            </h3>
            <Field label="Name *">
              <input style={inp} value={cForm.name} onChange={e => setCForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Rice & Grains" />
            </Field>
            <Field label="Emoji">
              <input style={inp} value={cForm.emoji} onChange={e => setCForm(f=>({...f,emoji:e.target.value}))} placeholder="🌾" />
            </Field>
            <Field label="Category Color">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8, marginBottom:12 }}>
                {['#1e6641','#2563eb','#dc2626','#7c3aed','#d97706','#0891b2','#db2777','#c49a2a','#16a34a','#ea580c','#4f46e5','#0d9488','#be123c','#854d0e','#1d4ed8','#6d28d9'].map(c => (
                  <button key={c} type="button" onClick={() => setCForm(f=>({...f,color:c}))} title={c}
                    style={{ width:'100%', aspectRatio:'1', borderRadius:8, background:c, border: cForm.color===c?'3px solid #111':'2px solid transparent', cursor:'pointer', transform: cForm.color===c?'scale(1.15)':'scale(1)', outline: cForm.color===c?'2px solid #fff':'none', outlineOffset:-4, transition:'transform .15s' }} />
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <label style={{ width:44, height:44, borderRadius:10, border:'2px solid #e8ede9', background:cForm.color, cursor:'pointer', display:'block', flexShrink:0, overflow:'hidden', position:'relative' }}>
                  <input type="color" value={cForm.color} onChange={e => setCForm(f=>({...f,color:e.target.value}))} style={{ position:'absolute', inset:0, width:'200%', height:'200%', opacity:0, cursor:'pointer' }} />
                </label>
                <div>
                  <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>Custom color →</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#333' }}>{cForm.color}</div>
                </div>
                <div style={{ marginLeft:'auto', background:cForm.color+'22', border:`2px solid ${cForm.color}`, borderRadius:50, padding:'4px 14px', fontSize:13, fontWeight:700, color:cForm.color, whiteSpace:'nowrap' }}>
                  {cForm.emoji} {cForm.name||'Preview'}
                </div>
              </div>
            </Field>
            <Field label="Sort Order">
              <input type="number" style={inp} value={cForm.sort_order} onChange={e => setCForm(f=>({...f,sort_order:e.target.value}))} placeholder="1" />
            </Field>
            <button onClick={saveCategory} style={{ width:'100%', background:'#1e6641', color:'#fff', padding:13, borderRadius:12, fontWeight:800, fontSize:15, border:'none', cursor:'pointer', marginTop:6, fontFamily:"'Nunito',sans-serif" }}>
              {editCId ? '💾 Update Category' : '✅ Add Category'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
