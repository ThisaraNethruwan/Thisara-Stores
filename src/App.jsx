import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from './components/CartContext'
import { AuthProvider } from './components/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'

const Home            = lazy(() => import('./pages/Home'))
const Shop            = lazy(() => import('./pages/Shop'))
const Cart            = lazy(() => import('./pages/Cart'))
const OrderSuccess    = lazy(() => import('./pages/OrderSuccess'))
const About           = lazy(() => import('./pages/About'))
const AdminLogin      = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'))
const ReturnPolicy    = lazy(() => import('./pages/ReturnPolicy'))
const PrivacyPolicy   = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))

/* ─── Splash Screen ─────────────────────────────────────────────────────── */
function SplashScreen({ onDone, logoReady }) {
  const [phase, setPhase] = useState('enter') // enter → pulse → exit

  useEffect(() => {
    // Only start animation once logo is confirmed loaded in memory
    if (!logoReady) return
    const t1 = setTimeout(() => setPhase('pulse'), 600)
    const t2 = setTimeout(() => setPhase('exit'),  2200)
    const t3 = setTimeout(() => onDone(),           2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [logoReady, onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#f5f0e8',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
      opacity: phase === 'exit' ? 0 : 1,
      transform: phase === 'exit' ? 'scale(1.04)' : 'scale(1)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
      pointerEvents: 'none',
    }}>

      <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Outer ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(30,102,65,0.15)',
          animation: logoReady ? 'ringPulse 2s ease-in-out infinite' : 'none',
        }} />

        {/* Middle ring */}
        <div style={{
          position: 'absolute', inset: 12, borderRadius: '50%',
          border: '2px solid rgba(30,102,65,0.25)',
          animation: logoReady ? 'ringPulse 2s ease-in-out infinite 0.2s' : 'none',
        }} />

        {/* Logo circle */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(30,102,65,0.22), 0 2px 8px rgba(0,0,0,0.10)',
          transform: phase === 'enter' ? 'scale(0.6)' : 'scale(1)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
          background: '#fff',
        }}>
          <img
            src="/logo-round.png"
            alt="Thisara Stores"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Orbiting dot */}
        <div style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          animation: logoReady ? 'orbit 1.6s linear infinite' : 'none',
        }}>
          <div style={{
            width: 12, height: 20, borderRadius: '50%', background: '#1e6641',
            position: 'absolute', top: '50%', left: 0,
            transform: 'translateY(-50%)',
            boxShadow: '0 0 8px rgba(30,102,65,0.6)',
          }} />
        </div>
      </div>

      {/* Brand name */}
      <div style={{
        textAlign: 'center',
        transform: phase === 'enter' ? 'translateY(16px)' : 'translateY(0)',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'transform 0.6s ease 0.3s, opacity 0.6s ease 0.3s',
      }}>
        <div style={{
          fontFamily: 'Fraunces, Georgia, serif', fontWeight: 900,
          fontSize: 26, color: '#1e6641', letterSpacing: '-0.5px', lineHeight: 1.1,
        }}>
          Thisara Stores
        </div>
        <div style={{
          fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 700,
          letterSpacing: '3px', color: '#7ab648', textTransform: 'uppercase', marginTop: 4,
        }}>
          Shop Online
        </div>
      </div>

      {/* Loading bar */}
      <div style={{
        width: 120, height: 3,
        borderRadius: 99, overflow: 'hidden',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'opacity 0.4s ease 0.5s',
      }}>
      
      </div>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%       { transform: scale(1.08); opacity: 1;   }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
   
      `}</style>
    </div>
  )
}

/* ─── Page-level Suspense fallback ──────────────────────────────────────── */
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(30,102,65,0.18)',
          animation: 'loaderBounce 0.8s ease-in-out infinite alternate',
        }}>
          <img src="/logo-round.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: '#1e6641',
              animation: 'dotPop 0.9s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`, opacity: 0.4,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes loaderBounce {
            from { transform: translateY(0);    box-shadow: 0 4px 16px rgba(30,102,65,0.18); }
            to   { transform: translateY(-8px); box-shadow: 0 12px 24px rgba(30,102,65,0.28); }
          }
          @keyframes dotPop {
            0%, 100% { transform: scaleY(1);   opacity: 0.3; }
            50%       { transform: scaleY(1.6); opacity: 1;   }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ─── App ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const [logoReady, setLogoReady]   = useState(false)

  // Preload logo into the browser cache before splash animation starts.
  // Files in Vite's public/ folder are served from root (/), not /public/.
  useEffect(() => {
    const img = new Image()
    img.src = '/logo-round.png'
    if (img.complete && img.naturalWidth > 0) {
      setLogoReady(true)
    } else {
      img.onload  = () => setLogoReady(true)
      img.onerror = () => setLogoReady(true) // fail gracefully — show splash anyway
    }
  }, [])

  return (
    <AuthProvider>
      <CartProvider>
        {!splashDone && (
          <SplashScreen
            logoReady={logoReady}
            onDone={() => setSplashDone(true)}
          />
        )}

        <div style={{ opacity: splashDone ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <BrowserRouter>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  fontFamily: 'Nunito, sans-serif', borderRadius: '12px',
                  fontWeight: 600, fontSize: '14px', maxWidth: '380px',
                },
                success: {
                  style: { background: '#1e6641', color: '#fff' },
                  iconTheme: { primary: '#fff', secondary: '#1e6641' },
                },
                error: {
                  style: { background: '#e63946', color: '#fff' },
                  iconTheme: { primary: '#fff', secondary: '#e63946' },
                },
                duration: 3000,
              }}
            />
            <Navbar />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"                element={<Home />} />
                <Route path="/shop"            element={<Shop />} />
                <Route path="/cart"            element={<Cart />} />
                <Route path="/order-success"   element={<OrderSuccess />} />
                <Route path="/about"           element={<About />} />
                <Route path="/admin"           element={<Navigate to="/admin/login" replace />} />
                <Route path="/admin/login"     element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/return-policy"   element={<ReturnPolicy />} />
                <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
                <Route path="/terms"           element={<TermsConditions />} />
                <Route path="*"               element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Footer />
            <ScrollToTop />
          </BrowserRouter>
        </div>
      </CartProvider>
    </AuthProvider>
  )
}
