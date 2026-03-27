import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// ── Scroll to top on every route change ──────────────────────────────────────
function RouteScrollReset() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

// ── Floating "back to top" button ─────────────────────────────────────────────
function BackToTopButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const h = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      style={{
        position: 'fixed', bottom: 28, left: 20, zIndex: 80,
        background: 'linear-gradient(135deg,#1a3d28,#1e6641)',
        color: '#fff', width: 44, height: 44, borderRadius: '50%',
        border: 'none', cursor: 'pointer', fontSize: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(30,102,65,.4)',
        transition: 'transform .2s, opacity .3s',
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >↑</button>
  )
}

// ── Combined export ───────────────────────────────────────────────────────────
export default function ScrollToTop() {
  return (
    <>
      <RouteScrollReset />
      <BackToTopButton />
    </>
  )
}
