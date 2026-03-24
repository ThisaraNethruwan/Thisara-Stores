import { SHOP_NAME, OWNER_PHONE, OWNER_WHATSAPP, SHOP_ADDRESS } from '../utils/constants'

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <p style={{ color:'rgba(255,255,255,.8)', fontSize:15, maxWidth:520, margin:'0 auto' }}>
          Your privacy is important to us. Here is how {SHOP_NAME} collects and uses your information.
        </p>
        <div style={{ marginTop:16, fontSize:13, color:'rgba(255,255,255,.55)' }}>
          Last updated: {new Date().toLocaleDateString('en-LK', { year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      <div className="policy-body">

        <div className="policy-highlight">
          🔒 We only collect information necessary to process and deliver your orders. We never sell your personal data to third parties.
        </div>

        <div className="policy-section">
          <h2>1. Who We Are</h2>
          <p>
            {SHOP_NAME} is an online grocery delivery service based in Ragama, Western Province, Sri Lanka. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and place orders with us.
          </p>
        </div>

        <div className="policy-section">
          <h2>2. Information We Collect</h2>
          <p>We collect the following information when you place an order:</p>
          <ul>
            <li><strong>Name</strong> — to address your order and delivery</li>
            <li><strong>Phone number (WhatsApp)</strong> — to confirm your order and coordinate delivery</li>
            <li><strong>Delivery address and GPS location</strong> — to calculate delivery fee and deliver to your door</li>
            <li><strong>Order details</strong> — items, quantities, and amounts for processing your order</li>
            <li><strong>Payment information</strong> — processed securely through PayHere; we do not store your card details</li>
          </ul>
          <p>We do not require you to create an account to place an order. We do not collect more information than is necessary to fulfil your order.</p>
        </div>

        <div className="policy-section">
          <h2>3. How We Use Your Information</h2>
          <p>Your information is used solely for the following purposes:</p>
          <ul>
            <li>To process and confirm your grocery order</li>
            <li>To contact you via WhatsApp or phone regarding your order status</li>
            <li>To calculate and charge the correct delivery fee based on your location</li>
            <li>To deliver your order to the correct address</li>
            <li>To process payments securely through PayHere payment gateway</li>
            <li>To improve our service and resolve any complaints</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>4. How We Store Your Information</h2>
          <p>
            Your order data is stored securely in Google Firebase Firestore, a cloud database service provided by Google LLC. Firebase complies with international data protection standards. Your data is stored only as long as necessary for order fulfilment and legal compliance purposes.
          </p>
          <p>
            Your shopping cart is stored locally in your browser (localStorage) and is not transmitted to our servers until you place an order.
          </p>
        </div>

        <div className="policy-section">
          <h2>5. Payment Security</h2>
          <p>
            All card payments are processed through <strong>PayHere</strong>, a licensed payment gateway in Sri Lanka regulated by the Central Bank of Sri Lanka. We do not store, see, or have access to your card number, CVV, or banking details. All card transactions are encrypted and handled entirely by PayHere's secure servers.
          </p>
        </div>

        <div className="policy-section">
          <h2>6. Sharing Your Information</h2>
          <p>We do not sell, rent, or trade your personal information. We may share your information only in the following limited circumstances:</p>
          <ul>
            <li><strong>PayHere</strong> — for processing card payments (only order amount and reference details)</li>
            <li><strong>Google Firebase</strong> — for secure data storage</li>
            <li><strong>Legal requirements</strong> — if required by law or a government authority in Sri Lanka</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>7. Cookies</h2>
          <p>
            Our website uses minimal browser storage (localStorage) to save your shopping cart between visits. We do not use advertising cookies or tracking pixels. We do not use Google Analytics or any third-party tracking services.
          </p>
        </div>

        <div className="policy-section">
          <h2>8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Request access to the personal data we hold about you</li>
            <li>Request deletion of your personal data from our records</li>
            <li>Withdraw consent for us to contact you</li>
          </ul>
          <p>To exercise any of these rights, please contact us via WhatsApp or phone.</p>
        </div>

        <div className="policy-section">
          <h2>9. Children's Privacy</h2>
          <p>
            Our service is not directed at children under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us and we will delete it promptly.
          </p>
        </div>

        <div className="policy-section">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated date. Continued use of our website after changes constitutes acceptance of the updated policy.
          </p>
        </div>

        <div className="policy-section">
          <h2>11. Contact Us</h2>
          <p>For any privacy-related questions or requests:</p>
          <ul>
            <li>📞 Phone / WhatsApp: <strong>{OWNER_PHONE}</strong></li>
            <li>📍 Address: {SHOP_ADDRESS}</li>
          </ul>
        </div>

     

      </div>
    </>
  )
}
