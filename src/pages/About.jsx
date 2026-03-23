import { Link } from 'react-router-dom'
import { SHOP_NAME, OWNER_PHONE, SHOP_ADDRESS, SHOP_HOURS } from '../utils/constants'

const VALUES = [
  { icon:'🌿', t:'Freshness First',   d:"We source our products daily. If it's not fresh, it doesn't go on our shelves." },
  { icon:'🤝', t:'Community Trust',   d:"We've served Ragama families for years. Every customer is treated like family." },
  { icon:'💰', t:'Fair Pricing',      d:'No hidden charges. Honest prices you can trust, every single day.' },
  { icon:'🚚', t:'Reliable Delivery', d:'We deliver when we say we will. Your time matters to us.' },
]

const STATS = [
  ['100+', 'Products'],
  ['500+', 'Orders'],
  ['100%', 'Fresh'],
  ['0', 'Hidden Fees'],
]

const CONTACT_INFO = [
  { icon:'📍', title:'Location',          text: SHOP_ADDRESS,                              isPhone: false },
  { icon:'📞', title:'Phone & WhatsApp',  text: OWNER_PHONE,                               isPhone: true  },
  { icon:'🕐', title:'Opening Hours',     text: SHOP_HOURS,                                isPhone: false },
  { icon:'🚚', title:'Delivery Area',     text: 'Ragama, Kandana, Ja-Ela, Wattala & nearby', isPhone: false },
]

