import { NextResponse } from 'next/server'

export async function GET() {
  // Fetch rates from exchangerate.host (base: USD)
  const res = await fetch('https://api.exchangerate.host/latest?base=USD')
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 })
  }

  const data = await res.json()
  // You can limit currencies if you want:
  const rates = {
    USD: data.rates.USD,
    EUR: data.rates.EUR,
    GBP: data.rates.GBP,
    JPY: data.rates.JPY,
    AUD: data.rates.AUD,
    // add any others you need
  }

  return NextResponse.json(rates)
}