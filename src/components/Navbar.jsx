import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from './CartContext'
import { SHOP_NAME } from '../utils/constants'

export default function Navbar() {
  const { count }                 = useCart()
  const [open, setOpen]           = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const loc                       = useLocation()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => setOpen(false), [loc.pathname])

  const isActive = to => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)

  // Admin dashboard has its own sidebar nav — hide Navbar there
  if (loc.pathname.startsWith('/admin/dashboard')) return null

  const LINKS = [
    { to: '/',      label: 'Home'  },
    { to: '/shop',  label: 'Shop'  },
    { to: '/about', label: 'About' },
  ]

  return (
    <>
      <style>{`
        .nav-wrap {
          position:fixed; top:0; left:0; right:0; z-index:999;
          background:${scrolled ? 'rgba(255,251,240,0.97)' : 'rgba(255,251,240,0.95)'};
          backdrop-filter:blur(14px);
          border-bottom:1.5px solid #d8f3dc;
          box-shadow:${scrolled ? '0 4px 24px rgba(0,0,0,.10)' : 'none'};
          transition:box-shadow .3s, background .3s;
        }
        .nav-inner {
          max-width:1200px; margin:0 auto;
          display:flex; align-items:center; justify-content:space-between;
          height:64px; padding:0 20px; gap:12px;
        }
        .nav-logo { display:flex; align-items:center; gap:10px; flex-shrink:0; text-decoration:none; }
        .nav-logo-name { font-family:'Fraunces',serif; font-size:19px; font-weight:900; color:#1e6641; line-height:1.1; }
        .nav-logo-sub { font-size:10px; color:#6b7c74; letter-spacing:.4px; }
        .nav-links { display:flex; gap:2px; }
        .nav-link {
          padding:8px 15px; border-radius:50px; font-size:14px; font-weight:600;
          color:#2c3e35; text-decoration:none; transition:all .2s;
        }
        .nav-link.active { color:#1e6641; background:#d8f3dc; }
        .nav-link:not(.active):hover { background:#f0faf3; color:#1e6641; }
        .nav-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .nav-cart {
          display:flex; align-items:center; gap:6px;
          background:#1e6641; color:#fff;
          padding:8px 16px; border-radius:50px; font-weight:700; font-size:14px;
          text-decoration:none; position:relative; transition:background .2s;
        }
        .nav-cart:hover { background:#2d8653; }
        .nav-cart-badge {
          position:absolute; top:-7px; right:-7px;
          background:#f4a322; color:#111; border-radius:50%;
          width:21px; height:21px; font-size:11px; font-weight:800;
          display:flex; align-items:center; justify-content:center;
          border:2px solid #fffbf0; animation:popIn .2s ease;
        }
        .nav-burger {
          display:none; flex-direction:column; gap:5px;
          background:none; padding:6px; border-radius:8px; border:none; cursor:pointer;
        }
        .nav-burger span {
          display:block; width:22px; height:2.5px; background:#1e6641;
          border-radius:2px; transition:all .3s;
        }
        .nav-mobile {
          display:none; flex-direction:column;
          background:#fffbf0; border-top:1.5px solid #d8f3dc;
          padding:8px 0 16px;
        }
        .nav-mobile.open { display:flex; }
        .nav-mobile-link {
          padding:13px 24px; font-size:15px; font-weight:600;
          color:#2c3e35; text-decoration:none;
          border-bottom:1px solid #f0faf3; transition:background .15s;
        }
        .nav-mobile-link:hover, .nav-mobile-link.active { color:#1e6641; background:#f0faf3; }
        @media(max-width:750px) {
          .nav-links { display:none; }
          .nav-cart span.cart-label { display:none; }
          .nav-burger { display:flex; }
          .nav-cart { padding:8px 12px; }
        }
      `}</style>

      <nav className="nav-wrap">
        <div className="nav-inner">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <span style={{ fontSize: 26 }}>🏪</span>
            <div>
              <div className="nav-logo-name">{SHOP_NAME}</div>
              <div className="nav-logo-sub">Ragama, Sri Lanka</div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="nav-links">
            {LINKS.map(l => (
              <Link key={l.to} to={l.to} className={`nav-link${isActive(l.to) ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side — cart only */}
          <div className="nav-right">
            <Link to="/cart" className="nav-cart">
              <span>🛒</span>
              <span className="cart-label">Cart</span>
              {count > 0 && <span className="nav-cart-badge">{count > 99 ? '99+' : count}</span>}
            </Link>

            {/* Hamburger */}
            <button className="nav-burger" onClick={() => setOpen(o => !o)} aria-label="Menu">
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  transform:
                    open && i === 0 ? 'rotate(45deg) translate(5px,5px)' :
                    open && i === 1 ? 'scale(0)' :
                    open && i === 2 ? 'rotate(-45deg) translate(5px,-5px)' : 'none',
                  opacity: open && i === 1 ? 0 : 1,
                }} />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`nav-mobile${open ? ' open' : ''}`}>
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} className={`nav-mobile-link${isActive(l.to) ? ' active' : ''}`}>
              {l.label}
            </Link>
          ))}
          <div style={{ padding: '12px 16px' }}>
            <Link to="/cart" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#1e6641', color: '#fff', padding: 13, borderRadius: 12,
              fontWeight: 700, fontSize: 15, textDecoration: 'none',
            }}>
              🛒 Cart {count > 0 && `(${count})`}
            </Link>
          </div>
        </div>
      </nav>
      <div style={{ height: 64 }} />
    </>
  )
}
