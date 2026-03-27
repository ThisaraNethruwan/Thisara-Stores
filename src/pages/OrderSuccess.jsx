import { Link, useLocation } from 'react-router-dom'

export default function OrderSuccess() {
  const { state } = useLocation()
  const name = state?.name || 'Customer'
  const orderId = state?.orderId
  const method = state?.method || 'cod'
  const isPaid = method === 'card'

  const steps = [
    { icon: '✔', text: 'Order received successfully', done: true },
    { icon: '✔', text: "We've been notified and will contact you shortly", done: true },
    { icon: '✔', text: 'We pack your fresh groceries', done: false },
    { icon: '✔', text: 'Delivered fresh to your doorstep!', done: false },
  ]

  return (
    <>
      <style>{`
        /* Hide global footers if present */
        footer, .footer, #footer { display: none !important; }

        /* Modernized wrapper with soft, fresh gradient */
        .os-page { 
          min-height: 100vh; 
          background: linear-gradient(135deg, #f0fff4 0%, #fdfbf7 100%); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 24px 16px; 
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* Super clean desktop card */
        .os-card { 
          max-width: 550px; 
          width: 100%; 
          background: #ffffff; 
          border-radius: 28px; 
          padding: 48px; 
          box-shadow: 0 25px 50px -12px rgba(21, 62, 41, 0.08); 
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Header flexbox (Fixes check & text in one line) */
        .os-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 8px;
        }

        .os-check { 
          width: 58px; 
          height: 58px; 
          border-radius: 50%; 
          background: linear-gradient(135deg, #036011, #08791f); 
          color: #fff; 
          font-size: 30px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .os-title {
          font-family: 'Fraunces', Georgia, serif; 
          font-size: 35px; 
          font-weight: 800; 
          color: #064e3b; 
          margin: 0;
        }

        /* Order tracking steps */
        .os-steps { 
          border-radius: 20px; 
          padding: 10px; 
          margin-bottom: 12px; 
          text-align: left; 
          border: 1px solid #edf2f7;
        }

        .os-step { 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          padding: 14px 0; 
          font-size: 13px; 
          transition: all 0.3s ease;
        }

        .os-step:not(:last-child) { 
          border-bottom: 1px solid #e2e8f0; 
        }

        .os-step-icon {
          font-size: 15px; 
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #064e0d;
        }

        /* Action Buttons */
        .os-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: linear-gradient(135deg, #0a7408, #03450f);
          color: white;
          text-decoration: none;
          padding: 16px 24px;
          border-radius: 16px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
        }

        .os-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.4);
        }

        /* Keyframes */
        @keyframes slideUp { 
          from { transform: translateY(30px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }

        @keyframes popIn { 
          from { transform: scale(0.6); opacity: 0; } 
          to { transform: scale(1); opacity: 1; } 
        }

        /* Mobile Viewport Fixes */
        @media (max-width: 480px) { 
          .os-card { 
            padding: 32px 10px; 
            border-radius: 24px;
          }
          .os-header {
            flex-direction: row; /* Keeping them in the same line on mobile */
            gap: 10px;
          }
          .os-title {
            font-size: 32px;
          }
            
          .os-check {
            width: 45px;
            height: 45px;
            font-size: 20px;
          }
        }
      `}</style>

      <main className="os-page">
        <div className="os-card">
          
          {/* Flex Header aligning Icon and Title on the same line */}
          <div className="os-header">
            <div className="os-check"><strong>✔</strong></div>
            <h2 className="os-title">Order Placed!</h2>
          </div>

          <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', marginBottom: '14px', textAlign: 'center' }}>
            Thank you, <strong>{name}</strong>!
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {orderId && (
              <span style={{ background: '#f0fdf4', color: '#166534', padding: '8px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
                Order #{orderId}
              </span>
            )}

            <span style={{ 
              background: isPaid ? '#eff6ff' : '#fef3c7', 
              color: isPaid ? '#1e40af' : '#92400e', 
              padding: '8px 8px', 
              borderRadius: '50px', 
              fontSize: '10px', 
              fontWeight: 'bold',
              border: `1px solid ${isPaid ? '#bfdbfe' : '#fde68a'}`
            }}>
              {isPaid ? '💳 Card Payment' : '💵 Cash on Delivery'}
            </span>
          </div>

          <div className="os-steps">
            {steps.map((step, i) => (
              <div key={i} className="os-step" style={{ opacity: step.done ? 1 : 0.6 }}>
                <div className="os-step-icon">{step.icon}</div>
                <div style={{ flex: 1, color: step.done ? '#064e3b' : '#374151', fontWeight: step.done ? '600' : '400' }}>
                  {step.text}
                </div>
              </div>
            ))}
          </div>

          <div>
            <Link to="/" className="os-btn-primary">
              🏠 Back to Home
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