export default function About() {
  return (
    <>
      <style>{`
        /* ══════════════════════════════════════
           ABOUT PAGE — FULL RESPONSIVE STYLES
        ══════════════════════════════════════ */

        .ab { background: #fffbf0; }

        /* ── HERO ── */
        .ab-hero {
          background: linear-gradient(140deg, #1a3d28 0%, #1e6641 55%, #2d8653 100%);
          padding: 60px 0 68px;
          position: relative; overflow: hidden;
        }
        .ab-hero::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 75% 50%, rgba(82,183,136,.22) 0%, transparent 60%);
        }
        .ab-hero-inner {
          max-width: 1160px; margin: 0 auto; padding: 0 20px;
          position: relative; z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }

        /* Text */
        .ab-tag {
          display: inline-block; background: rgba(255,255,255,.2);
          color: #fff; padding: 6px 18px; border-radius: 50px;
          font-size: 13px; font-weight: 700; margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,.28);
        }
        .ab-h1 {
          font-family: 'Fraunces', serif;
          font-size: clamp(28px, 4.5vw, 54px);
          font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 18px;
        }
        .ab-h1 span { color: #f4a322; }
        @media (max-width: 480px) { .ab-h1 { font-size: clamp(38px, 7vw, 54px) !important; } }
        .ab-desc {
          font-size: 15px; color: rgba(255,255,255,.85);
          line-height: 1.8; margin-bottom: 26px; max-width: 440px;
        }
        .ab-hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
        .ab-btn-gold {
          background: #f4a322; color: #111; padding: 12px 26px;
          border-radius: 50px; font-weight: 800; font-size: 15px; display: inline-block;
        }
        .ab-btn-ghost {
          background: rgba(255,255,255,.15); color: #fff; padding: 12px 26px;
          border-radius: 50px; font-weight: 700; font-size: 15px;
          border: 2px solid rgba(255,255,255,.4); display: inline-block;
        }

        /* Stats card — right column on desktop, below text on mobile */
        .ab-stats-col { display: flex; justify-content: center; align-items: center; }
        .ab-stats-card {
          background: rgba(255,255,255,.12); backdrop-filter: blur(12px);
          border-radius: 22px; padding: 28px 24px;
          border: 1px solid rgba(255,255,255,.22);
          width: 100%; max-width: 320px; text-align: center;
        }
        .ab-stats-leaf { font-size: 48px; margin-bottom: 16px; }
        .ab-stats-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .ab-stat-box {
          background: rgba(255,255,255,.15); border-radius: 12px; padding: 14px 10px;
        }
        .ab-stat-n { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 900; color: #fff; }
        .ab-stat-l { font-size: 11px; color: rgba(255,255,255,.75); margin-top: 2px; }

        /* Mobile stats card — shown only on mobile below the text */
        .ab-stats-mobile {
          display: none;
          margin-top: 28px;
        }
        .ab-stats-mobile .ab-stats-card { max-width: 100%; }

        /* ── SHARED SECTION STYLES ── */
        .ab-section { padding: 60px 0; }
        .ab-wrap { max-width: 1160px; margin: 0 auto; padding: 0 20px; }
        .ab-center { text-align: center; margin-bottom: 38px; }
        .ab-pill {
          display: inline-block; background: #d8f3dc; color: #1e6641;
          padding: 6px 18px; border-radius: 50px;
          font-size: 13px; font-weight: 700; margin-bottom: 10px;
        }
        .ab-heading {
          font-family: 'Fraunces', serif;
          font-size: clamp(22px, 4vw, 38px);
          font-weight: 900; color: #111;
        }

        /* ── VALUES ── */
        .ab-values-bg { background: #fffbf0; }
        .ab-values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .ab-val-card {
          background: #fff; border-radius: 18px; padding: 28px 18px;
          text-align: center; box-shadow: 0 2px 14px rgba(0,0,0,.06);
          transition: transform .25s, box-shadow .25s;
        }
        .ab-val-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,.11); }
        .ab-val-icon { font-size: 40px; margin-bottom: 12px; }
        .ab-val-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 900; color: #111; margin-bottom: 8px; }
        .ab-val-desc  { color: #666; font-size: 14px; line-height: 1.72; }

        /* ── CONTACT ── */
        .ab-contact-bg { background: #f0faf3; }
        .ab-contact-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px; margin-top: 38px;
        }
        .ab-contact-card {
          background: #fff; border-radius: 18px; padding: 24px 16px;
          text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,.06);
          transition: transform .2s;
        }
        .ab-contact-card:hover { transform: translateY(-3px); }
        .ab-contact-icon { font-size: 32px; margin-bottom: 10px; }
        .ab-contact-title { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 900; color: #111; margin-bottom: 6px; }
        .ab-contact-text  { font-size: 13px; color: #666; line-height: 1.65; }

        /* Map placeholder */
        .ab-map-ph {
          margin-top: 28px; border-radius: 16px; overflow: hidden;
          background: #e8ede9; height: 280px;
          display: flex; align-items: center; justify-content: center;
          text-align: center; color: #888;
          box-shadow: 0 2px 14px rgba(0,0,0,.07);
        }

        /* ── CTA ── */
        .ab-cta { background: linear-gradient(135deg, #111714, #1e6641); padding: 64px 0; }
        .ab-cta-wrap { max-width: 1160px; margin: 0 auto; padding: 0 20px; text-align: center; }
        .ab-cta h2 { font-family: 'Fraunces', serif; font-size: clamp(24px, 4vw, 42px); font-weight: 900; color: #fff; margin-bottom: 14px; }
        .ab-cta p  { color: rgba(255,255,255,.75); font-size: 15px; margin-bottom: 28px; }
        .ab-cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        /* ════════════════════════
           RESPONSIVE
        ════════════════════════ */

        /* Desktop medium — values 4→2, contact 4→2 */
        @media (max-width: 1024px) {
          .ab-values-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .ab-contact-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        /* Tablet 768 — hero single column, show mobile stats card */
        @media (max-width: 768px) {
          .ab-hero-inner {
            grid-template-columns: 1fr !important;
            text-align: center;
            gap: 0 !important;
          }
          /* Hide the right-column desktop stats card */
          .ab-stats-col { display: none !important; }
          /* Show mobile stats card below text */
          .ab-stats-mobile { display: block !important; }

          .ab-desc { margin: 0 auto 22px !important; }
          .ab-hero-btns { justify-content: center !important; }
          .ab-hero { padding: 44px 0 52px !important; }
          .ab-section { padding: 44px 0 !important; }
          .ab-contact-bg { padding: 44px 0 !important; }
          .ab-cta { padding: 44px 0 !important; }

          /* Values 2-col on tablet */
          .ab-values-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .ab-contact-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        /* Small phone 520 */
        @media (max-width: 520px) {
          .ab-values-grid  { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .ab-contact-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .ab-val-card     { padding: 20px 14px !important; }
          .ab-val-icon     { font-size: 34px !important; }
          .ab-hero-btns    { gap: 10px !important; }
          .ab-btn-gold, .ab-btn-ghost { padding: 11px 20px !important; font-size: 14px !important; }
          .ab-stats-card   { padding: 20px 16px !important; }
        }

        /* Very small 380 */
        @media (max-width: 380px) {
          .ab-values-grid  { grid-template-columns: 1fr !important; }
          .ab-contact-grid { grid-template-columns: 1fr !important; }
          .ab-h1 { font-size: 26px !important; }
        }
      `}</style>

      <main className="ab">

        {/* ── HERO ── */}
        <section className="ab-hero">
          <div className="ab-hero-inner">

            {/* Left: text */}
            <div>
              <div className="ab-tag">🌿 Our Story</div>
              <h1 className="ab-h1">
                Fresh Groceries,<br />
                Honest People,<br />
                <span>Real Community</span>
              </h1>
              <p className="ab-desc">
                {SHOP_NAME} started as a small local shop in Horape, Ragama with a simple mission: bring the freshest groceries to every family at fair prices. Today, we deliver across Ragama and nearby areas but our values have never changed.
              </p>
              <div className="ab-hero-btns">
                <Link to="/shop" className="ab-btn-gold">Shop Now →</Link>
                <a href={`tel:${OWNER_PHONE}`} className="ab-btn-ghost">📞 Call Us</a>
              </div>

              {/* ── MOBILE-ONLY stats (shown below text on small screens) ── */}
              <div className="ab-stats-mobile">
                <div className="ab-stats-card">
                  <div className="ab-stats-grid">
                    {STATS.map(([n, l]) => (
                      <div key={l} className="ab-stat-box">
                        <div className="ab-stat-n">{n}</div>
                        <div className="ab-stat-l">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: desktop stats card */}
            <div className="ab-stats-col">
              <div className="ab-stats-card">
                <div className="ab-stats-grid">
                  {STATS.map(([n, l]) => (
                    <div key={l} className="ab-stat-box">
                      <div className="ab-stat-n">{n}</div>
                      <div className="ab-stat-l">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── VALUES ── */}
        <section className="ab-section ab-values-bg">
          <div className="ab-wrap">
            <div className="ab-center">
              <div className="ab-pill">What We Stand For</div>
              <h2 className="ab-heading">Our Core Values</h2>
            </div>
            <div className="ab-values-grid">
              {VALUES.map((v, i) => (
                <div key={i} className="ab-val-card">
                  <div className="ab-val-icon">{v.icon}</div>
                  <h3 className="ab-val-title">{v.t}</h3>
                  <p className="ab-val-desc">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="ab-section ab-contact-bg">
          <div className="ab-wrap">
            <div className="ab-center">
              <div className="ab-pill">Get in Touch</div>
              <h2 className="ab-heading">Find Us</h2>
            </div>
            <div className="ab-contact-grid">
              {CONTACT_INFO.map(({ icon, title, text, isPhone }, i) => (
                <div key={i} className="ab-contact-card">
                  <div className="ab-contact-icon">{icon}</div>
                  <h3 className="ab-contact-title">{title}</h3>
                  {isPhone
                    ? <a href={`tel:${text}`} style={{ color:'#1e6641', fontWeight:800, fontSize:16 }}>{text}</a>
                    : <p className="ab-contact-text">{text}</p>
                  }
                </div>
              ))}
            </div>

<div style={{ marginTop:28, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,.08)', height:300 }}>
  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3959.949335423728!2d79.91947664095079!3d7.015241284464327!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2f827f6acaef9%3A0x87faf6330b546679!2sSri%20Padma%20Book%20Shop!5e0!3m2!1sen!2slk!4v1774149240043!5m2!1sen!2slk" 
    width="100%"
    height="300"
    style={{ border:0, display:'block' }}
    allowFullScreen=""
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    title="Thisara Stores Location"
  />
</div>
</div>
        </section>

        {/* ── CTA ── */}
        <section className="ab-cta">
          <div className="ab-cta-wrap">
            <h2>Ready to Order?</h2>
            <p>Fresh groceries delivered to your door.</p>
            <div className="ab-cta-btns">
              <Link to="/shop" style={{ background:'#f4a322', color:'#111', padding:'13px 28px', borderRadius:50, fontWeight:800, fontSize:15, display:'inline-block' }}>
                🛒 Shop Now
              </Link>
        
              <a href={`tel:${OWNER_PHONE}`}
                style={{ background:'rgba(255,255,255,.15)', color:'#fff', padding:'13px 28px', borderRadius:50, fontWeight:700, fontSize:15, border:'2px solid rgba(255,255,255,.35)', display:'inline-block' }}>
                📞 {OWNER_PHONE}
              </a>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}