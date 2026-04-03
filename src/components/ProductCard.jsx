import { useState } from 'react'
import { useCart } from './CartContext'
import toast from 'react-hot-toast'
import { WEIGHT_OPTIONS } from '../utils/constants'

const CAT_COLORS = {
  'Rice & Grains':          'linear-gradient(135deg,#f5e6b0,#e8d070)',
  'Vegetables & Fruits':    'linear-gradient(135deg,#b7f5c4,#52c47a)',
  'Drinks & Beverages':     'linear-gradient(135deg,#bfdbfe,#60a5fa)',
  'Spices & Dry Food':      'linear-gradient(135deg,#fecaca,#f87171)',
  'Dairy & Eggs':           'linear-gradient(135deg,#ede9fe,#a78bfa)',
  'Snacks & Biscuits':      'linear-gradient(135deg,#fef3c7,#fbbf24)',
  'Household & Cleaning':   'linear-gradient(135deg,#cffafe,#22d3ee)',
  'Personal Care':          'linear-gradient(135deg,#fce7f3,#f472b6)',
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [showModal, setShowModal]             = useState(false)
  const [selected, setSelected]               = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [imgErr, setImgErr]                   = useState(false)
  const [modalImgErr, setModalImgErr]         = useState(false)
  const [added, setAdded]                     = useState(false)

  const bg          = CAT_COLORS[product.category] || 'linear-gradient(135deg,#d8f3dc,#b7e4c7)'
  const isWeight    = product.is_weight_based
  const hasVariants = product.has_variants && product.variants?.length > 0
  const available   = WEIGHT_OPTIONS.filter(w => !product.max_weight || w.value <= product.max_weight)
  const needsModal  = isWeight || hasVariants

  const handleAdd = () => {
    if (product.stock === 0) return
    if (needsModal) {
      setShowModal(true)
    } else {
      doAdd()
    }
  }

  const getVariantPrice = (variant) => {
    if (!variant) return product.price
    if (variant.price_override !== undefined && variant.price_override !== null && variant.price_override !== '') {
      return Number(variant.price_override)
    }
    return product.price
  }

  const doAdd = (wOpt = null, vOpt = null) => {
    const variantFields = vOpt ? {
      selectedVariant:      vOpt.label,
      selectedVariantPrice: getVariantPrice(vOpt),
      price:                getVariantPrice(vOpt),
    } : {}

    addToCart({ ...product, ...variantFields }, wOpt)
    setAdded(true)
    setShowModal(false)
    setSelected(null)
    setSelectedVariant(null)
    const suffix = vOpt ? ` (${vOpt.label})` : ''
    toast.success(`${product.name}${suffix} added! 🛒`)
    setTimeout(() => setAdded(false), 1400)
  }

  const canConfirm    = (!isWeight || selected) && (!hasVariants || selectedVariant)
  const handleConfirm = () => { if (canConfirm) doAdd(isWeight ? selected : null, hasVariants ? selectedVariant : null) }

  return (
    <>
      {/* ─────────────────── PRODUCT CARD ─────────────────── */}
      <div
        className="product-card"
        style={{
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,.07)',
          transition: 'transform .25s, box-shadow .25s',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.13)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,.07)' }}
      >
        {/* Image area */}
        <div style={{ position: 'relative', height: 150, overflow: 'hidden', flexShrink: 0, background: bg }}>
          {product.image_url && !imgErr ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgErr(true)}
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 52 }}>{product.category_emoji || '🛒'}</span>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.15),transparent)' }} />

          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {product.badge && (
              <span className="product-badge" style={{ background: product.badge === 'Sale' ? '#e63946' : product.badge === 'Hot' ? '#f97316' : '#1e6641' }}>
                {product.badge === 'Sale' ? '🏷️' : product.badge === 'Hot' ? '🔥' : '✨'} {product.badge}
              </span>
            )}
            {isWeight    && <span className="product-badge" style={{ background: '#7c3aed' }}>Weight</span>}
            {hasVariants && <span className="product-badge" style={{ background: '#db2777' }}>Variants</span>}
          </div>

          {product.stock === 0 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>
              OUT OF STOCK
            </div>
          )}
          {product.stock > 0 && product.stock < 5 && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: '#f4a322', color: '#111', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>
              Only {product.stock} left!
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2d8653', background: '#f0faf3', display: 'inline-block', padding: '2px 8px', borderRadius: 50, marginBottom: 6 }}>
            {product.category_emoji} {product.category}
          </div>
          <div style={{ fontFamily: 'Fraunces,serif', fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4, lineHeight: 1.3 }}>{product.name}</div>
          {product.description && (
            <div style={{ fontSize: 11, color: '#888', flex: 1, lineHeight: 1.5, marginBottom: 8 }}>
              {product.description.slice(0, 60)}{product.description.length > 60 ? '…' : ''}
            </div>
          )}

          {hasVariants && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {product.variants.slice(0, 4).map((v, i) => (
                <span key={i} style={{ background: '#fdf4ff', border: '1.5px solid #e9d5ff', color: '#7c3aed', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>
                  {v.label}
                </span>
              ))}
              {product.variants.length > 4 && (
                <span style={{ fontSize: 10, color: '#aaa', padding: '2px 4px' }}>+{product.variants.length - 4}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 8 }}>
            <div>
              {isWeight ? (
                <>
                  <div style={{ fontFamily: 'Fraunces,serif', fontSize: 17, fontWeight: 900, color: '#1e6641' }}>
                    Rs. {Number(product.price_per_kg).toLocaleString()}<span style={{ fontSize: 11, fontWeight: 500, color: '#52b788' }}>/kg</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#999' }}>Choose amount</div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'Fraunces,serif', fontSize: 17, fontWeight: 900, color: '#1e6641' }}>
                    Rs. {Number(product.price).toLocaleString()}
                  </div>
                  {product.unit    && <div style={{ fontSize: 10, color: '#999' }}>per {product.unit}</div>}
                  {hasVariants     && <div style={{ fontSize: 10, color: '#db2777' }}>Select variant →</div>}
                </>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: added ? '#52b788' : product.stock === 0 ? '#ccc' : '#1e6641',
                color: '#fff', fontSize: 20, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                transition: 'background .2s, transform .15s',
                transform: added ? 'scale(.9)' : 'scale(1)',
              }}
            >
              {added ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────── SELECTION MODAL ─────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-box pop-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            {/* Close button */}
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>

            {/* ── Circular product image / emoji + name ── */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                overflow: 'hidden',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: bg,
                border: '3px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              }}>
                {product.image_url && !modalImgErr ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    onError={() => setModalImgErr(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                   
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 52 }}>{product.category_emoji || '🛒'}</span>
                )}
              </div>

              <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
                {product.name}
              </h3>
              {product.description && (
                <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.5 }}>
                  {product.description}
                </p>
              )}
            </div>

            {/* ── VARIANT SELECTION ── */}
            {hasVariants && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                   Choose your option <span style={{ color: '#e63946', fontWeight: 900 }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {product.variants.map((v, i) => {
                    const vPrice  = getVariantPrice(v)
                    const isSel   = selectedVariant?.label === v.label
                    const hasDiff = v.price_override !== undefined && v.price_override !== null && v.price_override !== '' && Number(v.price_override) !== Number(product.price)
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(v)}
                        style={{
                          border:     isSel ? '2.5px solid #7c3aed' : '2px solid #e9d5ff',
                          background: isSel ? '#faf5ff' : '#fff',
                          borderRadius: 12, padding: '12px 10px', cursor: 'pointer',
                          textAlign: 'center', transition: 'all .18s', position: 'relative',
                          boxShadow: isSel ? '0 0 0 3px rgba(124,58,237,.12)' : 'none',
                        }}
                      >
                        {isSel && (
                          <div style={{ position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</div>
                        )}
                        <div style={{ fontWeight: 800, fontSize: 14, color: isSel ? '#5b21b6' : '#111' }}>{v.label}</div>
                        <div style={{ fontSize: 12, marginTop: 4, color: isSel ? '#7c3aed' : '#52b788', fontWeight: 700 }}>
                          Rs. {Number(vPrice).toLocaleString()}
                        </div>
                        {hasDiff && (
                          <div style={{ fontSize: 10, color: '#db2777', marginTop: 2, fontWeight: 700 }}>
                            {Number(v.price_override) > Number(product.price) ? '' : ''} 
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {!selectedVariant && (
                  <div style={{ fontSize: 11, color: '#e63946', marginTop: 8, fontWeight: 600 }}>⚠️ Please choose an option above</div>
                )}
              </div>
            )}

            {/* ── WEIGHT SELECTION ── */}
            {isWeight && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e6641', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚖️ Choose your amount <span style={{ color: '#e63946', fontWeight: 900 }}>*</span>
                </div>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 12, marginTop: 0 }}>
                  Rs. {Number(product.price_per_kg).toLocaleString()}/kg
                  {selectedVariant?.price_override !== undefined && selectedVariant?.price_override !== '' &&
                    ` (${selectedVariant.label}: Rs. ${Number(selectedVariant.price_override).toLocaleString()}/kg)`
                  }
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {available.map(w => {
                    const basePerKg = (selectedVariant && selectedVariant.price_override !== undefined && selectedVariant.price_override !== '')
                      ? Number(selectedVariant.price_override)
                      : product.price_per_kg
                    const cost = basePerKg * w.value
                    const sel  = selected?.value === w.value
                    return (
                      <button
                        key={w.value}
                        onClick={() => setSelected(w)}
                        style={{
                          border:     sel ? '2px solid #1e6641' : '2px solid #e8ede9',
                          background: sel ? '#f0faf3' : '#fff',
                          borderRadius: 12, padding: '12px 8px', cursor: 'pointer', textAlign: 'center',
                          boxShadow:  sel ? '0 0 0 3px rgba(30,102,65,.1)' : 'none',
                          transition: 'all .18s',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>{w.label}</div>
                        <div style={{ fontSize: 11, color: '#52b788', marginTop: 3, fontWeight: 700 }}>Rs. {cost.toLocaleString()}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── CONFIRM BUTTON ── */}
            {(() => {
              let summaryPrice = null
              let summaryLabel = ''

              if (isWeight && selected) {
                const perKg  = product.price_per_kg
                summaryPrice = perKg * selected.value
                summaryLabel = selected.label
                if (selectedVariant) summaryLabel = `${selectedVariant.label} · ${selected.label}`
              } else if (!isWeight && selectedVariant) {
                summaryPrice = getVariantPrice(selectedVariant)
                summaryLabel = selectedVariant.label
              }

              return (
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  style={{
                    width: '100%', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none',
                    cursor:     canConfirm ? 'pointer' : 'not-allowed',
                    background: canConfirm
                      ? (hasVariants ? 'linear-gradient(135deg,#5b21b6,#7c3aed)' : '#1e6641')
                      : '#ccc',
                    color: '#fff', transition: 'all .2s',
                  }}
                >
                  {canConfirm
                    ? `Add to Cart${summaryLabel ? ` — ${summaryLabel}` : ''}${summaryPrice ? ` — Rs. ${Number(summaryPrice).toLocaleString()}` : ''}`
                    : `Select ${hasVariants && !selectedVariant ? 'an option' : ''}${hasVariants && !selectedVariant && isWeight && !selected ? ' & ' : ''}${isWeight && !selected ? 'amount' : ''} above`
                  }
                </button>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}
