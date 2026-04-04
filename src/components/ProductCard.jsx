import { useState, useRef, useEffect } from 'react'
import { useCart } from './CartContext'
import toast from 'react-hot-toast'
import { WEIGHT_OPTIONS } from '../utils/constants'

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

const CUSTOM_MIN_G  = 1
const CUSTOM_MAX_KG = 50

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCustomValue(raw) {
  const n = parseFloat(String(raw).replace(',', '.'))
  return isNaN(n) ? null : n
}

function toKg(value, unit) {
  if (value === null || value === undefined) return null
  return unit === 'g' ? value / 1000 : value
}

function formatWeightLabel(kg) {
  if (kg === null || kg === undefined || isNaN(kg)) return ''
  if (kg < 1) return `${Math.round(kg * 1000)} g`
  if (Number.isInteger(kg)) return `${kg} kg`
  return `${kg} kg`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductCard({ product }) {
  const { addToCart } = useCart()

  const [showModal,       setShowModal]       = useState(false)
  const [selected,        setSelected]        = useState(null)
  const [useCustom,       setUseCustom]       = useState(false)
  const [customRaw,       setCustomRaw]       = useState('')
  const [customErr,       setCustomErr]       = useState('')
  const [customUnit,      setCustomUnit]      = useState('kg')
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [imgErr,          setImgErr]          = useState(false)
  const [modalImgErr,     setModalImgErr]     = useState(false)
  const [added,           setAdded]           = useState(false)

  const customInputRef = useRef(null)

  const bg          = CAT_COLORS[product.category] || 'linear-gradient(135deg,#d8f3dc,#b7e4c7)'
  const isWeight    = product.is_weight_based
  const hasVariants = product.has_variants && product.variants?.length > 0
  const available   = WEIGHT_OPTIONS.filter(w => !product.max_weight || w.value <= product.max_weight)
  const maxKg       = product.max_weight || CUSTOM_MAX_KG
  const needsModal  = isWeight || hasVariants

  useEffect(() => {
    if (useCustom && customInputRef.current) {
      customInputRef.current.focus()
    }
  }, [useCustom])

  // ── Reset on close ────────────────────────────────────────────────────────
  const closeModal = () => {
    setShowModal(false)
    setSelected(null)
    setUseCustom(false)
    setCustomRaw('')
    setCustomErr('')
    setCustomUnit('kg')
    setSelectedVariant(null)
  }

  // ── Price helpers ─────────────────────────────────────────────────────────
  const getVariantPrice = (variant) => {
    if (!variant) return product.price
    if (variant.price_override !== undefined && variant.price_override !== null && variant.price_override !== '') {
      return Number(variant.price_override)
    }
    return product.price
  }

  const effectivePricePerKg = (() => {
    if (!isWeight) return null
    if (
      selectedVariant?.price_override !== undefined &&
      selectedVariant?.price_override !== null &&
      selectedVariant?.price_override !== ''
    ) {
      return Number(selectedVariant.price_override)
    }
    return Number(product.price_per_kg)
  })()

  // ── Custom weight validation ───────────────────────────────────────────────
  const validateCustom = (raw, unit = customUnit) => {
    if (raw === '' || raw === null || raw === undefined) return 'Please enter a weight'
    const val = parseCustomValue(raw)
    if (val === null || val <= 0) return 'Please enter a valid number'
    const kg = toKg(val, unit)
    if (unit === 'g' && val < CUSTOM_MIN_G) return `Minimum order is ${CUSTOM_MIN_G} g`
    if (unit === 'kg' && kg < 0.001)        return 'Minimum order is 1 g'
    if (kg > maxKg) return `Maximum is ${formatWeightLabel(maxKg)}`
    return ''
  }

  const handleCustomChange = (raw, unit = customUnit) => {
    setCustomRaw(raw)
    setCustomErr(raw !== '' ? validateCustom(raw, unit) : '')
  }

  // ── Resolved custom kg value (null if invalid) ────────────────────────────
  const resolvedCustomKg = (() => {
    const val = parseCustomValue(customRaw)
    const kg  = toKg(val, customUnit)
    if (kg === null || kg <= 0) return null
    if (validateCustom(customRaw) !== '') return null
    return kg
  })()

  // ── Resolved weight option for doAdd ─────────────────────────────────────
  const resolvedWeightOpt = (() => {
    if (!isWeight) return null
    if (useCustom) {
      if (resolvedCustomKg === null) return null
      return { value: resolvedCustomKg, label: formatWeightLabel(resolvedCustomKg), isCustom: true }
    }
    return selected
  })()

  // ── Can confirm ───────────────────────────────────────────────────────────
  const customValid = useCustom && resolvedCustomKg !== null
  const weightReady = !isWeight || (useCustom ? customValid : selected !== null)
  const canConfirm  = weightReady && (!hasVariants || selectedVariant !== null)

  // ── Add to cart ───────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (product.stock === 0) return
    if (needsModal) { setShowModal(true); return }
    doAdd()
  }

  const doAdd = (wOpt = null, vOpt = null) => {
    const variantFields = vOpt
      ? {
          selectedVariant:      vOpt.label,
          selectedVariantPrice: getVariantPrice(vOpt),
          price:                getVariantPrice(vOpt),
        }
      : {}

    addToCart({ ...product, ...variantFields }, wOpt)
    setAdded(true)
    closeModal()

    const weightSuffix  = wOpt ? ` · ${wOpt.label}` : ''
    const variantSuffix = vOpt ? ` (${vOpt.label})` : ''
    toast.success(`${product.name}${variantSuffix}${weightSuffix} added! 🛒`)
    setTimeout(() => setAdded(false), 1400)
  }

  const handleConfirm = () => {
    if (!canConfirm) return
    if (useCustom) {
      const err = validateCustom(customRaw)
      if (err) { setCustomErr(err); return }
    }
    doAdd(
      isWeight  ? resolvedWeightOpt  : null,
      hasVariants ? selectedVariant  : null,
    )
  }

  // ── Summary label & price for confirm button ──────────────────────────────
  const { summaryLabel, summaryPrice } = (() => {
    if (!canConfirm) return { summaryLabel: '', summaryPrice: null }

    if (isWeight && resolvedWeightOpt) {
      const cost  = (effectivePricePerKg || 0) * resolvedWeightOpt.value
      const wPart = resolvedWeightOpt.label
      const vPart = selectedVariant ? `${selectedVariant.label} · ` : ''
      return { summaryLabel: `${vPart}${wPart}`, summaryPrice: cost }
    }
    if (!isWeight && selectedVariant) {
      return { summaryLabel: selectedVariant.label, summaryPrice: getVariantPrice(selectedVariant) }
    }
    return { summaryLabel: '', summaryPrice: null }
  })()

  // ── Live cost preview while typing custom weight ──────────────────────────
  const customLiveCost = (() => {
    if (!useCustom || !effectivePricePerKg || resolvedCustomKg === null) return null
    return effectivePricePerKg * resolvedCustomKg
  })()

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .cw-toggle-row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 12px; padding: 10px 12px;
          background: #f9fdf9; border-radius: 10px;
          border: 1.5px solid #e8ede9; cursor: pointer;
          user-select: none; transition: border-color .18s, background .18s;
        }
        .cw-toggle-row:hover  { border-color: #52b788; background: #f0faf3; }
        .cw-toggle-row.active { border-color: #1e6641; background: #f0faf3; }
        .cw-toggle-check {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid #ccc; display: flex;
          align-items: center; justify-content: center;
          flex-shrink: 0; transition: all .18s; background: #fff;
        }
        .cw-toggle-row.active .cw-toggle-check { border-color: #1e6641; background: #1e6641; }
        .cw-toggle-check-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #fff; opacity: 0; transition: opacity .15s;
        }
        .cw-toggle-row.active .cw-toggle-check-dot { opacity: 1; }
        .cw-toggle-label { flex: 1; }
        .cw-toggle-title { font-size: 13px; font-weight: 800; color: #1e6641; }
        .cw-toggle-sub   { font-size: 11px; color: #888; margin-top: 1px; }

        .cw-input-wrap {
          background: #fff; border: 2px solid #e8ede9;
          border-radius: 12px; padding: 14px 16px;
          margin-bottom: 8px; transition: border-color .2s;
        }
        .cw-input-wrap:focus-within { border-color: #1e6641; }
        .cw-input-wrap.error        { border-color: #e63946; }
        .cw-input-row { display: flex; align-items: center; gap: 10px; }
        .cw-input {
          flex: 1; border: none; outline: none;
          font-size: 22px; font-weight: 900; color: #111;
          font-family: 'Fraunces', serif; background: transparent;
          width: 100%; min-width: 0;
        }
        .cw-input::placeholder { color: #ccc; font-size: 18px; font-weight: 500; }
        .cw-unit-badge {
          flex-shrink: 0; background: #f0faf3; color: #1e6641;
          font-size: 13px; font-weight: 800; padding: 6px 12px;
          border-radius: 8px; letter-spacing: .3px;
        }
        .cw-input-footer {
          display: flex; justify-content: space-between;
          align-items: center; margin-top: 8px;
        }
        .cw-live-cost {
          font-family: 'Fraunces', serif; font-size: 15px;
          font-weight: 900; color: #1e6641;
        }
        .cw-limit-hint { font-size: 11px; color: #aaa; font-weight: 500; }
        .cw-err {
          font-size: 12px; color: #e63946; font-weight: 600;
          margin-top: 4px; display: flex; align-items: center; gap: 4px;
        }
        .cw-quick-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .cw-chip {
          border: 1.5px solid #e8ede9; background: #fff;
          border-radius: 50px; padding: 4px 12px;
          font-size: 11px; font-weight: 700; color: #555;
          cursor: pointer; transition: all .15s;
          font-family: 'Nunito', sans-serif;
        }
        .cw-chip:hover { border-color: #1e6641; color: #1e6641; background: #f0faf3; }
        .cw-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 14px 0 12px; color: #bbb; font-size: 11px;
          font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
        }
        .cw-divider::before, .cw-divider::after {
          content: ''; flex: 1; height: 1px; background: #e8ede9;
        }
      `}</style>

      {/* ── PRODUCT CARD ─────────────────────────────────────── */}
      <div
        className="product-card"
        style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,.07)',
          transition: 'transform .25s, box-shadow .25s',
          display: 'flex', flexDirection: 'column',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.13)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,.07)' }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: 150, overflow: 'hidden', flexShrink: 0, background: bg }}>
          {product.image_url && !imgErr ? (
            <img
              src={product.image_url} alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgErr(true)} loading="lazy"
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
            {isWeight    && <span className="product-badge" style={{ background: '#7c3aed' }}>⚖️ Weight</span>}
            {hasVariants && <span className="product-badge" style={{ background: '#db2777' }}>🎨 Variants</span>}
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
                  <div style={{ fontSize: 10, color: '#999' }}>Choose amount or enter custom</div>
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

      {/* ── SELECTION MODAL ──────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="modal-close" onClick={closeModal}>✕</button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
                margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg, border: '3px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              }}>
                {product.image_url && !modalImgErr ? (
                  <img
                    src={product.image_url} alt={product.name}
                    onError={() => setModalImgErr(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 46 }}>{product.category_emoji || '🛒'}</span>
                )}
              </div>
              <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
                {product.name}
              </h3>
              {product.description && (
                <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.5 }}>{product.description}</p>
              )}
            </div>

            {/* ── VARIANT SELECTION ── */}
            {hasVariants && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🎨 Choose your option <span style={{ color: '#e63946', fontWeight: 900 }}>*</span>
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
                  Rs. {Number(effectivePricePerKg).toLocaleString()}/kg
                  {selectedVariant?.price_override !== undefined && selectedVariant?.price_override !== '' && ` · ${selectedVariant.label}`}
                </p>

                {/* Preset grid — hidden when custom mode is active */}
                {!useCustom && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {available.map(w => {
                      const cost = (effectivePricePerKg || 0) * w.value
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
                            transition: 'all .18s', position: 'relative',
                          }}
                        >
                          {sel && (
                            <div style={{ position: 'absolute', top: 5, right: 7, width: 16, height: 16, borderRadius: '50%', background: '#1e6641', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 900 }}>✓</div>
                          )}
                          <div style={{ fontWeight: 800, fontSize: 14, color: sel ? '#1e6641' : '#111' }}>{w.label}</div>
                          <div style={{ fontSize: 11, color: sel ? '#1e6641' : '#52b788', marginTop: 3, fontWeight: 700 }}>
                            Rs. {Number(cost).toLocaleString()}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="cw-divider">or enter custom amount</div>

                {/* Custom toggle */}
                <div
                  className={`cw-toggle-row${useCustom ? ' active' : ''}`}
                  onClick={() => {
                    const next = !useCustom
                    setUseCustom(next)
                    if (next) {
                      setSelected(null)     // deselect preset when entering custom mode
                    } else {
                      setCustomRaw('')      // clear input when leaving custom mode
                      setCustomErr('')
                    }
                  }}
                >
                  <div className="cw-toggle-check">
                    <div className="cw-toggle-check-dot" />
                  </div>
                  <div className="cw-toggle-label">
                    <div className="cw-toggle-title">✏️ Enter custom weight</div>
                  </div>
                </div>

                {/* Custom input panel */}
                {useCustom && (
                  <div>
                    {/* kg / g unit toggle */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {['kg', 'g'].map(u => (
                        <button
                          key={u}
                          onClick={() => {
                            setCustomUnit(u)
                            setCustomRaw('')
                            setCustomErr('')
                          }}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 10, border: "1.5px solid #095618",
                            fontWeight: 800, fontSize: 13, cursor: 'pointer',
                            fontFamily: "'Nunito', sans-serif",
                            background: customUnit === u ? '#1e6641' : '#f0faf3',
                            color:      customUnit === u ? '#fff'    : '#1e6641',
                            transition: 'all .18s',
                          }}
                        >
                          {u === 'kg' ? ' Kilograms (kg)' : ' Grams (g)'}
                        </button>
                      ))}
                    </div>

                    <div className={`cw-input-wrap${customErr ? ' error' : ''}`}>
                      <div className="cw-input-row">
                        <input
                          ref={customInputRef}
                          className="cw-input"
                          type="number"
                          inputMode="decimal"
                          min={customUnit === 'g' ? CUSTOM_MIN_G : 0.001}
                          max={customUnit === 'g' ? maxKg * 1000 : maxKg}
                          step={customUnit === 'g' ? 1 : 0.1}
                          placeholder={customUnit === 'kg' ? 'e.g. 1.5' : 'e.g. 750'}
                          value={customRaw}
                          onChange={e => handleCustomChange(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && canConfirm) handleConfirm() }}
                        />
                        <div className="cw-unit-badge">{customUnit}</div>
                      </div>

                      <div className="cw-input-footer">
                        <div>
                          {customLiveCost !== null && !customErr ? (
                            <div className="cw-live-cost">
                              = Rs. {Number(customLiveCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                          ) : (
                            <div className="cw-limit-hint">
                              {customUnit === 'g'
                                ? `${CUSTOM_MIN_G} g – ${maxKg * 1000} g`
                                : `0.001 kg – ${maxKg} kg`}
                            </div>
                          )}
                        </div>
                        {customRaw !== '' && !customErr && resolvedCustomKg !== null && (
                          <div style={{ fontSize: 11, color: '#1e6641', fontWeight: 700 }}>
                            ✅ {formatWeightLabel(resolvedCustomKg)}
                          </div>
                        )}
                      </div>

                      {customErr && <div className="cw-err">⚠️ {customErr}</div>}
                    </div>

                    {/* Quick-fill chips */}
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 6 }}>Quick fill:</div>
                    <div className="cw-quick-chips">
                      {customUnit === 'g'
                        ? [50, 100, 250, 500, 750, 1000, 1500, 2000]
                            .filter(v => v <= maxKg * 1000)
                            .map(v => (
                              <button key={v} className="cw-chip" onClick={() => handleCustomChange(String(v), 'g')}>
                                {v} g
                              </button>
                            ))
                        : [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2.5, 3]
                            .filter(v => v <= maxKg)
                            .map(v => (
                              <button key={v} className="cw-chip" onClick={() => handleCustomChange(String(v), 'kg')}>
                                {formatWeightLabel(v)}
                              </button>
                            ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CONFIRM BUTTON ── */}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                fontWeight: 800, fontSize: 14, border: 'none',
                cursor:     canConfirm ? 'pointer' : 'not-allowed',
                background: canConfirm
                  ? (hasVariants ? 'linear-gradient(135deg,#5b21b6,#7c3aed)' : '#1e6641')
                  : '#ccc',
                color: '#fff', transition: 'all .2s', marginTop: 4,
              }}
            >
              {canConfirm
                ? `Add to Cart${summaryPrice !== null ? ` — Rs. ${Number(summaryPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}`
                : (() => {
                    const parts = []
                    if (hasVariants && !selectedVariant) parts.push('an option')
                    if (isWeight && !weightReady) parts.push('an amount')
                    return `Select ${parts.join(' & ')} above`
                  })()
              }
            </button>
          </div>
        </div>
      )}
    </>
  )
}
