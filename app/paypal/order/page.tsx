'use client'

export default function PayPalOrderDocs() {
  return (
    <div style={{ maxWidth: 720, margin: '40px auto', lineHeight: 1.6 }}>
      <h1>PayPal Order Endpoints</h1>
      <ul>
        <li>POST /api/paypal/order {'{'} bundleId {'}'} -&gt; returns {'{'} id {'}'}</li>
        <li>POST /api/paypal/order/[id]/capture {'{'} bundleId {'}'} -&gt; credits user on success</li>
      </ul>
    </div>
  );
}
