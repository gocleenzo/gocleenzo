'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = { id: string; name: string; base_price: number; duration_minutes: number }
type Address = { id: string; label: string; flat_no: string | null; building: string | null; area: string; city: string; is_default?: boolean }

// ─── Razorpay types ───────────────────────────────────────────────────────────
interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
}
interface RazorpayOptions {
  key:       string
  amount:    number
  currency:  string
  name:      string
  order_id:  string
  prefill?:  { email?: string; contact?: string }
  theme?:    { color?: string }
  handler:   (response: RazorpayResponse) => void
  modal?:    { ondismiss?: () => void }
}


const TIME_SLOTS = [
  '07:00 AM','08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM', '06:00 PM','07:00 PM'
]

const SLOT_LABELS: Record<string, string> = {
  '07:00 AM': 'Early Morning', '08:00 AM': 'Early Morning', '09:00 AM': 'Morning',
  '10:00 AM': 'Mid Morning',   '11:00 AM': 'Late Morning',
  '12:00 PM': 'Noon',          '01:00 PM': 'Afternoon',
  '02:00 PM': 'Afternoon',     '03:00 PM': 'Late Afternoon',
  '04:00 PM': 'Evening',       '05:00 PM': 'Evening',
  '06:00 PM': 'Late Evening',  '07:00 PM': 'Late Evening',
}

function getDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const STEPS = ['Date & Time', 'Address', 'Confirm']

