import { Link, useLocation } from 'react-router-dom'
import { SHOP_NAME, OWNER_PHONE, SHOP_ADDRESS, SHOP_HOURS, OWNER_WHATSAPP } from '../utils/constants'

export default function Footer() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/admin/dashboard')) return null

  return (
    <footer style={{ marginTop:80 }}>
      <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ width:'100%', height:40, display:'block', background:'#fffbf0' }}>
        <path d="M0,24 C480,48 960,0 1440,24 L1440,48 L0,48Z" fill="#1a2e22"/>
      </svg>
      <div style={{ background:'#1a2e22' }}>
        <div className="container" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:36, padding:'44px 20px 36px' }}>

          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <span style={{ fontSize:32 }}>🌿</span>
              <div>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:900, color:'#fff' }}>{SHOP_NAME}</div>
                <div style={{ fontSize:11, color:'#52b788', letterSpacing:.3 }}>Ragama's Finest Grocery</div>
              </div>
            </div>
            <p style={{ color:'#8aab98', fontSize:13, lineHeight:1.85, marginBottom:18 }}>
              Groceries from farm to doorstep. Quality products, honest prices. Serving Ragama and surrounding areas daily.
            </p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <a href={`https://wa.me/${OWNER_WHATSAPP}`} target="_blank" rel="noreferrer"
                style={{ background:'#25D366', color:'#fff', padding:'7px 16px', borderRadius:50, fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5 }}>
                💬 WhatsApp
              </a>
              <a href={`tel:${OWNER_PHONE}`}
                style={{ background:'#2d4a38', color:'#52b788', padding:'7px 16px', borderRadius:50, fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5, border:'1.5px solid #3d5e48' }}>
                📞 Call Us
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:900, color:'#fff', marginBottom:14, paddingBottom:8, borderBottom:'2px solid #2d4a38' }}>
              Quick Links
            </h4>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['/', ' Home'],
                ['/shop', ' Shop'],
                ['/cart', ' My Cart'],
                ['/about', ' About Us'],
                ['/admin/dashboard', ' My Account'],
              ].map(([to, label]) => (
                <Link key={to} to={to} style={{ color:'#8aab98', fontSize:13, fontWeight:500, transition:'color .2s', textDecoration:'none' }}
                  onMouseEnter={e=>e.target.style.color='#52b788'}
                  onMouseLeave={e=>e.target.style.color='#8aab98'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:900, color:'#fff', marginBottom:14, paddingBottom:8, borderBottom:'2px solid #2d4a38' }}>
              Contact Us
            </h4>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                ['📍', SHOP_ADDRESS],
                ['📞', <a key="p" href={`tel:${OWNER_PHONE}`} style={{ color:'#52b788', textDecoration:'none' }}>{OWNER_PHONE}</a>],
                ['🕐', SHOP_HOURS],
                ['🚚', 'Delivery across Ragama, Kandana, Ja-Ela & more'],
              ].map(([icon, text], i) => (
                <div key={i} style={{ display:'flex', gap:10, color:'#8aab98', fontSize:13, lineHeight:1.6 }}>
                  <span style={{ flexShrink:0, fontSize:15 }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container" style={{
          borderTop:'1px solid #2d4a38', padding:'16px 20px',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap',
          gap:8, fontSize:12, color:'#4a6b58',
        }}>
          <span>© {new Date().getFullYear()} {SHOP_NAME}. All rights reserved.</span>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              ['/return-policy',  'Return Policy'],
              ['/privacy-policy', 'Privacy Policy'],
              ['/terms',          'Terms & Conditions'],
            ].map(([to, label]) => (
              <Link key={to} to={to} style={{ color:'#4a6b58', textDecoration:'none', transition:'color .2s' }}
                onMouseEnter={e=>e.target.style.color='#52b788'}
                onMouseLeave={e=>e.target.style.color='#4a6b58'}>
                {label}
              </Link>
            ))}
          </div>
          <span>Made with ❤️ in Sri Lanka 🇱🇰</span>
        </div>
      </div>
    </footer>
  )
}