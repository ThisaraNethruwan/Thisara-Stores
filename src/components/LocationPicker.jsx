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

  useEffect(() => { cartTotalRef.current = cartTotal }, [cartTotal])

  // ── Load Leaflet ──────────────────────────────────────────────────────────
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

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || mode !== 'map' || !mapRef.current || mapInstance.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      zoomControl: true,
      tap: true,
      tapTolerance: 15,
    }).setView([SHOP_LAT, SHOP_LNG], 15)

    // ── Google Maps tile layer — looks exactly like Google Maps ─────────────
    // Uses Google's satellite+labels hybrid style which is familiar to everyone
    // and shows Sri Lankan place names, roads, and landmarks correctly.
    L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK',
      {
        attribution: '© Google Maps',
        maxZoom: 20,
        // Rotate between Google tile servers for performance
        subdomains: ['mt0','mt1','mt2','mt3'],
      }
    ).addTo(map)

    // Use proper subdomains for load balancing
    // Override with the correct URL format
    map.eachLayer(layer => {
      if (layer._url && layer._url.includes('google')) {
        map.removeLayer(layer)
      }
    })

    // Re-add with proper subdomain rotation
    L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK',
      {
        subdomains: ['mt0','mt1','mt2','mt3'],
        attribution: '© Google Maps',
        maxZoom: 20,
      }
    ).addTo(map)

    // ── Shop marker ──────────────────────────────────────────────────────────
    const shopIcon = L.divIcon({
      html: `<div style="background:#1e6641;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);">🏪</div>`,
      className: '', iconSize: [40, 40], iconAnchor: [20, 20],
    })
    L.marker([SHOP_LAT, SHOP_LNG], { icon: shopIcon })
      .addTo(map)
      .bindPopup('<b style="font-family:sans-serif">🏪 Thisara Stores</b><br><small>Our Shop Location</small>')

    // ── Delivery marker ──────────────────────────────────────────────────────
    const deliveryIcon = L.divIcon({
      html: `
        <div style="position:relative;width:32px;height:44px;">
          <div style="
            background:#e63946;width:32px;height:32px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);border:3px solid #fff;
            box-shadow:0 2px 12px rgba(0,0,0,.4);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:16px;">📍</span>
          </div>
          <div style="
            width:6px;height:6px;background:#e63946;border-radius:50%;
            position:absolute;bottom:0;left:50%;transform:translateX(-50%);
            box-shadow:0 1px 4px rgba(0,0,0,.3);
          "></div>
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

    setTimeout(() => {
      map.invalidateSize()
      setMapReady(true)
    }, 150)

    return () => {
      map.remove()
      mapInstance.current = null
      markerRef.current   = null
      setMapReady(false)
    }
  }, [mapLoaded, mode]) // eslint-disable-line

  // ── Auto-try GPS once map ready ───────────────────────────────────────────
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
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'error')
        setGeoMsg(
          err.code === 1
            ? 'Location access denied. Tap "Use My Location" to try again, or pin manually on the map.'
            : 'Could not get your location. Please pin manually on the map.'
        )
        setLoading(false)
      }
    )
  }, [mapReady]) // eslint-disable-line

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

  // ── Manual GPS button ─────────────────────────────────────────────────────
  const useMyLocation = useCallback(() => {
    setGeoMsg('')
    setGeoStatus('asking')
    setLoading(true)

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
      },
      (err) => {
        setLoading(false)
        if (err.code === 1) {
          setGeoStatus('denied')
          const ua = navigator.userAgent
          const isIOS = /iPhone|iPad|iPod/.test(ua)
          const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
          const isFirefox = /Firefox/.test(ua)
          let helpMsg = ''
          if (isIOS) helpMsg = 'On iPhone/iPad: Settings → Privacy & Security → Location Services → Safari → Allow.'
          else if (isSafari) helpMsg = 'Safari menu → Settings for This Website → Location → Allow.'
          else if (isFirefox) helpMsg = 'Click the 🔒 lock icon in the address bar → Permissions → Use Location.'
          else helpMsg = 'Click the 🔒 lock icon in your browser address bar → Site Settings → Location → Allow.'
          setGeoMsg(helpMsg)
        } else {
          setGeoStatus('error')
          setGeoMsg('Location unavailable. Please pin your location manually on the map.')
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
        .lp-denied { background:#fff5f5; border:1.5px solid #fca5a5; border-radius:8px; padding:10px 12px; font-size:12px; color:#b91c1c; margin-bottom:10px; line-height:1.6; }
        .lp-map-wrap { width:100%; height:300px; border-radius:14px; overflow:hidden; border:2px solid #e0e0e0; position:relative; box-shadow:0 2px 12px rgba(0,0,0,.1); }
        .lp-map-skeleton { height:300px; border-radius:14px; background:#f0faf3; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:8px; color:#1e6641; }
        .lp-pin-info { margin-top:10px; border-radius:12px; padding:12px 14px; font-size:13px; }
        .lp-hint { font-size:11px; color:#888; text-align:center; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:6px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .lp-loading-dot { animation:lp-pulse 1.2s ease infinite; }
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

          {isAsking && !loading && (
            <div className="lp-asking">
              <span style={{ fontSize:16, flexShrink:0 }}>🔔</span>
              <span>Your browser is asking for location permission — please tap <strong>Allow</strong> when prompted.</span>
            </div>
          )}

          {(geoStatus === 'denied' || geoStatus === 'error') && geoMsg && (
            <div className="lp-denied">
              <strong>{geoStatus === 'denied' ? '🚫 Location access denied.' : '⚠️ Location unavailable.'}</strong>
              <br />{geoMsg}<br />
              <span style={{ color:'#555' }}>You can also pin your location manually by clicking or dragging on the map below.</span>
            </div>
          )}

          {/* Map */}
          {!mapLoaded ? (
            <div className="lp-map-skeleton">
              <div style={{ fontSize:32, animation:'spin 1s linear infinite' }}>🗺️</div>
              <div style={{ fontWeight:700, fontSize:13 }}>Loading Google Maps...</div>
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
