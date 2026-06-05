'use client'
import { useRouter } from 'next/navigation'
import { ErrorBox, BackButton, useOtpFlow } from '../shared'

export default function WorkerLoginPage() {
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

    if (userData?.role !== 'worker') {
      await supabase.auth.signOut()
      setError('This number is not registered as a worker. Contact your admin.')
      setStep('phone')
      setOtp(['','','','','',''])
      return
    }

    router.push('/dashboard')
  }

  const AMBER = '#F59E0B'
  const AMBER_DARK = '#D97706'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)' }}>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-slide { animation: slideUp 0.45s ease forwards; }
      `}</style>

      {/* blobs */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'rgba(245,158,11,0.2)' }} />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'rgba(217,119,6,0.15)' }} />

      <div className="relative z-10 w-full max-w-sm auth-slide">

        {/* logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl
            mb-3 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg,#F59E0B,#D97706)',
              boxShadow:  '0 8px 32px rgba(245,158,11,0.5)',
            }}>
            <span className="text-3xl">👷</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#78350F' }}>
            GoCleenzo
          </h1>
          <p className="text-amber-600 text-sm mt-1 font-medium">Worker Portal</p>
        </div>

        {/* card */}
        <div className="overflow-hidden"
          style={{
            background:   '#ffffff',
            borderRadius: '32px',
            boxShadow:    '0 32px 80px rgba(245,158,11,0.2), 0 8px 24px rgba(0,0,0,0.08)',
          }}>

          {/* STEP 1 — phone */}
          {step === 'phone' && (
            <>
              {/* amber header */}
              <div className="px-6 pt-6 pb-5 rounded-t-[32px]"
                style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center
                    text-2xl" style={{ background: 'rgba(245,158,11,0.2)' }}>
                    👷
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Worker Login</h2>
                    <p className="text-amber-600 text-xs mt-0.5">GoCleenzo Professional</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">

                {/* worker perks */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: '💰', label: 'Daily Pay'    },
                    { icon: '📍', label: 'Near Jobs'    },
                    { icon: '⭐', label: 'Top Ratings'  },
                  ].map(p => (
                    <div key={p.label} className="flex flex-col items-center gap-1 py-2.5
                      rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-[10px] font-bold text-amber-700">{p.label}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider block mb-2"
                    style={{ color: '#92400E' }}>Your Phone Number</label>
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-3.5"
                    style={{ border: '2px solid #FDE68A', background: '#FFFBEB' }}>
                    <span className="text-xl flex-shrink-0">🇮🇳</span>
                    <span className="font-bold text-sm flex-shrink-0 text-amber-700">+91</span>
                    <div className="w-px h-5 bg-amber-200 mx-1 flex-shrink-0" />
                    <input type="tel" placeholder="98765 43210" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                      className="flex-1 bg-transparent outline-none text-gray-900 font-bold
                        text-base placeholder-amber-300" />
                    {phone.length === 10 && (
                      <span className="text-amber-500 text-sm flex-shrink-0">✓</span>
                    )}
                  </div>
                </div>

                <ErrorBox msg={error} />

                <button onClick={() => sendOtp()}
                  disabled={loading || phone.length < 10}
                  className="w-full h-14 rounded-2xl text-white font-black text-base
                    flex items-center justify-center gap-2.5 active:scale-95 transition-all
                    disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`,
                    boxShadow:  phone.length === 10 ? '0 8px 24px rgba(245,158,11,0.45)' : 'none',
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

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <span className="text-sm">ℹ️</span>
                  <p className="text-xs text-amber-700 font-medium">
                    Your account must be activated by admin before first login
                  </p>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — OTP */}
          {step === 'otp' && (
            <>
              <div className="px-6 pt-6 pb-5 rounded-t-[32px]"
                style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center
                    text-2xl" style={{ background: 'rgba(245,158,11,0.2)' }}>
                    📱
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Verify OTP</h2>
                    <p className="text-amber-600 text-xs mt-0.5">Sent to +91 {phone}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">
                <BackButton onClick={() => { setStep('phone'); setError('') }} />
                <p className="text-sm text-gray-500 text-center -mt-2">
                  Enter the 6-digit code sent to your phone
                </p>

                {/* amber OTP boxes */}
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
                        outline-none transition-all"
                      style={{
                        border:     d ? `2px solid ${AMBER}` : '2px solid #FDE68A',
                        background: d ? '#FFFBEB' : '#FFFFF5',
                        color:      AMBER_DARK,
                        boxShadow:  d ? '0 4px 12px rgba(245,158,11,0.2)' : 'none',
                      }} />
                  ))}
                </div>

                <ErrorBox msg={error} />

                <button onClick={handleVerify}
                  disabled={loading || otp.join('').length < 6}
                  className="w-full h-14 rounded-2xl text-white font-black text-base
                    flex items-center justify-center gap-2.5 active:scale-95 transition-all
                    disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`,
                    boxShadow:  otp.join('').length === 6 ? '0 8px 24px rgba(245,158,11,0.45)' : 'none',
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
                      Enter Dashboard
                    </>
                  )}
                </button>

                <button onClick={() => sendOtp()}
                  className="w-full text-center text-xs font-semibold py-2 text-amber-600">
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