import { SHOP_NAME, OWNER_PHONE, OWNER_WHATSAPP, SHOP_ADDRESS, DELIVERY_RATE_PER_KM, FREE_DELIVERY_THRESHOLD } from '../utils/constants'

export default function TermsConditions() {
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
        <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:'clamp(26px,5vw,40px)', fontWeight:900, color:'#fff', marginBottom:10 }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ color:'rgba(255,255,255,.8)', fontSize:15, maxWidth:520, margin:'0 auto' }}>
          Please read these terms carefully before placing an order with {SHOP_NAME}.
        </p>
        <div style={{ marginTop:16, fontSize:13, color:'rgba(255,255,255,.55)' }}>
          Last updated: {new Date().toLocaleDateString('en-LK', { year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      <div className="policy-body">

        <div className="policy-highlight">
          📋 By placing an order on our website, you agree to these Terms and Conditions. If you do not agree, please do not use our service.
        </div>

        <div className="policy-section">
          <h2>1. About Us</h2>
          <p>
            {SHOP_NAME} is an online grocery delivery service based in Ragama, Western Province, Sri Lanka. We sell and deliver daily grocery items to customers in Ragama and surrounding areas. These Terms and Conditions govern your use of our website and the purchase of products from us.
          </p>
        </div>

        <div className="policy-section">
          <h2>2. Ordering</h2>
          <ul>
            <li>Orders are placed through our website by adding items to your cart and completing the checkout form</li>
            <li>All orders are confirmed via <strong>WhatsApp</strong> — you will receive a confirmation message after placing your order</li>
            <li>We reserve the right to cancel or refuse any order at our discretion, for example if an item is out of stock or the delivery location is outside our service area</li>
            <li>Prices displayed on the website are in <strong>Sri Lankan Rupees (LKR)</strong> and are inclusive of all applicable charges unless stated otherwise</li>
            <li>Product availability and prices may change without prior notice</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>3. Delivery</h2>
          <ul>
            <li>We deliver to Ragama, Kandana, Ja-Ela, Wattala, Kelaniya, Peliyagoda, Ekala, Seeduwa, Minuwangoda, Katunayake, and surrounding areas</li>
            <li>Delivery fee is calculated based on distance from our store at a rate of <strong>Rs. {DELIVERY_RATE_PER_KM}/km</strong></li>
            <li>Orders above <strong>Rs. {FREE_DELIVERY_THRESHOLD.toLocaleString()}</strong> qualify for free delivery</li>
            <li>Delivery times are same-day for orders placed during business hours. We will confirm the estimated delivery time via WhatsApp</li>
            <li>We are not liable for delays caused by traffic, weather, or other circumstances beyond our control</li>
            <li>Someone must be available at the delivery address to receive the order. If no one is available, we will contact you via WhatsApp to arrange re-delivery</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>4. Pricing & Payments</h2>
          <ul>
            <li>All prices are in Sri Lankan Rupees (LKR)</li>
            <li>We accept <strong>Cash on Delivery (COD)</strong> and <strong>card payments via PayHere</strong></li>
            <li>For card payments, your transaction is processed securely by PayHere — a licensed payment gateway regulated by the Central Bank of Sri Lanka</li>
            <li>We do not store your card details at any time</li>
            <li>For weight-based products (rice, spices, etc.), the final price is calculated based on the weight selected at the time of ordering</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>5. Product Quality</h2>
          <ul>
            <li>We take all reasonable care to ensure products are fresh and of good quality at the time of delivery</li>
            <li>All perishable items (vegetables, dairy, etc.) are sourced daily and delivered fresh</li>
            <li>If you receive a damaged, wrong, or expired item, please contact us within <strong>24 hours</strong> of delivery — refer to our Return &amp; Refund Policy for details</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>6. Cancellations</h2>
          <ul>
            <li>You may cancel your order by contacting us via WhatsApp <strong>before the order is dispatched</strong></li>
            <li>Once dispatched, cancellation is not possible</li>
            <li>For prepaid card orders cancelled before dispatch, a full refund will be issued within 7–14 business days</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            {SHOP_NAME} will not be liable for any indirect, incidental, or consequential damages arising from the use of our service. Our total liability in any case is limited to the value of the order placed. We are not responsible for any loss or damage caused by events outside our reasonable control.
          </p>
        </div>

        <div className="policy-section">
          <h2>8. Intellectual Property</h2>
          <p>
            All content on this website, including text, images, logos, and design, is the property of {SHOP_NAME} and may not be copied, reproduced, or used without our written permission.
          </p>
        </div>

        <div className="policy-section">
          <h2>9. Governing Law</h2>
          <p>
            These Terms and Conditions are governed by the laws of Sri Lanka. Any disputes arising from the use of our service or these terms shall be subject to the jurisdiction of the courts of Sri Lanka.
          </p>
        </div>

        <div className="policy-section">
          <h2>10. Changes to These Terms</h2>
          <p>
            We reserve the right to update these Terms and Conditions at any time. Changes will be posted on this page with an updated date. Continued use of our service after changes have been posted constitutes your acceptance of the revised terms.
          </p>
        </div>

        <div className="policy-section">
          <h2>11. Contact Us</h2>
          <p>For any questions about these Terms and Conditions:</p>
          <ul>
            <li>📞 Phone / WhatsApp: <strong>{OWNER_PHONE}</strong></li>
            <li>📍 Address: {SHOP_ADDRESS}</li>
          </ul>
        </div>


      </div>
    </>
  )
}