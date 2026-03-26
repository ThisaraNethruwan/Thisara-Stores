import { useState, useEffect, useRef, useCallback } from 'react'

const SHOP_LAT = 7.015468376212816
const SHOP_LNG = 79.91953996256439
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

function requestGeolocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError({ code: 0 })
    return
  }

  navigator.geolocation.getCurrentPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0, // 🔥 critical: always fresh request
  })
}

export default function LocationPicker({
  onLocationSelect,
  initialAddress = '',
  cartTotal = 0,
  forceRequest
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const cartTotalRef = useRef(cartTotal)

  const [address, setAddress] = useState(initialAddress)
  const [loading, setLoading] = useState(false)
  const [pinInfo, setPinInfo] = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')
  const [geoMsg, setGeoMsg] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    cartTotalRef.current = cartTotal
  }, [cartTotal])

  // Load Leaflet
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
      return
    }

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return

    const L = window.L

    const map = L.map(mapRef.current).setView([SHOP_LAT, SHOP_LNG], 15)

    L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=LK',
      {
        subdomains: ['mt0','mt1','mt2','mt3'],
        maxZoom: 20,
      }
    ).addTo(map)

    const marker = L.marker([SHOP_LAT, SHOP_LNG], { draggable: true }).addTo(map)
    markerRef.current = marker

    const handleLatLng = async (lat, lng) => {
      setLoading(true)

      const addr = await reverseGeocode(lat, lng)
      const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
      const fee = calcFee(distKm, cartTotalRef.current)

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
    }, 200)

    return () => map.remove()
  }, [mapLoaded])

  // 🔥 MAIN FIX: always request location on Cart load
  useEffect(() => {
    if (!mapReady) return

    setGeoStatus('asking')
    setGeoMsg('')
    setLoading(true)

    requestGeolocation(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords

        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        }

        const addr = await reverseGeocode(lat, lng)
        const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
        const fee = calcFee(distKm, cartTotalRef.current)

        setAddress(addr)
        setPinInfo({ lat, lng, distKm, fee })
        onLocationSelect({ address: addr, lat, lng, distKm, fee })

        setGeoStatus('success')
        setLoading(false)
      },
      (err) => {
        setLoading(false)

        if (err.code === 1) {
          setGeoStatus('denied')
          setGeoMsg('Location blocked. Please enable it in browser settings.')
        } else {
          setGeoStatus('error')
          setGeoMsg('Unable to fetch location. Try again.')
        }
      }
    )
  }, [forceRequest, mapReady])

  // Retry button
  const useMyLocation = useCallback(() => {
    setGeoStatus('asking')
    setGeoMsg('')
    setLoading(true)

    requestGeolocation(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords

        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        }

        const addr = await reverseGeocode(lat, lng)
        const distKm = calcDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng)
        const fee = calcFee(distKm, cartTotalRef.current)

        setAddress(addr)
        setPinInfo({ lat, lng, distKm, fee })
        onLocationSelect({ address: addr, lat, lng, distKm, fee })

        setGeoStatus('success')
        setLoading(false)
      },
      () => {
        setLoading(false)
        setGeoStatus('error')
        setGeoMsg('Retry failed. Please allow location.')
      }
    )
  }, [onLocationSelect])

  return (
    <div>
      <button onClick={useMyLocation} disabled={loading}>
        {loading ? 'Getting location...' : '📍 Use My Current Location'}
      </button>

      {geoStatus === 'asking' && (
        <p>🔔 Please allow location access in your browser</p>
      )}

      {geoMsg && (
        <p style={{ color: 'red' }}>{geoMsg}</p>
      )}

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: 300,
          marginTop: 10,
          borderRadius: 10,
        }}
      />

      {pinInfo && (
        <p style={{ marginTop: 10 }}>
          📍 {address} <br />
          🚚 {pinInfo.distKm.toFixed(2)} km — Rs. {pinInfo.fee}
        </p>
      )}
    </div>
  )
}
