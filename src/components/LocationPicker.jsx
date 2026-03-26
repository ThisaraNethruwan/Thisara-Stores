import { useState, useEffect, useRef, useCallback } from 'react'

const SHOP_LAT = 7.0278
const SHOP_LNG = 79.9212
const DELIVERY_RATE_PER_KM = 70
const FREE_DELIVERY_THRESHOLD = 10000
const MIN_DELIVERY_FEE = 100

function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcFee(distKm, subtotal) {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0
  return Math.max(Math.round(distKm * DELIVERY_RATE_PER_KM), MIN_DELIVERY_FEE)
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// ── Browser detection ─────────────────────────────────────────────────────────
function detectBrowser() {
  const ua = navigator.userAgent
  const vendor = navigator.vendor || ''

  // Order matters: check specific browsers before generic ones
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'opera'
  if (/Edg\//i.test(ua)) return 'edge'
  if (/Firefox/i.test(ua)) return 'firefox'
  // Chrome must come before Safari (Chrome UA also contains "Safari")
  if (/Chrome/i.test(ua) && /Google Inc/.test(vendor)) return 'chrome'
  if (/CriOS/i.test(ua)) return 'chrome-ios'     // Chrome on iOS
  if (/FxiOS/i.test(ua)) return 'firefox-ios'    // Firefox on iOS
  if (/Safari/i.test(ua) && /Apple Computer/.test(vendor)) {
    // Distinguish iOS Safari from macOS Safari
    if (/iPhone|iPad|iPod/i.test(ua)) return 'safari-ios'
    return 'safari-mac'
  }
  return 'unknown'
}

function detectOS() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Mac/i.test(ua)) return 'mac'
  if (/Win/i.test(ua)) return 'windows'
  return 'other'
}

// Returns detailed steps for granting location based on browser + OS
function getLocationInstructions(browser, os) {
  const steps = {
    'chrome': {
      icon: '🌐',
      name: 'Google Chrome',
      steps: [
        'Click the 🔒 lock icon in the address bar (left of the URL)',
        'Click "Site settings" from the dropdown',
        'Find "Location" and change it to "Allow"',
        'Refresh the page and try again',
      ],
    },
    'chrome-ios': {
      icon: '🌐',
      name: 'Chrome on iPhone/iPad',
      steps: [
        'Go to iPhone Settings → Chrome',
        'Tap "Location"',
        'Select "While Using the App"',
        'Come back and tap "Use My Current Location" again',
      ],
    },
    'safari-ios': {
      icon: '🧭',
      name: 'Safari on iPhone/iPad',
      steps: [
        'Go to iPhone Settings → Privacy & Security',
        'Tap "Location Services"',
        'Scroll down and tap "Safari Websites"',
        'Select "While Using the App" or "Ask Next Time"',
        'Return here and tap "Use My Current Location" again',
      ],
    },
    'safari-mac': {
      icon: '🧭',
      name: 'Safari on Mac',
      steps: [
        'In the menu bar, click Safari → Settings (or Preferences)',
        'Click the "Websites" tab',
        'Select "Location" from the left sidebar',
        'Find this website and set it to "Allow"',
        'Refresh and try again',
      ],
    },
    'firefox': {
      icon: '🦊',
      name: 'Firefox',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click the arrow (→) next to "Connection Secure"',
        'Click "More Information"',
        'Go to "Permissions" tab → find "Access Your Location"',
        'Uncheck "Use Default" and select "Allow"',
        'Refresh the page and try again',
      ],
    },
    'firefox-ios': {
      icon: '🦊',
      name: 'Firefox on iPhone/iPad',
      steps: [
        'Go to iPhone Settings → Firefox',
        'Tap "Location"',
        'Select "While Using the App"',
        'Return here and try again',
      ],
    },
    'edge': {
      icon: '🔷',
      name: 'Microsoft Edge',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click "Permissions for this site"',
        'Find "Location" and set it to "Allow"',
        'Refresh the page and try again',
      ],
    },
    'samsung': {
      icon: '📱',
      name: 'Samsung Internet',
      steps: [
        'Tap the menu icon (☰) at the bottom right',
        'Go to Settings → Sites and downloads → Site permissions',
        'Tap "Location" and find this website',
        'Switch it to "Allow"',
        'Go back and try again',
      ],
    },
    'opera': {
      icon: '🎭',
      name: 'Opera',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click "Site settings"',
        'Find "Location" and change it to "Allow"',
        'Refresh and try again',
      ],
    },
    'unknown': {
      icon: '🌐',
      name: 'Your Browser',
      steps: [
        'Look for a 🔒 lock or info icon in the address bar',
        'Click it and find "Location" or "Site permissions"',
        'Change Location to "Allow"',
        'Refresh the page and try again',
        os === 'ios'
          ? 'Or go to Settings → Privacy & Security → Location Services'
          : os === 'android'
          ? 'Or go to Android Settings → Apps → [Browser] → Permissions → Location'
          : '',
      ].filter(Boolean),
    },
  }

  return steps[browser] || steps['unknown']
}

