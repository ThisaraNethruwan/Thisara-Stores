import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { db, fetchCategories, fetchApprovedReviews, invalidateCache, cachedQuery } from '../lib/firebase'
import { onSnapshot, collection, query, where } from 'firebase/firestore'
import ReviewModal from '../components/ReviewModal'
import { SHOP_NAME, SHOP_AREA, HERO_IMAGE_URL } from '../utils/constants'

const FEATURES = [
  { icon:'🚚', title:'Fast Delivery',   desc:'Same-day delivery to Ragama, Kandana, Ja-Ela, Wattala and nearby areas.' },
  { icon:'🌿', title:'100% Fresh',      desc:'All products freshly sourced daily. Quality guaranteed or money back.' },
  { icon:'⚖️', title:'Custom Weights', desc:'Order rice, spices and more in exactly the amount you need — 250g to 10kg.' },
  { icon:'💰', title:'Best Prices',     desc:'Honest, competitive prices. No hidden charges. Save more online.' },
]

const STEPS = [
  { n:'1', icon:'🔍', t:'Browse & Choose',   d:'Browse our wide selection of fresh groceries.' },
  { n:'2', icon:'🛒', t:'Add to Cart',       d:'Add items. For rice & spices, pick your exact weight.' },
  { n:'3', icon:'📍', t:'Set Your Location', d:'Pin your delivery location on the map for exact fee.' },
  { n:'4', icon:'🚚', t:'We Deliver!',       d:'We confirm by call and deliver fresh groceries to your door!' },
]

