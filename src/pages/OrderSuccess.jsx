import { Link, useLocation } from 'react-router-dom'

export default function OrderSuccess() {
  const { state }  = useLocation()
  const name       = state?.name    || 'Customer'
  const orderId    = state?.orderId
  const method     = state?.method  || 'cod'
  const isPaid     = method === 'card'

  const steps = [
    { icon: '✅', text: 'Order received & saved successfully',              done: true  },
    { icon: '📲', text: 'We\'ve been notified and will contact you shortly', done: true  },
    { icon: '📦', text: 'We pack your fresh groceries',                     done: false },
    { icon: '🚚', text: 'Delivered fresh to your doorstep!',                done: false },
  ]

  return (
    <>
      <style>{`
        .os-page { min-height:85vh; background:#fffbf0; display:flex; align-items:center; justify-content:center; padding:40px 20px; }
        .os-card { max-width:520px; width:100%; background:#fff; border-radius:24px; padding:48px 36px; text-align:center; box-shadow:0 16px 64px rgba(0,0,0,.13); }
        .os-check { width:76px; height:76px; border-radius:50%; background:linear-gradient(135deg,#1e6641,#52b788); color:#fff; font-size:34px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; animation:popIn .4s ease both; }
        .os-steps { background:#f9fdf9; border-radius:16px; padding:20px; margin-bottom:24px; text-align:left; }
        .os-step { display:flex; align-items:center; gap:12px; padding:10px 0; font-size:14px; }
        .os-step:not(:last-child) { border-bottom:1px solid #eef5ef; }
        .os-badge { display:inline-flex; align-items:center; gap:6px; border-radius:50px; padding:6px 18px; font-size:13px; font-weight:700; margin-bottom:16px; }
        .os-badge-card { background:#eff6ff; color:#1e40af; border:1.5px solid #93c5fd; }
        .os-badge-cod  { background:#f0fff4; color:#166534; border:1.5px solid #86efac; }
        @keyframes popIn { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @media(max-width:420px){ .os-card{padding:32px 20px;} }
      `}</style>

      <main className="os-page">
        <div className="os-card">
          <div className="os-check">✓</div>

          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:34, fontWeight:900, color:'#1e6641', marginBottom:8 }}>
            Order Placed! 🎉
          </h1>

          {orderId && (
            <div style={{ display:'inline-block', background:'#f0faf3', color:'#1e6641', padding:'4px 18px', borderRadius:50, fontSize:13, fontWeight:700, marginBottom:12 }}>
              Order #{orderId}
            </div>
          )}

          <div className={`os-badge ${isPaid ? 'os-badge-card' : 'os-badge-cod'}`}>
            {isPaid ? '💳 Paid via Card' : '💵 Cash on Delivery'}
          </div>

          <p style={{ fontSize:16, color:'#444', lineHeight:1.75, marginBottom:20 }}>
            Thank you, <strong>{name}</strong>!<br />
          </p>

          <div className="os-steps">
            {steps.map((step, i) => (
              <div key={i} className="os-step" style={{ color: step.done ? '#1e6641' : '#555', fontWeight: step.done ? 700 : 400 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{step.icon}</span>
                <span style={{ flex:1 }}>{step.text}</span>
                {step.done && <span style={{ color:'#1e6641', fontWeight:900, fontSize:16 }}>✓</span>}
              </div>
            ))}
          </div>

          <div style={{ background:'#fff9ec', border:'1.5px solid #fde68a', borderRadius:12, padding:'12px 16px', marginBottom:24, fontSize:13, color:'#92400e', fontWeight:600, lineHeight:1.7 }}>
            📞 We'll call to confirm your order!
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
     
            <Link to="/" className="btn-secondary" style={{ fontSize:14, padding:'12px 24px' }}>🏠 Back to Home</Link>
          </div>
        </div>
      </main>
    </>
  )
}