function requestGeolocation(onSuccess, onError, options = {}) {
  if (!navigator.geolocation) {
    onError({ code: 0, message: 'Geolocation is not supported by this browser.' })
    return
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
    ...options,
  })
}

export default function LocationPicker({ onLocationSelect, initialAddress = '', cartTotal = 0 }) {
  const mapRef       = useRef(null)
  const mapInstance  = useRef(null)
  const markerRef    = useRef(null)
  const cartTotalRef = useRef(cartTotal)
  const autoTriedRef = useRef(false)

  const [mode, setMode]           = useState('map')
  const [address, setAddress]     = useState(initialAddress)
  const [loading, setLoading]     = useState(false)
  const [pinInfo, setPinInfo]     = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')
  const [geoMsg, setGeoMsg]       = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapReady, setMapReady]   = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  // Detect browser & OS once
  const browser = useRef(detectBrowser())
  const os      = useRef(detectOS())

  useEffect(() => { cartTotalRef.current = cartTotal }, [cartTotal])

  // ── Load Leaflet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return }
    if (document.getElementById('leaflet-css')) {
      const check = setInterval(() => {
        if (window.L) { setMapLoaded(true); clearInterval(check) }
      }, 100)
      return () => clearInterval(check)
    }
    const css = document.createElement('link')
    css.id = 'leaflet-css'
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || mode !== 'map' || !mapRef.current || mapInstance.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      zoomControl: true,
      tap: true,
      tapTolerance: 15,
    }).setView([SHOP_LAT, SHOP_LNG], 15)

    L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK',
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
        maxZoom: 20,
      }
    ).addTo(map)

    // Shop marker
    const shopIcon = L.divIcon({
      html: `<div style="background:#1e6641;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);">🏪</div>`,
      className: '', iconSize: [40, 40], iconAnchor: [20, 20],
    })
    L.marker([SHOP_LAT, SHOP_LNG], { icon: shopIcon })
      .addTo(map)
      .bindPopup('<b style="font-family:sans-serif">🏪 Thisara Stores</b><br><small>Our Shop Location</small>')

    // Delivery marker
    const deliveryIcon = L.divIcon({
      html: `
        <div style="position:relative;width:32px;height:44px;">
          <div style="background:#e63946;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);font-size:16px;">📍</span>
          </div>
          <div style="width:6px;height:6px;background:#e63946;border-radius:50%;position:absolute;bottom:0;left:50%;transform:translateX(-50%);box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
        </div>`,
      className: '', iconSize: [32, 44], iconAnchor: [16, 44],
    })
    const marker = L.marker([SHOP_LAT, SHOP_LNG], { icon: deliveryIcon, draggable: true }).addTo(map)
    markerRef.current = marker

    const handleLatLng = async (lat, lng) => {
      setLoading(true)
      const addr   = await reverseGeocode(lat, lng)
      const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
      const fee    = calcFee(distKm, cartTotalRef.current)
      setAddress(addr)
      setPinInfo({ lat, lng, distKm, fee })
      onLocationSelect({ address: addr, lat, lng, distKm, fee })
      setLoading(false)
    }

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      handleLatLng(lat, lng)
    })
    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      handleLatLng(e.latlng.lat, e.latlng.lng)
    })

    mapInstance.current = map
    setTimeout(() => { map.invalidateSize(); setMapReady(true) }, 150)

    return () => {
      map.remove()
      mapInstance.current = null
      markerRef.current   = null
      setMapReady(false)
    }
  }, [mapLoaded, mode]) // eslint-disable-line

  // ── Auto-try GPS once map ready ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || autoTriedRef.current) return
    autoTriedRef.current = true
    setGeoStatus('asking')

    requestGeolocation(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        }
        const addr   = await reverseGeocode(lat, lng)
        const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
        const fee    = calcFee(distKm, cartTotalRef.current)
        setAddress(addr)
        setPinInfo({ lat, lng, distKm, fee })
        onLocationSelect({ address: addr, lat, lng, distKm, fee })
        setGeoStatus('idle')
        setLoading(false)
        setShowSteps(false)
      },
      (err) => {
        // On initial auto-try, silently fall to 'denied' without showing the full message
        // The user will see the GPS button + can click it manually
        if (err.code === 1) {
          setGeoStatus('denied')
          setShowSteps(false) // Don't auto-expand steps on page load
          setGeoMsg('denied')
        } else {
          setGeoStatus('error')
          setGeoMsg('unavailable')
        }
        setLoading(false)
      }
    )
  }, [mapReady]) // eslint-disable-line

  // ── Recalc fee when cart total changes ──────────────────────────────────────
  useEffect(() => {
    if (!pinInfo) return
    const fee = calcFee(pinInfo.distKm, cartTotal)
    if (fee !== pinInfo.fee) {
      const updated = { ...pinInfo, fee }
      setPinInfo(updated)
      onLocationSelect({ address, lat: pinInfo.lat, lng: pinInfo.lng, distKm: pinInfo.distKm, fee })
    }
  }, [cartTotal]) // eslint-disable-line

  // ── Manual GPS button ───────────────────────────────────────────────────────
  // Key insight: on modern browsers, calling getCurrentPosition() again after a
  // denial does re-trigger the permission prompt ONLY if the site-level permission
  // hasn't been permanently blocked. If it has been permanently blocked
  // (i.e. the user clicked "Block" in the browser bar), we must show settings steps.
  const useMyLocation = useCallback(() => {
    setGeoMsg('')
    setGeoStatus('asking')
    setLoading(true)
    setShowSteps(false)

    requestGeolocation(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        }
        const addr   = await reverseGeocode(lat, lng)
        const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
        const fee    = calcFee(distKm, cartTotal)
        setAddress(addr)
        setPinInfo({ lat, lng, distKm, fee })
        onLocationSelect({ address: addr, lat, lng, distKm, fee })
        setGeoStatus('idle')
        setLoading(false)
        setShowSteps(false)
      },
      (err) => {
        setLoading(false)
        if (err.code === 1) {
          setGeoStatus('denied')
          setGeoMsg('denied')
          setShowSteps(true) // Show detailed steps when user explicitly clicked the button
        } else {
          setGeoStatus('error')
          setGeoMsg('unavailable')
          setShowSteps(false)
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [cartTotal, onLocationSelect])

  const handleTextChange = (val) => {
    setAddress(val)
    setPinInfo(null)
    onLocationSelect({ address: val, lat: null, lng: null, distKm: null, fee: null })
  }

  const switchMode = (m) => {
    if (m === mode) return
    if (m === 'map') {
      mapInstance.current  = null
      autoTriedRef.current = false
    }
    setMode(m)
  }

  const isAsking = geoStatus === 'asking'
  const isDenied = geoStatus === 'denied'
  const isError  = geoStatus === 'error'
  const instructions = getLocationInstructions(browser.current, os.current)

  return (
    <div>
      <style>{`
        .lp-tabs { display:flex; gap:8px; margin-bottom:12px; }
        .lp-tab { flex:1; padding:10px 8px; border-radius:10px; border:2px solid #e8ede9; background:#fff; font-weight:700; font-size:13px; cursor:pointer; color:#666; font-family:'Nunito',sans-serif; transition:all .2s; }
        .lp-tab.active { border-color:#1e6641; background:#f0faf3; color:#1e6641; }
        .lp-btn-gps { width:100%; margin-bottom:10px; padding:13px; border-radius:10px; background:linear-gradient(135deg,#1a3d28,#1e6641); color:#fff; font-weight:700; font-size:14px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'Nunito',sans-serif; box-shadow:0 4px 14px rgba(30,102,65,.3); transition:all .2s; }
        .lp-btn-gps:disabled { background:#94a3b8; box-shadow:none; cursor:not-allowed; }
        .lp-btn-gps:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(30,102,65,.35); }
        .lp-asking { background:#fff9ec; border:1.5px solid #fcd34d; border-radius:8px; padding:10px 12px; font-size:12px; color:#92400e; margin-bottom:10px; display:flex; gap:8px; align-items:center; line-height:1.5; }
        
        /* Denied/error panel */
        .lp-denied-panel { background:#fff5f5; border:1.5px solid #fca5a5; border-radius:12px; padding:0; margin-bottom:10px; overflow:hidden; }
        .lp-denied-header { padding:10px 14px; display:flex; align-items:center; gap:8px; }
        .lp-denied-header-text { flex:1; }
        .lp-denied-title { font-size:13px; font-weight:800; color:#b91c1c; display:block; }
        .lp-denied-subtitle { font-size:11px; color:#7f1d1d; margin-top:1px; display:block; }
        .lp-steps-toggle { background:none; border:1.5px solid #fca5a5; border-radius:8px; padding:4px 10px; font-size:11px; font-weight:700; color:#b91c1c; cursor:pointer; white-space:nowrap; font-family:'Nunito',sans-serif; transition:all .2s; flex-shrink:0; }
        .lp-steps-toggle:hover { background:#ffe4e4; }
        .lp-steps-body { border-top:1.5px solid #fecaca; padding:12px 14px; background:#fff; }
        .lp-browser-badge { display:inline-flex; align-items:center; gap:5px; background:#fee2e2; color:#b91c1c; padding:3px 10px; border-radius:50px; font-size:11px; font-weight:800; margin-bottom:10px; }
        .lp-steps-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:7px; }
        .lp-steps-list li { display:flex; align-items:flex-start; gap:8px; font-size:12px; color:#374151; line-height:1.5; }
        .lp-step-num { background:#e63946; color:#fff; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; flex-shrink:0; margin-top:1px; }
        .lp-manual-note { margin-top:10px; font-size:11px; color:#6b7280; padding-top:8px; border-top:1px solid #fee2e2; display:flex; gap:6px; align-items:flex-start; }
        
        .lp-map-wrap { width:100%; height:300px; border-radius:14px; overflow:hidden; border:2px solid #e0e0e0; position:relative; box-shadow:0 2px 12px rgba(0,0,0,.1); }
        .lp-map-skeleton { height:300px; border-radius:14px; background:#f0faf3; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:8px; color:#1e6641; }
        .lp-hint { font-size:11px; color:#888; text-align:center; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .lp-loading-dot { animation:lp-pulse 1.2s ease infinite; }
        .lp-steps-anim { animation: lp-slide-down .2s ease; }
        @keyframes lp-slide-down { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Mode tabs */}
      <div className="lp-tabs">
        {[['map', '📍 Pin on Map'], ['text', '✍️ Type Address']].map(([m, label]) => (
          <button
            key={m} type="button"
            className={`lp-tab${mode === m ? ' active' : ''}`}
            onClick={() => switchMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TEXT MODE */}
      {mode === 'text' && (
        <div>
          <textarea
            rows={3}
            placeholder="Enter your full delivery address (house no, street, area, city)..."
            value={address}
            onChange={e => handleTextChange(e.target.value)}
            style={{
              width:'100%', padding:'11px 14px',
              border:'2px solid #e8ede9', borderRadius:10,
              fontSize:14, outline:'none', background:'#fff',
              fontFamily:"'Nunito',sans-serif", resize:'vertical',
              transition:'border-color .2s', boxSizing:'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#52b788')}
            onBlur={e => (e.target.style.borderColor = '#e8ede9')}
          />
          <p style={{ fontSize:11, color:'#f59e0b', marginTop:4, fontWeight:600 }}>
            ⚠️ Typed address — delivery fee will be confirmed by our team on call.
          </p>
        </div>
      )}

      {/* MAP MODE */}
      {mode === 'map' && (
        <div>
          {/* GPS button */}
          <button
            type="button"
            className="lp-btn-gps"
            onClick={useMyLocation}
            disabled={loading || isAsking}
          >
            {loading || isAsking
              ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block', fontSize:16 }}>⏳</span> Getting your location...</>
              : <>📍 Use My Current Location (GPS)</>
            }
          </button>

          {/* Browser prompt reminder */}
          {isAsking && !loading && (
            <div className="lp-asking">
              <span style={{ fontSize:16, flexShrink:0 }}>🔔</span>
              <span>Your browser is asking for location permission — please tap <strong>Allow</strong> when prompted.</span>
            </div>
          )}

          {/* Denied with smart browser-specific steps */}
          {isDenied && (
            <div className="lp-denied-panel">
              <div className="lp-denied-header">
                <span style={{ fontSize:18 }}>🚫</span>
                <div className="lp-denied-header-text">
                  <span className="lp-denied-title">Location access denied</span>
                  <span className="lp-denied-subtitle">
                    {showSteps
                      ? `Follow the steps below to allow location for ${instructions.name}`
                      : 'Tap "How to fix" to see steps, or pin location manually on the map'}
                  </span>
                </div>
                <button
                  type="button"
                  className="lp-steps-toggle"
                  onClick={() => setShowSteps(s => !s)}
                >
                  {showSteps ? '✕ Close' : '🔧 How to fix'}
                </button>
              </div>

              {showSteps && (
                <div className="lp-steps-body lp-steps-anim">
                  <div className="lp-browser-badge">
                    <span>{instructions.icon}</span>
                    <span>{instructions.name} detected</span>
                  </div>
                  <ol className="lp-steps-list">
                    {instructions.steps.map((step, i) => (
                      <li key={i}>
                        <span className="lp-step-num">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="lp-manual-note">
                    <span>💡</span>
                    <span>After updating settings, come back here and tap the <strong>"Use My Current Location"</strong> button again. Or simply drag the red pin on the map to your location.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generic error (GPS hardware issue, timeout, etc.) */}
          {isError && (
            <div style={{
              background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:10,
              padding:'10px 14px', marginBottom:10, fontSize:12, color:'#92400e', lineHeight:1.6,
            }}>
              <strong>⚠️ Could not get your location.</strong><br />
              Your GPS signal may be weak. Please pin your location manually by clicking or dragging on the map below.
            </div>
          )}

          {/* Map */}
          {!mapLoaded ? (
            <div className="lp-map-skeleton">
              <div style={{ fontSize:32, animation:'spin 1s linear infinite' }}>🗺️</div>
              <div style={{ fontWeight:700, fontSize:13 }}>Loading map...</div>
            </div>
          ) : (
            <div className="lp-map-wrap">
              <div ref={mapRef} style={{ width:'100%', height:'100%' }} />
              {loading && (
                <div style={{
                  position:'absolute', inset:0, background:'rgba(255,255,255,.75)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700, color:'#1e6641', gap:8, zIndex:999,
                  borderRadius:14,
                }}>
                  <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⏳</span>
                  Getting your address...
                </div>
              )}
            </div>
          )}

          <div className="lp-hint">
            <span>🏪 Green = Our shop</span>
            <span>·</span>
            <span>📍 Red = Your location</span>
            <span>·</span>
            <span>Tap map or drag pin to change</span>
          </div>
        </div>
      )}
    </div>
  )
}
