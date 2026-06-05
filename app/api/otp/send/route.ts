import { NextRequest, NextResponse } from 'next/server'
import { sendOtpSms, generateOtp } from '@/lib/otp'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

  const otp = generateOtp()
  const sent = await sendOtpSms(phone, otp, '')
  if (!sent) return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })

  return NextResponse.json({ success: true })
}