'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Coupon = {
  id: string
  code: string
  description: string
  discount_type: 'percent' | 'flat'
  discount_value: number
  min_order: number
  max_discount: number | null
  expires_at: string | null
  is_active: boolean
}

const SAMPLE_COUPONS: Coupon[] = [
  { id: '1', code: 'WELCOME20', description: 'Get 20% off on your first order', discount_type: 'percent', discount_value: 20, min_order: 299, max_discount: 150, expires_at: '2025-12-31', is_active: true },
  { id: '2', code: 'FLAT100',   description: 'Flat ₹100 off on orders above ₹499', discount_type: 'flat',    discount_value: 100, min_order: 499, max_discount: null, expires_at: '2025-09-30', is_active: true },
  { id: '3', code: 'CLEAN50',   description: '50% off on deep cleaning services',  discount_type: 'percent', discount_value: 50, min_order: 799, max_discount: 250, expires_at: '2025-07-15', is_active: true },
  { id: '4', code: 'MONSOON',   description: 'Monsoon special – ₹75 off',          discount_type: 'flat',    discount_value: 75,  min_order: 349, max_discount: null, expires_at: '2025-08-31', is_active: false },
]

export default function OffersPage() {
  const [coupons, setCoupons]       = useState<Coupon[]>([])
  const [copied, setCopied]         = useState<string | null>(null)
  const [promoInput, setPromoInput] = useState('')
  const [promoMsg, setPromoMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Try to load from DB; fall back to sample data
      const { data } = await supabase.from('coupons').select('*').eq('is_active', true)
      setCoupons(data && data.length > 0 ? data : SAMPLE_COUPONS)
    }
    load()
  }, [])

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function applyPromo() {
    const match = coupons.find(c => c.code.toUpperCase() === promoInput.trim().toUpperCase())
    if (match) {
      setPromoMsg({ type: 'success', text: `🎉 "${match.code}" applied! ${match.description}` })
    } else {
      setPromoMsg({ type: 'error', text: '❌ Invalid or expired coupon code.' })
    }
    setTimeout(() => setPromoMsg(null), 3000)
  }

  const active   = coupons.filter(c => c.is_active)
  const inactive = coupons.filter(c => !c.is_active)

  return (
    <div className="min-h-screen bg-[#f0f4ff]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .coupon-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 12px rgba(99,102,241,0.07); }
        .coupon-left { background: linear-gradient(135deg,#6366f1,#4f46e5); }
        .notch { width:20px;height:20px;border-radius:50%;background:#f0f4ff; }
        .dashed-sep { border-left: 2px dashed #e0e7ff; }
        .tag { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px; }
        .slide-up { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .copy-btn { transition: all 0.2s; }
        .copy-btn:active { transform: scale(0.93); }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 50%,#0ea5e9 100%)' }}
        className="px-5 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-12 w-20 h-20 rounded-full bg-indigo-800/30" />
        <button onClick={() => router.back()}
          className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Cleenzo Rewards</p>
          <h1 className="text-white text-2xl font-bold">Offers & Coupons 🎟</h1>
          <p className="text-indigo-200 text-sm mt-1">Tap any code to copy instantly</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-16">

        {/* Promo code input */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-indigo-50">
          <p className="text-gray-700 text-sm font-semibold mb-3">Have a promo code?</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter code e.g. WELCOME20"
              value={promoInput}
              onChange={e => setPromoInput(e.target.value.toUpperCase())}
              className="flex-1 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-sm font-mono font-semibold text-indigo-700 outline-none tracking-widest uppercase"
            />
            <button onClick={applyPromo}
              className="bg-indigo-500 text-white px-5 rounded-2xl text-sm font-bold shadow-md shadow-indigo-200 active:scale-95 transition-transform">
              Apply
            </button>
          </div>
          {promoMsg && (
            <p className={`mt-2 text-xs font-medium slide-up ${promoMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {promoMsg.text}
            </p>
          )}
        </div>

        {/* Active coupons */}
        {active.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3 px-1">Available for you</p>
            <div className="space-y-3">
              {active.map(c => <CouponCard key={c.id} coupon={c} copied={copied} onCopy={copyCode} />)}
            </div>
          </div>
        )}

        {/* Expired coupons */}
        {inactive.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">Expired</p>
            <div className="space-y-3 opacity-50">
              {inactive.map(c => <CouponCard key={c.id} coupon={c} copied={copied} onCopy={copyCode} expired />)}
            </div>
          </div>
        )}

        {coupons.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🎟</p>
            <p className="text-gray-400 text-sm">No offers right now.<br />Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CouponCard({ coupon, copied, onCopy, expired = false }:
  { coupon: Coupon; copied: string | null; onCopy: (c: string) => void; expired?: boolean }) {

  const isPercent = coupon.discount_type === 'percent'
  const label     = isPercent ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`

  return (
    <div className="coupon-card flex">
      {/* Left colored strip */}
      <div className="coupon-left flex flex-col items-center justify-center px-4 py-5 min-w-[80px]">
        <p className="text-white text-lg font-black leading-none">{isPercent ? coupon.discount_value + '%' : '₹' + coupon.discount_value}</p>
        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-wide mt-0.5">OFF</p>
      </div>

      {/* Notch divider */}
      <div className="flex flex-col justify-between py-2 items-center">
        <div className="notch -ml-2.5" />
        <div className="dashed-sep flex-1 mx-0" />
        <div className="notch -ml-2.5" />
      </div>

      {/* Right content */}
      <div className="flex-1 px-4 py-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-900 text-sm font-bold">{coupon.description}</p>
          </div>
          <p className="text-gray-400 text-xs">Min order ₹{coupon.min_order}
            {coupon.max_discount ? ` · Max ₹${coupon.max_discount}` : ''}
          </p>
          {coupon.expires_at && (
            <p className="text-gray-300 text-[10px] mt-1">
              Expires {new Date(coupon.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="bg-indigo-50 border border-dashed border-indigo-300 rounded-xl px-3 py-1.5">
            <p className="text-indigo-600 text-xs font-bold font-mono tracking-widest">{coupon.code}</p>
          </div>
          {!expired && (
            <button onClick={() => onCopy(coupon.code)}
              className="copy-btn flex items-center gap-1.5 bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm shadow-indigo-200">
              {copied === coupon.code
                ? <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!</>
                : <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}