'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string
  name: string
  category: string
  base_price: number
  duration_minutes: number
  description: string | null
  includes: string[]
  excludes: string[]
  image_url: string | null
}

const SERVICE_CONFIG: Record<string, { emoji: string; heroBg: string; accent: string; light: string }> = {
  'Bathroom Cleaning':          { emoji: '🚿', heroBg: 'linear-gradient(160deg,#E0F2FE,#BAE6FD,#7DD3FC)', accent: '#0EA5E9', light: '#F0F9FF' },
  'Kitchen Cleaning':           { emoji: '🍳', heroBg: 'linear-gradient(160deg,#FEF3C7,#FDE68A,#FCD34D)', accent: '#D97706', light: '#FFFBEB' },
  'Kitchen Cabinet Cleaning':   { emoji: '🗄', heroBg: 'linear-gradient(160deg,#FEF9C3,#FEF08A,#FACC15)', accent: '#CA8A04', light: '#FEFCE8' },
  'Fan Cleaning':               { emoji: '💨', heroBg: 'linear-gradient(160deg,#DBEAFE,#BFDBFE,#93C5FD)', accent: '#3B82F6', light: '#EFF6FF' },
  'Balcony Cleaning':           { emoji: '🌿', heroBg: 'linear-gradient(160deg,#D1FAE5,#A7F3D0,#6EE7B7)', accent: '#059669', light: '#ECFDF5' },
  'Dusting & Wiping':           { emoji: '🧹', heroBg: 'linear-gradient(160deg,#EDE9FE,#DDD6FE,#C4B5FD)', accent: '#7C3AED', light: '#F5F3FF' },
  'Sweeping & Mopping':         { emoji: '🧺', heroBg: 'linear-gradient(160deg,#CFFAFE,#A5F3FC,#67E8F9)', accent: '#0891B2', light: '#ECFEFF' },
  'Utensil Cleaning':           { emoji: '🍽', heroBg: 'linear-gradient(160deg,#FCE7F3,#FBCFE8,#F9A8D4)', accent: '#DB2777', light: '#FDF2F8' },
  'Wardrobe Cleaning':          { emoji: '👔', heroBg: 'linear-gradient(160deg,#E0E7FF,#C7D2FE,#A5B4FC)', accent: '#4F46E5', light: '#EEF2FF' },
  'Refrigerator Cleaning':      { emoji: '❄️', heroBg: 'linear-gradient(160deg,#E0F2FE,#BAE6FD,#7DD3FC)', accent: '#0284C7', light: '#F0F9FF' },
  'Full House Cleaning':        { emoji: '🏠', heroBg: 'linear-gradient(160deg,#CFFAFE,#A5F3FC,#06B6D4)', accent: '#0891B2', light: '#ECFEFF' },
  'Pre-Party Express Cleaning': { emoji: '🎉', heroBg: 'linear-gradient(160deg,#FCE7F3,#FBCFE8,#F472B6)', accent: '#BE185D', light: '#FDF2F8' },
  'After-Party Cleanup':        { emoji: '🧽', heroBg: 'linear-gradient(160deg,#FEE2E2,#FECACA,#FCA5A5)', accent: '#DC2626', light: '#FEF2F2' },
}

const REVIEWS = [
  { name: 'Priya M.',  avatar: 'PR', bg: '#06B6D4', stars: 5, date: '12 May', text: 'Bathroom looked brand new! Super punctual and thorough.' },
  { name: 'Rahul K.',  avatar: 'RK', bg: '#7C3AED', stars: 5, date: '3 May',  text: 'Great value. Kitchen was absolutely spotless.' },
  { name: 'Sneha D.',  avatar: 'SD', bg: '#DB2777', stars: 4, date: '24 Apr', text: 'Very professional team. Excellent cleaning quality.' },
]

function Stars({ n = 5, size = 12, color = '#F59E0B' }: { n?: number; size?: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0,1,2,3,4].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i < n ? color : 'none'} stroke={color} strokeWidth={1.5}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

