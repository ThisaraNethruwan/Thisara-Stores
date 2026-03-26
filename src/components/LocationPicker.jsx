import { useState, useEffect, useRef, useCallback } from 'react'

const SHOP_LAT = 7.0278
const SHOP_LNG = 79.9212
const DELIVERY_RATE_PER_KM = 70
const FREE_DELIVERY_THRESHOLD = 10000
const MIN_DELIVERY_FEE = 100

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function requestGeolocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError({ code: 0, message: 'Geolocation not supported.' })
    return
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  })
}

// ── Detect just enough for one universal instruction set ──────────────────────
function detectEnv() {
  const ua = navigator.userAgent
  const isIOS     = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isMobile  = isIOS || isAndroid
  const isEdge    = /Edg\//.test(ua)
  const isChrome  = !isEdge && /Chrome\//.test(ua)
  const isFirefox = /Firefox\//.test(ua)
  const isSamsung = /SamsungBrowser/.test(ua)
  const isSafari  = !isChrome && !isEdge && !isFirefox && !isSamsung && /Safari\//.test(ua)

  const os      = isIOS ? 'iPhone / iPad' : isAndroid ? 'Android' : 'Desktop'
  const browser = isEdge ? 'Edge' : isChrome ? 'Chrome' : isFirefox ? 'Firefox'
                : isSamsung ? 'Samsung Internet' : isSafari ? 'Safari' : 'Browser'

  // iOS Safari has no lock icon — must use Settings app
  const lockLabel = (isIOS && isSafari)
    ? 'the ⚙️ Settings app on your iPhone'
    : 'the 🔒 lock icon in your browser address bar'

  // Secondary system-level path
  const systemPath = isIOS
    ? 'iPhone Settings → Privacy & Security → Location Services → ' + browser + ' → Allow'
    : isAndroid
    ? 'Android Settings → Apps → ' + browser + ' → Permissions → Location → Allow'
    : 'System Settings → Privacy → Location Services → ' + browser + ' → Allow'

  return { os, browser, isMobile, lockLabel, systemPath }
}

// ── Reload & re-ask mechanism ─────────────────────────────────────────────────
// Browsers remember a denied permission for the entire page session.
// The ONLY reliable way to get a fresh prompt is a full page reload AFTER
// the user has unblocked location in their settings.
// We store a flag in sessionStorage so GPS auto-fires right after reload.
const SESSION_KEY = 'lp_retry_on_load'