export default function BookingPage() {
  const { id }        = useParams<{ id: string }>()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const supabase      = createClient()
  const mode          = searchParams.get('mode')

  const [service,         setService]         = useState<Service | null>(null)
  const [addresses,       setAddresses]       = useState<Address[]>([])
  const [selectedDate,    setSelectedDate]    = useState<Date>(new Date())
  const [selectedTime,    setSelectedTime]    = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [promoCode,       setPromoCode]       = useState('')
  const [promoApplied,    setPromoApplied]    = useState(false)
  const [discount,        setDiscount]        = useState(0)
  const [notes,           setNotes]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [step,            setStep]            = useState<1|2|3>(1)

  const dates     = getDates()
  const isInstant = mode === 'instant'

  // ── Load Razorpay script once ─────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return
    const script    = document.createElement('script')
    script.id       = 'razorpay-script'
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async    = true
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (isInstant) {
      setSelectedTime('ASAP')
      setStep(2)
    }
  }, [isInstant])

  useEffect(() => {
    async function load() {
      const { data: svc } = await supabase
        .from('services').select('id,name,base_price,duration_minutes')
        .eq('id', id).single()
      if (svc) setService(svc)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: addrs } = await supabase
          .from('addresses').select('*').eq('user_id', user.id)
        if (addrs?.length) {
          setAddresses(addrs)
          const def = addrs.find((a: Address) => a.is_default) ?? addrs[0]
          setSelectedAddress(def.id)
        }
      }
    }
    load()
  }, [id])

  async function applyPromo() {
    if (!promoCode.trim() || !service) return
    const { data } = await supabase
      .from('promo_codes').select('*')
      .eq('code', promoCode.toUpperCase()).eq('is_active', true).single()
    if (!data) { alert('Invalid or expired promo code'); return }
    const disc = data.discount_type === 'flat'
      ? data.discount_value
      : Math.min((service.base_price * data.discount_value) / 100, data.max_discount_amount ?? 9999)
    setDiscount(disc)
    setPromoApplied(true)
  }

  // ── MAIN: initiate payment → verify → create booking ─────────────────────
  async function confirmBooking() {
    if (!selectedAddress || !service) {
      alert('Please select an address')
      return
    }
    if (!isInstant && !selectedTime) {
      alert('Please select a time slot')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // ── 1. Create Razorpay order on server ──────────────────────────────────
    let orderId: string
    try {
      const res = await fetch('/api/payments/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: finalAmount }),
      })
      const data = await res.json()
      if (!res.ok || !data.orderId) throw new Error(data.error ?? 'Order creation failed')
      orderId = data.orderId
    } catch (err) {
      setLoading(false)
      alert('Could not initiate payment. Please try again.')
      return
    }

    // ── 2. Pre-compute scheduled date (needed inside handler closure) ────────
    let scheduledDate: Date
    if (isInstant) {
      scheduledDate = new Date()
      scheduledDate.setHours(scheduledDate.getHours() + 2)
    } else {
      const [time, meridiem] = selectedTime.split(' ')
      const [hh, mm]         = time.split(':').map(Number)
      const hours            = meridiem === 'PM' && hh !== 12 ? hh + 12
                             : hh === 12 && meridiem === 'AM'  ? 0
                             : hh
      scheduledDate = new Date(selectedDate)
      scheduledDate.setHours(hours, mm, 0, 0)
    }

    // ── 3. Open Razorpay modal ───────────────────────────────────────────────
    const options: RazorpayOptions = {
      key:      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount:   finalAmount * 100,
      currency: 'INR',
      name:     'GoCleenzo',
      order_id: orderId,
      prefill:  { email: user.email },
      theme:    { color: '#06B6D4' },

      // ── 4. Payment SUCCESS → verify signature → create booking ────────────
      handler: async function (response: RazorpayResponse) {
        try {
          // 4a. Verify signature on server (prevents tampered payments)
          const verifyRes = await fetch('/api/payments/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          })
          const { verified } = await verifyRes.json()

          if (!verified) {
            // Payment exists but signature doesn't match — do NOT book
            setLoading(false)
            alert('Payment verification failed. Please contact support with your payment ID: ' + response.razorpay_payment_id)
            return
          }

          // 4b. Signature verified — NOW create the booking
          const { data: booking, error } = await supabase.from('bookings').insert({
            customer_id:          user.id,
            service_id:           service!.id,
            address_id:           selectedAddress,
            status:               'pending',
            scheduled_at:         scheduledDate.toISOString(),
            base_price:           service!.base_price,
            discount_amount:      discount,
            final_amount:         finalAmount,
            special_instructions: notes || null,
            payment_status:       'paid',                        // ✅ paid
            razorpay_payment_id:  response.razorpay_payment_id, // ✅ store ref
            razorpay_order_id:    response.razorpay_order_id,
            otp:                  Math.floor(1000 + Math.random() * 9000).toString(),
          }).select().single()

          setLoading(false)
          if (error) {
            // Payment went through but DB insert failed — critical, log it
            console.error('DB insert failed after payment:', error, response)
            alert('Payment successful but booking creation failed. Please contact support with payment ID: ' + response.razorpay_payment_id)
            return
          }

          router.push(`/bookings/${booking.id}?new=true`)

        } catch (err) {
          setLoading(false)
          console.error('Post-payment error:', err)
          alert('Something went wrong after payment. Contact support.')
        }
      },

      // ── 5. User closes modal without paying ──────────────────────────────
      modal: {
        ondismiss: () => {
          setLoading(false)
          // No booking created — safe to just reset
        }
      }
    }

    const rzp = new window.Razorpay(options)

    // ── 6. Payment FAILURE (card declined etc.) ───────────────────────────
    rzp.on('payment.failed', () => {
      setLoading(false)
      alert('Payment failed. Please try a different payment method.')
    })

    rzp.open()
  }

  const finalAmount  = service ? service.base_price - discount : 0
  const selectedAddr = addresses.find(a => a.id === selectedAddress)

  if (!service) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 flex-shrink-0"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center
                justify-center active:scale-90 transition-transform flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-extrabold text-lg leading-none">
                {isInstant ? '⚡ Book Instant' : '📅 Schedule'}
              </h1>
              <p className="text-cyan-100 text-xs mt-0.5 truncate">{service.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-cyan-100 text-[10px] font-semibold">Total</p>
              <p className="text-white font-black text-xl leading-none">₹{finalAmount}</p>
            </div>
          </div>

          {/* steps */}
          <div className="flex items-center gap-1 mb-3">
            {(isInstant ? ['Address', 'Confirm'] : STEPS).map((label, i) => {
              const s      = isInstant ? i + 2 : i + 1
              const active = step === s
              const done   = step > s
              return (
                <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center
                    text-[10px] font-black flex-shrink-0 transition-all
                    ${done   ? 'bg-white text-cyan-600'
                    : active ? 'bg-white text-cyan-600'
                    :          'bg-white/25 text-white/70'}`}>
                    {done ? '✓' : isInstant ? i + 1 : s}
                  </div>
                  <span className={`text-[11px] font-semibold truncate
                    ${active ? 'text-white' : done ? 'text-cyan-100' : 'text-white/50'}`}>
                    {label}
                  </span>
                  {i < (isInstant ? 1 : 2) && (
                    <div className={`h-px flex-1 mx-1 ${done ? 'bg-white/60' : 'bg-white/20'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* progress bar */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500"
              style={{
                width: isInstant
                  ? (step === 2 ? '30%' : '100%')
                  : (step === 1 ? '10%' : step === 2 ? '55%' : '100%')
              }} />
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4"
        style={{ paddingBottom: '160px' }}>

        {isInstant && step === 2 && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-4 py-3
            flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-cyan-800 font-extrabold text-sm">Instant Booking</p>
              <p className="text-cyan-600 text-xs">Professional arrives within 2 hours</p>
            </div>
          </div>
        )}

        {/* ═══ STEP 1 — Date & Time ═══ */}
        {step === 1 && !isInstant && (
          <>
            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center
                  justify-center shadow-sm shadow-cyan-200 flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Choose Date</h2>
                  <p className="text-xs text-gray-400">Select your preferred date</p>
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                  {dates.map((d, i) => {
                    const active = d.toDateString() === selectedDate.toDateString()
                    return (
                      <button key={i} onClick={() => setSelectedDate(d)}
                        className="flex flex-col items-center rounded-2xl px-3 py-3
                          min-w-[58px] flex-shrink-0 transition-all active:scale-95"
                        style={{
                          background: active ? '#06B6D4' : '#F9FAFB',
                          boxShadow:  active ? '0 4px 14px rgba(6,182,212,0.45)' : 'none',
                          border:     active ? 'none' : '1.5px solid #F0F0F0',
                        }}>
                        <span className={`text-[10px] font-bold uppercase tracking-wide
                          ${active ? 'text-cyan-100' : 'text-gray-400'}`}>
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </span>
                        <span className={`text-2xl font-black mt-0.5 leading-none
                          ${active ? 'text-white' : 'text-gray-900'}`}>
                          {d.getDate()}
                        </span>
                        <span className={`text-[9px] font-bold mt-1
                          ${active ? 'text-white' : i === 0 ? 'text-cyan-500' : 'text-transparent'}`}>
                          {i === 0 ? 'TODAY' : '·'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center
                  justify-center shadow-sm shadow-cyan-200 flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Choose Time</h2>
                  <p className="text-xs text-gray-400">Pick a convenient time slot</p>
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="grid grid-cols-3 gap-2.5">
                  {TIME_SLOTS.map(slot => {
                    const active = selectedTime === slot
                    return (
                      <button key={slot} onClick={() => setSelectedTime(slot)}
                        className="flex flex-col items-center py-3 rounded-2xl
                          transition-all active:scale-95"
                        style={{
                          background: active ? '#06B6D4' : '#F9FAFB',
                          border:     active ? 'none' : '1.5px solid #F0F0F0',
                          boxShadow:  active ? '0 4px 14px rgba(6,182,212,0.4)' : 'none',
                        }}>
                        <span className={`text-sm font-black ${active ? 'text-white' : 'text-gray-900'}`}>
                          {slot}
                        </span>
                        <span className={`text-[9px] font-semibold mt-0.5
                          ${active ? 'text-cyan-100' : 'text-gray-400'}`}>
                          {SLOT_LABELS[slot]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 2 — Address ═══ */}
        {step === 2 && (
          <>
            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center
                    justify-center shadow-sm shadow-cyan-200 flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900">Service Address</h2>
                    <p className="text-xs text-gray-400">Where should we come?</p>
                  </div>
                </div>
                <button onClick={() => router.push('/account')}
                  className="text-xs font-bold text-cyan-500 bg-cyan-50 px-3 py-1.5
                    rounded-xl border border-cyan-100 active:scale-95 transition-transform">
                  + Add new
                </button>
              </div>
              <div className="p-4">
                {addresses.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">📍</div>
                    <p className="text-gray-700 font-bold mb-1">No saved addresses</p>
                    <p className="text-gray-400 text-sm mb-4">Add an address to continue</p>
                    <button onClick={() => router.push('/account')}
                      className="bg-cyan-500 text-white px-6 py-3 rounded-2xl font-bold
                        text-sm shadow-md shadow-cyan-200">
                      Add Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => {
                      const active = selectedAddress === addr.id
                      const icon = addr.label === 'Home' ? '🏠' : addr.label === 'Office' ? '🏢' : '📍'
                      return (
                        <button key={addr.id} onClick={() => setSelectedAddress(addr.id)}
                          className="w-full text-left rounded-2xl p-4 transition-all border-2"
                          style={{
                            background:  active ? '#ECFEFF' : '#F9FAFB',
                            borderColor: active ? '#06B6D4' : '#F0F0F0',
                          }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center
                                justify-center text-xl shadow-sm border border-gray-100 flex-shrink-0">
                                {icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-extrabold text-gray-900">{addr.label}</span>
                                  {addr.is_default && (
                                    <span className="text-[10px] font-bold bg-cyan-100
                                      text-cyan-700 px-2 py-0.5 rounded-full">Default</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                  {addr.flat_no && `${addr.flat_no}, `}
                                  {addr.building && `${addr.building}, `}
                                  {addr.area}, {addr.city}
                                </p>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center
                              justify-center flex-shrink-0 mt-0.5 transition-all
                              ${active ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'}`}>
                              {active && (
                                <svg className="w-3 h-3 text-white" fill="none"
                                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Special Instructions</h2>
                  <p className="text-xs text-gray-400">Optional notes for the cleaner</p>
                </div>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="e.g. Ring bell twice, pet at home, focus on bathroom tiles..."
                className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm text-gray-700
                  placeholder-gray-400 outline-none border-2 border-transparent
                  focus:border-cyan-300 focus:bg-white transition-all resize-none" />
            </div>
          </>
        )}

        {/* ═══ STEP 3 — Confirm ═══ */}
        {step === 3 && (
          <>
            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center
                  justify-center shadow-sm shadow-cyan-200 flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Booking Summary</h2>
                  <p className="text-xs text-gray-400">Review before paying</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { icon: '🧹', label: 'Service', value: service.name },
                  { icon: '📅', label: 'Date',    value: isInstant ? 'Today (Instant)' : selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) },
                  { icon: '⏰', label: 'Time',    value: isInstant ? 'Within 2 hours' : selectedTime },
                  { icon: '📍', label: 'Address', value: selectedAddr ? `${selectedAddr.area}, ${selectedAddr.city}` : '—' },
                  ...(notes ? [{ icon: '💬', label: 'Notes', value: notes }] : []),
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center
                      justify-center text-base flex-shrink-0">{row.icon}</div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        {row.label}
                      </p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5 leading-snug">
                        {row.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100
                  flex items-center justify-center text-lg flex-shrink-0">🎟️</div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Promo Code</h2>
                  <p className="text-xs text-gray-400">Have a coupon? Save more!</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter code e.g. CLEAN20"
                  value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  disabled={promoApplied}
                  className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4
                    py-3 text-sm font-bold uppercase tracking-widest outline-none
                    focus:border-cyan-300 transition-all" />
                <button onClick={applyPromo} disabled={promoApplied}
                  className={`px-5 rounded-2xl text-sm font-black transition-all
                    active:scale-95 flex-shrink-0
                    ${promoApplied ? 'bg-green-500 text-white' : 'bg-cyan-500 text-white shadow-sm shadow-cyan-200'}`}>
                  {promoApplied ? '✓' : 'Apply'}
                </button>
              </div>
              {promoApplied && (
                <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <span className="text-green-500">✓</span>
                  <p className="text-green-700 text-xs font-bold">Promo applied — you save ₹{discount}!</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center
                  justify-center shadow-sm shadow-cyan-200 flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-sm font-extrabold text-gray-900">Price Breakdown</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Service price</span>
                  <span className="text-sm font-bold text-gray-900">₹{service.base_price}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Discount ({promoCode})</span>
                    <span className="text-sm font-bold text-green-600">− ₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Platform fee</span>
                  <span className="text-sm font-bold text-green-500">FREE</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-extrabold text-gray-900">Total payable</span>
                  <span className="text-2xl font-black text-cyan-600">₹{finalAmount}</span>
                </div>
              </div>

              {/* ✅ Updated payment trust badge */}
              <div className="mx-5 mb-5 flex items-center gap-3 bg-cyan-50 border
                border-cyan-100 rounded-2xl px-4 py-3">
                <span className="text-xl flex-shrink-0">🔒</span>
                <p className="text-xs text-cyan-700 font-semibold leading-snug">
                  100% secure payment via Razorpay. Booking confirmed only after successful payment.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="fixed left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 pt-3 pb-3"
        style={{ bottom: '64px', boxShadow: '0 -8px 24px rgba(0,0,0,0.10)' }}>

        {step > (isInstant ? 1 : 1) && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 mb-3">
            {isInstant ? (
              <span className="text-xs text-cyan-600 font-bold">⚡ Instant — within 2 hours</span>
            ) : (
              <>
                <span className="text-xs text-gray-500 font-semibold">
                  📅 {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                {selectedTime && (
                  <>
                    <div className="w-px h-3 bg-gray-300" />
                    <span className="text-xs text-gray-500 font-semibold">⏰ {selectedTime}</span>
                  </>
                )}
              </>
            )}
            <span className="ml-auto text-cyan-600 font-black text-sm">₹{finalAmount}</span>
          </div>
        )}

        <div className="flex gap-3">
          {step > (isInstant ? 2 : 1) && (
            <button onClick={() => setStep(s => (s - 1) as 1|2|3)}
              className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center
                justify-center active:scale-95 transition-transform flex-shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <button
            onClick={() => step < 3 ? setStep(s => (s + 1) as 1|2|3) : confirmBooking()}
            disabled={
              loading ||
              (!isInstant && step === 1 && !selectedTime) ||
              (step === 2 && !selectedAddress)
            }
            className="flex-1 h-14 rounded-2xl font-black text-base text-white
              flex items-center justify-center gap-2.5 active:scale-95 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
              boxShadow:  '0 6px 20px rgba(6,182,212,0.45)',
            }}>
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : step === 3 ? (
              <>Pay ₹{finalAmount} & Book
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>Continue
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}