export default function ServiceDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const supabase = createClient()

  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked,   setLiked]   = useState(false)
  const [tab,     setTab]     = useState<'about' | 'includes' | 'reviews'>('about')

  useEffect(() => {
    supabase.from('services').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setService(data); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
      <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
    </div>
  )

  if (!service) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 bg-[#F5F5F7]">
      <div className="text-6xl">🔍</div>
      <p className="text-gray-800 font-bold text-xl">Service not found</p>
      <button onClick={() => router.back()}
        className="bg-cyan-500 text-white px-8 py-3 rounded-2xl font-bold">← Go back</button>
    </div>
  )

  const cfg = SERVICE_CONFIG[service.name] ?? SERVICE_CONFIG['Full House Cleaning']

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-40">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{ background: cfg.heroBg, minHeight: 260 }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />

        {/* nav */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-14 mb-6">
          <button onClick={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-white/30 backdrop-blur-md border border-white/40
              flex items-center justify-center active:scale-90 transition-all">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-2.5">
            <button className="w-11 h-11 rounded-2xl bg-white/30 backdrop-blur-md border border-white/40
              flex items-center justify-center active:scale-90 transition-all">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button onClick={() => setLiked(v => !v)}
              className={`w-11 h-11 rounded-2xl border backdrop-blur-md flex items-center
                justify-center active:scale-90 transition-all
                ${liked ? 'bg-rose-500 border-rose-400' : 'bg-white/30 border-white/40'}`}>
              <svg className="w-5 h-5 text-white" fill={liked ? 'white' : 'none'}
                viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* hero content */}
        <div className="relative z-10 px-5 pb-8">
          <div className="w-20 h-20 rounded-3xl bg-white/25 border-2 border-white/40
            flex items-center justify-center text-4xl mb-4 shadow-xl backdrop-blur-sm">
            {cfg.emoji}
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30
            rounded-full px-3.5 py-1 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
            <span className="text-white text-[11px] font-bold tracking-widest uppercase">
              {service.category}
            </span>
          </div>
          <h1 className="text-white text-[28px] font-black leading-tight mb-4">{service.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { icon: '⏱', label: `~${service.duration_minutes} min` },
              { icon: '✓', label: 'Verified cleaners' },
              { icon: '★', label: '4.8 rated' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm
                border border-white/15 rounded-full px-3 py-1.5">
                <span className="text-white text-[11px]">{m.icon}</span>
                <span className="text-white text-[11px] font-bold">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CARD ── */}
      <div className="bg-white rounded-t-[32px] -mt-6 relative z-10">

        {/* price row */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5 border-b border-gray-100">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">
              Starting price
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900 leading-none">
                ₹{service.base_price}
              </span>
              <span className="text-sm text-gray-400 line-through">
                ₹{Math.round(service.base_price * 1.4)}
              </span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="flex flex-col items-center bg-amber-50 border-2 border-amber-100
              rounded-2xl px-4 py-3 min-w-[68px]">
              <span className="text-2xl font-black text-amber-500 leading-none">4.8</span>
              <Stars n={5} size={10} />
              <span className="text-[10px] text-amber-500 font-bold mt-1">2.4K</span>
            </div>
            <div className="flex flex-col items-center bg-cyan-50 border-2 border-cyan-100
              rounded-2xl px-4 py-3 min-w-[68px]">
              <span className="text-2xl font-black text-cyan-600 leading-none">2K+</span>
              <div className="w-8 h-0.5 bg-cyan-200 rounded my-1" />
              <span className="text-[10px] text-cyan-600 font-bold">Bookings</span>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex mx-5 my-4 bg-gray-100 rounded-2xl p-1">
          {(['about', 'includes', 'reviews'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all"
              style={{
                background: tab === t ? '#fff' : 'transparent',
                color:      tab === t ? '#111827' : '#9CA3AF',
                boxShadow:  tab === t ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div className="px-5 pb-4">

          {/* ABOUT */}
          {tab === 'about' && (
            <div className="space-y-4">
              {service.description && (
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-2">About this service</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{service.description}</p>
                </div>
              )}
              <div>
                <h3 className="text-base font-extrabold text-gray-900 mb-3">Why choose us</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: '🛡️', title: 'Fully insured',  sub: 'Damage covered',    bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
                    { icon: '⭐',  title: 'Top rated',      sub: '4.8 / 5 stars',     bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
                    { icon: '💳',  title: 'Flexible pay',   sub: 'UPI · Card · Cash', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
                    { icon: '🔄',  title: 'Re-clean',       sub: 'If not satisfied',  bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75' },
                  ].map(b => (
                    <div key={b.title} className="flex items-center gap-3 rounded-2xl px-3.5 py-3.5 border"
                      style={{ background: b.bg, borderColor: b.border }}>
                      <span className="text-xl flex-shrink-0">{b.icon}</span>
                      <div>
                        <p className="text-xs font-extrabold" style={{ color: b.text }}>{b.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{b.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INCLUDES */}
          {tab === 'includes' && (
            <div className="space-y-4">
              {(service.includes?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-3">
                    ✅ What&apos;s included
                  </h3>
                  <div className="space-y-2">
                    {service.includes.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-green-50
                        border border-green-100 rounded-2xl px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center
                          justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-green-900">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(service.excludes?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-3">❌ Not included</h3>
                  <div className="space-y-2">
                    {service.excludes.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-red-50
                        border border-red-100 rounded-2xl px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-red-400 flex items-center
                          justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-red-800">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS */}
          {tab === 'reviews' && (
            <div className="space-y-3">
              <div className="flex items-center gap-5 bg-amber-50 border border-amber-100
                rounded-2xl p-4 mb-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-5xl font-black text-amber-500 leading-none">4.8</p>
                  <Stars n={5} size={14} />
                  <p className="text-xs text-amber-500/70 mt-1 font-bold">2,400+ reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[{s:5,pct:76},{s:4,pct:16},{s:3,pct:5},{s:2,pct:2},{s:1,pct:1}].map(r => (
                    <div key={r.s} className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-700 w-3 font-bold">{r.s}</span>
                      <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {REVIEWS.map((r, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center
                        text-xs font-black text-white" style={{ background: r.bg }}>
                        {r.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">{r.name}</p>
                        <p className="text-[10px] text-gray-400">{r.date}</p>
                      </div>
                    </div>
                    <Stars n={r.stars} size={11} />
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR — Schedule + Book Instant ── */}
      <div className="fixed bottom-[60px] left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-4"
        style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold">Starting from</p>
            <p className="text-2xl font-black text-gray-900">₹{service.base_price}</p>
          </div>
          <div className="flex items-center gap-1">
            <Stars n={5} size={11} />
            <span className="text-xs text-gray-500 font-semibold ml-1">4.8 · 2K+ bookings</span>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Schedule — goes to book page with mode=schedule */}
          <button
            onClick={() => router.push(`/book/${service.id}?mode=schedule`)}
            className="flex-1 h-14 rounded-2xl border-2 font-black text-base
              active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ borderColor: cfg.accent, color: cfg.accent }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule
          </button>

          {/* Book Instant — goes to book page with mode=instant, skips to step 2 */}
          <button
            onClick={() => router.push(`/book/${service.id}?mode=instant`)}
            className="flex-1 h-14 rounded-2xl font-black text-base text-white
              active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}CC)`,
              boxShadow:  `0 6px 20px ${cfg.accent}50`,
            }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Book Instant
          </button>
        </div>
      </div>
    </div>
  )
}