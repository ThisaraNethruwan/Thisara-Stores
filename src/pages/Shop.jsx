import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db, fetchProducts, fetchCategories, cachedQuery, invalidateCache } from '../lib/firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import ProductCard from '../components/ProductCard'

const SORT_OPTIONS = [
  { value:'default',    label:'Default' },
  { value:'price-asc',  label:'Price: Low → High' },
  { value:'price-desc', label:'Price: High → Low' },
  { value:'name',       label:'Name A–Z' },
]

function SkeletonCard() {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', background:'#fff', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
      <div className="skeleton" style={{ height:160 }} />
      <div style={{ padding:'14px 16px 16px' }}>
        <div className="skeleton" style={{ height:11, width:'45%', marginBottom:10, borderRadius:6 }} />
        <div className="skeleton" style={{ height:17, width:'82%', marginBottom:8, borderRadius:6 }} />
        <div className="skeleton" style={{ height:11, width:'60%', marginBottom:14, borderRadius:6 }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="skeleton" style={{ height:22, width:'38%', borderRadius:6 }} />
          <div className="skeleton" style={{ height:36, width:36, borderRadius:'50%' }} />
        </div>
      </div>
    </div>
  )
}

export default function Shop() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [sort, setSort]             = useState('default')
  const [searchParams]              = useSearchParams()
  const [activeCat, setActiveCat]   = useState(searchParams.get('category') || 'All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dropOpen, setDropOpen]     = useState(false)
  const dropRef    = useRef(null)
  const searchRef  = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const c = searchParams.get('category')
    if (c) setActiveCat(c)
  }, [searchParams])

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const q = query(collection(db, 'products'), where('active', '==', true), orderBy('category'))
    const unsub = onSnapshot(q, (snap) => {
      if (!mountedRef.current) return
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProducts(prods)
      invalidateCache('products')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('sort_order'))
    const unsub = onSnapshot(q, (snap) => {
      if (!mountedRef.current) return
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setCategories([{ name:'All', emoji:'🛒' }, ...cats])
      invalidateCache('categories')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  async function loadAll() {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        cachedQuery('products', fetchProducts),
        cachedQuery('categories', fetchCategories),
      ])
      if (!mountedRef.current) return
      setProducts(prods || [])
      setCategories([{ name:'All', emoji:'🛒' }, ...(cats || [])])
    } catch (err) { console.error('Shop load error:', err) }
    if (mountedRef.current) setLoading(false)
  }

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const mc = activeCat === 'All' || p.category === activeCat
      const q  = search.toLowerCase()
      const ms = !q || p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)
      return mc && ms
    })
    if (sort === 'price-asc')  list = [...list].sort((a,b) => (a.price||a.price_per_kg||0)-(b.price||b.price_per_kg||0))
    if (sort === 'price-desc') list = [...list].sort((a,b) => (b.price||b.price_per_kg||0)-(a.price||a.price_per_kg||0))
    if (sort === 'name')       list = [...list].sort((a,b) => a.name.localeCompare(b.name))
    return list
  }, [products, activeCat, search, sort])

  const pickCat = useCallback((name) => {
    setActiveCat(name); setDrawerOpen(false); setDropOpen(false)
  }, [])

  const activeCatData = categories.find(c => c.name === activeCat)

  const CatList = () => (
    <>
      {categories.map((cat, i) => {
        const active = activeCat === cat.name
        return (
          <button key={i} onClick={() => pickCat(cat.name)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:12,
            padding:'12px 16px', borderRadius:12, border:'none',
            background: active ? 'linear-gradient(135deg,#f0faf3,#d8f3dc)' : 'transparent',
            color: active ? '#1e6641' : '#444',
            fontSize:14, fontWeight: active ? 700 : 500,
            cursor:'pointer', marginBottom:4,
            fontFamily:'Nunito,sans-serif', textAlign:'left', transition:'all .15s',
          }}>
            <span style={{ fontSize:20 }}>{cat.emoji}</span>
            <span style={{ flex:1 }}>{cat.name}</span>
            {active && <span style={{ background:'#1e6641', color:'#fff', width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>✓</span>}
          </button>
        )
      })}
    </>
  )

  return (
    <>
      <style>{`
        .sp { background:#f8faf8; min-height:100vh; }
        .sp-hdr { background:linear-gradient(135deg,#0f2d1c 0%,#1a3d28 40%,#1e6641 100%); padding:22px 28px 18px; position:sticky; top:64px; z-index:100; box-shadow:0 8px 32px rgba(0,0,0,.2); }
        .sp-hdr-row { display:flex; align-items:center; gap:14px; flex-wrap:nowrap; }
        .sp-title { font-family:'Fraunces',serif; font-size:clamp(20px,3vw,28px); font-weight:900; color:#fff; white-space:nowrap; flex-shrink:0; }
        .sp-search { flex:1; display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.2); border-radius:50px; padding:0 16px; transition:all .2s; min-width:0; }
        .sp-search:focus-within { background:rgba(255,255,255,.2); border-color:rgba(255,255,255,.5); }
        .sp-search input { flex:1; background:transparent; border:none; outline:none; padding:11px 4px; font-size:14px; color:#fff; font-family:'Nunito',sans-serif; min-width:0; }
        .sp-search input::placeholder { color:rgba(255,255,255,.55); }
        .sp-search-clear { background:rgba(255,255,255,.2); border:none; color:#fff; width:20px; height:20px; border-radius:50%; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .sp-cat-btn { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.15); border:1.5px solid rgba(255,255,255,.25); border-radius:50px; padding:10px 18px; color:#fff; font-weight:700; font-size:14px; cursor:pointer; font-family:'Nunito',sans-serif; white-space:nowrap; flex-shrink:0; transition:all .2s; }
        .sp-cat-btn:hover,.sp-cat-btn.open { background:rgba(255,255,255,.25); }
        .sp-cat-arrow { font-size:10px; transition:transform .25s; display:inline-block; }
        .sp-cat-arrow.open { transform:rotate(180deg); }
        .sp-cat-menu { position:absolute; top:calc(100% + 10px); right:0; background:#fff; border-radius:18px; box-shadow:0 16px 48px rgba(0,0,0,.18); min-width:240px; z-index:999; overflow:hidden; animation:dropIn .18s ease; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .sp-cat-menu-inner { padding:8px; max-height:360px; overflow-y:auto; }

        /* ── Hide the category dropdown on mobile ── */
        .sp-cat-dropdown-wrap { display:flex; }
        @media(max-width:900px) { .sp-cat-dropdown-wrap { display:none !important; } }

        .sp-body { max-width:1440px; margin:0 auto; padding:28px 28px 100px; }
        .sp-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; gap:12px; flex-wrap:wrap; }
        .sp-count { font-size:15px; color:#333; font-weight:700; }
        .sp-badge { display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,#f0faf3,#d8f3dc); color:#1e6641; padding:4px 12px; border-radius:50px; font-size:13px; font-weight:700; border:1.5px solid #b7e4c7; margin-left:10px; }
        .sp-badge-clear { background:none; border:none; color:#1e6641; cursor:pointer; font-weight:900; font-size:13px; padding:0 2px; }
        .sp-sort-wrap { display:flex; align-items:center; gap:8px; }
        .sp-sort-wrap label { font-size:13px; color:#888; font-weight:600; }
        .sp-sort-select { border:2px solid #e8ede9; border-radius:10px; padding:8px 14px; font-size:13px; background:#fff; font-family:'Nunito',sans-serif; cursor:pointer; outline:none; font-weight:600; color:#333; transition:border-color .2s; }
        .sp-sort-select:focus { border-color:#52b788; }
        .sp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:20px; }
        .sp-empty { text-align:center; padding:80px 20px; background:#fff; border-radius:24px; box-shadow:0 2px 16px rgba(0,0,0,.06); }
        .sp-fab { display:none; position:fixed; bottom:24px; right:20px; z-index:90; background:linear-gradient(135deg,#1a3d28,#1e6641); color:#fff; width:56px; height:56px; border-radius:50%; border:none; font-size:22px; cursor:pointer; box-shadow:0 6px 24px rgba(30,102,65,.4); align-items:center; justify-content:center; }
        .sp-overlay { display:none; position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,.5); }
        .sp-overlay.on { display:block; }
        .sp-drawer { position:fixed; top:0; left:0; bottom:0; width:280px; background:#fff; z-index:2001; display:flex; flex-direction:column; transform:translateX(-100%); transition:transform .28s cubic-bezier(.4,0,.2,1); }
        .sp-drawer.on { transform:translateX(0); }
        .sp-drawer-hdr { background:linear-gradient(135deg,#1a3d28,#1e6641); padding:20px 18px; display:flex; justify-content:space-between; align-items:center; }
        .sp-drawer-hdr h3 { font-family:'Fraunces',serif; font-size:18px; color:#fff; margin:0; }
        .sp-drawer-close { background:rgba(255,255,255,.2); border:none; color:#fff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:14px; }
        .sp-drawer-body { flex:1; overflow-y:auto; padding:12px; }
        @media(max-width:900px) {
          .sp-hdr { padding:16px 16px 14px; }
          .sp-body { padding:16px 14px 100px; }
          .sp-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
          .sp-fab { display:flex; }
        }
        @media(max-width:480px) { .sp-grid { gap:10px; } .sp-body { padding:12px 10px 100px; } }
      `}</style>

      <main className="sp">
        <div className="sp-hdr">
          <div className="sp-hdr-row">
            <div className="sp-title">🛒 Shop</div>

            <div className="sp-search">
              <span style={{ color:'rgba(255,255,255,.65)', fontSize:15 }}>🔍</span>
              <input
                ref={searchRef}
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="sp-search-clear" onClick={() => { setSearch(''); searchRef.current?.focus() }}>✕</button>
              )}
            </div>

            {/* Category dropdown — hidden on mobile via CSS */}
            <div className="sp-cat-dropdown-wrap" style={{ position:'relative', flexShrink:0 }} ref={dropRef}>
              <button type="button" className={`sp-cat-btn${dropOpen?' open':''}`} onClick={() => setDropOpen(o => !o)}>
                <span style={{ fontSize:16 }}>{activeCatData?.emoji || '🛒'}</span>
                <span>{activeCat}</span>
                <span className={`sp-cat-arrow${dropOpen?' open':''}`}>▼</span>
              </button>
              {dropOpen && (
                <div className="sp-cat-menu">
                  <div style={{ padding:'12px 16px 8px', borderBottom:'1px solid #f0faf3' }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'#1e6641', letterSpacing:1, textTransform:'uppercase' }}>Filter by Category</div>
                  </div>
                  <div className="sp-cat-menu-inner"><CatList /></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sp-body">
          <div className="sp-toolbar">
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div className="sp-count">
                {loading ? '⏳ Loading...' : <>{filtered.length} <span style={{ color:'#888', fontWeight:500 }}>product{filtered.length!==1?'s':''}</span></>}
              </div>
              {activeCat !== 'All' && !loading && (
                <div className="sp-badge">
                  {activeCatData?.emoji} {activeCat}
                  <button className="sp-badge-clear" onClick={() => setActiveCat('All')}>✕</button>
                </div>
              )}
              {search && !loading && (
                <div className="sp-badge" style={{ background:'linear-gradient(135deg,#eff6ff,#dbeafe)', color:'#1d4ed8', borderColor:'#bfdbfe' }}>
                  🔍 "{search}"
                  <button className="sp-badge-clear" style={{ color:'#1d4ed8' }} onClick={() => setSearch('')}>✕</button>
                </div>
              )}
            </div>
            <div className="sp-sort-wrap">
              <label>Sort by:</label>
              <select className="sp-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="sp-grid">{Array.from({length:10}).map((_,i) => <SkeletonCard key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="sp-empty">
              <div style={{ fontSize:72, marginBottom:16 }}>🔍</div>
              <h3 style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:900, marginBottom:10, color:'#1e6641' }}>No products found</h3>
              <p style={{ color:'#888', marginBottom:24, fontSize:15 }}>Try a different search or category</p>
              <button onClick={() => { setSearch(''); setActiveCat('All') }}
                style={{ background:'linear-gradient(135deg,#1a3d28,#1e6641)', color:'#fff', padding:'12px 28px', borderRadius:50, fontWeight:700, border:'none', cursor:'pointer', fontSize:14 }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="sp-grid">{filtered.map(p => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </main>

      <button className="sp-fab" onClick={() => setDrawerOpen(true)}>🏷️</button>
      <div className={`sp-overlay${drawerOpen?' on':''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`sp-drawer${drawerOpen?' on':''}`}>
        <div className="sp-drawer-hdr">
          <h3>🏷️ Categories</h3>
          <button className="sp-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <div className="sp-drawer-body"><CatList /></div>
      </div>
    </>
  )
}
