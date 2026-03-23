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
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import toast from 'react-hot-toast'

const STATUS_COLOR = { pending:'#f4a322', confirmed:'#2563eb', delivered:'#1e6641', cancelled:'#e63946' }
const STATUS_BG    = { pending:'#fff9ec', confirmed:'#eff6ff', delivered:'#f0faf3', cancelled:'#fff5f5' }
const STATUS_ICON  = { pending:'⏳', confirmed:'✅', delivered:'🚚', cancelled:'❌' }
const PAYMENT_COLOR = { cod:'#b45309', card_paid:'#1e6641', card_pending:'#1d4ed8' }
const PAYMENT_BG    = { cod:'#fff9ec', card_paid:'#f0faf3', card_pending:'#eff6ff' }
const PAYMENT_LABEL = { cod:'💵 COD', card_paid:'💳 Paid', card_pending:'💳 Pending' }

function getPaymentKey(order) {
  if (order.paymentMethod === 'card') return order.paymentStatus === 'paid' ? 'card_paid' : 'card_pending'
  return 'cod'
}
const EMPTY_PRODUCT = { name:'', category:'', price:'', price_per_kg:'', is_weight_based:false, max_weight:'', unit:'', stock:'99', description:'', badge:'', active:true, image_url:'' }
const EMPTY_CAT = { name:'', emoji:'🛒', color:'#1e6641', sort_order:0 }

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:13, fontWeight:700, color:'#444', display:'block', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}
const inp = { width:'100%', padding:'10px 14px', border:'2px solid #e8ede9', borderRadius:10, fontSize:14, outline:'none', fontFamily:"'Nunito',sans-serif", background:'#fff', boxSizing:'border-box' }

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading, signOut, user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]               = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orders, setOrders]         = useState([])
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [reviews, setReviews]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [stats, setStats]           = useState({ total:0, pending:0, delivered:0, revenue:0 })
  const [orderFilter, setOrderFilter] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [showPF, setShowPF]         = useState(false)
  const [editPId, setEditPId]       = useState(null)
  const [pForm, setPForm]           = useState(EMPTY_PRODUCT)
  const [uploading, setUploading]   = useState(false)
  const [showCF, setShowCF]         = useState(false)
  const [editCId, setEditCId]       = useState(null)
  const [cForm, setCForm]           = useState(EMPTY_CAT)

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

  // Realtime orders listener
  useEffect(() => {
    if (!isAdmin) return
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const o = d.data()
        return { id: d.id, ...o, created_at: o.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() }
      })
      setOrders(data)
      setStats({
        total:     data.length,
        pending:   data.filter(o => o.status === 'pending').length,
        delivered: data.filter(o => o.status === 'delivered').length,
        revenue:   data.filter(o => o.status !== 'cancelled').reduce((s,o) => s + Number(o.totalPrice||0), 0),
      })
      // Show toast for new orders (only after initial load)
    })
    return () => unsub()
  }, [isAdmin])

  // Realtime reviews listener
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
    total: data.length,
    pending: data.filter(o => o.status === 'pending').length,
    delivered: data.filter(o => o.status === 'delivered').length,
    revenue: data.filter(o => o.status !== 'cancelled').reduce((s,o) => s + Number(o.totalPrice||o.total_price||0), 0),
  })

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOrders()
      const normalized = data.map(o => ({ ...o, created_at: o.createdAt || o.created_at || new Date().toISOString(), customer_name: o.customerName || o.customer_name, customer_phone: o.customerPhone || o.customer_phone, delivery_address: o.deliveryAddress || o.delivery_address, delivery_lat: o.deliveryLat || o.delivery_lat, delivery_lng: o.deliveryLng || o.delivery_lng, total_price: o.totalPrice || o.total_price, delivery_fee: o.deliveryFee || o.delivery_fee }))
      setOrders(normalized)
      calcStats(normalized)
    } catch(e) { toast.error('Could not load orders: ' + e.message) }
    setLoading(false)
  }, [])

  const loadProducts = useCallback(async () => {
    try { const data = await fetchAllProducts(); setProducts(data) } catch {}
  }, [])

  const loadCategories = useCallback(async () => {
    try { const data = await fetchCategories(); setCategories(data) } catch {}
  }, [])

  const loadReviews = useCallback(async () => {
    try { const data = await fetchAllReviews(); setReviews(data.map(r => ({ ...r, created_at: r.createdAt || r.created_at || new Date().toISOString() }))) } catch {}
  }, [])

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status)
      setOrders(prev => { const updated = prev.map(o => o.id === id ? {...o, status} : o); calcStats(updated); return updated })
      toast.success(`Order marked as ${status}`)
    } catch { toast.error('Failed to update status') }
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
      console.error('Cloudinary error:', e)
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
    await deleteProduct(id); setProducts(prev => prev.filter(p => p.id !== id))
    invalidateCache('products'); toast.success('Product deleted')
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return
    await deleteCategory(id); setCategories(prev => prev.filter(c => c.id !== id))
    invalidateCache('categories'); toast.success('Category deleted')
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
    await deleteReview(id); setReviews(prev => prev.filter(r => r.id !== id)); toast.success('Deleted')
  }

  const openNewProduct  = () => { setPForm({...EMPTY_PRODUCT, category: categories[0]?.name||''}); setEditPId(null); setShowPF(true) }
  const openEditProduct = (p) => { setPForm({...p, price:p.price||'', price_per_kg:p.price_per_kg||'', max_weight:p.max_weight||''}); setEditPId(p.id); setShowPF(true) }
  const handleTabChange = (t)  => { setTab(t); setSidebarOpen(false); setExpandedOrder(null) }
  const handleLogout    = async () => { await signOut(); toast.success('Logged out') }

  const filteredOrders = orders.filter(o => {
    const matchStatus = orderFilter === 'all' || o.status === orderFilter
    const q = orderSearch.toLowerCase()
    const matchSearch = !q || (o.customer_name||o.customerName||'').toLowerCase().includes(q) || (o.customer_phone||o.customerPhone||'').includes(q)
    return matchStatus && matchSearch
  })
  const filteredProducts = productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase())) : products
  const pendingReviews   = reviews.filter(r => !r.approved)

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8faf8' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, animation:'spin 1s linear infinite', display:'inline-block', marginBottom:12 }}>🌿</div>
        <div style={{ fontFamily:'Nunito,sans-serif', color:'#888', fontSize:14 }}>Loading dashboard...</div>
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

  const SidebarContent = () => (
    <>
      <div style={{ padding:'20px 16px', borderBottom:'1px solid #2d4a38', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <span style={{ fontSize:26 }}>🏪</span>
          <div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:900, color:'#fff' }}>Thisara Stores</div>
            <div style={{ fontSize:11, color:'#52b788' }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:'#52b788', marginTop:8, background:'rgba(82,183,136,.15)', padding:'5px 10px', borderRadius:6 }}>🟢 Firebase Realtime</div>
      </div>
      <div style={{ padding:'10px', flex:1, overflowY:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:10, border:'none',
            background: tab===t.id ? 'rgba(82,183,136,.2)' : 'transparent', color: tab===t.id ? '#52b788' : '#8aab98',
            fontSize:14, fontWeight: tab===t.id ? 700 : 500, cursor:'pointer', marginBottom:3, fontFamily:"'Nunito',sans-serif", textAlign:'left',
          }}>
            <span style={{ fontSize:18, width:22, flexShrink:0 }}>{t.icon}</span>
            <span style={{ flex:1 }}>{t.label}</span>
            {t.badge && <span style={{ background:'#f4a322', color:'#111', borderRadius:'50%', minWidth:22, height:22, fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{t.badge}</span>}
          </button>
        ))}
        <div style={{ borderTop:'1px solid #2d4a38', marginTop:12, paddingTop:12 }}>
          {[['/', '🏠', 'Home'],['/shop','🛒','Shop'],['/about','ℹ️','About']].map(([to,icon,label]) => (
            <Link key={to} to={to} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, color:'#8aab98', fontSize:13, textDecoration:'none' }}>
              <span>{icon}</span>{label}
            </Link>
          ))}
        </div>
      </div>
      <div style={{ padding:'16px', borderTop:'1px solid #2d4a38', flexShrink:0 }}>
        <div style={{ fontSize:12, color:'#4a6b58', marginBottom:8 }}>Signed in as:<br /><span style={{ color:'#8aab98' }}>{user?.email}</span></div>
        <button onClick={handleLogout} style={{ width:'100%', background:'#e63946', color:'#fff', border:'none', padding:'10px', borderRadius:10, fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:13 }}>🚪 Sign Out</button>
      </div>
    </>
  )

  const OrderCard = ({ order }) => {
    const items = order.items || []
    const isOpen = expandedOrder === order.id
    const name = order.customer_name || order.customerName || ''
    const phone = order.customer_phone || order.customerPhone || ''
    const address = order.delivery_address || order.deliveryAddress || ''
    const lat = order.delivery_lat || order.deliveryLat
    const lng = order.delivery_lng || order.deliveryLng
    const total = order.total_price || order.totalPrice || 0
    const fee = order.delivery_fee || order.deliveryFee || 0
    const date = new Date(order.created_at || order.createdAt || Date.now()).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
    return (
      <div style={{ background:'#fff', borderRadius:14, border:'1.5px solid #e8ede9', marginBottom:12, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <div onClick={() => setExpandedOrder(isOpen ? null : order.id)} style={{ padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              <span style={{ fontWeight:800, fontSize:13, color:'#1e6641' }}>#{order.id?.slice(0,8)}</span>
              <span style={{ background:STATUS_BG[order.status]||'#f5f5f5', color:STATUS_COLOR[order.status]||'#555', padding:'2px 10px', borderRadius:50, fontSize:11, fontWeight:700 }}>{STATUS_ICON[order.status]} {order.status}</span>
            </div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>{name}</div>
            <div style={{ fontSize:12, color:'#888' }}>{phone} · {date}</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'Fraunces,serif', fontWeight:900, fontSize:16, color:'#1e6641' }}>Rs. {Number(total).toLocaleString()}</div>
            <div style={{ marginTop:4, display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
              <span style={{ background:PAYMENT_BG[getPaymentKey(order)], color:PAYMENT_COLOR[getPaymentKey(order)], padding:'2px 8px', borderRadius:50, fontSize:10, fontWeight:700 }}>
                {PAYMENT_LABEL[getPaymentKey(order)]}
              </span>
              <span style={{ fontSize:18, color:'#ccc' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
          </div>
        </div>
        {isOpen && (
          <div style={{ borderTop:'1.5px solid #f0faf3', padding:'14px 16px' }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#888', marginBottom:4 }}>DELIVERY LOCATION</div>
              <div style={{ fontSize:13, color:'#444', lineHeight:1.6 }}>{address||'—'}</div>
              {lat && (
                <a
                  href={`https://maps.google.com/?q=${lat},${lng}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    display:'inline-flex', alignItems:'center', gap:6, marginTop:8,
                    background:'#1e6641', color:'#fff', padding:'8px 16px',
                    borderRadius:50, fontWeight:700, fontSize:13, textDecoration:'none',
                  }}
                >
                  🗺️ Open in Google Maps
                </a>
              )}
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#888', marginBottom:6 }}>ITEMS ({items.length})</div>
              {items.map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
                  <span>{item.name} <span style={{ color:'#888', fontSize:12 }}>({item.isWeightBased||item.is_weight_based ? item.weightLabel||item.weight_label : `×${item.qty}`})</span></span>
                  <span style={{ fontWeight:700, color:'#1e6641' }}>Rs. {Number(item.subtotal).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#f9fdf9', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, color:'#666' }}><span>Delivery fee</span><span>Rs. {Number(fee).toLocaleString()}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, color:'#1e6641', borderTop:'1px solid #e8ede9', paddingTop:6 }}><span>Total</span><span>Rs. {Number(total).toLocaleString()}</span></div>
            </div>
            {order.note && <div style={{ background:'#fff9ec', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#92400e' }}>📝 {order.note}</div>}
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'#888', marginBottom:8 }}>UPDATE STATUS</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {['pending','confirmed','delivered','cancelled'].map(s => (
                  <button key={s} onClick={() => handleUpdateStatus(order.id, s)} style={{ padding:'7px 14px', borderRadius:8, border:'2px solid', borderColor:order.status===s?STATUS_COLOR[s]:'#e8ede9', background:order.status===s?STATUS_BG[s]:'#fff', color:order.status===s?STATUS_COLOR[s]:'#888', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
                    {STATUS_ICON[s]} {s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        * { box-sizing:border-box; }
        .adm { display:flex; height:100vh; overflow:hidden; background:#f8faf8; font-family:'Nunito',sans-serif; }
        .adm-sidebar { width:240px; background:linear-gradient(180deg,#0f2d1c,#1a3d28); display:flex; flex-direction:column; flex-shrink:0; }
        .adm-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
        .adm-topbar { background:#fff; border-bottom:1.5px solid #e8ede9; padding:0 20px; height:60px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,.04); gap:12px; }
        .adm-topbar h1 { font-family:'Fraunces',serif; font-size:18px; font-weight:900; color:#1e6641; white-space:nowrap; }
        .adm-content { flex:1; overflow-y:auto; padding:20px; }
        .adm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
        .adm-stat { background:#fff; border-radius:14px; padding:18px 16px; box-shadow:0 2px 10px rgba(0,0,0,.05); border-left:4px solid; }
        .adm-stat-val { font-family:'Fraunces',serif; font-size:26px; font-weight:900; margin-bottom:2px; }
        .adm-stat-lbl { font-size:11px; color:#888; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
        .adm-card { background:#fff; border-radius:16px; box-shadow:0 2px 12px rgba(0,0,0,.05); overflow:hidden; margin-bottom:20px; }
        .adm-card-hdr { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1.5px solid #f0faf3; flex-wrap:wrap; gap:10px; }
        .adm-card-hdr h2 { font-family:'Fraunces',serif; font-size:16px; font-weight:900; }
        .adm-table { width:100%; border-collapse:collapse; }
        .adm-table th { background:#f8faf8; padding:10px 14px; text-align:left; font-size:11px; font-weight:800; color:#888; letter-spacing:.4px; text-transform:uppercase; border-bottom:1.5px solid #e8ede9; white-space:nowrap; }
        .adm-table td { padding:12px 14px; border-bottom:1px solid #f5f5f5; vertical-align:top; }
        .adm-table tr:last-child td { border-bottom:none; }
        .adm-table tr:hover td { background:#fafcfa; }
        .adm-btn { padding:7px 14px; border-radius:8px; border:none; cursor:pointer; font-size:12px; font-weight:700; font-family:'Nunito',sans-serif; transition:all .15s; white-space:nowrap; }
        .adm-btn-green { background:#f0faf3; color:#1e6641; } .adm-btn-green:hover { background:#d8f3dc; }
        .adm-btn-red { background:#fff5f5; color:#e63946; } .adm-btn-red:hover { background:#ffe5e7; }
        .adm-btn-primary { background:#1e6641; color:#fff; padding:9px 18px; } .adm-btn-primary:hover { background:#2d8653; }
        .adm-hamburger { display:none; background:none; border:none; cursor:pointer; padding:6px; flex-direction:column; gap:5px; align-items:center; justify-content:center; }
        .adm-hamburger span { display:block; width:22px; height:2.5px; background:#1e6641; border-radius:2px; }
        .adm-mobile-overlay { display:none; position:fixed; inset:0; z-index:1999; background:rgba(0,0,0,.5); }
        .adm-mobile-overlay.on { display:block; }
        .adm-mobile-sidebar { position:fixed; top:0; left:0; bottom:0; width:240px; z-index:2000; background:linear-gradient(180deg,#0f2d1c,#1a3d28); display:flex; flex-direction:column; transform:translateX(-100%); transition:transform .28s cubic-bezier(.4,0,.2,1); }
        .adm-mobile-sidebar.on { transform:translateX(0); }
        .modal-overlay { position:fixed; inset:0; z-index:3000; background:rgba(0,0,0,.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
        .modal-box { background:#fff; border-radius:20px; padding:24px 20px; max-width:520px; width:100%; position:relative; box-shadow:0 24px 64px rgba(0,0,0,.2); max-height:90vh; overflow-y:auto; animation:popIn .22s ease; }
        .modal-close { position:absolute; top:14px; right:14px; background:#f0faf3; border:none; width:32px; height:32px; border-radius:50%; font-size:15px; cursor:pointer; color:#1e6641; display:flex; align-items:center; justify-content:center; }
        .fm-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .adm-search { border:2px solid #e8ede9; border-radius:8px; padding:7px 12px; font-size:13px; outline:none; font-family:'Nunito',sans-serif; } .adm-search:focus { border-color:#52b788; }
        .orders-desktop { display:block; } .orders-mobile { display:none; }
        .overview-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @keyframes popIn { from{transform:scale(.94);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:1100px) { .adm-stats { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:900px) {
          .adm-sidebar { display:none; } .adm-hamburger { display:flex; } .adm-content { padding:14px; }
          .adm-stats { grid-template-columns:repeat(2,1fr); gap:10px; }
          .orders-desktop { display:none; } .orders-mobile { display:block; padding:14px; }
          .overview-grid { grid-template-columns:1fr; } .fm-row { grid-template-columns:1fr; }
          .adm-card-hdr { flex-direction:column; align-items:stretch; }
        }
        @media(max-width:500px) { .adm-stats { gap:8px; } .adm-stat { padding:14px 12px; } .adm-stat-val { font-size:22px; } }
      `}</style>

      <div className="adm">
        <div className="adm-sidebar"><SidebarContent /></div>
        <div className="adm-main">
          <div className="adm-topbar">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="adm-hamburger" onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
              <h1>{TABS.find(t=>t.id===tab)?.icon} {TABS.find(t=>t.id===tab)?.label}</h1>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ background:'#f0faf3', color:'#1e6641', padding:'4px 10px', borderRadius:50, fontSize:11, fontWeight:700 }}>🟢 Live</div>
            </div>
          </div>

          <div className="adm-content">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <>
                <div className="adm-stats">
                  {[
                    { label:'Total Orders', val:stats.total,     color:'#2563eb', icon:'📦' },
                    { label:'Pending',      val:stats.pending,   color:'#f4a322', icon:'⏳' },
                    { label:'Delivered',    val:stats.delivered, color:'#1e6641', icon:'✅' },
                    { label:'Revenue',      val:`Rs. ${stats.revenue.toLocaleString()}`, color:'#7c3aed', icon:'💰' },
                  ].map((s,i) => (
                    <div key={i} className="adm-stat" style={{ borderLeftColor:s.color }}>
                      <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                      <div className="adm-stat-val" style={{ color:s.color }}>{s.val}</div>
                      <div className="adm-stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="overview-grid">
                  <div className="adm-card">
                    <div className="adm-card-hdr"><h2>🕐 Recent Orders</h2><button className="adm-btn adm-btn-green" onClick={() => handleTabChange('orders')}>View All</button></div>
                    {orders.length === 0 ? <div style={{ padding:28, textAlign:'center', color:'#888' }}>No orders yet 📦</div> : (
                      <div style={{ overflowX:'auto' }}>
                        <table className="adm-table">
                          <thead><tr><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                          <tbody>
                            {orders.slice(0,6).map(o => (
                              <tr key={o.id}>
                                <td><div style={{ fontWeight:700, fontSize:13 }}>{o.customer_name||o.customerName}</div><div style={{ fontSize:11, color:'#888' }}>{o.customer_phone||o.customerPhone}</div></td>
                                <td style={{ fontWeight:700, color:'#1e6641', fontSize:13 }}>Rs. {Number(o.total_price||o.totalPrice||0).toLocaleString()}</td>
                                <td><span style={{ background:STATUS_BG[o.status]||'#f5f5f5', color:STATUS_COLOR[o.status]||'#555', padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700 }}>{STATUS_ICON[o.status]} {o.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="adm-card">
                    <div className="adm-card-hdr"><h2>⭐ Pending Reviews</h2><button className="adm-btn adm-btn-green" onClick={() => handleTabChange('reviews')}>View All</button></div>
                    {pendingReviews.length === 0 ? <div style={{ padding:'28px 20px', textAlign:'center', color:'#888', fontSize:14 }}>No pending reviews ✅</div> : (
                      <div style={{ padding:'10px 16px' }}>
                        {pendingReviews.slice(0,3).map(r => (
                          <div key={r.id} style={{ padding:'10px 0', borderBottom:'1px solid #f0faf3' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                              <div><span style={{ fontWeight:700, fontSize:13 }}>{r.user_name}</span><span style={{ color:'#f4a322', marginLeft:6, fontSize:12 }}>{'★'.repeat(r.rating)}</span></div>
                              <button className="adm-btn adm-btn-green" style={{ fontSize:11 }} onClick={() => handleApproveReview(r.id, true)}>Approve</button>
                            </div>
                            <p style={{ fontSize:12, color:'#666', marginTop:4, lineHeight:1.5 }}>{r.text?.slice(0,80)}…</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ORDERS */}
            {tab === 'orders' && (
              <div className="adm-card">
                <div className="adm-card-hdr">
                  <h2>📦 All Orders ({filteredOrders.length})</h2>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <input className="adm-search" placeholder="Search name / phone..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} style={{ width:200 }} />
                    <button className="adm-btn adm-btn-green" onClick={loadOrders}>🔄 Refresh</button>
                  </div>
                </div>
                <div style={{ padding:'12px 20px', borderBottom:'1.5px solid #f0faf3', display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['all','pending','confirmed','delivered','cancelled'].map(f => {
                    const cnt = f === 'all' ? orders.length : orders.filter(o => o.status === f).length
                    return (
                      <button key={f} className="adm-btn" onClick={() => setOrderFilter(f)} style={{ background:orderFilter===f?'#1e6641':'#f0faf3', color:orderFilter===f?'#fff':'#1e6641', fontSize:12 }}>
                        {f === 'all' ? '📋' : STATUS_ICON[f]} {f.charAt(0).toUpperCase()+f.slice(1)}
                        <span style={{ background:orderFilter===f?'rgba(255,255,255,.25)':'#d8f3dc', color:orderFilter===f?'#fff':'#1e6641', borderRadius:50, padding:'1px 7px', fontSize:11, fontWeight:800, marginLeft:4 }}>{cnt}</span>
                      </button>
                    )
                  })}
                </div>
                {loading ? (
                  <div style={{ padding:40, textAlign:'center', color:'#888' }}><div style={{ fontSize:32, marginBottom:10 }}>⏳</div>Loading orders...</div>
                ) : filteredOrders.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:'#888' }}><div style={{ fontSize:40, marginBottom:10 }}>📭</div>No orders found</div>
                ) : (
                  <>
                    <div className="orders-desktop" style={{ overflowX:'auto' }}>
                      <table className="adm-table">
                        <thead><tr><th>#ID</th><th>Customer</th><th>Location</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                          {filteredOrders.map(order => {
                            const items = order.items || []
                            const name = order.customer_name || order.customerName || ''
                            const phone = order.customer_phone || order.customerPhone || ''
                            const address = order.delivery_address || order.deliveryAddress || ''
                            const lat = order.delivery_lat || order.deliveryLat
                            const lng = order.delivery_lng || order.deliveryLng
                            const total = order.total_price || order.totalPrice || 0
                            return (
                              <tr key={order.id}>
                                <td style={{ fontWeight:700, color:'#1e6641', fontSize:12 }}>#{order.id?.slice(0,8)}</td>
                                <td><div style={{ fontWeight:700, fontSize:13 }}>{name}</div><div style={{ fontSize:11, color:'#888' }}>{phone}</div></td>
                                <td style={{ maxWidth:160 }}>
                                  <div style={{ fontSize:12, color:'#555', lineHeight:1.5 }}>{address?.slice(0,55)}{address?.length>55?'…':''}</div>
                                  {lat && (
                                    <a href={`https://maps.google.com/?q=${lat},${lng}`}
                                      target="_blank" rel="noreferrer"
                                      style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:4, background:'#1e6641', color:'#fff', padding:'4px 10px', borderRadius:50, fontWeight:700, fontSize:11, textDecoration:'none' }}>
                                      🗺️ Open Map
                                    </a>
                                  )}
                                </td>
                                <td style={{ maxWidth:180 }}>
                                  {items.slice(0,3).map((item,i) => (
                                    <div key={i} style={{ fontSize:11, color:'#555' }}>• {item.name} ({item.isWeightBased||item.is_weight_based ? item.weightLabel||item.weight_label : `×${item.qty}`})</div>
                                  ))}
                                  {items.length > 3 && <div style={{ fontSize:11, color:'#888' }}>+{items.length-3} more</div>}
                                </td>
                                <td style={{ fontWeight:700, color:'#1e6641', whiteSpace:'nowrap' }}>Rs. {Number(total).toLocaleString()}</td>
                                <td>
                                  <span style={{ background:PAYMENT_BG[getPaymentKey(order)], color:PAYMENT_COLOR[getPaymentKey(order)], padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                                    {PAYMENT_LABEL[getPaymentKey(order)]}
                                  </span>
                                </td>
                                <td>
                                  <select value={order.status} onChange={e => handleUpdateStatus(order.id, e.target.value)}
                                    style={{ border:`2px solid ${STATUS_COLOR[order.status]||'#ccc'}`, background:STATUS_BG[order.status]||'#f5f5f5', color:STATUS_COLOR[order.status]||'#555', borderRadius:8, padding:'4px 8px', fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
                                    {['pending','confirmed','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td style={{ fontSize:11, color:'#888', whiteSpace:'nowrap' }}>
                                  {new Date(order.created_at||order.createdAt||Date.now()).toLocaleDateString('en-LK',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="orders-mobile">
                      {filteredOrders.map(order => <OrderCard key={order.id} order={order} />)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PRODUCTS */}
            {tab === 'products' && (
              <div className="adm-card">
                <div className="adm-card-hdr">
                  <h2>🛒 Products ({filteredProducts.length})</h2>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <input className="adm-search" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." style={{ width:180 }} />
                    <button className="adm-btn adm-btn-primary" onClick={openNewProduct}>+ Add Product</button>
                  </div>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table className="adm-table">
                    <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredProducts.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                                : <div style={{ width:36, height:36, borderRadius:8, background:'#f0faf3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{p.category_emoji||'🛒'}</div>}
                              <div><div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                                {p.badge && <span style={{ background:'#f4a322', color:'#111', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:50 }}>{p.badge}</span>}</div>
                            </div>
                          </td>
                          <td style={{ fontSize:12, color:'#555' }}>{p.category_emoji} {p.category}</td>
                          <td style={{ fontWeight:700, color:'#1e6641', fontSize:13 }}>{p.is_weight_based ? `Rs. ${Number(p.price_per_kg).toLocaleString()}/kg` : `Rs. ${Number(p.price).toLocaleString()}`}</td>
                          <td><span style={{ background:p.stock===0?'#fff5f5':p.stock<5?'#fff9ec':'#f0faf3', color:p.stock===0?'#e63946':p.stock<5?'#b45309':'#1e6641', padding:'2px 8px', borderRadius:50, fontSize:11, fontWeight:700 }}>{p.stock===0?'Out':p.stock}</span></td>
                          <td><button onClick={() => handleToggleProduct(p.id, !p.active)} style={{ background:p.active?'#f0faf3':'#fff5f5', color:p.active?'#1e6641':'#e63946', border:'none', padding:'4px 10px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer' }}>{p.active?'✅ Active':'❌ Hidden'}</button></td>
                          <td><div style={{ display:'flex', gap:6 }}><button className="adm-btn adm-btn-green" onClick={() => openEditProduct(p)}>✏️ Edit</button><button className="adm-btn adm-btn-red" onClick={() => handleDeleteProduct(p.id)}>🗑️</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && <div style={{ padding:'40px 20px', textAlign:'center', color:'#888' }}>No products found</div>}
                </div>
              </div>
            )}

            {/* CATEGORIES */}
            {tab === 'categories' && (
              <div className="adm-card">
                <div className="adm-card-hdr">
                  <h2>🏷️ Categories ({categories.length})</h2>
                  <button className="adm-btn adm-btn-primary" onClick={() => { setCForm(EMPTY_CAT); setEditCId(null); setShowCF(true) }}>+ Add Category</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, padding:20 }}>
                  {categories.map(cat => (
                    <div key={cat.id} style={{ background:'#f9fdf9', borderRadius:14, padding:16, border:'1.5px solid #e8ede9', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:(cat.color||'#1e6641')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{cat.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{cat.name}</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Order: {cat.sort_order}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button className="adm-btn adm-btn-green" onClick={() => { setCForm(cat); setEditCId(cat.id); setShowCF(true) }}>✏️</button>
                        <button className="adm-btn adm-btn-red" onClick={() => handleDeleteCategory(cat.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEWS */}
            {tab === 'reviews' && (
              <div className="adm-card">
                <div className="adm-card-hdr"><h2>⭐ Reviews ({reviews.length})</h2><div style={{ fontSize:13, color:'#888' }}>{pendingReviews.length} pending</div></div>
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background:r.approved?'#f9fdf9':'#fffbf0', border:`1.5px solid ${r.approved?'#e8ede9':'#fde68a'}`, borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                        <div>
                          <span style={{ fontWeight:800, fontSize:14 }}>{r.user_name}</span>
                          <span style={{ color:'#f4a322', marginLeft:8, fontSize:14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{new Date(r.created_at||r.createdAt||Date.now()).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'})}</div>
                        </div>
                        <span style={{ background:r.approved?'#f0faf3':'#fff9ec', color:r.approved?'#1e6641':'#b45309', padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {r.approved?'✅ Published':'⏳ Pending'}
                        </span>
                      </div>
                      <p style={{ fontSize:13, color:'#444', lineHeight:1.65, margin:'10px 0' }}>{r.text}</p>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="adm-btn adm-btn-green" onClick={() => handleApproveReview(r.id, !r.approved)}>{r.approved?'Hide':'✅ Approve'}</button>
                        <button className="adm-btn adm-btn-red" onClick={() => handleDeleteReview(r.id)}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && <div style={{ textAlign:'center', padding:32, color:'#888' }}>No reviews yet</div>}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <div className={`adm-mobile-overlay${sidebarOpen?' on':''}`} onClick={() => setSidebarOpen(false)} />
      <div className={`adm-mobile-sidebar${sidebarOpen?' on':''}`}><SidebarContent /></div>

      {/* Product Modal */}
      {showPF && (
        <div className="modal-overlay" onClick={() => setShowPF(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPF(false)}>✕</button>
            <h3 style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:900, marginBottom:20 }}>{editPId?'✏️ Edit Product':'➕ New Product'}</h3>
            <div className="fm-row">
              <Field label="Product Name *"><input style={inp} value={pForm.name} onChange={e => setPForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Samba Rice" /></Field>
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
                <><Field label="Price per kg (Rs.) *"><input type="number" style={inp} value={pForm.price_per_kg} onChange={e => setPForm(f=>({...f,price_per_kg:e.target.value}))} placeholder="180" /></Field>
                  <Field label="Max weight (kg)"><input type="number" style={inp} value={pForm.max_weight} onChange={e => setPForm(f=>({...f,max_weight:e.target.value}))} placeholder="10" /></Field></>
              ) : (
                <><Field label="Price (Rs.) *"><input type="number" style={inp} value={pForm.price} onChange={e => setPForm(f=>({...f,price:e.target.value}))} placeholder="250" /></Field>
                  <Field label="Unit"><input style={inp} value={pForm.unit} onChange={e => setPForm(f=>({...f,unit:e.target.value}))} placeholder="pack / bottle" /></Field></>
              )}
            </div>
            <div className="fm-row">
              <Field label="Stock"><input type="number" style={inp} value={pForm.stock} onChange={e => setPForm(f=>({...f,stock:e.target.value}))} placeholder="99" /></Field>
              <Field label="Badge">
                <select style={inp} value={pForm.badge} onChange={e => setPForm(f=>({...f,badge:e.target.value}))}>
                  <option value="">None</option><option value="Hot">🔥 Hot</option><option value="New">✨ New</option><option value="Sale">🏷️ Sale</option>
                </select>
              </Field>
            </div>
            <Field label="Description"><textarea style={{...inp,resize:'none'}} value={pForm.description} onChange={e => setPForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Short description..." /></Field>
            <Field label="Product Image">
              <input type="file" accept="image/*" style={{ fontSize:13 }} onChange={async e => { const url = await uploadImage(e.target.files[0]); if(url) setPForm(f=>({...f,image_url:url})) }} />
              {uploading && (
                <div style={{ fontSize:12, color:'#1e6641', marginTop:6, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⏳</span>
                  Uploading image to Cloudinary...
                </div>
              )}
              {!uploading && pForm.image_url && (
                <div style={{ marginTop:8 }}>
                  <img src={pForm.image_url} alt="preview" style={{ height:70, borderRadius:8, objectFit:'cover', border:'2px solid #d8f3dc' }} />
                  <div style={{ fontSize:11, color:'#1e6641', marginTop:4, fontWeight:600 }}>✅ Image uploaded successfully</div>
                </div>
              )}
            </Field>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14, fontWeight:600 }}>
                <input type="checkbox" checked={pForm.active} onChange={e => setPForm(f=>({...f,active:e.target.checked}))} style={{ width:16, height:16 }} />
                Product is active (visible in shop)
              </label>
            </div>
            <button onClick={saveProduct} style={{ width:'100%', background:'#1e6641', color:'#fff', padding:14, borderRadius:12, fontWeight:800, fontSize:15, border:'none', cursor:'pointer', fontFamily:"'Nunito',sans-serif", opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⏳ Saving image... (you can still save)' : editPId ? '💾 Update Product' : '✅ Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCF && (
        <div className="modal-overlay" onClick={() => setShowCF(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
            <button className="modal-close" onClick={() => setShowCF(false)}>✕</button>
            <h3 style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:900, marginBottom:20 }}>
              {editCId ? '✏️ Edit Category' : '➕ New Category'}
            </h3>

            <Field label="Name *">
              <input style={inp} value={cForm.name} onChange={e => setCForm(f=>({...f, name:e.target.value}))} placeholder="e.g. Rice & Grains" />
            </Field>

            <Field label="Emoji">
              <input style={inp} value={cForm.emoji} onChange={e => setCForm(f=>({...f, emoji:e.target.value}))} placeholder="🌾" />
            </Field>

            <Field label="Category Color">
              {/* Quick color swatches */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8, marginBottom:12 }}>
                {[
                  '#1e6641','#2563eb','#dc2626','#7c3aed',
                  '#d97706','#0891b2','#db2777','#c49a2a',
                  '#16a34a','#ea580c','#4f46e5','#0d9488',
                  '#be123c','#854d0e','#1d4ed8','#6d28d9',
                ].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCForm(f => ({...f, color: c}))}
                    title={c}
                    style={{
                      width:'100%', aspectRatio:'1', borderRadius:8,
                      background: c, border: cForm.color === c ? '3px solid #111' : '2px solid transparent',
                      cursor:'pointer', transition:'transform .15s',
                      transform: cForm.color === c ? 'scale(1.15)' : 'scale(1)',
                      outline: cForm.color === c ? '2px solid #fff' : 'none',
                      outlineOffset: -4,
                    }}
                  />
                ))}
              </div>

              {/* Native color picker + current value display */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <label style={{
                  width:44, height:44, borderRadius:10, border:'2px solid #e8ede9',
                  background: cForm.color, cursor:'pointer', display:'block',
                  flexShrink:0, overflow:'hidden', position:'relative',
                }}>
                  <input
                    type="color"
                    value={cForm.color}
                    onChange={e => setCForm(f => ({...f, color: e.target.value}))}
                    style={{
                      position:'absolute', inset:0, width:'200%', height:'200%',
                      opacity:0, cursor:'pointer', border:'none', padding:0,
                    }}
                  />
                </label>
                <div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:2 }}>Or pick any custom color →</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#333' }}>{cForm.color}</div>
                </div>
                {/* Preview badge */}
                <div style={{
                  marginLeft:'auto', background: cForm.color + '22',
                  border: `2px solid ${cForm.color}`,
                  borderRadius:50, padding:'4px 14px',
                  fontSize:13, fontWeight:700, color: cForm.color,
                  whiteSpace:'nowrap',
                }}>
                  {cForm.emoji} {cForm.name || 'Preview'}
                </div>
              </div>
            </Field>

            <Field label="Sort Order">
              <input type="number" style={inp} value={cForm.sort_order} onChange={e => setCForm(f=>({...f, sort_order:e.target.value}))} placeholder="1" />
            </Field>

            <button onClick={saveCategory} style={{
              width:'100%', background:'#1e6641', color:'#fff',
              padding:13, borderRadius:12, fontWeight:800, fontSize:15,
              border:'none', cursor:'pointer', marginTop:6, fontFamily:"'Nunito',sans-serif",
            }}>
              {editCId ? '💾 Update Category' : '✅ Add Category'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}