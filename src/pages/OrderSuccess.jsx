import { Link, useLocation } from 'react-router-dom'

export default function OrderSuccess() {
  const { state } = useLocation()
  const name    = state?.name    || 'Customer'
  const orderId = state?.orderId

  const steps = [
    { icon: '💬', text: 'Order sent to WhatsApp with your location & items', done: true },
    { icon: '📞', text: 'We call to confirm within 30 minutes',               done: false },
    { icon: '📦', text: 'We pack your fresh groceries',                       done: false },
    { icon: '🚚', text: 'Delivered fresh to your doorstep!',                  done: false },
  ]

  return (
    <>
      <style>{`
        .os-page { min-height:85vh; background:#fffbf0; display:flex; align-items:center; justify-content:center; padding:40px 20px; }
        .os-card { max-width:520px; width:100%; background:#fff; border-radius:24px; padding:48px 36px; text-align:center; box-shadow:0 16px 64px rgba(0,0,0,.13); }
        .os-check { width:76px; height:76px; border-radius:50%; background:linear-gradient(135deg,#25D366,#128C7E); color:#fff; font-size:34px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; animation:popIn .4s ease both; }
        .os-steps { background:#f9fdf9; border-radius:16px; padding:20px; margin-bottom:24px; text-align:left; }
        .os-step { display:flex; align-items:center; gap:12px; padding:10px 0; font-size:14px; }
        .os-step:not(:last-child) { border-bottom:1px solid #eef5ef; }
        .os-wa-hint { background:#f0fff4; border:1.5px solid #86efac; border-radius:12px; padding:14px 18px; margin-bottom:24px; font-size:13px; color:#166534; font-weight:600; line-height:1.7; }
        @keyframes popIn { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @media(max-width:420px){ .os-card{padding:32px 20px;} }
      `}</style>

      <main className="os-page">
        <div className="os-card">
          {/* WhatsApp green checkmark */}

          <h1 style={{ fontFamily: 'Fraunces,serif', fontSize: 34, fontWeight: 900, color: '#128C7E', marginBottom: 8 }}>
            Order Ready! 🎉
          </h1>

          {orderId && (
            <div style={{ display: 'inline-block', background: '#f0faf3', color: '#1e6641', padding: '4px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              Order #{orderId}
            </div>
          )}

          <p style={{ fontSize: 16, color: '#444', lineHeight: 1.75, marginBottom: 20 }}>
            Thank you, <strong>{name}</strong>! <br />
            WhatsApp has opened with your order ready to send.
          </p>

     

          <div className="os-steps">
            {steps.map((step, i) => (
              <div
                key={i}
                className="os-step"
                style={{ color: step.done ? '#1e6641' : '#555', fontWeight: step.done ? 700 : 400 }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{step.icon}</span>
                <span style={{ flex: 1 }}>{step.text}</span>
                {step.done && <span style={{ color: '#1e6641', fontWeight: 900, fontSize: 16 }}>✓</span>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn-secondary">🏠 Back to Home</Link>
          </div>
        </div>
      </main>
    </>
  )
}