function markRetryOnReload() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
}
function consumeRetryFlag() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    return v === '1'
  } catch { return false }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LocationPicker({ onLocationSelect, initialAddress = '', cartTotal = 0 }) {
  const mapRef       = useRef(null)
  const mapInstance  = useRef(null)
  const markerRef    = useRef(null)
  const cartTotalRef = useRef(cartTotal)
  const autoTriedRef = useRef(false)
  const shouldRetry  = useRef(consumeRetryFlag())

  const [mode, setMode]           = useState('map')
  const [address, setAddress]     = useState(initialAddress)
  const [loading, setLoading]     = useState(false)
  const [pinInfo, setPinInfo]     = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')   // idle | asking | denied | error
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapReady, setMapReady]   = useState(false)
  const [env]                     = useState(() => detectEnv())

  useEffect(() => { cartTotalRef.current = cartTotal }, [cartTotal])

  // ── Load Leaflet ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return }
    if (document.getElementById('leaflet-css')) {
      const check = setInterval(() => { if (window.L) { setMapLoaded(true); clearInterval(check) } }, 100)
      return () => clearInterval(check)
    }
    const css  = document.createElement('link')
    css.id     = 'leaflet-css'
    css.rel    = 'stylesheet'
    css.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const script   = document.createElement('script')
    script.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload  = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || mode !== 'map' || !mapRef.current || mapInstance.current) return
    const L   = window.L
    const map = L.map(mapRef.current, { zoomControl: true, tap: true, tapTolerance: 15 })
      .setView([SHOP_LAT, SHOP_LNG], 15)

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK', {
      subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google Maps', maxZoom: 20,
    }).addTo(map)

    const shopIcon = L.divIcon({
      html: `<div style="background:#1e6641;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);">🏪</div>`,
      className: '', iconSize: [40,40], iconAnchor: [20,20],
    })
    L.marker([SHOP_LAT, SHOP_LNG], { icon: shopIcon }).addTo(map)
      .bindPopup('<b style="font-family:sans-serif">🏪 Thisara Stores</b><br><small>Our Shop Location</small>')

    const deliveryIcon = L.divIcon({
      html: `<div style="position:relative;width:32px;height:44px;"><div style="background:#e63946;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div><div style="width:6px;height:6px;background:#e63946;border-radius:50%;position:absolute;bottom:0;left:50%;transform:translateX(-50%);box-shadow:0 1px 4px rgba(0,0,0,.3);"></div></div>`,
      className: '', iconSize: [32,44], iconAnchor: [16,44],
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

    marker.on('dragend', () => { const { lat, lng } = marker.getLatLng(); handleLatLng(lat, lng) })
    map.on('click', (e) => { marker.setLatLng(e.latlng); handleLatLng(e.latlng.lat, e.latlng.lng) })

    mapInstance.current = map
    setTimeout(() => { map.invalidateSize(); setMapReady(true) }, 150)
    return () => { map.remove(); mapInstance.current = null; markerRef.current = null; setMapReady(false) }
  }, [mapLoaded, mode]) // eslint-disable-line

  // ── GPS trigger ───────────────────────────────────────────────────────────
  const triggerGPS = useCallback(() => {
    setLoading(true)
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
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'error')
        setLoading(false)
      }
    )
  }, [onLocationSelect])

  // ── Auto-try GPS once map ready ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || autoTriedRef.current) return
    autoTriedRef.current = true
    triggerGPS()
  }, [mapReady, triggerGPS])

  // ── Recalc fee when cart total changes ────────────────────────────────────
  useEffect(() => {
    if (!pinInfo) return
    const fee = calcFee(pinInfo.distKm, cartTotal)
    if (fee !== pinInfo.fee) {
      const updated = { ...pinInfo, fee }
      setPinInfo(updated)
      onLocationSelect({ address, lat: pinInfo.lat, lng: pinInfo.lng, distKm: pinInfo.distKm, fee })
    }
  }, [cartTotal]) // eslint-disable-line

  // ── Reload & ask again ────────────────────────────────────────────────────
  const handleReload = () => {
    markRetryOnReload()       // flag so GPS fires immediately after reload
    window.location.reload()
  }

  const switchMode = (m) => {
    if (m === mode) return
    if (m === 'map') { mapInstance.current = null; autoTriedRef.current = false }
    setMode(m)
  }

  const handleTextChange = (val) => {
    setAddress(val); setPinInfo(null)
    onLocationSelect({ address: val, lat: null, lng: null, distKm: null, fee: null })
  }

  const isDenied = geoStatus === 'denied'
  const isError  = geoStatus === 'error'
  const isAsking = geoStatus === 'asking'

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        .lp-tabs { display:flex; gap:8px; margin-bottom:12px; }
        .lp-tab {
          flex:1; padding:10px 8px; border-radius:10px; border:2px solid #e8ede9;
          background:#fff; font-weight:700; font-size:13px; cursor:pointer; color:#666;
          font-family:'Nunito',sans-serif; transition:all .2s;
        }
        .lp-tab.active { border-color:#1e6641; background:#f0faf3; color:#1e6641; }

        .lp-btn-gps {
          width:100%; margin-bottom:10px; padding:13px; border-radius:10px;
          background:linear-gradient(135deg,#1a3d28,#1e6641); color:#fff;
          font-weight:800; font-size:14px; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          font-family:'Nunito',sans-serif; box-shadow:0 4px 14px rgba(30,102,65,.3);
          transition:all .2s;
        }
        .lp-btn-gps:disabled { background:#94a3b8; box-shadow:none; cursor:not-allowed; }
        .lp-btn-gps:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(30,102,65,.35); }

        .lp-asking {
          background:#fff9ec; border:1.5px solid #fcd34d; border-radius:10px;
          padding:10px 13px; font-size:12.5px; color:#92400e; margin-bottom:10px;
          display:flex; gap:8px; align-items:center; line-height:1.6; font-weight:600;
        }

        /* ── Denied card ── */
        .lp-denied-card {
          border-radius:14px; overflow:hidden; margin-bottom:12px;
          border:1.5px solid #fca5a5; box-shadow:0 3px 14px rgba(220,38,38,.12);
          animation: lp-in .25s ease;
        }
        @keyframes lp-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

        .lp-denied-top {
          background:linear-gradient(135deg,#dc2626,#b91c1c);
          padding:13px 15px; display:flex; align-items:center; gap:10px;
        }
        .lp-denied-icon { font-size:28px; flex-shrink:0; }
        .lp-denied-title { color:#fff; font-weight:900; font-size:14px; margin:0 0 3px; line-height:1.3; }
        .lp-denied-sub {
          color:#fecaca; font-size:11px; font-weight:700; margin:0;
          display:flex; align-items:center; gap:5px; flex-wrap:wrap;
        }
        .lp-badge {
          background:rgba(255,255,255,.22); color:#fff; border-radius:20px;
          padding:1px 8px; font-size:10px; font-weight:800;
        }

        .lp-denied-body { background:#fff5f5; padding:15px; }

        /* steps */
        .lp-steps { list-style:none; margin:0 0 14px; padding:0; }
        .lp-step {
          display:flex; gap:12px; align-items:flex-start;
          padding:9px 0; position:relative;
        }
        .lp-step:not(:last-child)::after {
          content:''; position:absolute; left:12px; top:30px;
          width:2px; bottom:-1px; background:#fecaca;
        }
        .lp-step-num {
          width:24px; height:24px; border-radius:50%; flex-shrink:0;
          background:#dc2626; color:#fff; display:flex; align-items:center;
          justify-content:center; font-size:11px; font-weight:900;
          position:relative; z-index:1;
        }
        .lp-step-text {
          font-size:12.5px; color:#7f1d1d; font-weight:700;
          line-height:1.6; padding-top:2px;
        }
        .lp-code {
          display:inline-block; background:#fff; border:1.5px solid #fca5a5;
          border-radius:5px; padding:0px 6px; font-size:11px; font-weight:800;
          color:#991b1b; font-family:monospace; margin:0 1px;
        }

        .lp-tip {
          background:#fff; border:1.5px dashed #fca5a5; border-radius:9px;
          padding:9px 12px; font-size:11.5px; color:#7f1d1d; font-weight:600;
          line-height:1.6; margin-bottom:14px; display:flex; gap:8px;
        }

        .lp-btn-reload {
          width:100%; padding:12px; border-radius:10px;
          background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff;
          font-weight:900; font-size:14px; border:none; cursor:pointer;
          font-family:'Nunito',sans-serif; transition:all .2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow:0 4px 12px rgba(220,38,38,.3); margin-bottom:8px;
        }
        .lp-btn-reload:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(220,38,38,.35); }

        .lp-btn-retry {
          width:100%; padding:11px; border-radius:10px;
          background:transparent; color:#dc2626;
          font-weight:800; font-size:13px; border:2px solid #fca5a5; cursor:pointer;
          font-family:'Nunito',sans-serif; transition:all .2s;
          display:flex; align-items:center; justify-content:center; gap:7px;
          margin-bottom:8px;
        }
        .lp-btn-retry:hover { background:#fff5f5; }

        .lp-or-manual { text-align:center; font-size:11.5px; color:#991b1b; font-weight:700; }

        /* map */
        .lp-map-wrap {
          width:100%; height:300px; border-radius:14px; overflow:hidden;
          border:2px solid #e0e0e0; position:relative; box-shadow:0 2px 12px rgba(0,0,0,.1);
        }
        .lp-map-skeleton {
          height:300px; border-radius:14px; background:#f0faf3;
          display:flex; align-items:center; justify-content:center;
          flex-direction:column; gap:8px; color:#1e6641;
        }
        .lp-hint {
          font-size:11px; color:#888; text-align:center; margin-top:6px;
          display:flex; align-items:center; justify-content:center;
          gap:6px; flex-wrap:wrap;
        }

        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* ── Tabs ── */}
      <div className="lp-tabs">
        {[['map','📍 Pin on Map'],['text','✍️ Type Address']].map(([m,label]) => (
          <button key={m} type="button"
            className={`lp-tab${mode===m?' active':''}`}
            onClick={() => switchMode(m)}>{label}
          </button>
        ))}
      </div>

      {/* ── TEXT MODE ── */}
      {mode === 'text' && (
        <div>
          <textarea rows={3}
            placeholder="Enter your full delivery address (house no, street, area, city)..."
            value={address} onChange={e => handleTextChange(e.target.value)}
            style={{
              width:'100%', padding:'11px 14px', border:'2px solid #e8ede9', borderRadius:10,
              fontSize:14, outline:'none', background:'#fff', fontFamily:"'Nunito',sans-serif",
              resize:'vertical', transition:'border-color .2s', boxSizing:'border-box',
            }}
            onFocus={e => (e.target.style.borderColor='#52b788')}
            onBlur={e  => (e.target.style.borderColor='#e8ede9')}
          />
          <p style={{ fontSize:11, color:'#f59e0b', marginTop:4, fontWeight:700 }}>
            ⚠️ Typed address — delivery fee will be confirmed by our team on call.
          </p>
        </div>
      )}

      {/* ── MAP MODE ── */}
      {mode === 'map' && (
        <div>
          {/* GPS button */}
          <button type="button" className="lp-btn-gps"
            onClick={triggerGPS} disabled={loading || isAsking}>
            {loading || isAsking
              ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block',fontSize:16}}>⏳</span> Getting your location...</>
              : <>📍 Use My Current Location (GPS)</>
            }
          </button>

          {/* Asking hint */}
          {isAsking && !loading && (
            <div className="lp-asking">
              <span style={{fontSize:18,flexShrink:0}}>🔔</span>
              <span>Your browser is asking for location permission — please tap <strong>Allow</strong> when prompted.</span>
            </div>
          )}

          {/* ── Denied banner ── */}
          {isDenied && !loading && (
            <div className="lp-denied-card">
              <div className="lp-denied-top">
                <span className="lp-denied-icon">🚫</span>
                <div>
                  <p className="lp-denied-title">Location access is blocked</p>
                  <p className="lp-denied-sub">
                    Detected: <span className="lp-badge">📱 {env.os}</span>
                    <span className="lp-badge">🌐 {env.browser}</span>
                  </p>
                </div>
              </div>
              <div className="lp-denied-body">
                <ul className="lp-steps">
                  <li className="lp-step">
                    <span className="lp-step-num">1</span>
                    <span className="lp-step-text">
                      Open <strong>{env.lockLabel}</strong> — this controls what the site can access.
                    </span>
                  </li>
                  <li className="lp-step">
                    <span className="lp-step-num">2</span>
                    <span className="lp-step-text">
                      Find <span className="lp-code">Location</span> and change it
                      from <span className="lp-code">Block</span> to <span className="lp-code">Allow</span>.
                    </span>
                  </li>
                  <li className="lp-step">
                    <span className="lp-step-num">3</span>
                    <span className="lp-step-text">
                      Tap <strong>"Reload &amp; Ask Again"</strong> below — the browser will ask for your location fresh.
                    </span>
                  </li>
                </ul>

                <div className="lp-tip">
                  <span style={{flexShrink:0}}>💡</span>
                  <span>
                    Can't find the lock icon? Try your <strong>device settings</strong> instead:<br />
                    <span style={{opacity:.8,fontSize:11}}>{env.systemPath}</span>
                  </span>
                </div>

                {/* Primary CTA — reload so browser asks fresh */}
                <button type="button" className="lp-btn-reload" onClick={handleReload}>
                    Reload &amp; Ask Again
                </button>

                <p className="lp-or-manual">— or tap the map below to pin your location manually —</p>
              </div>
            </div>
          )}

          {/* ── GPS error (signal / timeout) banner ── */}
          {isError && !loading && (
            <div className="lp-denied-card">
              <div className="lp-denied-top">
                <span className="lp-denied-icon">📡</span>
                <div>
                  <p className="lp-denied-title">Could not detect your location</p>
                  <p className="lp-denied-sub">GPS signal weak or timed out</p>
                </div>
              </div>
              <div className="lp-denied-body">
                <div className="lp-tip" style={{marginBottom:14}}>
                  <span style={{flexShrink:0}}>💡</span>
                  <span>
                    Make sure location is turned on in your device settings, move to an open area for a better signal,
                    then tap <strong>Try Again</strong> — or just pin your location on the map below.
                  </span>
                </div>
                <button type="button" className="lp-btn-reload" onClick={triggerGPS}>
                    Try Again
                </button>
                <p className="lp-or-manual">— or tap the map below to pin manually —</p>
              </div>
            </div>
          )}

          {/* Map */}
          {!mapLoaded ? (
            <div className="lp-map-skeleton">
              <div style={{fontSize:32,animation:'spin 1s linear infinite'}}>🗺️</div>
              <div style={{fontWeight:700,fontSize:13}}>Loading map...</div>
            </div>
          ) : (
            <div className="lp-map-wrap">
              <div ref={mapRef} style={{width:'100%',height:'100%'}} />
              {loading && (
                <div style={{
                  position:'absolute', inset:0, background:'rgba(255,255,255,.75)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:800, color:'#1e6641', gap:8, zIndex:999, borderRadius:14,
                }}>
                  <span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span>
                  Getting your address...
                </div>
              )}
            </div>
          )}

          <div className="lp-hint">
            <span>🏪 Green = Our shop</span><span>·</span>
            <span>📍 Red = Your location</span><span>·</span>
            <span>Tap map or drag pin to change</span>
          </div>
        </div>
      )}
    </div>
  )
}
