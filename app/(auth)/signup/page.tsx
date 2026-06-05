'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BG, CARD_STYLE, PhoneInput, OtpInput, CyanButton,
  ErrorBox, BackButton, CardHeader, useOtpFlow
} from '../shared'

export default function SignupPage() {
  const router = useRouter()
  const {
    phone, setPhone, otp, setOtp, step, setStep,
    loading, error, setError, sendOtp, verifyOtp, supabase,
  } = useOtpFlow()
  const [name, setName] = useState('')

  async function handleSend() {
    if (!name.trim()) { setError('Please enter your full name'); return }
    await sendOtp()
  }

  async function handleVerify() {
    const user = await verifyOtp()
    if (!user) return

    // create customer profile
    await supabase.from('users').upsert({
      id:        user.id,
      full_name: name.trim(),
      phone:     `+91${phone}`,
      role:      'customer',
    })

    router.push('/services')
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center
      justify-center px-4 py-8" style={{ background: BG }}>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-slide { animation: slideUp 0.45s ease forwards; }
      `}</style>

      {/* blobs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 pointer-events-none rounded-full"
        style={{ background: 'rgba(6,182,212,0.12)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 pointer-events-none rounded-full"
        style={{ background: 'rgba(8,145,178,0.10)' }} />

      <div className="relative z-10 w-full max-w-sm">

        {/* logo */}
        <div className="text-center mb-6 auth-slide">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl
            mb-3 shadow-xl" style={{
              background:    'rgba(255,255,255,0.7)',
              backdropFilter:'blur(12px)',
              border:        '2px solid rgba(6,182,212,0.3)',
            }}>
            <span className="text-3xl">🧹</span>
          </div>
          <h1 className="text-3xl font-black text-cyan-900 tracking-tight">GoCleenzo</h1>
          <p className="text-cyan-600 text-sm mt-1 font-medium">Home care in minutes</p>
        </div>

        <div className="auth-slide overflow-hidden" style={CARD_STYLE}>

          {/* STEP 1 — name + phone */}
          {step === 'phone' && (
            <>
              <CardHeader emoji="🎉" title="Create Account" subtitle="Join thousands of happy customers" />
              <div className="px-6 py-6 space-y-4">

                {/* trust pills */}
                <div className="flex justify-center gap-2 pb-1">
                  {['⭐ 4.8 Rated', '✓ Verified', '⚡ Fast'].map(b => (
                    <div key={b} className="px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: '#ECFEFF', color: '#0891B2', border: '1px solid #A5F3FC' }}>
                      {b}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-black text-gray-400 uppercase
                    tracking-wider block mb-2">Full Name</label>
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-3.5"
                    style={{ border: '2px solid #A5F3FC', background: '#F0FDFF' }}>
                    <span className="text-lg flex-shrink-0">👤</span>
                    <input type="text" placeholder="Your full name" value={name}
                      onChange={e => setName(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-gray-900
                        font-bold text-sm placeholder-cyan-300" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-400 uppercase
                    tracking-wider block mb-2">Phone Number</label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>

                <ErrorBox msg={error} />

                <CyanButton
                  onClick={handleSend}
                  loading={loading}
                  disabled={phone.length < 10 || !name.trim()}>
                  Get Started
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </CyanButton>

                <p className="text-center text-xs text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="font-black text-cyan-600 hover:underline">
                    Login
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* STEP 2 — OTP */}
          {step === 'otp' && (
            <>
              <CardHeader emoji="📱" title="Verify OTP" subtitle={`Sent to +91 ${phone}`} />
              <div className="px-6 py-6 space-y-4">
                <BackButton onClick={() => { setStep('phone'); setError('') }} />
                <div className="text-center -mt-2">
                  <p className="text-sm text-gray-500">Enter the 6-digit code</p>
                  <p className="text-xs text-cyan-600 font-semibold mt-0.5">
                    Creating account for {name}
                  </p>
                </div>
                <OtpInput value={otp} onChange={setOtp} />
                <ErrorBox msg={error} />
                <CyanButton
                  onClick={handleVerify}
                  loading={loading}
                  disabled={otp.join('').length < 6}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Create Account
                </CyanButton>
                <button onClick={handleSend}
                  className="w-full text-center text-xs font-semibold text-cyan-500 py-2">
                  Resend OTP
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-cyan-700/50 text-xs mt-6">
          By signing up you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  )
}