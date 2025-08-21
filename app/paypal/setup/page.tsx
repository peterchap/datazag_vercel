'use client'

export default function PayPalSetupDocs() {
  return (
    <div style={{ maxWidth: 720, margin: '40px auto', lineHeight: 1.6 }}>
      <h1>PayPal Setup</h1>
      <p>
        Ensure PAYPAL_CLIENT_TOKEN (or NEXT_PUBLIC_PAYPAL_CLIENT_TOKEN) is set in your environment.
      </p>
      <pre>
        {`GET /api/paypal/setup -> { clientToken }`}
      </pre>
    </div>
  );
}
