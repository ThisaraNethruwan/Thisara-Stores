import { useState, useEffect, useRef, useCallback } from 'react'

const SHOP_LAT = 7.0278
const SHOP_LNG = 79.9212
const DELIVERY_RATE_PER_KM = 70
const FREE_DELIVERY_THRESHOLD = 10000
const MIN_DELIVERY_FEE = 100

// ── Distance / fee helpers ────────────────────────────────────────────────────
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

// ── Reverse geocode ───────────────────────────────────────────────────────────
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

// ── Geolocation wrapper ───────────────────────────────────────────────────────
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

// ── Smart device / browser detector ──────────────────────────────────────────
function detectEnvironment() {
  const ua = navigator.userAgent

  // OS
  const isIOS     = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isMac     = !isIOS && /Macintosh|MacIntel/.test(ua)
  const isWindows = /Windows/.test(ua)

  // Browser (order matters — Chrome check must come before Safari)
  const isEdge    = /Edg\//.test(ua)
  const isChrome  = !isEdge && /Chrome\//.test(ua) && !/Chromium/.test(ua)
  const isFirefox = /Firefox\//.test(ua)
  const isSamsung = /SamsungBrowser/.test(ua)
  const isOpera   = /OPR\/|Opera\//.test(ua)
  const isSafari  = !isChrome && !isEdge && !isFirefox && !isSamsung && !isOpera && /Safari\//.test(ua)

  // Device category
  const isMobile  = isIOS || isAndroid
  const isDesktop = !isMobile

  // Human-readable labels
  const osLabel      = isIOS ? 'iPhone / iPad' : isAndroid ? 'Android' : isMac ? 'Mac' : isWindows ? 'Windows' : 'Desktop'
  const browserLabel = isEdge ? 'Microsoft Edge' : isChrome ? 'Google Chrome' : isFirefox ? 'Firefox' : isSamsung ? 'Samsung Internet' : isOpera ? 'Opera' : isSafari ? 'Safari' : 'your browser'

  return { isIOS, isAndroid, isMac, isWindows, isMobile, isDesktop, isEdge, isChrome, isFirefox, isSamsung, isOpera, isSafari, osLabel, browserLabel }
}

