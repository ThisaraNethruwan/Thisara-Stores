import { Link, useLocation } from 'react-router-dom'

export default function OrderSuccess() {
  const { state } = useLocation()

  const name         = state?.name        || 'Customer'
  const orderId      = state?.orderId     || null
  const method       = state?.method      || 'cod'
  const total        = state?.total       || 0
  const subtotal     = state?.subtotal    || 0
  const deliveryFee  = state?.deliveryFee ?? 0
  const phone        = state?.phone       || ''
  const address      = state?.address     || ''
  const note         = state?.note        || ''
  const items        = state?.items       || []
  const placedAt     = state?.placedAt    || new Date().toISOString()
  const isPaid       = method === 'card'
  const isFreeDelivery = deliveryFee === 0 && subtotal > 0

  const formattedDate = new Date(placedAt).toLocaleString('en-LK', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <style>{`
        /* ── Global screen hide ── */
        footer, .footer, #footer { display: none !important; }

        /* ── Screen layout ── */
        .os-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #f0faf3 0%, #fffbf0 60%, #f5f0e8 100%);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 32px 16px 60px;
          font-family: 'Nunito', sans-serif;
        }
        .os-wrap { width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 16px; }

        .os-banner {
          background: linear-gradient(135deg, #0f2d1c 0%, #1a3d28 50%, #1e6641 100%);
          border-radius: 24px; padding: 25px 28px 10px;
          color: #fff; position: relative; overflow: hidden;
          animation: osSlideUp 0.55s cubic-bezier(0.16,1,0.3,1) both;
        }
        .os-banner::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 80% 30%, rgba(82,183,136,.28) 0%, transparent 55%);
        }
        .os-banner-inner { position: relative; z-index: 1; }
        .os-banner-top { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
        .os-logo {
          width: 60px; height: 60px; border-radius: 50%; overflow: hidden;
          border: 3px solid rgba(255,255,255,.35); flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(0,0,0,.2);
          animation: osPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
        }
        .os-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .os-banner-title { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 900; color: #fff; line-height: 1.1; }
        .os-banner-sub { font-size: 14px; color: rgba(255,255,255,.75); margin-top: 3px; }
        .os-badges { display: flex; flex-wrap: wrap; gap: 8px; }
        .os-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,.15); border: 1.5px solid rgba(255,255,255,.25);
          padding: 6px 14px; border-radius: 50px; font-size: 12px; font-weight: 700; color: #fff;
        }
        .os-badge.gold { background: rgba(244,163,34,.25); border-color: rgba(244,163,34,.5); color: #fcd34d; }

        .os-receipt {
          background: #fff; border-radius: 22px; overflow: hidden;
          box-shadow: 0 4px 28px rgba(0,0,0,.08);
          animation: osSlideUp 0.55s 0.1s cubic-bezier(0.16,1,0.3,1) both;
        }
        .os-receipt-hdr {
          padding: 22px 24px 18px;
          background: linear-gradient(135deg, #f8faf8, #f0fdf4);
          border-bottom: 1.5px solid #e8f5ec;
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
        }
        .os-receipt-hdr h3 { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 900; color: #1e3a2a; }
        .os-receipt-hdr p { font-size: 12px; color: #888; margin-top: 3px; }
        .os-receipt-id {
          font-size: 11px; font-weight: 800; color: #1e6641;
          background: #d8f3dc; padding: 5px 12px; border-radius: 50px;
          white-space: nowrap; letter-spacing: .3px;
        }
        .os-info-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1.5px solid #f0f5f1; }
        .os-info-cell { padding: 14px 20px; border-right: 1.5px solid #f0f5f1; }
        .os-info-cell:last-child { border-right: none; }
        .os-info-cell:nth-child(3), .os-info-cell:nth-child(4) { border-top: 1.5px solid #f0f5f1; }
        .os-info-label { font-size: 10px; font-weight: 800; color: #94a89e; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
        .os-info-value { font-size: 13px; font-weight: 700; color: #1a1a1a; line-height: 1.5; }
        .os-info-address { grid-column: 1 / -1; border-right: none !important; }
        .os-items-hdr {
          padding: 14px 20px 10px; font-size: 10px; font-weight: 800; color: #94a89e;
          text-transform: uppercase; letter-spacing: .6px;
          border-bottom: 1.5px solid #f0f5f1;
          display: flex; justify-content: space-between;
        }
        .os-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #f8faf8; }
        .os-item:last-child { border-bottom: none; }
        .os-item-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; color: #111; }
        .os-item-meta { font-size: 11px; color: #888; margin-top: 2px; font-weight: 500; }
        .os-item-variant { display: inline-flex; align-items: center; background: #ede9fe; color: #5b21b6; font-size: 10px; font-weight: 700; padding: 1px 8px; border-radius: 50px; margin-left: 6px; vertical-align: middle; }
        .os-item-price { font-family: 'Fraunces', serif; font-size: 14px; font-weight: 900; color: #1e6641; white-space: nowrap; }
        .os-totals { padding: 14px 20px; border-top: 1.5px solid #f0f5f1; }
        .os-total-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: 13px; color: #555; }
        .os-total-row + .os-total-row { border-top: 1px solid #f8faf8; }
        .os-grand-total {
          margin-top: 10px; background: linear-gradient(135deg, #1a3d28, #1e6641);
          border-radius: 14px; padding: 16px 18px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .os-grand-total-label { font-size: 12px; color: rgba(255,255,255,.75); font-weight: 700; }
        .os-grand-total-val { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 900; color: #fff; }
        .os-payment-tag { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.15); color: #d8f3dc; padding: 3px 10px; border-radius: 50px; margin-top: 4px; display: inline-block; }
        .os-note { margin: 0 20px 14px; background: #fffbec; border: 1.5px solid #fde68a; border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #92400e; line-height: 1.6; }
        .os-steps-card {
          background: #fff; border-radius: 22px; box-shadow: 0 4px 28px rgba(0,0,0,.07);
          padding: 20px 22px;
          animation: osSlideUp 0.55s 0.18s cubic-bezier(0.16,1,0.3,1) both;
        }
        .os-steps-title { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 900; color: #1e3a2a; margin-bottom: 14px; }
        .os-step { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
        .os-step:not(:last-child) { border-bottom: 1px solid #f0faf3; }
        .os-step-ico { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .os-step-ico.done { background: #f0faf3; }
        .os-step-ico.pending { background: #f5f5f5; opacity: .5; }
        .os-step-text { font-size: 13px; font-weight: 600; }
        .os-step-text.done { color: #1e3a2a; }
        .os-step-text.pending { color: #aaa; }
        .os-actions { display: flex; flex-direction: column; gap: 10px; animation: osSlideUp 0.55s 0.26s cubic-bezier(0.16,1,0.3,1) both; }
        .os-btn-print {
          width: 100%; padding: 15px 20px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #1a3d28, #1e6641);
          color: #fff; font-family: 'Nunito', sans-serif;
          font-size: 15px; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 6px 20px rgba(30,102,65,.3); transition: transform .2s, box-shadow .2s;
        }
        .os-btn-print:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(30,102,65,.38); }
        .os-btn-home {
          width: 100%; padding: 14px 20px; border-radius: 14px;
          border: 2px solid #1e6641; background: transparent; color: #1e6641;
          font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          text-decoration: none; transition: background .2s;
        }
        .os-btn-home:hover { background: #f0faf3; }
        @keyframes osSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes osPopIn   { from { opacity: 0; transform: scale(.6); }        to { opacity: 1; transform: scale(1); } }
        @media (max-width: 480px) {
          .os-banner { padding: 24px 18px 20px; }
          .os-banner-title { font-size: 24px; }
          .os-info-grid { grid-template-columns: 1fr; }
          .os-info-cell { border-right: none !important; border-top: 1.5px solid #f0f5f1; }
          .os-info-cell:first-child { border-top: none; }
          .os-receipt-hdr { flex-direction: column; gap: 8px; }
        }

        /* ═══════════════════════════════════════
           PRINT STYLES — clean A4 invoice
           ═══════════════════════════════════════ */
        @media print {
          @page { size: A4; margin: 16mm; }

          /* Hide all screen UI */
          .os-page,
          .os-steps-card,
          .os-actions,
          nav, .nav-wrap,
          footer, .footer, #footer { display: none !important; }

          /* Show the receipt wrapper */
          .os-receipt-print-wrap {
            display: block !important;
            font-family: 'Nunito', sans-serif;
            color: #111;
          }

          /* Invoice header */
          .rp-header {
            display: flex !important;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 14px;
            margin-bottom: 18px;
            border-bottom: 2.5px solid #1e6641;
          }
          .rp-logo-row { display: flex !important; align-items: center; gap: 12px; }
          .rp-logo {
            width: 48px; height: 48px;
            border-radius: 50%; overflow: hidden;
            border: 2px solid #1e6641;
            flex-shrink: 0;
          }
          .rp-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .rp-shop-name { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 900; color: #1e6641; display: block; }
          .rp-shop-sub  { font-size: 10.5px; color: #666; display: block; margin-top: 1px; line-height: 1.5; }
          .rp-right { text-align: right; }
          .rp-label { font-size: 9px; font-weight: 800; color: #999; letter-spacing: 2px; text-transform: uppercase; display: block; }
          .rp-oid   { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 900; color: #1e6641; display: block; margin-top: 2px; }
          .rp-date  { font-size: 10px; color: #666; display: block; margin-top: 2px; }

          /* Customer info table */
          .rp-info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            border: 1px solid #e0e0e0;
          }
          .rp-info-table td {
            padding: 8px 12px;
            font-size: 12px;
            border: 1px solid #e0e0e0;
            vertical-align: top;
          }
          .rp-info-table td:first-child {
            font-weight: 800;
            color: #555;
            width: 28%;
            background: #f8faf8;
          }

          /* Items table */
          .rp-items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          .rp-items-table th {
            background: #1e6641;
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .5px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .rp-items-table th:last-child { text-align: right; }
          .rp-items-table td {
            padding: 9px 10px;
            font-size: 12px;
            border-bottom: 1px solid #efefef;
            vertical-align: top;
          }
          .rp-items-table td:last-child { text-align: right; font-weight: 700; }
          .rp-items-table tr:last-child td { border-bottom: none; }
          .rp-items-table tr:nth-child(even) td { background: #fafaf8; }
          .rp-item-variant {
            display: inline-block;
            background: #ede9fe;
            color: #5b21b6;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 50px;
            margin-left: 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .rp-item-sub { font-size: 10px; color: #888; margin-top: 2px; }

          /* Totals */
          .rp-totals {
            width: 260px;
            margin-left: auto;
            border-collapse: collapse;
            margin-bottom: 18px;
          }
          .rp-totals td { padding: 5px 10px; font-size: 12px; }
          .rp-totals td:last-child { text-align: right; font-weight: 700; }
          .rp-totals tr:not(:last-child) td { border-bottom: 1px solid #efefef; }
          .rp-total-grand td {
            background: #1e6641;
            color: #fff;
            font-family: 'Fraunces', serif;
            font-size: 14px;
            font-weight: 900;
            padding: 9px 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Note */
          .rp-note {
            background: #fffbec;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 11px;
            color: #92400e;
            margin-bottom: 14px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Footer */
          .rp-footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 10px;
            color: #aaa;
            line-height: 1.7;
          }
        }

        /* Screen: hide print-only elements */
        .os-receipt-print-wrap { display: none; }
      `}</style>

      {/* ── SCREEN VIEW ─────────────────────────────────────── */}
      <main className="os-page">
        <div className="os-wrap">

          <div className="os-banner">
            <div className="os-banner-inner">
              <div className="os-banner-top">
                <div className="os-logo">
                  <img src="/logo-round.png" alt="Thisara Stores" />
                </div>
                <div>
                  <div className="os-banner-title">Order Placed! 🎉</div>
                  <div className="os-banner-sub">Thank you, <strong>{name}</strong>!</div>
                </div>
              </div>
           
            </div>
          </div>

          <div className="os-receipt">
            <div className="os-receipt-hdr">
              <div>
                <h3>🧾 Order Receipt</h3>
                <p>{formattedDate}</p>
              </div>
              {orderId && <span className="os-receipt-id">#{orderId}</span>}
            </div>

            <div className="os-info-grid">
              <div className="os-info-cell">
                <div className="os-info-label">Customer</div>
                <div className="os-info-value">{name}</div>
              </div>
              <div className="os-info-cell">
                <div className="os-info-label">Phone</div>
                <div className="os-info-value">{phone || '—'}</div>
              </div>
              <div className="os-info-cell os-info-address">
                <div className="os-info-label">Delivery Address</div>
                <div className="os-info-value" style={{ fontWeight: 600, fontSize: 12, color: '#444' }}>
                  {address || '—'}
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <>
                <div className="os-items-hdr">
                  <span>Items ({items.length})</span>
                  <span>Subtotal</span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="os-item">
                    <div className="os-item-name">
                      <span>{item.name}</span>
                      {item.selectedVariant && (
                        <span className="os-item-variant">{item.selectedVariant}</span>
                      )}
                      <div className="os-item-meta">
                        {item.isWeightBased
                          ? `${item.weightLabel} · Rs. ${Number(item.price || 0).toLocaleString()}/kg`
                          : `Rs. ${Number(item.price || 0).toLocaleString()} × ${item.qty}`}
                      </div>
                    </div>
                    <div className="os-item-price">Rs. {Number(item.subtotal || 0).toLocaleString()}</div>
                  </div>
                ))}
              </>
            )}

            {note && (
              <div className="os-note">📝 <strong>Special request:</strong> {note}</div>
            )}

            <div className="os-totals">
              <div className="os-total-row">
                <span>Items subtotal</span>
                <span style={{ fontWeight: 700 }}>Rs. {Number(subtotal).toLocaleString()}</span>
              </div>
              <div className="os-total-row">
                <span>Delivery fee</span>
                <span style={{ fontWeight: 700 }}>
                  {isFreeDelivery
                    ? <span style={{ background: '#d8f3dc', color: '#1e6641', padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 800 }}>FREE</span>
                    : `Rs. ${Number(deliveryFee).toLocaleString()}`}
                </span>
              </div>
              <div className="os-grand-total">
                <div>
                  <div className="os-grand-total-label">Grand Total</div>
                  <div className="os-grand-total-val">Rs. {Number(total).toLocaleString()}</div>
                  <div className="os-payment-tag">{isPaid ? '💳 Card — Paid' : '💵 Cash on Delivery'}</div>
                </div>
                <span style={{ fontSize: 36 }}>💰</span>
              </div>
            </div>
          </div>

      

          <div className="os-actions">
            <button className="os-btn-print" onClick={() => window.print()}>
              🖨️ Print / Save as PDF
            </button>
            <Link to="/" className="os-btn-home">🏠 Back to Home</Link>
          </div>

        </div>
      </main>

      {/* ── PRINT-ONLY RECEIPT ───────────────────────────────── */}
      {/* display:none on screen; shown via @media print */}
      <div className="os-receipt-print-wrap">

        {/* Header */}
        <div className="rp-header">
          <div className="rp-logo-row">
            <div className="rp-logo">
              <img src="/logo-round.png" alt="Thisara Stores" />
            </div>
            <div>
              <span className="rp-shop-name">Thisara Stores</span>
              <span className="rp-shop-sub">Ragama, Western Province, Sri Lanka</span>
              <span className="rp-shop-sub">Tel: 0707779453</span>
            </div>
          </div>
          <div className="rp-right">
            <span className="rp-label">Order Receipt</span>
            <span className="rp-oid">{orderId ? `#${orderId}` : 'N/A'}</span>
            <span className="rp-date">{formattedDate}</span>
          </div>
        </div>

        {/* Customer info */}
        <table className="rp-info-table">
          <tbody>
            <tr>
              <td>Customer</td>
              <td>{name}</td>
            </tr>
            <tr>
              <td>Phone</td>
              <td>{phone || '—'}</td>
            </tr>
            <tr>
              <td>Delivery Address</td>
              <td>{address || '—'}</td>
            </tr>
            <tr>
              <td>Payment Method</td>
              <td>{isPaid ? 'Card Payment' : 'Cash on Delivery'}</td>
            </tr>
            {note && (
              <tr>
                <td>Special Request</td>
                <td>{note}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Items table */}
        {items.length > 0 && (
          <table className="rp-items-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Item</th>
                <th>Details</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    {item.name}
                    {item.selectedVariant && (
                      <span className="rp-item-variant">{item.selectedVariant}</span>
                    )}
                  </td>
                  <td>
                    {item.isWeightBased ? `Weight based` : `Fixed price`}
                  </td>
                  <td>
                    {item.isWeightBased ? item.weightLabel : `×${item.qty}`}
                  </td>
                  <td>
                    {item.isWeightBased
                      ? `Rs. ${Number(item.price || 0).toLocaleString()}/kg`
                      : `Rs. ${Number(item.price || 0).toLocaleString()}`}
                  </td>
                  <td>Rs. {Number(item.subtotal || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        <table className="rp-totals">
          <tbody>
            <tr>
              <td>Items Subtotal</td>
              <td>Rs. {Number(subtotal).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Delivery Fee</td>
              <td>{isFreeDelivery ? 'FREE' : `Rs. ${Number(deliveryFee).toLocaleString()}`}</td>
            </tr>
            <tr className="rp-total-grand">
              <td>Grand Total</td>
              <td>Rs. {Number(total).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="rp-footer">
          Thank you for shopping with Thisara Stores!<br />
          Ragama, Western Province, Sri Lanka &nbsp;|&nbsp; Tel: 0707779453<br />
          This is a computer-generated receipt. 
        </div>

      </div>
    </>
  )
}
