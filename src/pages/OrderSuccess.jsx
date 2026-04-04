import { Link, useLocation } from 'react-router-dom'

export default function OrderSuccess() {
  const { state } = useLocation()

  const name          = state?.name        || 'Customer'
  const orderId       = state?.orderId     || null
  const method        = state?.method      || 'cod'
  const total         = state?.total       || 0
  const subtotal      = state?.subtotal    || 0
  const deliveryFee   = state?.deliveryFee ?? 0
  const phone         = state?.phone       || ''
  const address       = state?.address     || ''
  const note          = state?.note        || ''
  const items         = state?.items       || []
  const placedAt      = state?.placedAt    || new Date().toISOString()
  const isPaid        = method === 'card'
  const isFreeDelivery = deliveryFee === 0 && subtotal > 0

  const formattedDate = new Date(placedAt).toLocaleString('en-LK', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // ── PDF Download using jsPDF (text-based, perfectly structured) ─────────
const handleDownloadPDF = async () => {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const W = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // ── Palette ──────────────────────────────────────────────
    const dkGreen  = [13, 38, 24]
    const green    = [28, 98, 62]
    const midGreen = [44, 130, 85]
    const ltGreen  = [236, 248, 240]
    const white    = [255, 255, 255]
    const offWhite = [249, 252, 250]
    const silver   = [155, 165, 160]
    const ink      = [22, 22, 22]
    const rule     = [220, 234, 224]

    // ── Load logo ────────────────────────────────────────────
    let logoBase64 = null
    try {
      const res  = await fetch('/logo-round.png')
      const blob = await res.blob()
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch (_) {}

    let y = 0

    // ══════════════════════════════════════════════════════════
    // HEADER  — compact dark band
    // ══════════════════════════════════════════════════════════
    const HDR_H = 26
    doc.setFillColor(...dkGreen)
    doc.rect(0, 0, W, HDR_H, 'F')

    // subtle accent stripe
    doc.setFillColor(...green)
    doc.rect(0, HDR_H - 2, W, 2, 'F')

    // Logo — small circle on left
    const LOGO_SIZE = 16
    const LOGO_X    = 12
    const LOGO_Y    = (HDR_H - LOGO_SIZE) / 2
    if (logoBase64) {
      // white circle bg behind logo
      doc.setFillColor(...white)
      doc.circle(LOGO_X + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2, LOGO_SIZE / 2 + 0.8, 'F')
      doc.addImage(logoBase64, 'PNG', LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, '', 'FAST')
    } else {
      doc.setFillColor(...green)
      doc.circle(LOGO_X + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2, LOGO_SIZE / 2, 'F')
    }

    // Shop name + tagline
    const TEXT_X = LOGO_X + LOGO_SIZE + 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...white)
    doc.text('Thisara Stores', TEXT_X, HDR_H / 2 - 1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(160, 210, 180)
    doc.text('Ragama, Western Province, Sri Lanka   |   Tel: 0707779453', TEXT_X, HDR_H / 2 + 5)

    // Right: ORDER RECEIPT + ID + date
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(160, 210, 180)
    doc.text('ORDER RECEIPT', W - 12, 8, { align: 'right' })

    doc.setFontSize(11)
    doc.setTextColor(...white)
    doc.text(orderId ? `#${orderId}` : 'N/A', W - 12, 15, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(160, 210, 180)
    doc.text(formattedDate, W - 12, 21, { align: 'right' })

    y = HDR_H + 9

    // ══════════════════════════════════════════════════════════
    // CUSTOMER INFORMATION
    // ══════════════════════════════════════════════════════════
    // Section label
    doc.setFillColor(...ltGreen)
    doc.roundedRect(14, y, W - 28, 6.5, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...green)
    doc.text('CUSTOMER INFORMATION', 18, y + 4.3)
    y += 10

    const infoRows = [
      ['Customer',        name],
      ['Phone',           phone || '-'],
      ['Delivery Address', address || '-'],
      ['Payment',         isPaid ? 'Card Payment  (Paid)' : 'Cash on Delivery'],
    ]
    if (note) infoRows.push(['Special Request', note])

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      tableWidth: W - 28,
      head: [],
      body: infoRows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: silver, cellWidth: 38 },
        1: { textColor: ink },
      },
      didDrawCell: (data) => {
        if (data.row.index < infoRows.length - 1 && data.column.index === 1) {
          doc.setDrawColor(...rule)
          doc.setLineWidth(0.25)
          doc.line(14, data.cell.y + data.cell.height, W - 14, data.cell.y + data.cell.height)
        }
      },
    })

    y = doc.lastAutoTable.finalY + 10

    // ══════════════════════════════════════════════════════════
    // ORDER ITEMS
    // ══════════════════════════════════════════════════════════
    doc.setFillColor(...ltGreen)
    doc.roundedRect(14, y, W - 28, 6.5, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...green)
    doc.text('ORDER ITEMS', 18, y + 4.3)
    y += 10

    const itemRows = items.map((item, i) => [
      `${i + 1}`,
      item.name + (item.selectedVariant ? `  [${item.selectedVariant}]` : ''),
      item.isWeightBased ? item.weightLabel : `x${item.qty}`,
      item.isWeightBased
        ? `Rs. ${Number(item.price || 0).toLocaleString()}/kg`
        : `Rs. ${Number(item.price || 0).toLocaleString()}`,
      `Rs. ${Number(item.subtotal || 0).toLocaleString()}`,
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      tableWidth: W - 28,
      head: [['#', 'Item', 'Qty / Weight', 'Unit Price', 'Subtotal']],
      body: itemRows,
      theme: 'grid',
      headStyles: {
        fillColor: green,
        textColor: white,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: ink,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        overflow: 'linebreak',
      },
      alternateRowStyles: { fillColor: offWhite },
      columnStyles: {
        0: { cellWidth: 9,  halign: 'center', textColor: silver, fontSize: 8 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: green },
      },
      styles: { lineColor: rule, lineWidth: 0.25 },
    })

    y = doc.lastAutoTable.finalY + 8

    // ══════════════════════════════════════════════════════════
    // TOTALS  — right-aligned compact block
    // ══════════════════════════════════════════════════════════
    const TW = 76          // totals block width
    const TX = W - 14 - TW // left edge of block

    // thin top rule across full width
    doc.setDrawColor(...rule)
    doc.setLineWidth(0.3)
    doc.line(14, y - 2, W - 14, y - 2)

    // Row helper
    const drawTotalRow = (label, value, bgColor, labelColor, valueColor, rowH = 9) => {
      doc.setFillColor(...bgColor)
      doc.rect(TX, y, TW, rowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...labelColor)
      doc.text(label, TX + 5, y + rowH / 2 + 1.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...valueColor)
      doc.text(value, TX + TW - 5, y + rowH / 2 + 1.5, { align: 'right' })
      // bottom rule
      doc.setDrawColor(...rule)
      doc.setLineWidth(0.25)
      doc.line(TX, y + rowH, TX + TW, y + rowH)
      y += rowH
    }

    drawTotalRow(
      'Items Subtotal',
      `Rs. ${Number(subtotal).toLocaleString()}`,
      offWhite, silver, ink
    )
    drawTotalRow(
      'Delivery Fee',
      isFreeDelivery ? 'FREE' : `Rs. ${Number(deliveryFee).toLocaleString()}`,
      offWhite, silver, isFreeDelivery ? green : ink
    )

    // Grand total — taller dark row
    const GT_H = 13
    doc.setFillColor(...green)
    doc.roundedRect(TX, y, TW, GT_H, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(150, 205, 170)
    doc.text('GRAND TOTAL', TX + 5, y + 5)
    doc.setFontSize(12)
    doc.setTextColor(...white)
    doc.text(`Rs. ${Number(total).toLocaleString()}`, TX + TW - 5, y + 10, { align: 'right' })
    y += GT_H + 4

    // Payment pill
    doc.setFillColor(...ltGreen)
    doc.setDrawColor(...midGreen)
    doc.setLineWidth(0.4)
    doc.roundedRect(TX, y, TW, 7.5, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...green)
    doc.text(
      isPaid ? 'Card Payment - Paid' : 'Cash on Delivery',
      TX + TW / 2, y + 5, { align: 'center' }
    )

    // ══════════════════════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════════════════════
    // thin rule above footer
    doc.setDrawColor(...rule)
    doc.setLineWidth(0.4)
    doc.line(14, pageH - 20, W - 14, pageH - 20)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...green)
    doc.text('Thank you for shopping with Thisara Stores!', W / 2, pageH - 14, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...silver)
    doc.text('Ragama, Western Province, Sri Lanka   |   Tel: 0707779453', W / 2, pageH - 9, { align: 'center' })
    doc.text('This is a computer-generated receipt.', W / 2, pageH - 4, { align: 'center' })

    // Detect iOS non-Safari (Chrome, Firefox, etc on iOS)
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

if (isIOS && !isSafari) {
  // iOS Chrome/Firefox can't trigger downloads — open in new tab instead
  const pdfBlob = doc.output('blob')
  const blobUrl = URL.createObjectURL(pdfBlob)
  window.open(blobUrl, '_blank')
  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
} else {
  doc.save(`Thisara-Order-${orderId || 'Receipt'}.pdf`)
}
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        footer, .footer, #footer { display: none !important; }

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
          border-radius: 24px; padding: 25px 28px 22px;
          color: #fff; position: relative; overflow: hidden;
          animation: osSlideUp 0.55s cubic-bezier(0.16,1,0.3,1) both;
        }
        .os-banner::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 80% 30%, rgba(82,183,136,.28) 0%, transparent 55%);
        }
        .os-banner-inner { position: relative; z-index: 1; }
        .os-banner-top { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
        .os-logo {
          width: 60px; height: 60px; border-radius: 50%; overflow: hidden;
          border: 3px solid rgba(255,255,255,.35); flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(0,0,0,.2);
          animation: osPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
        }
        .os-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .os-banner-title { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 900; color: #fff; line-height: 1.1; }
        .os-banner-sub { font-size: 14px; color: rgba(255,255,255,.75); margin-top: 3px; }

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
        .os-info-cell:nth-child(n+3) { border-top: 1.5px solid #f0f5f1; }
        .os-info-label { font-size: 10px; font-weight: 800; color: #94a89e; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
        .os-info-value { font-size: 13px; font-weight: 700; color: #1a1a1a; line-height: 1.5; }
        .os-info-full { grid-column: 1 / -1; border-right: none !important; }

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
        .os-btn-download {
          width: 100%; padding: 15px 20px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #1a3d28, #1e6641);
          color: #fff; font-family: 'Nunito', sans-serif;
          font-size: 15px; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 6px 20px rgba(30,102,65,.3); transition: transform .2s, box-shadow .2s;
        }
        .os-btn-download:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(30,102,65,.38); }
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

        @media print { * { display: none !important; } }
      `}</style>

      <main className="os-page">
        <div className="os-wrap">

          {/* Banner */}
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

          {/* Receipt card */}
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
              <div className="os-info-cell os-info-full">
                <div className="os-info-label">Delivery Address</div>
                <div className="os-info-value" style={{ fontWeight: 600, fontSize: 12, color: '#444' }}>
                  {address || '—'}
                </div>
              </div>
              <div className="os-info-cell os-info-full" style={{ borderTop: '1.5px solid #f0f5f1' }}>
                <div className="os-info-label">Payment</div>
                <div className="os-info-value">{isPaid ? '💳 Card Payment' : '💵 Cash on Delivery'}</div>
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

          {/* What happens next */}
          <div className="os-steps-card">
            <div className="os-steps-title">What happens next?</div>
            <div className="os-step">
              <div className="os-step-ico done">✅</div>
              <div className="os-step-text done">Order received & confirmed</div>
            </div>
            <div className="os-step">
              <div className="os-step-ico done">📦</div>
              <div className="os-step-text done">We're packing your items</div>
            </div>
            <div className="os-step">
              <div className="os-step-ico pending">🚚</div>
              <div className="os-step-text pending">Out for delivery</div>
            </div>
            <div className="os-step">
              <div className="os-step-ico pending">🏠</div>
              <div className="os-step-text pending">Delivered to your door</div>
            </div>
          </div>

          {/* Actions */}
          <div className="os-actions">
            <button className="os-btn-download" onClick={handleDownloadPDF}>
              ⬇Download Receipt (PDF)
            </button>
            <Link to="/" className="os-btn-home">🏠 Back to Home</Link>
          </div>

        </div>
      </main>
    </>
  )
}
