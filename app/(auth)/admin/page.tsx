'use client'
import { useRouter } from 'next/navigation'
import {
  CARD_STYLE, OtpInput, CyanButton, ErrorBox, BackButton,
  CardHeader, useOtpFlow
} from '../shared'

export default function AdminLoginPage() {
  const router = useRouter()
  const {
    phone, setPhone, otp, setOtp, step, setStep,
    loading, error, setError, sendOtp, verifyOtp, supabase,
  } = useOtpFlow()

  async function handleVerify() {
    const user = await verifyOtp()
    if (!user) return

    // Normalize: strip leading 91 or +91 to get bare 10-digit number,
    // then query both forms so DB format doesn't matter
    const bare = phone.replace(/^(\+?91)/, '')

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .or(`id.eq.${user.id},phone.eq.${bare},phone.eq.91${bare},phone.eq.+91${bare}`)
      .maybeSingle()

    if (userData?.role !== 'owner') {
      await supabase.auth.signOut()
      setError('Access denied. Not an admin account.')
      setStep('phone')
      setOtp(['','','','','',''])
      return
    }

    router.push('/admin-overview')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1426 50%, #1E2A45 100%)' }}>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-slide { animation: slideUp 0.45s ease forwards; }
      `}</style>

      {/* glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.06) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm auth-slide">

        {/* logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl
            mb-3 shadow-2xl"
            style={{
              background:  'linear-gradient(135deg, #06B6D4, #0891B2)',
              boxShadow:   '0 8px 32px rgba(6,182,212,0.5)',
            }}>
            <span className="text-white font-black text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">GoCleenzo</h1>
          <p className="text-cyan-400 text-sm mt-1 font-medium">Admin Dashboard</p>
        </div>

        {/* card — dark */}
        <div className="overflow-hidden"
          style={{
            background:   '#0D1426',
            borderRadius: '32px',
            border:       '1px solid #1E2A45',
            boxShadow:    '0 32px 80px rgba(0,0,0,0.5)',
          }}>

          {/* STEP 1 — phone */}
          {step === 'phone' && (
            <>
              {/* dark header */}
              <div className="px-6 pt-6 pb-5"
                style={{ background: 'linear-gradient(135deg,#0891B220,#06B6D415)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center
                    text-2xl" style={{ background: '#06B6D420' }}>
                    🔐
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Admin Access</h2>
                    <p className="text-cyan-400 text-xs mt-0.5">Authorised personnel only</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider block mb-2"
                    style={{ color: '#475569' }}>Admin Phone</label>
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-3.5"
                    style={{ border: '1.5px solid #1E2A45', background: '#ffffff08' }}>
                    <span className="text-xl flex-shrink-0">🇮🇳</span>
                    <span className="font-bold text-sm flex-shrink-0" style={{ color: '#64748B' }}>+91</span>
                    <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: '#1E2A45' }} />
                    <input type="tel" placeholder="Admin phone number" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                      className="flex-1 bg-transparent outline-none font-bold text-base
                        placeholder-gray-700 text-white" />
                    {phone.length === 10 && (
                      <span className="text-cyan-400 text-sm flex-shrink-0">✓</span>
                    )}
                  </div>
                </div>

                <ErrorBox msg={error} />

                <button
                  onClick={() => sendOtp()}
                  disabled={loading || phone.length < 10}
                  className="w-full h-14 rounded-2xl text-white font-black text-base
                    flex items-center justify-center gap-2.5 active:scale-95 transition-all
                    disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                    boxShadow:  phone.length === 10 ? '0 8px 24px rgba(6,182,212,0.4)' : 'none',
                  }}>
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>Send OTP
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>

                {/* security note */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: '#06B6D410', border: '1px solid #06B6D420' }}>
                  <span className="text-sm">🔒</span>
                  <p className="text-xs font-medium" style={{ color: '#64748B' }}>
                    This page is for authorized admins only
                  </p>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — OTP */}
          {step === 'otp' && (
            <>
              <div className="px-6 pt-6 pb-5"
                style={{ background: 'linear-gradient(135deg,#0891B220,#06B6D415)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center
                    text-2xl" style={{ background: '#06B6D420' }}>
                    📱
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Verify OTP</h2>
                    <p className="text-cyan-400 text-xs mt-0.5">Sent to +91 {phone}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">
                <BackButton onClick={() => { setStep('phone'); setError('') }} />
                <p className="text-sm text-center -mt-2" style={{ color: '#64748B' }}>
                  Enter the 6-digit verification code
                </p>

                {/* dark OTP boxes */}
                <div className="flex gap-2.5 justify-center">
                  {otp.map((d, i) => (
                    <input key={i} id={`otp-box-${i}`} type="text" inputMode="numeric"
                      value={d} maxLength={1}
                      onChange={e => {
                        if (!/^\d*$/.test(e.target.value)) return
                        const next = [...otp]; next[i] = e.target.value.slice(-1)
                        setOtp(next)
                        if (e.target.value && i < 5)
                          document.getElementById(`otp-box-${i+1}`)?.focus()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !d && i > 0)
                          document.getElementById(`otp-box-${i-1}`)?.focus()
                      }}
                      className="w-11 h-14 text-center text-xl font-black rounded-2xl
                        outline-none transition-all text-white"
                      style={{
                        border:     d ? '2px solid #06B6D4' : '1.5px solid #1E2A45',
                        background: d ? '#06B6D415' : '#ffffff08',
                        boxShadow:  d ? '0 4px 12px rgba(6,182,212,0.2)' : 'none',
                      }} />
                  ))}
                </div>

                <ErrorBox msg={error} />

                <button onClick={handleVerify}
                  disabled={loading || otp.join('').length < 6}
                  className="w-full h-14 rounded-2xl text-white font-black text-base
                    flex items-center justify-center gap-2.5 active:scale-95 transition-all
                    disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                    boxShadow:  otp.join('').length === 6 ? '0 8px 24px rgba(6,182,212,0.4)' : 'none',
                  }}>
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Access Dashboard
                    </>
                  )}
                </button>

                <button onClick={() => sendOtp()}
                  className="w-full text-center text-xs font-semibold py-2"
                  style={{ color: '#06B6D4' }}>
                  Resend OTP
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}