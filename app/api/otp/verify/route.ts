import { NextRequest, NextResponse } from 'next/server'
import { verifyOtpSms } from '@/lib/otp'
import { createServiceClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { phone, otp } = await req.json()
  if (!phone || !otp) return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })

  // Step 1 — verify OTP via MSG91
  const isValid = await verifyOtpSms(phone, otp)
  if (!isValid) return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 })

  const admin = createServiceClient()
  const virtualEmail    = `${phone}@cleenzo.app`
  const virtualPassword = `cleenzo_${phone}_secure_2024`

  // Step 2 — check if auth user already exists via admin API
  const { data: listData } = await admin.auth.admin.listUsers()
  const existingAuthUser = listData?.users?.find(u => u.email === virtualEmail)

  if (existingAuthUser) {
    // ── Existing user path ──────────────────────────────────────
    // Ensure password is correct (reset it to be safe)
    await admin.auth.admin.updateUserById(existingAuthUser.id, {
      password:      virtualPassword,
      email_confirm: true,
    })

    // Sign in to get a session
    const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
      email:    virtualEmail,
      password: virtualPassword,
    })

    if (signInError || !signInData?.session) {
      console.error('Sign in error:', signInError)
      return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 })
    }

    // Get user record from your table
    const { data: existing } = await admin
      .from('users')
      .select('id, phone, role, full_name')
      .eq('phone', phone)
      .single()

    return NextResponse.json({
      success:       true,
      user:          existing ?? { id: existingAuthUser.id, phone, role: 'customer', full_name: '' },
      access_token:  signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    })
  }

  // ── New user path ─────────────────────────────────────────────
  // Step 3 — create auth user with email confirmed immediately
  const { data: signUpData, error: signUpError } = await admin.auth.admin.createUser({
    email:            virtualEmail,
    password:         virtualPassword,
    email_confirm:    true,           // ← skips confirmation email entirely
    user_metadata:    { phone },
  })

  if (signUpError || !signUpData?.user) {
    console.error('SignUp error:', signUpError)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }

  const authUserId = signUpData.user.id

  // Step 4 — insert into your users table
  await admin.from('users').insert({
    id:          authUserId,
    phone,
    is_verified: true,
    role:        'customer',
  })

  // Step 5 — sign in to get a real session
  const { data: finalSession, error: finalError } = await admin.auth.signInWithPassword({
    email:    virtualEmail,
    password: virtualPassword,
  })

  if (finalError || !finalSession?.session) {
    console.error('Final sign in error:', finalError)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json({
    success:       true,
    user:          { id: authUserId, phone, role: 'customer', full_name: '' },
    access_token:  finalSession.session.access_token,
    refresh_token: finalSession.session.refresh_token,
  })
}