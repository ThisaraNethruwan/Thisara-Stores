import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_LAT               = 7.015468376212816
const SHOP_LNG               = 79.91953996256439
const DELIVERY_RATE_PER_KM   = 70
const FREE_DELIVERY_THRESHOLD = 10000
const MIN_DELIVERY_FEE        = 100

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
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

// ─── Core geolocation call (cross-browser safe) ───────────────────────────────
// maximumAge: 0  → never use a cached position
// timeout: 20000 → give browsers like Safari more time
function doGetCurrentPosition(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError({ code: 0, message: 'Geolocation is not supported by this browser.' })
    return
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
  })
}

// ─── Check current permission state (Permissions API — not available on all browsers) ──
// Returns: 'granted' | 'denied' | 'prompt' | 'unknown'
async function checkPermissionState() {
  try {
    if (!navigator.permissions) return 'unknown'
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result.state // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown'
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LocationPicker({ onLocationSelect, initialAddress = '', cartTotal = 0 }) {
  const mapRef        = useRef(null)
  const mapInstance   = useRef(null)
  const markerRef     = useRef(null)
  const cartTotalRef  = useRef(cartTotal)
  const mountedRef    = useRef(true)
  const permListenRef = useRef(null) // Permissions API listener

  const [mode, setMode]             = useState('map')
  const [address, setAddress]       = useState(initialAddress)
  const [loading, setLoading]       = useState(false)
  const [pinInfo, setPinInfo]       = useState(null)
  const [mapLoaded, setMapLoaded]   = useState(false)
  const [mapReady, setMapReady]     = useState(false)

  // geoStatus: 'idle' | 'asking' | 'waiting_user' | 'fetching' | 'success' | 'denied' | 'error'
  const [geoStatus, setGeoStatus]   = useState('idle')
  const [geoMsg, setGeoMsg]         = useState('')
  const [permState, setPermState]   = useState('unknown') // 'granted'|'denied'|'prompt'|'unknown'

  useEffect(() => { cartTotalRef.current = cartTotal }, [cartTotal])

  // ── Track component alive ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Clean up Permissions API listener
      if (permListenRef.current) {
        try { permListenRef.current.removeEventListener('change', permListenRef._handler) } catch {}
      }
    }
  }, [])

  // ── Load Leaflet once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return }
    if (document.getElementById('leaflet-css-ts')) {
      const check = setInterval(() => {
        if (window.L) { setMapLoaded(true); clearInterval(check) }
      }, 100)
      return () => clearInterval(check)
    }
    const css    = document.createElement('link')
    css.id       = 'leaflet-css-ts'
    css.rel      = 'stylesheet'
    css.href     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script    = document.createElement('script')
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload   = () => setMapLoaded(true)
    script.onerror  = () => setMapLoaded(false)
    document.head.appendChild(script)
  }, [])

  // ── Init Leaflet map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || mode !== 'map' || !mapRef.current || mapInstance.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      zoomControl: true,
      tap: true,
      tapTolerance: 15,
    }).setView([SHOP_LAT, SHOP_LNG], 15)

    // Google Maps tiles (more familiar for Sri Lankan users)
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
      maxZoom: 20,
    }).addTo(map)

