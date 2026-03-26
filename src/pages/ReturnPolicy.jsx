import { SHOP_NAME, OWNER_PHONE, OWNER_WHATSAPP, SHOP_ADDRESS } from '../utils/constants'

export default function ReturnPolicy() {
  return (
    <>
      <style>{`
        .policy-hero { background:linear-gradient(135deg,#0f2d1c,#1e6641); padding:60px 20px 48px; text-align:center; }
        .policy-body { max-width:780px; margin:0 auto; padding:48px 24px 80px; }
        .policy-section { margin-bottom:36px; }
        .policy-section h2 { font-family:'Fraunces',serif; font-size:20px; font-weight:900; color:#1e6641; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #d8f3dc; }
        .policy-section p, .policy-section li { font-size:15px; color:#444; line-height:1.85; margin-bottom:10px; }
        .policy-section ul { padding-left:20px; }
        .policy-section li { margin-bottom:8px; }
        .policy-highlight { background:#f0faf3; border-left:4px solid #1e6641; border-radius:0 10px 10px 0; padding:14px 18px; margin:16px 0; font-size:14px; color:#1e6641; font-weight:600; line-height:1.7; }
        .policy-contact { background:#1e6641; color:#fff; border-radius:16px; padding:24px; margin-top:40px; text-align:center; }
        .policy-contact p { color:rgba(255,255,255,.85); font-size:14px; margin-bottom:16px; }
        .policy-contact-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .policy-contact-btns a { padding:10px 22px; border-radius:50px; font-weight:700; font-size:13px; text-decoration:none; }
      `}</style>

      <div className="policy-hero">
        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:'clamp(26px,5vw,40px)', fontWeight:900, color:'#fff', marginBottom:10 }}>
          Return & Refund Policy
        </h1>
        <p style={{ color:'rgba(255,255,255,.8)', fontSize:15, maxWidth:520, margin:'0 auto' }}>
          We want you to be completely satisfied with every order from {SHOP_NAME}.
        </p>
        <div style={{ marginTop:16, fontSize:13, color:'rgba(255,255,255,.55)' }}>
          Last updated: {new Date().toLocaleDateString('en-LK', { year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      <div className="policy-body">

        <div className="policy-highlight">
          📦 We take full responsibility for damaged, wrong, or missing items. Contact us within 24 hours of delivery and we will make it right.
        </div>

        <div className="policy-section">
          <h2>1. Our Commitment</h2>
          <p>
            At {SHOP_NAME}, we are committed to delivering fresh, high-quality grocery products to your doorstep. If you are not satisfied with your order for any reason covered under this policy, we will do our best to resolve the issue promptly.
          </p>
        </div>

        <div className="policy-section">
          <h2>2. Eligible Return & Refund Situations</h2>
          <p>You are eligible for a return, replacement, or refund in the following situations:</p>
          <ul>
            <li>You received a <strong>wrong item</strong> that you did not order</li>
            <li>The product is <strong>damaged, spoiled, or in poor condition</strong> upon delivery</li>
            <li>The product is <strong>past its expiry date</strong> at the time of delivery</li>
            <li>A <strong>significant quantity shortage</strong> compared to what was ordered and charged</li>
            <li>An item was <strong>missing</strong> from your order but charged</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>3. Non-Returnable Items</h2>
          <p>Due to the perishable nature of grocery products, the following cannot be returned:</p>
          <ul>
            <li>Fresh vegetables, fruits, and dairy products once accepted in good condition</li>
            <li>Items that have been opened, used, or consumed</li>
            <li>Products damaged due to improper storage by the customer after delivery</li>
            <li>Items where the complaint is raised more than 24 hours after delivery</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>4. How to Request a Return or Refund</h2>
          <p>To initiate a return or refund request, please follow these steps:</p>
          <ul>
            <li>Contact us via <strong>WhatsApp or phone within 24 hours</strong> of receiving your delivery</li>
            <li>Provide your <strong>order number</strong> and a brief description of the issue</li>
            <li>Send a <strong>clear photo</strong> of the damaged or incorrect item via WhatsApp</li>
            <li>Our team will review and respond within <strong>24 hours</strong></li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>5. Refund Methods</h2>
          <p>Once your return request is approved, we will process the refund as follows:</p>
          <ul>
            <li><strong>Cash on Delivery orders:</strong> Cash refund at the time of replacement delivery, or bank transfer within 3–5 business days</li>
            <li><strong>Card payments (PayHere):</strong> Refund to the original payment card within 1–3 business days, depending on your bank</li>
            <li><strong>Replacement:</strong> A replacement of the item may be offered at our discretion at no extra charge</li>
          </ul>
        </div>

  

        <div className="policy-section">
          <h2>7. Contact Us</h2>
          <p>For any return, refund, or cancellation requests, please reach us through:</p>
          <ul>
            <li>📞 Phone / WhatsApp: <strong>{OWNER_PHONE}</strong></li>
            <li>📍 Address: {SHOP_ADDRESS}</li>
          </ul>
        </div>


      </div>
    </>
  )
}