function ReviewCarousel({ reviews, onWriteReview }) {
  const [current, setCurrent] = useState(0)
  const [perPage, setPerPage] = useState(3)
  const autoRef = useRef(null)

  useEffect(() => {
    const update = () => setPerPage(window.innerWidth < 640 ? 1 : window.innerWidth < 960 ? 2 : 3)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => { setCurrent(0) }, [reviews.length, perPage])

  useEffect(() => {
    if (reviews.length <= perPage) return
    autoRef.current = setInterval(() => {
      setCurrent(c => {
        const max = Math.ceil(reviews.length / perPage) - 1
        return c >= max ? 0 : c + 1
      })
    }, 5000)
    return () => clearInterval(autoRef.current)
  }, [reviews.length, perPage])

  const totalPages = Math.ceil(reviews.length / perPage)
  const startIdx   = current * perPage
  const visible    = reviews.slice(startIdx, startIdx + perPage)

  const prev = () => { clearInterval(autoRef.current); setCurrent(c => c <= 0 ? totalPages - 1 : c - 1) }
  const next = () => { clearInterval(autoRef.current); setCurrent(c => c >= totalPages - 1 ? 0 : c + 1) }

  if (reviews.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px' }}>
      <div style={{ fontSize:52, marginBottom:14 }}>⭐</div>
      <p style={{ fontSize:16, color:'#888', marginBottom:20 }}>No reviews yet. Be the first!</p>
      <button className="h-review-btn" onClick={onWriteReview}>✍️ Write First Review</button>
    </div>
  )

  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${perPage}, 1fr)`, gap:18, minHeight:200 }}>
        {visible.map((r, i) => (
          <div key={r.id || i} className="h-review-card">
            <div style={{ color:'#f4a322', fontSize:20, marginBottom:10, letterSpacing:2 }}>
              {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
            </div>
            <p style={{ fontSize:14, color:'#444', lineHeight:1.78, fontStyle:'italic', marginBottom:18, flex:1 }}>
              "{r.text}"
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#1e6641,#52b788)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces,serif', fontSize:16, fontWeight:900, flexShrink:0 }}>
                {(r.user_name || 'C')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:14 }}>{r.user_name}</div>
                <div style={{ fontSize:11, color:'#999' }}>
                  {new Date(r.createdAt).toLocaleDateString('en-LK', { year:'numeric', month:'short', day:'numeric' })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginTop:28 }}>
            <button onClick={prev} className="h-carousel-btn" aria-label="Previous">←</button>
            <div style={{ display:'flex', gap:8 }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => { clearInterval(autoRef.current); setCurrent(i) }}
                  style={{ width: i === current ? 24 : 8, height:8, borderRadius:50, border:'none', cursor:'pointer', background: i === current ? '#1e6641' : '#d8f3dc', transition:'all .3s', padding:0 }} />
              ))}
            </div>
            <button onClick={next} className="h-carousel-btn" aria-label="Next">→</button>
          </div>
          <div style={{ textAlign:'center', marginTop:10, fontSize:12, color:'#aaa' }}>{current + 1} / {totalPages}</div>
        </>
      )}
    </div>
  )
}

export default function Home() {
  const [searchParams]              = useSearchParams()
  const [reviews, setReviews]       = useState([])
  const [categories, setCategories] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadCategories()
    loadReviews()
    if (searchParams.get('openReview') === '1') setTimeout(() => setShowReview(true), 400)
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('approved', '==', true))
    const unsub = onSnapshot(q,
      (snap) => {
        if (!mountedRef.current) return
        const data = snap.docs.map(d => { const r = d.data(); return { id:d.id, ...r, createdAt: r.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() } })
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,9)
        setReviews(data)
      },
      (err) => { console.error('Reviews listener error:', err); loadReviews() }
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'categories'))
    const unsub = onSnapshot(q, (snap) => {
      if (!mountedRef.current) return
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (a.sort_order||0)-(b.sort_order||0))
      setCategories(data.length > 0 ? data : [])
      invalidateCache('categories')
    })
    return () => unsub()
  }, [])

  async function loadCategories() {
    try {
      const data = await cachedQuery('categories', fetchCategories)
      if (mountedRef.current && categories === null) setCategories(data || [])
    } catch { if (mountedRef.current) setCategories([]) }
  }

  async function loadReviews() {
    try { const data = await fetchApprovedReviews(); if (mountedRef.current) setReviews(data || []) } catch {}
  }

  return (
    <>
      <style>{`
        /* ── FREE DELIVERY FLOATING TAG ── */
        .h-fd-tag {
          position: absolute;
          top: 40px;
          right: 10px;
          z-index: 10;
          animation: fdFloat 3s ease-in-out infinite;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,.4));
          cursor: default;
          transform-origin: top right;
        }
        @keyframes fdFloat {
          0%,100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-10px) rotate(2deg); }
        }
        .h-fd-tag-inner {
          background: linear-gradient(135deg, #f4a322 0%, #f59e0b 60%, #fbbf24 100%);
          border-radius: 18px 18px 18px 4px;
          padding: 14px 18px 14px 16px;
          position: relative;
          min-width: 180px;
          box-shadow:
            0 4px 0 #c47d0e,
            0 8px 32px rgba(244,163,34,.5),
            inset 0 1px 0 rgba(255,255,255,.4);
          border: 2px solid rgba(255,255,255,.35);
        }
        .h-fd-tag-inner::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 0;
          width: 0; height: 0;
          border-left: 10px solid #c47d0e;
          border-right: 0 solid transparent;
          border-top: 10px solid #c47d0e;
        }
        .h-fd-tag-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 5px;
        }
        .h-fd-tag-truck {
          font-size: 22px;
          animation: truckRide 1s linear infinite;
          display: inline-block;
        }
        @keyframes truckRide {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(2px) translateY(-1px); }
          75%      { transform: translateX(-1px) translateY(1px); }
        }
        .h-fd-tag-title {
          font-family: 'Fraunces', serif;
          font-size: 17px;
          font-weight: 900;
          color: #111;
          line-height: 1;
          letter-spacing: -0.3px;
        }
        .h-fd-tag-sub {
          font-family: 'Nunito', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #7c2d12;
          line-height: 1.3;
          margin-bottom: 8px;
        }
        .h-fd-tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #111;
          color: #f4a322;
          font-size: 10px;
          font-weight: 900;
          padding: 3px 10px;
          border-radius: 50px;
          font-family: 'Nunito', sans-serif;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .h-fd-sparkle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,.9);
          animation: sparklePop 2s ease-in-out infinite;
        }
        .h-fd-sparkle-1 { width:6px; height:6px; top:-4px; right:24px; animation-delay:0s; }
        .h-fd-sparkle-2 { width:4px; height:4px; top:4px; right:8px; animation-delay:.4s; }
        .h-fd-sparkle-3 { width:5px; height:5px; top:-6px; right:52px; animation-delay:.8s; }
        @keyframes sparklePop {
          0%,100% { transform:scale(0); opacity:0; }
          50%      { transform:scale(1); opacity:1; }
        }

        /* ── DELIVERY NOTICE BANNER ── */
        .h-delivery-notice {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          border-radius: 20px;
          padding: 22px 24px;
          margin: 28px 0 0;
          border: 1.5px solid rgba(255,255,255,0.15);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
          position: relative;
          overflow: hidden;
        }
        .h-delivery-notice::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #f4a322, #e63946, #f4a322);
          background-size: 200% 100%;
          animation: shimmerBar 3s linear infinite;
        }
        @keyframes shimmerBar {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .h-delivery-notice-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .h-delivery-notice-title-icon {
          font-size: 20px;
          animation: bellShake 2.5s ease-in-out infinite;
          display: inline-block;
        }
        @keyframes bellShake {
          0%,90%,100% { transform: rotate(0deg); }
          92% { transform: rotate(-12deg); }
          94% { transform: rotate(12deg); }
          96% { transform: rotate(-8deg); }
          98% { transform: rotate(8deg); }
        }
        .h-delivery-notice-title span {
          font-family: 'Fraunces', serif;
          font-size: 15px;
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .h-delivery-notice-title .badge {
          background: #e63946;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 50px;
          letter-spacing: 0.6px;
          font-family: 'Nunito', sans-serif;
          animation: pulseBadge 2s ease-in-out infinite;
        }
        @keyframes pulseBadge {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
        .h-delivery-rules {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .h-delivery-rule-card {
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border: 1.5px solid rgba(255,255,255,0.12);
          transition: transform 0.2s;
        }
        .h-delivery-rule-card:hover { transform: translateY(-1px); }
        .h-delivery-rule-card.tuesday {
          background: rgba(230, 57, 70, 0.18);
          border-color: rgba(230, 57, 70, 0.4);
        }
        .h-delivery-rule-card.timing {
          background: rgba(244, 163, 34, 0.18);
          border-color: rgba(244, 163, 34, 0.4);
        }
        .h-delivery-rule-icon {
          font-size: 28px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .h-delivery-rule-content {}
        .h-delivery-rule-label {
          font-family: 'Nunito', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .h-delivery-rule-card.tuesday .h-delivery-rule-label { color: #ff8a95; }
        .h-delivery-rule-card.timing .h-delivery-rule-label { color: #fcd34d; }
        .h-delivery-rule-title {
          font-family: 'Fraunces', serif;
          font-size: 15px;
          font-weight: 900;
          color: #fff;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        .h-delivery-rule-desc {
          font-family: 'Nunito', sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.5;
        }
        .h-delivery-rule-card.tuesday .h-delivery-rule-desc { color: rgba(255,180,185,0.9); }
        .h-delivery-rule-card.timing .h-delivery-rule-desc { color: rgba(253,220,150,0.9); }

        /* ── HERO ── */
        .h-hero { background:linear-gradient(135deg,#0f2d1c 0%,#1a3d28 40%,#1e6641 100%); position:relative; overflow:hidden; }
        .h-hero-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 65% 45%, rgba(82,183,136,.25) 0%, transparent 60%); }
        .h-hero-inner { max-width:1160px; margin:0 auto; padding:64px 20px 0; position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:center; min-height:82vh; padding-bottom:0; }
        .h-hero-text { display:flex; flex-direction:column; align-items:flex-start; }
        .h-hero-badge { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,.18); backdrop-filter:blur(8px); color:#fff; padding:8px 18px; border-radius:50px; font-size:13px; font-weight:700; margin-bottom:20px; border:1px solid rgba(255,255,255,.3); }
        .h-hero-title { font-family:'Fraunces',serif; font-weight:900; color:#fff; line-height:1.08; margin-bottom:18px; font-size:clamp(38px,5.5vw,64px); }
        .h-hero-desc { font-size:16px; color:rgba(255,255,255,.85); line-height:1.78; margin-bottom:28px; max-width:440px; }
        .h-hero-btns { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:32px; }
        .h-btn-white { background:#fff; color:#1e6641; padding:13px 28px; border-radius:50px; font-weight:800; font-size:15px; box-shadow:0 4px 20px rgba(0,0,0,.18); display:inline-block; white-space:nowrap; transition:transform .2s; }
        .h-btn-white:hover { transform:translateY(-2px); }
        .h-btn-ghost { background:rgba(255,255,255,.15); color:#fff; padding:13px 28px; border-radius:50px; font-weight:700; font-size:15px; border:2px solid rgba(255,255,255,.45); display:inline-block; white-space:nowrap; transition:all .2s; }
        .h-btn-ghost:hover { background:rgba(255,255,255,.25); }
        .h-trust { display:flex; gap:24px; flex-wrap:wrap; }
        .h-trust-n { font-family:'Fraunces',serif; font-size:22px; font-weight:900; color:#fff; }
        .h-trust-l { font-size:11px; color:rgba(255,255,255,.7); }
        .h-hero-img-col { display:flex; justify-content:center; align-items:flex-end; position:relative; }
        .h-hero-img-col img { width:100%; max-width:480px; object-fit:contain; }
        .h-hero-img-mobile { display:none; width:100%; max-width:300px; margin:24px auto 0; }
        .h-hero-img-mobile img { width:100%; }
        .h-hero-wave { width:100%; height:44px; display:block; }

        /* ── GENERAL ── */
        .h-wrap { max-width:1160px; margin:0 auto; padding:0 20px; }
        .h-center { text-align:center; margin-bottom:36px; }
        .h-pill { display:inline-block; background:#d8f3dc; color:#1e6641; padding:6px 18px; border-radius:50px; font-size:13px; font-weight:700; margin-bottom:10px; }
        .h-heading { font-family:'Fraunces',serif; font-size:clamp(22px,4vw,38px); font-weight:900; color:#111; }

        /* ── CATEGORIES ── */
        .h-cats { padding:60px 0 52px; }
        .h-cats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:14px; }
        .h-cat-card { background:#fff; border-radius:16px; padding:18px 10px; display:flex; flex-direction:column; align-items:center; gap:10px; box-shadow:0 2px 12px rgba(0,0,0,.06); transition:transform .2s,box-shadow .2s; text-decoration:none; }
        .h-cat-card:hover { transform:translateY(-3px); box-shadow:0 8px 22px rgba(0,0,0,.12); }
        .h-cat-icon { width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; }
        .h-cat-name { font-weight:700; font-size:12px; color:#222; text-align:center; line-height:1.35; }

        /* ── FEATURES ── */
        .h-features { padding:60px 0; background:linear-gradient(135deg,#1a3d28,#2d8653); }
        .h-feat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
        .h-feat-card { background:rgba(255,255,255,.12); backdrop-filter:blur(8px); border-radius:18px; padding:24px 18px; border:1px solid rgba(255,255,255,.2); transition:transform .2s; }
        .h-feat-card:hover { transform:translateY(-2px); }
        .h-feat-icon { font-size:36px; margin-bottom:14px; }
        .h-feat-title { font-family:'Fraunces',serif; font-size:17px; font-weight:900; color:#fff; margin-bottom:8px; }
        .h-feat-desc { font-size:13px; color:rgba(255,255,255,.8); line-height:1.7; }

        /* ── STEPS ── */
        .h-steps { padding:72px 0; background:#fff; }
        .h-steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; position:relative; }
        .h-step-card { background:#f9fdf9; border-radius:20px; padding:28px 20px; text-align:center; border:2px solid #e8ede9; position:relative; transition:transform .2s,box-shadow .2s; }
        .h-step-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .h-step-n { position:absolute; top:-14px; left:50%; transform:translateX(-50%); background:#1e6641; color:#fff; width:28px; height:28px; border-radius:50%; font-family:'Fraunces',serif; font-size:14px; font-weight:900; display:flex; align-items:center; justify-content:center; }
        .h-step-icon { font-size:36px; margin-bottom:12px; }
        .h-step-title { font-family:'Fraunces',serif; font-size:15px; font-weight:900; margin-bottom:8px; }
        .h-step-desc { font-size:13px; color:#666; line-height:1.65; }
        .h-step-arr { position:absolute; right:-14px; top:50%; transform:translateY(-50%); font-size:20px; color:#d8f3dc; z-index:1; }

        /* ── REVIEWS ── */
        .h-reviews { padding:72px 0; background:#fffbf0; }
        .h-reviews-hdr { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:32px; flex-wrap:wrap; gap:16px; }
        .h-review-btn { background:#1e6641; color:#fff; padding:11px 24px; border-radius:50px; font-weight:700; font-size:14px; border:none; cursor:pointer; font-family:'Nunito',sans-serif; transition:background .2s; }
        .h-review-btn:hover { background:#2d8653; }
        .h-review-card { background:#fff; border-radius:16px; padding:22px; box-shadow:0 2px 14px rgba(0,0,0,.06); border:1.5px solid #f0f0f0; transition:transform .2s; display:flex; flex-direction:column; }
        .h-review-card:hover { transform:translateY(-2px); }
        .h-carousel-btn { width:40px; height:40px; border-radius:50%; border:2px solid #1e6641; background:#fff; color:#1e6641; font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
        .h-carousel-btn:hover { background:#1e6641; color:#fff; }

        /* ── CTA ── */
        .h-cta { padding:80px 0; background:linear-gradient(135deg,#f0faf3,#fffbf0); }
        .h-cta-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-top:28px; }

        /* ── RESPONSIVE ── */
        @media(max-width:900px) {
          .h-hero-inner { grid-template-columns:1fr; padding-top:48px; min-height:auto; padding-bottom:32px; text-align:center; }
          .h-hero-text { align-items:center; }
          .h-hero-desc { margin-left:auto; margin-right:auto; text-align:center; }
          .h-hero-btns { justify-content:center; }
          .h-trust { justify-content:center; }
          .h-hero-img-col { display:none; }
          .h-hero-img-mobile { display:block; }
          .h-feat-grid { grid-template-columns:repeat(2,1fr); }
          .h-steps-grid { grid-template-columns:repeat(2,1fr); }
          .h-step-arr { display:none; }
          .h-reviews-hdr { flex-direction:column; align-items:center; text-align:center; }
          .h-delivery-rules { grid-template-columns: 1fr; }
        }
        @media(max-width:640px) {
          .h-cats-grid { grid-template-columns:repeat(3,1fr); }
          .h-btn-white, .h-btn-ghost { padding:10px 20px; font-size:13px; }
          .h-fd-tag { display: none; }
          .h-delivery-notice { padding: 16px; }
          .h-delivery-rule-card { padding: 12px 14px; }
          .h-delivery-rule-title { font-size: 14px; }
        }
        @media(max-width:480px) {
          .h-feat-grid { grid-template-columns:1fr 1fr; }
          .h-steps-grid { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      <main>
        {/* ── HERO ── */}
        <section className="h-hero">
          <div className="h-hero-glow" />
          <div className="h-hero-inner">
            <div className="h-hero-text">
              <div className="h-hero-badge fade-up"> {SHOP_NAME} — {SHOP_AREA}</div>
              <h1 className="h-hero-title fade-up-2">
                Neighbourhood<br />
                Grocery Store,<br />
                <span style={{ color:'#f4a322' }}>Now at Your Door</span>
              </h1>
              <p className="h-hero-desc fade-up-3">
                Rice, spices, vegetables and all daily essentials delivered fresh to your door across {SHOP_AREA} and nearby areas.
              </p>
              <div className="h-hero-btns fade-up-4">
                <Link to="/shop" className="h-btn-white">🛒 Shop Now →</Link>
                <a href="tel:0707779453" className="h-btn-ghost">📞 Call Us</a>
              </div>
              <div className="h-trust fade-up-4">
                {[['100+','Products'],['500+','Orders'],['4.2★','Rating']].map(([n,l]) => (
                  <div key={l}><div className="h-trust-n">{n}</div><div className="h-trust-l">{l}</div></div>
                ))}
              </div>

              {/* Mobile free delivery tag */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'linear-gradient(135deg,#f4a322,#f59e0b)',
                borderRadius:50, padding:'6px 18px',
                border:'2px solid rgba(0, 0, 0, 0.46)',
                marginBottom:8, marginTop:20,
                animation:'fdFloat 3s ease-in-out infinite',
              }}>
                <span style={{ fontSize:18, animation:'truckRide 1s linear infinite', display:'inline-block' }}>🚚</span>
                <div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:13, fontWeight:900, color:'#111', lineHeight:1 }}>FREE DELIVERY</div>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:11, fontWeight:700, color:'#7c2d12' }}>Orders over Rs. 10,000</div>
                </div>
                <span style={{ fontSize:14 }}>🎉</span>
              </div>


              <div className="h-hero-img-mobile">
                {HERO_IMAGE_URL && <img src={HERO_IMAGE_URL} alt="Fresh groceries delivery" loading="lazy" />}
              </div>
            </div>
            <div className="h-hero-img-col">
              {HERO_IMAGE_URL && <img src={HERO_IMAGE_URL} alt="Fresh groceries delivery" loading="eager" />}
            </div>
          </div>
          <svg className="h-hero-wave" viewBox="0 0 1440 44" preserveAspectRatio="none">
            <path d="M0,28 C480,0 960,44 1440,16 L1440,44 L0,44Z" fill="#fffbf0"/>
          </svg>
        </section>

        {/* ── CATEGORIES ── */}
        {categories !== null && categories.length > 0 && (
          <section className="h-cats">
            <div className="h-wrap">
              <div className="h-center">
                <div className="h-pill">Browse by Category</div>
                <h2 className="h-heading">What Are You Looking For?</h2>
              </div>
              <div className="h-cats-grid">
                {categories.map((cat,i) => (
                  <Link key={cat.id||i} to={`/shop?category=${encodeURIComponent(cat.name)}`} className="h-cat-card">
                    <div className="h-cat-icon" style={{ background:(cat.color||'#1e6641')+'22' }}><span>{cat.emoji}</span></div>
                    <span className="h-cat-name">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── FEATURES ── */}
        <section className="h-features">
          <div className="h-wrap">
            <div className="h-center">
              <div className="h-pill" style={{ background:'rgba(255,255,255,.2)', color:'#fff' }}>Why Choose Us</div>
              <h2 className="h-heading" style={{ color:'#fff' }}>We're Different From the Rest</h2>
            </div>
            <div className="h-feat-grid">
              {FEATURES.map((f,i) => (
                <div key={i} className="h-feat-card">
                  <div className="h-feat-icon">{f.icon}</div>
                  <h3 className="h-feat-title">{f.title}</h3>
                  <p className="h-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="h-steps">
          <div className="h-wrap">
            <div className="h-center">
              <div className="h-pill">Simple Process</div>
              <h2 className="h-heading">How to Order</h2>
            </div>
            <div className="h-steps-grid">
              {STEPS.map((step,i) => (
                <div key={i} className="h-step-card">
                  <div className="h-step-n">{step.n}</div>
                  <div className="h-step-icon">{step.icon}</div>
                  <h3 className="h-step-title">{step.t}</h3>
                  <p className="h-step-desc">{step.d}</p>
                  {i < 3 && <span className="h-step-arr">→</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REVIEWS ── */}
        <section className="h-reviews">
          <div className="h-wrap">
            <div className="h-reviews-hdr">
              <div>
                <div className="h-pill">Customer Reviews</div>
                <h2 className="h-heading" style={{ marginTop:8 }}>What Our Customers Say</h2>
              </div>
              <button className="h-review-btn" onClick={() => setShowReview(true)}>✍️ Write a Review</button>
            </div>
            <ReviewCarousel reviews={reviews} onWriteReview={() => setShowReview(true)} />
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="h-cta">
          <div className="h-wrap" style={{ textAlign:'center' }}>
            <h2 style={{ fontFamily:'Fraunces,serif', fontSize:'clamp(24px,5vw,46px)', fontWeight:900, color:'#111', marginBottom:12 }}>
              Ready for Fresh Groceries?
            </h2>
            <p style={{ color:'#555', fontSize:16 }}>Browse our products and get them delivered to your doorstep today.</p>
            <div className="h-cta-btns">
              <Link to="/shop" style={{ background:'#1e6641', color:'#fff', padding:'13px 30px', borderRadius:50, fontWeight:800, fontSize:15, display:'inline-block' }}>🛒 Start Shopping</Link>
              <a href="tel:0707779453" style={{ background:'rgba(30,102,65,.1)', color:'#1e6641', padding:'13px 30px', borderRadius:50, fontWeight:700, fontSize:15, border:'2px solid #1e6641', display:'inline-block' }}>📞 Call 0707779453</a>
            </div>
          </div>
        </section>

        {showReview && <ReviewModal onClose={() => setShowReview(false)} onSubmitted={loadReviews} />}
      </main>
    </>
  )
}