const shopIcon = L.divIcon({
  html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);overflow:hidden;background:#fff;">
           <img src="/logo-round.png" alt="Thisara Stores" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
         </div>`,
  className: '', iconSize: [44, 44], iconAnchor: [22, 22],
})
    L.marker([SHOP_LAT, SHOP_LNG], { icon: shopIcon })
      .addTo(map)
      .bindPopup('<b style="font-family:sans-serif">🏪 Thisara Stores</b>')

    // Delivery pin marker
    const deliveryIcon = L.divIcon({
      html: `
        <div style="position:relative;width:36px;height:48px;">
          <div style="background:#e63946;width:36px;height:36px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);border:3px solid #fff;
            box-shadow:0 2px 12px rgba(0,0,0,.4);
            display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);font-size:18px;">📍</span>
          </div>
          <div style="width:6px;height:6px;background:#e63946;border-radius:50%;
            position:absolute;bottom:0;left:50%;transform:translateX(-50%);
            box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
        </div>`,
      className: '', iconSize: [36, 48], iconAnchor: [18, 48],
    })

    const marker = L.marker([SHOP_LAT, SHOP_LNG], { icon: deliveryIcon, draggable: true }).addTo(map)
    markerRef.current = marker

    const handleLatLng = async (lat, lng) => {
      if (!mountedRef.current) return
      setLoading(true)
      setGeoStatus('fetching')
      setGeoMsg('')
      const addr   = await reverseGeocode(lat, lng)
      const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
      const fee    = calcFee(distKm, cartTotalRef.current)
      if (!mountedRef.current) return
      setAddress(addr)
      setPinInfo({ lat, lng, distKm, fee })
      onLocationSelect({ address: addr, lat, lng, distKm, fee })
      setGeoStatus('success')
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

    setTimeout(() => {
      if (!mountedRef.current) return
      map.invalidateSize()
      setMapReady(true)
    }, 200)

    return () => {
      map.remove()
      mapInstance.current = null
      markerRef.current   = null
      setMapReady(false)
    }
  }, [mapLoaded, mode]) // eslint-disable-line

  // ── Core GPS fetch (shared by auto-trigger + manual button) ───────────────
  const fetchGPS = useCallback(async () => {
    if (!mountedRef.current) return
    setGeoMsg('')
    setGeoStatus('asking')
    setLoading(true)

    doGetCurrentPosition(
      async (pos) => {
        if (!mountedRef.current) return
        const { latitude: lat, longitude: lng } = pos.coords

        // Move map & marker
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        }

        setGeoStatus('fetching')
        const addr   = await reverseGeocode(lat, lng)
        const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
        const fee    = calcFee(distKm, cartTotalRef.current)

        if (!mountedRef.current) return
        setAddress(addr)
        setPinInfo({ lat, lng, distKm, fee })
        onLocationSelect({ address: addr, lat, lng, distKm, fee })
        setGeoStatus('success')
        setGeoMsg('')
        setLoading(false)
        setPermState('granted')
      },
      (err) => {
        if (!mountedRef.current) return
        setLoading(false)
        if (err.code === 1) {
          // PERMISSION_DENIED
          setGeoStatus('denied')
          setPermState('denied')
          setGeoMsg('Location access was blocked. Please allow location in your browser settings and tap the button again.')
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setGeoStatus('error')
          setGeoMsg('Your device could not determine your location. Please pin your location on the map below.')
        } else if (err.code === 3) {
          // TIMEOUT
          setGeoStatus('error')
          setGeoMsg('Location request timed out. Please check your GPS/network and try again, or pin manually on the map.')
        } else {
          setGeoStatus('error')
          setGeoMsg('Location is not supported on this browser. Please pin your location on the map.')
        }
      }
    )
  }, [onLocationSelect])

  // ── AUTO-TRIGGER: always fire GPS when map is ready, every time ────────────
  // This runs every time the cart page mounts — no autoTriedRef guard.
  // On browsers where permission was already granted, it silently succeeds.
  // On browsers that need to prompt (or were set to "ask every time"), it shows the prompt.
  useEffect(() => {
    if (!mapReady) return

    // Check permission state first to give best UX feedback
    checkPermissionState().then((state) => {
      if (!mountedRef.current) return
      setPermState(state)

      if (state === 'denied') {
        // Already denied — show helpful message immediately, don't fire the blocked API
        setGeoStatus('denied')
        setGeoMsg('Location access is blocked in your browser. Please update your browser/site settings to allow location, then refresh the page.')
        setLoading(false)
        return
      }

      // 'granted', 'prompt', or 'unknown' → always attempt
      fetchGPS()
    })

    // ── Listen for permission changes (e.g. user allows after seeing denied state) ──
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((permResult) => {
        if (!mountedRef.current) return
        const handler = () => {
          if (!mountedRef.current) return
          const newState = permResult.state
          setPermState(newState)
          if (newState === 'granted') {
            // Permission was just granted (e.g. user changed settings) — auto-fetch
            fetchGPS()
          } else if (newState === 'denied') {
            setGeoStatus('denied')
            setGeoMsg('Location access was blocked. Please allow location in your browser settings.')
          }
        }
        permResult.addEventListener('change', handler)
        permListenRef.current = permResult
        permListenRef._handler = handler
      }).catch(() => {})
    }
  }, [mapReady, fetchGPS])

  // ── Recalculate delivery fee when cart total changes ──────────────────────
  useEffect(() => {
    if (!pinInfo) return
    const fee = calcFee(pinInfo.distKm, cartTotal)
    if (fee !== pinInfo.fee) {
      const updated = { ...pinInfo, fee }
      setPinInfo(updated)
      onLocationSelect({ address, lat: pinInfo.lat, lng: pinInfo.lng, distKm: pinInfo.distKm, fee })
    }
  }, [cartTotal]) // eslint-disable-line

  // ── Manual GPS button ─────────────────────────────────────────────────────
  const handleGPSClick = useCallback(() => {
    if (permState === 'denied') {
      // Give clear instructions depending on browser/OS
      const ua = navigator.userAgent.toLowerCase()
      let instructions = 'To allow location: open your browser settings → Site Settings → Location → Allow this site.'

      if (/iphone|ipad|ipod/.test(ua)) {
        instructions = 'On iOS: go to Settings → Privacy → Location Services → Safari/Chrome → Allow While Using App, then refresh the page.'
      } else if (/android/.test(ua)) {
        instructions = 'On Android: tap the lock icon 🔒 in your address bar → Permissions → Location → Allow.'
      } else if (/chrome/.test(ua)) {
        instructions = 'In Chrome: click the 🔒 lock icon in the address bar → Site Settings → Location → Allow.'
      } else if (/firefox/.test(ua)) {
        instructions = 'In Firefox: click the 🔒 lock icon → Connection → More Information → Permissions → Allow Location.'
      } else if (/safari/.test(ua)) {
        instructions = 'In Safari: go to Safari menu → Settings for This Website → Location → Allow.'
      }

      setGeoMsg(instructions)
      setGeoStatus('denied')
      return
    }
    fetchGPS()
  }, [permState, fetchGPS])

  // ── Text mode ─────────────────────────────────────────────────────────────
  const handleTextChange = (val) => {
    setAddress(val)
    setPinInfo(null)
    onLocationSelect({ address: val, lat: null, lng: null, distKm: null, fee: null })
  }

  // ── Switch modes ──────────────────────────────────────────────────────────
  const switchMode = (m) => {
    if (m === mode) return
    if (m === 'map') {
      // Reset map so it re-inits and auto-GPS fires again
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
      markerRef.current = null
      setMapReady(false)
      setGeoStatus('idle')
      setGeoMsg('')
    }
    setMode(m)
  }

  // ─── Derived UI state ────────────────────────────────────────────────────
  const isAsking  = geoStatus === 'asking' || geoStatus === 'waiting_user'
  const isFetching = geoStatus === 'fetching'
  const isBusy    = loading || isAsking || isFetching
  const isSuccess = geoStatus === 'success'
  const isDenied  = geoStatus === 'denied'
  const isError   = geoStatus === 'error'

  // Button label
  let btnLabel
  if (isAsking) btnLabel = <><SpinIcon /> Waiting for permission...</>
  else if (isFetching) btnLabel = <><SpinIcon /> Getting your location...</>
  else if (isSuccess) btnLabel = <>✅ Location successfully updated</>
  else btnLabel = <>📍 Use My Current Location (GPS)</>

  return (
    <div>
      <style>{`
        .lp-tabs{display:flex;gap:8px;margin-bottom:12px}
        .lp-tab{flex:1;padding:10px 8px;border-radius:10px;border:2px solid #e8ede9;background:#fff;font-weight:700;font-size:13px;cursor:pointer;color:#666;font-family:'Nunito',sans-serif;transition:all .2s}
        .lp-tab.active{border-color:#1e6641;background:#f0faf3;color:#1e6641}
        .lp-tab:hover:not(.active){background:#f9fdf9;border-color:#a7f3c0}

        .lp-btn-gps{width:100%;margin-bottom:10px;padding:13px 16px;border-radius:12px;color:#fff;font-weight:800;font-size:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:'Nunito',sans-serif;transition:all .2s;letter-spacing:.2px}
        .lp-btn-gps.idle,.lp-btn-gps.error{background:linear-gradient(135deg,#1a3d28,#1e6641);box-shadow:0 4px 14px rgba(30,102,65,.3)}
        .lp-btn-gps.idle:hover,.lp-btn-gps.error:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(30,102,65,.35)}
        .lp-btn-gps.asking,.lp-btn-gps.fetching{background:linear-gradient(135deg,#1a3d28,#1e6641);opacity:.85;cursor:wait}
        .lp-btn-gps.success{background:linear-gradient(135deg,#065f46,#059669);box-shadow:0 4px 14px rgba(5,150,105,.3)}
        .lp-btn-gps.success:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(5,150,105,.35)}
        .lp-btn-gps.denied{background:linear-gradient(135deg,#7f1d1d,#b91c1c);box-shadow:0 4px 14px rgba(185,28,28,.25)}
        .lp-btn-gps.denied:hover{transform:translateY(-1px)}

        .lp-banner{border-radius:10px;padding:11px 14px;font-size:12.5px;margin-bottom:10px;display:flex;gap:9px;align-items:flex-start;line-height:1.65;font-family:'Nunito',sans-serif}
        .lp-banner-asking{background:#fff9ec;border:1.5px solid #fcd34d;color:#92400e}
        .lp-banner-denied{background:#fff5f5;border:1.5px solid #fca5a5;color:#991b1b}
        .lp-banner-error{background:#fefce8;border:1.5px solid #fde047;color:#713f12}
        .lp-banner-success{background:#f0fdf4;border:1.5px solid #86efac;color:#166534}

        .lp-map-wrap{width:100%;height:300px;border-radius:14px;overflow:hidden;border:2px solid #e0e0e0;position:relative;box-shadow:0 2px 12px rgba(0,0,0,.1)}
        .lp-map-skeleton{height:300px;border-radius:14px;background:#f0faf3;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#1e6641}
        .lp-hint{font-size:11px;color:#888;text-align:center;margin-top:7px;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
        .lp-overlay{position:absolute;inset:0;background:rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#1e6641;gap:8px;z-index:999;border-radius:12px;backdrop-filter:blur(2px)}

        @keyframes lp-spin{to{transform:rotate(360deg)}}
        .lp-spin{display:inline-block;animation:lp-spin 0.8s linear infinite}
        @keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .lp-pulse{animation:lp-pulse 1.4s ease infinite}
      `}</style>

      {/* ── Mode tabs ── */}
      <div className="lp-tabs">
        {[['map', '📍 Pin on Map'], ['text', '✍️ Type Address']].map(([m, label]) => (
          <button key={m} type="button"
            className={`lp-tab${mode === m ? ' active' : ''}`}
            onClick={() => switchMode(m)}
          >{label}</button>
        ))}
      </div>

      {/* ── TEXT MODE ── */}
      {mode === 'text' && (
        <div>
          <textarea
            rows={3}
            placeholder="Enter your full delivery address (house no, street, area, city)..."
            value={address}
            onChange={e => handleTextChange(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px',
              border: '2px solid #e8ede9', borderRadius: 10,
              fontSize: 14, outline: 'none', background: '#fff',
              fontFamily: "'Nunito',sans-serif", resize: 'vertical',
              transition: 'border-color .2s', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#52b788')}
            onBlur={e => (e.target.style.borderColor = '#e8ede9')}
          />
          <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>
            ⚠️ Typed address — delivery fee will be confirmed by our team on call.
          </p>
        </div>
      )}

      {/* ── MAP MODE ── */}
      {mode === 'map' && (
        <div>
          {/* GPS button */}
          <button
            type="button"
            className={`lp-btn-gps ${isDenied ? 'denied' : isBusy ? (isAsking ? 'asking' : 'fetching') : isSuccess ? 'success' : 'idle'}`}
            onClick={handleGPSClick}
            disabled={isBusy}
          >
            {btnLabel}
          </button>

          {/* Status banners */}
          {isAsking && (
            <div className="lp-banner lp-banner-asking">
              <span style={{ fontSize: 18, flexShrink: 0 }} className="lp-pulse">🔔</span>
              <span>
                <strong>Allow location access</strong> — your browser should be showing a permission prompt.
                Tap <strong>"Allow"</strong> (or <strong>"While Using"</strong>) to continue.
              </span>
            </div>
          )}

          {isFetching && (
            <div className="lp-banner lp-banner-asking">
              <span style={{ fontSize: 18, flexShrink: 0 }} className="lp-spin">⏳</span>
              <span>Locating you on the map...</span>
            </div>
          )}

       

          {isDenied && (
            <div className="lp-banner lp-banner-denied">
              <span style={{ fontSize: 18, flexShrink: 0 }}>🚫</span>
              <div>
                <strong>Location access blocked.</strong><br />
                {geoMsg && <span>{geoMsg}</span>}
                {!geoMsg && <span>Please allow location in your browser or device settings, then tap the button again.</span>}
                <br />
                <span style={{ color: '#666', fontSize: 12, marginTop: 4, display: 'block' }}>
                  Or drag the red pin / tap the map to set your location manually.
                </span>
              </div>
            </div>
          )}

          {isError && (
            <div className="lp-banner lp-banner-error">
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <div>
                <strong>Could not detect location.</strong><br />
                {geoMsg && <span>{geoMsg}</span>}
                <br />
                <span style={{ color: '#666', fontSize: 12, marginTop: 4, display: 'block' }}>
                  Drag the red pin or tap the map to set your delivery location manually.
                </span>
              </div>
            </div>
          )}

          {/* Map container */}
          {!mapLoaded ? (
            <div className="lp-map-skeleton">
              <div style={{ fontSize: 32 }} className="lp-spin">🗺️</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Loading Map...</div>
            </div>
          ) : (
            <div className="lp-map-wrap">
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
              {(loading || isFetching) && (
                <div className="lp-overlay">
                  <span className="lp-spin">⏳</span>
                  Getting address...
                </div>
              )}
            </div>
          )}

          <div className="lp-hint">
            <span>🏪 Green = Our Shop</span>
            <span>·</span>
            <span>📍 Red = Your delivery pin</span>
            <span>·</span>
            <span>Tap map or drag pin</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SpinIcon() {
  return <span style={{ display: 'inline-block', animation: 'lp-spin 0.8s linear infinite', fontSize: 16 }}>⏳</span>
}
