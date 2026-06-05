'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PhoneInput, OtpInput, CyanButton,
  ErrorBox, BackButton, useOtpFlow
} from '../shared'

const CLEANING_IMAGES = [
  { emoji: '🧹', label: 'Deep Cleaning',     bg: 'linear-gradient(160deg,#E0F9FF,#BAF3FB)' },
  { emoji: '🚿', label: 'Bathroom Cleaning',  bg: 'linear-gradient(160deg,#DBEAFE,#BFDBFE)' },
  { emoji: '🍳', label: 'Kitchen Cleaning',   bg: 'linear-gradient(160deg,#FEF3C7,#FDE68A)' },
  { emoji: '🏠', label: 'Full Home Cleaning', bg: 'linear-gradient(160deg,#D1FAE5,#A7F3D0)' },
  { emoji: '🪟', label: 'Window Cleaning',    bg: 'linear-gradient(160deg,#EDE9FE,#DDD6FE)' },
  { emoji: '🛋', label: 'Sofa Cleaning',      bg: 'linear-gradient(160deg,#FCE7F3,#FBCFE8)' },
]

export default function LoginPage() {
  const router = useRouter()
  const {
    phone, setPhone, otp, setOtp, step, setStep,
    loading, error, setError, sendOtp, verifyOtp,
  } = useOtpFlow()

  async function handleSend() { await sendOtp() }

  async function handleVerify() {
    const user = await verifyOtp()
    if (!user) return

    // verifyOtp already saved user to localStorage via saveUser()
    // so we can redirect immediately — no delay needed
    const role = user.role ?? 'customer'
    if (role === 'worker') {
      router.push('/worker/dashboard')
    } else if (role === 'owner') {
      router.push('/admin-overview')
    } else {
      router.push('/services')
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fff' }}>
      <style>{`
        @keyframes scrollX {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scroll-track { animation: scrollX 18s linear infinite; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .aslide { animation: slideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      {/* scrolling images */}
      <div className="relative overflow-hidden" style={{ height: '52vh', minHeight: 280 }}>
        <div className="flex h-full overflow-hidden">
          <div className="scroll-track flex gap-3 px-3 pt-3 flex-shrink-0">
            {[...CLEANING_IMAGES, ...CLEANING_IMAGES].map((img, i) => (
              <div key={i}
                className="flex-shrink-0 rounded-3xl overflow-hidden relative flex items-end"
                style={{ width: '160px', height: '100%', background: img.bg }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-7xl opacity-80">{img.emoji}</span>
                </div>
                <div className="relative z-10 w-full px-4 pb-4"
                  style={{ background: 'linear-gradient(0deg,rgba(0,0,0,0.35) 0%,transparent 100%)' }}>
                  <p className="text-white font-black text-sm">{img.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(0deg,#fff 0%,transparent 100%)' }}/>
      </div>

      {/* brand + form */}
      <div className="flex-1 flex flex-col px-6 pb-8 aslide">
        <div className="text-center mb-6 mt-2">
          <div className="flex items-baseline justify-center gap-0 relative">
            <span className="font-black italic leading-none"
              style={{ fontSize: '48px', color: '#0D2D5E', fontFamily: "'Nunito','Arial Black',sans-serif", letterSpacing: '-1px' }}>
              Cleen
            </span>
            <span className="font-black italic leading-none relative"
              style={{ fontSize: '48px', color: '#06B6D4', fontFamily: "'Nunito','Arial Black',sans-serif", letterSpacing: '-1px' }}>
              zo
              <span className="absolute text-cyan-400 font-black not-italic"
                style={{ fontSize: '18px', top: '-10px', right: '-14px' }}>✦</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm font-semibold mt-1">Clean Home. Happy You.</p>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-2">
                Mobile Number
              </label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
            <ErrorBox msg={error} />
            <CyanButton onClick={handleSend} loading={loading} disabled={phone.length < 10}>
              Proceed
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </CyanButton>
            <p className="text-center text-xs text-gray-400">
              New here?{' '}
              <Link href="/signup" className="font-black text-cyan-600">Create account</Link>
            </p>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <BackButton onClick={() => { setStep('phone'); setError('') }} />
            <div className="text-center -mt-2">
              <p className="text-sm text-gray-500">Enter the 6-digit code sent to</p>
              <p className="font-black text-cyan-600 text-sm mt-0.5">+91 {phone}</p>
            </div>
            <OtpInput value={otp} onChange={setOtp} />
            <ErrorBox msg={error} />
            <CyanButton onClick={handleVerify} loading={loading} disabled={otp.join('').length < 6}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Verify & Continue
            </CyanButton>
            <button onClick={handleSend}
              className="w-full text-center text-xs font-semibold text-cyan-500 py-2">
              Resend OTP
            </button>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-6">
          By proceeding, I accept the{' '}
          <Link href="/terms" className="text-cyan-600 font-semibold">Terms of use</Link>
          {' & '}
          <span className="text-cyan-600 font-semibold">Privacy policy</span>
        </p>
      </div>
    </div>
  )
}