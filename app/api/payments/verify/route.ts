import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    const body      = razorpay_order_id + '|' + razorpay_payment_id
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    const isValid = expected === razorpay_signature

    if (!isValid) {
      return NextResponse.json({ verified: false }, { status: 400 })
    }

    return NextResponse.json({ verified: true })
  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.json({ verified: false }, { status: 500 })
  }
}