// ── Precise fix steps per device+browser combo ────────────────────────────────
function getLocationFixSteps(env) {
  const { isIOS, isAndroid, isMac, isWindows, isChrome, isEdge, isFirefox, isSamsung, isOpera, isSafari } = env

  // ── iOS ──────────────────────────────────────────────────────────────────
  if (isIOS && isSafari) {
    return {
      icon: '🍎',
      title: 'Enable Location on iPhone / iPad (Safari)',
      steps: [
        'Open the iPhone Settings app.',
        'Scroll down and tap Privacy & Security.',
        'Tap Location Services and make sure it is turned ON.',
        'Scroll down and tap Safari Websites.',
        'Set "While Using the App" or "Ask Next Time".',
        'Return here and tap "Use My Current Location" again.',
      ],
      tip: 'Also make sure you haven\'t blocked location for this specific site: Settings → Safari → Advanced → Website Data.',
    }
  }

  if (isIOS && isChrome) {
    return {
      icon: '🍎',
      title: 'Enable Location on iPhone / iPad (Chrome)',
      steps: [
        'Open the iPhone Settings app.',
        'Scroll down and tap Chrome.',
        'Tap Location and select "While Using the App".',
        'Return to this page and tap "Use My Current Location" again.',
      ],
      tip: 'If the option is missing, go to Settings → Privacy & Security → Location Services → Chrome.',
    }
  }

  if (isIOS && isEdge) {
    return {
      icon: '🍎',
      title: 'Enable Location on iPhone / iPad (Edge)',
      steps: [
        'Open the iPhone Settings app.',
        'Scroll down and tap Microsoft Edge.',
        'Tap Location and choose "While Using the App".',
        'Come back to this page and try again.',
      ],
    }
  }

  if (isIOS) {
    // Generic iOS fallback for any other browser
    return {
      icon: '🍎',
      title: 'Enable Location on iPhone / iPad',
      steps: [
        'Open Settings on your iPhone.',
        'Go to Privacy & Security → Location Services.',
        'Find your browser app in the list and tap it.',
        'Select "While Using the App".',
        'Return here and tap "Use My Current Location" again.',
      ],
    }
  }

  // ── Android ──────────────────────────────────────────────────────────────
  if (isAndroid && isChrome) {
    return {
      icon: '🤖',
      title: 'Enable Location on Android (Chrome)',
      steps: [
        'Tap the 🔒 lock icon (or ℹ️ info icon) in the address bar.',
        'Tap Permissions or Site Settings.',
        'Tap Location.',
        'Select Allow.',
        'Reload this page, then tap "Use My Current Location" again.',
      ],
      tip: 'Also check: Android Settings → Apps → Chrome → Permissions → Location → Allow.',
    }
  }

  if (isAndroid && isEdge) {
    return {
      icon: '🤖',
      title: 'Enable Location on Android (Edge)',
      steps: [
        'Tap the 🔒 or ℹ️ icon in the address bar.',
        'Tap Permissions.',
        'Tap Location and select Allow.',
        'Reload the page and try again.',
      ],
      tip: 'If still blocked: Android Settings → Apps → Edge → Permissions → Location → Allow.',
    }
  }

  if (isAndroid && isFirefox) {
    return {
      icon: '🤖',
      title: 'Enable Location on Android (Firefox)',
      steps: [
        'Tap the three-dot menu (⋮) at the top right.',
        'Tap Settings → Site Permissions.',
        'Tap Location.',
        'Find this site and change it to Allowed.',
        'Reload the page and tap "Use My Current Location" again.',
      ],
    }
  }

  if (isAndroid && isSamsung) {
    return {
      icon: '🤖',
      title: 'Enable Location on Android (Samsung Internet)',
      steps: [
        'Tap the three-line menu (≡) at the bottom.',
        'Tap Settings → Sites and Downloads.',
        'Tap Site Permissions → Location.',
        'Find this site and set it to Allow.',
        'Reload the page and try again.',
      ],
      tip: 'Also check: Android Settings → Apps → Samsung Internet → Permissions → Location.',
    }
  }

  if (isAndroid && isOpera) {
    return {
      icon: '🤖',
      title: 'Enable Location on Android (Opera)',
      steps: [
        'Tap the Opera "O" icon at the bottom.',
        'Go to Settings → Privacy → Site settings.',
        'Tap Location → find this site and Allow.',
        'Reload and try again.',
      ],
    }
  }

  if (isAndroid) {
    return {
      icon: '🤖',
      title: 'Enable Location on Android',
      steps: [
        'Tap the 🔒 or ℹ️ icon in your browser\'s address bar.',
        'Tap Permissions → Location → Allow.',
        'If not available, go to: Android Settings → Apps → [Your Browser] → Permissions → Location → Allow.',
        'Reload the page and tap "Use My Current Location" again.',
      ],
    }
  }

  // ── macOS ────────────────────────────────────────────────────────────────
  if (isMac && isSafari) {
    return {
      icon: '💻',
      title: 'Enable Location on Mac (Safari)',
      steps: [
        'In the menu bar, click Safari → Settings (or Preferences).',
        'Click the Websites tab.',
        'Click Location in the left sidebar.',
        'Find this website and change "Deny" to "Allow".',
        'Refresh the page and tap "Use My Current Location" again.',
      ],
      tip: 'Also check: System Settings → Privacy & Security → Location Services → Safari → Enable.',
    }
  }

  if (isMac && isChrome) {
    return {
      icon: '💻',
      title: 'Enable Location on Mac (Chrome)',
      steps: [
        'Click the 🔒 lock icon in Chrome\'s address bar.',
        'Click Site settings.',
        'Next to Location, click the dropdown and choose Allow.',
        'Reload the page and click "Use My Current Location" again.',
      ],
      tip: 'If blocked at system level: System Settings → Privacy & Security → Location Services → Google Chrome → Enable.',
    }
  }

  if (isMac && isEdge) {
    return {
      icon: '💻',
      title: 'Enable Location on Mac (Microsoft Edge)',
      steps: [
        'Click the 🔒 lock icon in Edge\'s address bar.',
        'Click Permissions for this site.',
        'Find Location and set it to Allow.',
        'Reload the page and click "Use My Current Location" again.',
      ],
      tip: 'System level: System Settings → Privacy & Security → Location Services → Microsoft Edge → Enable.',
    }
  }

  if (isMac && isFirefox) {
    return {
      icon: '💻',
      title: 'Enable Location on Mac (Firefox)',
      steps: [
        'Click the 🔒 lock icon in Firefox\'s address bar.',
        'Click the "×" next to "Block Location".',
        'Reload the page — Firefox will ask for permission again.',
        'Click Allow when prompted.',
      ],
      tip: 'Or go to Firefox menu → Settings → Privacy & Security → Permissions → Location → Settings, find this site and set to Allow.',
    }
  }

  // ── Windows ──────────────────────────────────────────────────────────────
  if (isWindows && isChrome) {
    return {
      icon: '🖥️',
      title: 'Enable Location on Windows (Chrome)',
      steps: [
        'Click the 🔒 lock icon in Chrome\'s address bar.',
        'Click Site settings.',
        'Next to Location, choose Allow.',
        'Reload the page and click "Use My Current Location" again.',
      ],
      tip: 'System level: Windows Settings → Privacy & Security → Location → Allow apps to access location → On.',
    }
  }

  if (isWindows && isEdge) {
    return {
      icon: '🖥️',
      title: 'Enable Location on Windows (Microsoft Edge)',
      steps: [
        'Click the 🔒 lock icon in Edge\'s address bar.',
        'Click Permissions for this site.',
        'Set Location to Allow.',
        'Reload the page and click "Use My Current Location" again.',
      ],
      tip: 'System level: Windows Settings → Privacy & Security → Location → Make sure Location access is On.',
    }
  }

  if (isWindows && isFirefox) {
    return {
      icon: '🖥️',
      title: 'Enable Location on Windows (Firefox)',
      steps: [
        'Click the 🔒 lock icon in Firefox\'s address bar.',
        'Remove the "Block Location" permission by clicking the × next to it.',
        'Reload the page — Firefox will ask again.',
        'Click Allow when the permission dialog appears.',
      ],
    }
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  return {
    icon: '🌐',
    title: 'Enable Location Access',
    steps: [
      'Click the 🔒 lock or ℹ️ info icon in your browser\'s address bar.',
      'Find the Location or Permissions section.',
      'Change Location to "Allow".',
      'Reload the page and tap "Use My Current Location" again.',
    ],
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [geoStatus, setGeoStatus] = useState('idle')   // idle | asking | denied | error
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapReady, setMapReady]   = useState(false)
  const [env]                     = useState(() => detectEnvironment())
  const [stepsOpen, setStepsOpen] = useState(false)

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
    css.id    = 'leaflet-css'
    css.rel   = 'stylesheet'
    css.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script    = document.createElement('script')
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload   = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || mode !== 'map' || !mapRef.current || mapInstance.current) return
    const L = window.L

    const map = L.map(mapRef.current, { zoomControl: true, tap: true, tapTolerance: 15 })
      .setView([SHOP_LAT, SHOP_LNG], 15)

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
      maxZoom: 20,
    }).addTo(map)

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
      html: `<div style="position:relative;width:32px;height:44px;"><div style="background:#e63946;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div><div style="width:6px;height:6px;background:#e63946;border-radius:50%;position:absolute;bottom:0;left:50%;transform:translateX(-50%);box-shadow:0 1px 4px rgba(0,0,0,.3);"></div></div>`,
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
        setStepsOpen(true)
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
    setGeoStatus('asking')
    setStepsOpen(false)
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
        setGeoStatus(err.code === 1 ? 'denied' : 'error')
        setStepsOpen(true)
        setLoading(false)
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

  const isAsking    = geoStatus === 'asking'
  const isDenied    = geoStatus === 'denied'
  const isError     = geoStatus === 'error'
  const showBanner  = (isDenied || isError) && !loading
  const fixSteps    = showBanner ? getLocationFixSteps(env) : null

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

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
          padding:10px 13px; font-size:12px; color:#92400e; margin-bottom:10px;
          display:flex; gap:8px; align-items:center; line-height:1.6; font-weight:600;
        }

        /* ── Fix banner ── */
        .lp-fix-banner {
          border-radius:12px; overflow:hidden; margin-bottom:12px;
          border:1.5px solid #fca5a5; box-shadow:0 2px 10px rgba(220,38,38,.1);
        }
        .lp-fix-header {
          background:linear-gradient(135deg,#dc2626,#b91c1c);
          padding:11px 14px; display:flex; align-items:center; gap:10px;
          cursor:pointer; user-select:none;
        }
        .lp-fix-header-text { flex:1; }
        .lp-fix-title { color:#fff; font-weight:800; font-size:13px; line-height:1.3; margin:0; }
        .lp-fix-subtitle { color:#fecaca; font-size:11px; font-weight:600; margin:2px 0 0; }
        .lp-fix-chevron {
          color:#fff; font-size:18px; transition:transform .25s;
          line-height:1; flex-shrink:0;
        }
        .lp-fix-chevron.open { transform:rotate(180deg); }
        .lp-fix-device-badge {
          background:rgba(255,255,255,.18); color:#fff; font-size:10px;
          font-weight:700; border-radius:6px; padding:2px 8px;
          letter-spacing:.04em; flex-shrink:0;
        }

        .lp-fix-body {
          background:#fff5f5; padding:13px 14px 14px;
          border-top:1px solid #fecaca;
          animation: lp-slide-down .2s ease;
        }
        @keyframes lp-slide-down {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .lp-fix-steps { margin:0; padding:0; list-style:none; }
        .lp-fix-step {
          display:flex; gap:10px; align-items:flex-start;
          padding:7px 0; border-bottom:1px dashed #fecaca;
          font-size:12.5px; color:#7f1d1d; line-height:1.55; font-weight:600;
        }
        .lp-fix-step:last-child { border-bottom:none; }
        .lp-step-num {
          background:#dc2626; color:#fff; border-radius:50%;
          width:20px; height:20px; display:flex; align-items:center;
          justify-content:center; font-size:10px; font-weight:800;
          flex-shrink:0; margin-top:1px;
        }

        .lp-fix-tip {
          margin-top:10px; background:#fff; border:1.5px solid #fca5a5;
          border-radius:8px; padding:8px 11px; font-size:11.5px;
          color:#7f1d1d; line-height:1.55; font-weight:600;
          display:flex; gap:7px; align-items:flex-start;
        }

        .lp-fix-retry {
          width:100%; margin-top:12px; padding:11px; border-radius:9px;
          background:#dc2626; color:#fff; font-weight:800; font-size:13px;
          border:none; cursor:pointer; font-family:'Nunito',sans-serif;
          transition:all .2s; display:flex; align-items:center;
          justify-content:center; gap:7px;
        }
        .lp-fix-retry:hover { background:#b91c1c; transform:translateY(-1px); }

        .lp-fix-alt {
          text-align:center; font-size:11px; color:#991b1b;
          margin-top:8px; font-weight:600;
        }

        /* ── Map ── */
        .lp-map-wrap {
          width:100%; height:300px; border-radius:14px; overflow:hidden;
          border:2px solid #e0e0e0; position:relative;
          box-shadow:0 2px 12px rgba(0,0,0,.1);
        }
        .lp-map-skeleton {
          height:300px; border-radius:14px; background:#f0faf3;
          display:flex; align-items:center; justify-content:center;
          flex-direction:column; gap:8px; color:#1e6641;
        }
        .lp-hint {
          font-size:11px; color:#888; text-align:center;
          margin-top:6px; display:flex; align-items:center;
          justify-content:center; gap:6px; flex-wrap:wrap;
        }

        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* ── Mode tabs ── */}
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
            onFocus={e  => (e.target.style.borderColor = '#52b788')}
            onBlur={e   => (e.target.style.borderColor = '#e8ede9')}
          />
          <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontWeight: 700 }}>
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
            className="lp-btn-gps"
            onClick={useMyLocation}
            disabled={loading || isAsking}
          >
            {loading || isAsking
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 16 }}>⏳</span> Getting your location...</>
              : <>📍 Use My Current Location (GPS)</>
            }
          </button>

          {/* Asking permission hint */}
          {isAsking && !loading && (
            <div className="lp-asking">
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>
              <span>Your browser is asking for location permission — please tap <strong>Allow</strong> when prompted.</span>
            </div>
          )}

          {/* ── Smart Fix Banner ── */}
          {showBanner && fixSteps && (
            <div className="lp-fix-banner">
              {/* Collapsible header */}
              <div className="lp-fix-header" onClick={() => setStepsOpen(o => !o)}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{fixSteps.icon}</span>
                <div className="lp-fix-header-text">
                  <p className="lp-fix-title">
                    {isDenied ? '🚫 Location access denied' : '⚠️ Could not get location'}
                  </p>
                  <p className="lp-fix-subtitle">
                    Detected: <strong>{env.osLabel}</strong> · <strong>{env.browserLabel}</strong>
                  </p>
                </div>
                <span className="lp-fix-device-badge">
                  {env.isMobile ? '📱 Mobile' : '🖥️ Desktop'}
                </span>
                <span className={`lp-fix-chevron${stepsOpen ? ' open' : ''}`}>⌄</span>
              </div>

              {/* Steps body */}
              {stepsOpen && (
                <div className="lp-fix-body">
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#991b1b' }}>
                    {fixSteps.title}
                  </p>

                  <ol className="lp-fix-steps">
                    {fixSteps.steps.map((step, i) => (
                      <li key={i} className="lp-fix-step">
                        <span className="lp-step-num">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  {fixSteps.tip && (
                    <div className="lp-fix-tip">
                      <span style={{ flexShrink: 0, fontSize: 15 }}>💡</span>
                      <span>{fixSteps.tip}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="lp-fix-retry"
                    onClick={useMyLocation}
                  >
                    🔄 I've fixed it — Try Again
                  </button>

                  <p className="lp-fix-alt">
                    Or just <strong>tap the map below</strong> to pin your location manually.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Map */}
          {!mapLoaded ? (
            <div className="lp-map-skeleton">
              <div style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>🗺️</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Loading map...</div>
            </div>
          ) : (
            <div className="lp-map-wrap">
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
              {loading && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(255,255,255,.75)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#1e6641', gap: 8, zIndex: 999,
                  borderRadius: 14,
                }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
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
