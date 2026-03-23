import { useState } from 'react'
import { useCart } from './CartContext'
import toast from 'react-hot-toast'
import { WEIGHT_OPTIONS } from '../utils/constants'

const CAT_COLORS = {
  'Rice & Grains':'linear-gradient(135deg,#f5e6b0,#e8d070)',
  'Vegetables & Fruits':'linear-gradient(135deg,#b7f5c4,#52c47a)',
  'Drinks & Beverages':'linear-gradient(135deg,#bfdbfe,#60a5fa)',
  'Spices & Dry Food':'linear-gradient(135deg,#fecaca,#f87171)',
  'Dairy & Eggs':'linear-gradient(135deg,#ede9fe,#a78bfa)',
  'Snacks & Biscuits':'linear-gradient(135deg,#fef3c7,#fbbf24)',
  'Household & Cleaning':'linear-gradient(135deg,#cffafe,#22d3ee)',
  'Personal Care':'linear-gradient(135deg,#fce7f3,#f472b6)',
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [imgErr, setImgErr] = useState(false)
  const [added, setAdded] = useState(false)

  const bg = CAT_COLORS[product.category] || 'linear-gradient(135deg,#d8f3dc,#b7e4c7)'
  const isWeight = product.is_weight_based
  const available = WEIGHT_OPTIONS.filter(w => !product.max_weight || w.value <= product.max_weight)

  const handleAdd = () => {
    if (product.stock === 0) return
    if (isWeight) { setShowModal(true) }
    else { doAdd() }
  }

  const doAdd = (wOpt = null) => {
    addToCart(product, wOpt)
    setAdded(true)
    setShowModal(false)
    setSelected(null)
    toast.success(`${product.name} added! 🛒`)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <>
      <div className="product-card" style={{
        background:'#fff', borderRadius:16, overflow:'hidden',
        boxShadow:'0 2px 16px rgba(0,0,0,.07)',
        transition:'transform .25s, box-shadow .25s',
        display:'flex', flexDirection:'column',
      }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,.13)' }}
        onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 16px rgba(0,0,0,.07)' }}
      >
        {/* Image area */}
        <div style={{ position:'relative', height:150, overflow:'hidden', flexShrink:0, background:bg }}>
          {product.image_url && !imgErr ? (
            <img src={product.image_url} alt={product.name}
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={() => setImgErr(true)} loading="lazy" />
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:52 }}>{product.category_emoji || '🛒'}</span>
            </div>
          )}
          {/* overlay */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.15),transparent)' }} />
          {/* badges */}
          <div style={{ position:'absolute', top:8, left:8, display:'flex', gap:5, flexWrap:'wrap' }}>
            {product.badge && (
              <span className="product-badge" style={{ background: product.badge==='Sale'?'#e63946': product.badge==='Hot'?'#f97316':'#1e6641' }}>
                {product.badge==='Sale'?'🏷️':product.badge==='Hot'?'🔥':'✨'} {product.badge}
              </span>
            )}
            {isWeight && <span className="product-badge" style={{ background:'#7c3aed' }}>⚖️ Weight</span>}
          </div>
          {product.stock === 0 && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14, letterSpacing:1 }}>
              OUT OF STOCK
            </div>
          )}
          {product.stock > 0 && product.stock < 5 && (
            <div style={{ position:'absolute', bottom:8, right:8, background:'#f4a322', color:'#111', fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:50 }}>
              Only {product.stock} left!
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding:'12px 14px 14px', display:'flex', flexDirection:'column', flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#2d8653', background:'#f0faf3', display:'inline-block', padding:'2px 8px', borderRadius:50, marginBottom:6 }}>
            {product.category_emoji} {product.category}
          </div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:'#111', marginBottom:4, lineHeight:1.3 }}>{product.name}</div>
          {product.description && <div style={{ fontSize:11, color:'#888', flex:1, lineHeight:1.5, marginBottom:8 }}>{product.description.slice(0,60)}{product.description.length>60?'…':''}</div>}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'auto', paddingTop:8 }}>
            <div>
              {isWeight ? (
                <><div style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:900, color:'#1e6641' }}>Rs. {Number(product.price_per_kg).toLocaleString()}<span style={{ fontSize:11, fontWeight:500, color:'#52b788' }}>/kg</span></div>
                  <div style={{ fontSize:10, color:'#999' }}>Choose amount</div></>
              ) : (
                <><div style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:900, color:'#1e6641' }}>Rs. {Number(product.price).toLocaleString()}</div>
                  {product.unit && <div style={{ fontSize:10, color:'#999' }}>per {product.unit}</div>}</>
              )}
            </div>
            <button onClick={handleAdd} disabled={product.stock===0}
              style={{
                width:34, height:34, borderRadius:'50%',
                background: added ? '#52b788' : product.stock===0 ? '#ccc' : '#1e6641',
                color:'#fff', fontSize:20, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'none', cursor: product.stock===0 ? 'not-allowed' : 'pointer',
                transition:'background .2s, transform .15s',
                transform: added ? 'scale(.9)' : 'scale(1)',
              }}>
              {added ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>

      {/* Weight Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box pop-in" onClick={e=>e.stopPropagation()} style={{ maxWidth:380 }}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <span style={{ fontSize:48 }}>{product.category_emoji || '⚖️'}</span>
              <h3 style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:900, marginTop:8 }}>{product.name}</h3>
              <p style={{ fontSize:13, color:'#666', marginTop:4 }}>Rs. {Number(product.price_per_kg).toLocaleString()}/kg · Choose your amount:</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
              {available.map(w => {
                const cost = product.price_per_kg * w.value
                const sel = selected?.value === w.value
                return (
                  <button key={w.value} onClick={() => setSelected(w)}
                    style={{
                      border: sel ? '2px solid #1e6641' : '2px solid #e8ede9',
                      background: sel ? '#f0faf3' : '#fff',
                      borderRadius:12, padding:'12px 8px', cursor:'pointer',
                      textAlign:'center',
                    }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'#111' }}>{w.label}</div>
                    <div style={{ fontSize:11, color:'#52b788', marginTop:3 }}>Rs. {cost.toLocaleString()}</div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => selected && doAdd(selected)} disabled={!selected}
              style={{
                width:'100%', background: selected ? '#1e6641' : '#ccc', color:'#fff',
                padding:14, borderRadius:12, fontWeight:800, fontSize:14, border:'none', cursor: selected?'pointer':'not-allowed',
              }}>
              {selected ? `Add ${selected.label} — Rs. ${(product.price_per_kg*selected.value).toLocaleString()}` : 'Select quantity above'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
