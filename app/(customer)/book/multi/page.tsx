'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = { id: string; name: string; base_price: number; duration_minutes: number }
type Address  = { id: string; label: string; flat_no: string | null; building: string | null; area: string; city: string; is_default?: boolean }

const TIMES = [
  '07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM','07:00 PM',
]

function getDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1); return d
  })
}

function BookMultiContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()
  const serviceIds   = (searchParams.get('services') ?? '').split(',').filter(Boolean)

  const [services,     setServices]     = useState<Service[]>([])
  const [addresses,    setAddresses]    = useState<Address[]>([])
  const [step,         setStep]         = useState(1)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedAddr, setSelectedAddr] = useState('')
  const [promoCode,    setPromoCode]    = useState('')
  const [discount,     setDiscount]     = useState(0)
  const [promoMsg,     setPromoMsg]     = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [booking,      setBooking]      = useState(false)
  const [userId,       setUserId]       = useState('')
  const [userEmail,    setUserEmail]    = useState('')

  useEffect(() => {
    if (!document.getElementById('razorpay-script')) {
      const s = document.createElement('script')
      s.id = 'razorpay-script'
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.async = true
      document.body.appendChild(s)
    }
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    setUserEmail(user.email ?? '')

    // fetch unique service IDs (deduplicate)
    const uniqueIds = [...new Set(serviceIds)]
    const { data: svcs } = await supabase
      .from('services').select('id,name,base_price,duration_minutes').in('id', uniqueIds)
    if (svcs) {
      // rebuild with quantities from serviceIds array
      const withQty = svcs.map(svc => ({
        ...svc,
        qty: serviceIds.filter(id => id === svc.id).length
      }))
      setServices(withQty as any)
    }

    const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', user.id)
    if (addrs?.length) {
      setAddresses(addrs)
      const def = addrs.find((a: Address) => a.is_default) ?? addrs[0]
      setSelectedAddr(def.id)
    }
  }

  const subtotal = (services as any[]).reduce((s, sv) => s + sv.base_price * (sv.qty ?? 1), 0)
  const total    = Math.max(0, subtotal - discount)
  const dates    = getDates()

  async function applyPromo() {
    if (!promoCode.trim() || promoApplied) return
    const { data } = await supabase
      .from('promo_codes').select('*')
      .eq('code', promoCode.toUpperCase()).eq('is_active', true).single()
    if (!data) { setPromoMsg('Invalid or expired promo code'); return }
    let disc = 0
    if (data.discount_type === 'percent') {
      disc = Math.round((subtotal * data.discount_value) / 100)
      if (data.max_discount_amount) disc = Math.min(disc, data.max_discount_amount)
    } else {
      disc = data.discount_value
    }
    setDiscount(disc); setPromoApplied(true)
    setPromoMsg(`✓ Saved ₹${disc.toLocaleString('en-IN')}!`)
    await supabase.from('promo_codes')
      .update({ used_count: (data.used_count ?? 0) + 1 }).eq('id', data.id)
  }

  async function confirmBooking() {
    if (!selectedDate || !selectedTime || !selectedAddr) return
    setBooking(true)

    // create Razorpay order
    let orderId: string
    try {
      const res  = await fetch('/api/payments/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total }),
      })
      const data = await res.json()
      if (!res.ok || !data.orderId) throw new Error('Order failed')
      orderId = data.orderId
    } catch {
      setBooking(false)
      alert('Could not initiate payment. Check internet and try again.')
      return
    }

    // compute scheduled time
    const [time, mer] = selectedTime.split(' ')
    const [hh, mm]    = time.split(':').map(Number)
    const hours       = mer === 'PM' && hh !== 12 ? hh + 12 : hh === 12 && mer === 'AM' ? 0 : hh
    const scheduled   = new Date(selectedDate)
    scheduled.setHours(hours, mm, 0, 0)
    const otp = String(Math.floor(1000 + Math.random() * 9000))

    if (!(window as any).Razorpay) {
      alert('Payment not loaded. Refresh and try again.')
      setBooking(false); return
    }

    const rzp = new (window as any).Razorpay({
      key:      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount:   total * 100,
      currency: 'INR',
      name:     'GoCleenzo',
      order_id: orderId,
      prefill:  { email: userEmail },
      theme:    { color: '#06B6D4' },

      handler: async function(response: any) {
        // verify payment
        const vRes = await fetch('/api/payments/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          }),
        })
        const { verified } = await vRes.json()
        if (!verified) {
          setBooking(false)
          alert('Payment verification failed. Contact support: ' + response.razorpay_payment_id)
          return
        }

        // ── INSERT ONE SINGLE ROW for entire order ──────────────────────
        const svcNames = (services as any[]).flatMap(s =>
          Array(s.qty ?? 1).fill(s.name)
        )
        const svcIds = (services as any[]).flatMap(s =>
          Array(s.qty ?? 1).fill(s.id)
        )

        const { data: newBooking, error } = await supabase
          .from('bookings')
          .insert({
            customer_id:         userId,
            service_id:          services[0]?.id,       // primary service
            service_ids:         svcIds,                 // all service ids as array
            service_names:       svcNames,               // all service names as array
            total_services:      svcIds.length,
            address_id:          selectedAddr,
            status:              'pending',
            base_price:          subtotal,
            discount_amount:     discount,
            final_amount:        total,
            scheduled_at:        scheduled.toISOString(),
            otp:                 otp,
            payment_status:      'paid',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id:   response.razorpay_order_id,
            promo_code:          promoCode || null,
          })
          .select()
          .single()

        if (error) {
          console.error('Booking insert failed:', error)
          alert('Payment done but booking failed. Contact support: ' + response.razorpay_payment_id)
          setBooking(false); return
        }

        setBooking(false)
        router.push('/bookings')
      },

      modal: { ondismiss: () => setBooking(false) }
    })

    rzp.on('payment.failed', () => {
      setBooking(false)
      alert('Payment failed. Please try a different method.')
    })

    rzp.open()
  }

  const selectedAddress = addresses.find(a => a.id === selectedAddr)

  return (
    <div className="min-h-screen pb-8" style={{ background: '#F5F5F7' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', paddingTop: '52px' }}>
        <div className="px-5 pb-0">
          <button onClick={() => step === 1 ? router.back() : setStep(s => s - 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 active:scale-90"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-black text-xl">Book Services</h1>
          <p className="text-cyan-100 text-sm mb-4">
            {serviceIds.length} {serviceIds.length === 1 ? 'service' : 'services'} · ₹{subtotal.toLocaleString('en-IN')}
          </p>
        </div>

        {/* steps */}
        <div className="flex items-center px-5 pb-5 gap-1">
          {['Date & Time', 'Address', 'Confirm'].map((label, i) => {
            const s = i + 1; const active = step === s; const done = step > s
            return (
              <div key={label} className="flex items-center gap-1 flex-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: done?'#10B981':active?'#fff':'rgba(255,255,255,0.3)', color: done?'#fff':active?'#06B6D4':'rgba(255,255,255,0.7)' }}>
                  {done ? '✓' : s}
                </div>
                <span className="text-[11px] font-semibold truncate"
                  style={{ color: active?'#fff':done?'#A5F3FC':'rgba(255,255,255,0.5)' }}>
                  {label}
                </span>
                {i < 2 && <div className="flex-1 h-px mx-1" style={{ background: 'rgba(255,255,255,0.3)' }}/>}
              </div>
            )
          })}
        </div>

        <svg viewBox="0 0 390 24" fill="none" preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: '24px' }}>
          <path d="M0 24C65 8 130 0 195 0C260 0 325 8 390 24H0Z" fill="#F5F5F7"/>
        </svg>
      </div>

      <div className="px-4 -mt-1 space-y-4">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div><h2 className="text-sm font-extrabold text-gray-900">Choose Date</h2><p className="text-xs text-gray-400">Select preferred date</p></div>
              </div>
              <div className="px-4 py-4">
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {dates.map(d => {
                    const iso = d.toISOString().split('T')[0]; const active = selectedDate === iso
                    return (
                      <button key={iso} onClick={() => setSelectedDate(iso)}
                        className="flex flex-col items-center rounded-2xl px-3 py-3 min-w-[58px] flex-shrink-0 transition-all active:scale-95"
                        style={{ background: active?'#06B6D4':'#F9FAFB', boxShadow: active?'0 4px 14px rgba(6,182,212,0.45)':'none', border: active?'none':'1.5px solid #F0F0F0' }}>
                        <span className="text-[10px] font-bold uppercase" style={{ color: active?'#CFFAFE':'#9CA3AF' }}>
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </span>
                        <span className="text-2xl font-black mt-0.5 leading-none" style={{ color: active?'#fff':'#111827' }}>{d.getDate()}</span>
                        <span className="text-[9px] font-bold mt-1" style={{ color: active?'#A5F3FC':'#D1D5DB' }}>
                          {d.toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div><h2 className="text-sm font-extrabold text-gray-900">Choose Time</h2><p className="text-xs text-gray-400">Pick a convenient slot</p></div>
              </div>
              <div className="px-4 py-4">
                <div className="grid grid-cols-3 gap-2.5">
                  {TIMES.map(slot => {
                    const active = selectedTime === slot
                    return (
                      <button key={slot} onClick={() => setSelectedTime(slot)}
                        className="py-3 rounded-2xl text-sm font-black transition-all active:scale-95"
                        style={{ background: active?'#06B6D4':'#F9FAFB', color: active?'#fff':'#111827', boxShadow: active?'0 4px 14px rgba(6,182,212,0.4)':'none', border: active?'none':'1.5px solid #F0F0F0' }}>
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <button onClick={() => { if (selectedDate && selectedTime) setStep(2) }}
              disabled={!selectedDate || !selectedTime}
              className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 8px 24px rgba(6,182,212,0.4)' }}>
              Continue →
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    </svg>
                  </div>
                  <div><h2 className="text-sm font-extrabold text-gray-900">Service Address</h2><p className="text-xs text-gray-400">Where should we come?</p></div>
                </div>
                <button onClick={() => router.push('/account')}
                  className="text-xs font-bold text-cyan-500 bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-100">
                  + Add new
                </button>
              </div>
              <div className="p-4">
                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📍</div>
                    <p className="text-gray-600 font-bold mb-3">No saved addresses</p>
                    <button onClick={() => router.push('/account')} className="bg-cyan-500 text-white px-6 py-2.5 rounded-2xl font-bold text-sm">Add Address</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => {
                      const active = selectedAddr === addr.id
                      const icon   = addr.label==='Home'?'🏠':addr.label==='Office'?'🏢':'📍'
                      return (
                        <button key={addr.id} onClick={() => setSelectedAddr(addr.id)}
                          className="w-full text-left rounded-2xl p-4 transition-all border-2"
                          style={{ background: active?'#ECFEFF':'#F9FAFB', borderColor: active?'#06B6D4':'#F0F0F0' }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-gray-100 flex-shrink-0">{icon}</div>
                              <div>
                                <p className="text-sm font-extrabold text-gray-900">{addr.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {addr.flat_no&&`${addr.flat_no}, `}{addr.building&&`${addr.building}, `}{addr.area}, {addr.city}
                                </p>
                              </div>
                            </div>
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                              style={{ background: active?'#06B6D4':'transparent', borderColor: active?'#06B6D4':'#D1D5DB' }}>
                              {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => { if (selectedAddr) setStep(3) }} disabled={!selectedAddr}
              className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 8px 24px rgba(6,182,212,0.4)' }}>
              Continue →
            </button>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            {/* services */}
            <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-lg">🧹</span></div>
                <h2 className="text-sm font-extrabold text-gray-900">Services ({serviceIds.length})</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {(services as any[]).map(svc => (
                  <div key={svc.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100">
                    <div>
                      <p className="text-gray-700 text-sm font-semibold">{svc.name}</p>
                      {svc.qty > 1 && <p className="text-gray-400 text-xs">× {svc.qty}</p>}
                    </div>
                    <p className="font-black text-sm" style={{ color: '#06B6D4' }}>
                      ₹{(svc.base_price * (svc.qty ?? 1)).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* summary */}
            <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-lg">📋</span></div>
                <h2 className="text-sm font-extrabold text-gray-900">Booking Summary</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                {[
                  { icon: '📅', label: 'DATE',    value: new Date(selectedDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' }) },
                  { icon: '⏰', label: 'TIME',    value: selectedTime },
                  { icon: '📍', label: 'ADDRESS', value: selectedAddress ? `${selectedAddress.area}, ${selectedAddress.city}` : '—' },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{row.icon}</div>
                    <div className="pt-0.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{row.label}</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* promo */}
            <div className="rounded-3xl overflow-hidden bg-white p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-lg">🎟️</div>
                <div><h2 className="text-sm font-extrabold text-gray-900">Promo Code</h2><p className="text-xs text-gray-400">Have a coupon?</p></div>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="ENTER CODE" value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(''); setPromoApplied(false); setDiscount(0) }}
                  disabled={promoApplied}
                  className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-widest outline-none focus:border-cyan-300 transition-all"/>
                <button onClick={applyPromo} disabled={promoApplied}
                  className="px-5 rounded-2xl text-sm font-black text-white flex-shrink-0"
                  style={{ background: promoApplied?'#10B981':'#06B6D4' }}>
                  {promoApplied ? '✓' : 'Apply'}
                </button>
              </div>
              {promoMsg && <p className="text-xs font-bold mt-2" style={{ color: promoMsg.startsWith('✓')?'#10B981':'#EF4444' }}>{promoMsg}</p>}
            </div>

            {/* price */}
            <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h2 className="text-sm font-extrabold text-gray-900">Price Breakdown</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {(services as any[]).map(svc => (
                  <div key={svc.id} className="flex justify-between">
                    <span className="text-sm text-gray-500">{svc.name}{svc.qty > 1 ? ` × ${svc.qty}` : ''}</span>
                    <span className="text-sm font-bold text-gray-900">₹{(svc.base_price * (svc.qty ?? 1)).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Discount ({promoCode})</span>
                    <span className="text-sm font-bold text-green-600">− ₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Platform fee</span>
                  <span className="text-sm font-bold text-green-500">FREE</span>
                </div>
                <div className="h-px bg-gray-100"/>
                <div className="flex justify-between items-center">
                  <span className="text-base font-extrabold text-gray-900">Total payable</span>
                  <span className="text-2xl font-black" style={{ color: '#06B6D4' }}>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="mx-5 mb-5 flex items-center gap-3 bg-cyan-50 border border-cyan-100 rounded-2xl px-4 py-3">
                <span className="text-xl flex-shrink-0">🔒</span>
                <p className="text-xs text-cyan-700 font-semibold">100% secure payment via Razorpay.</p>
              </div>
            </div>

            <button onClick={confirmBooking} disabled={booking}
              className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 8px 24px rgba(6,182,212,0.4)' }}>
              {booking ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : `Pay ₹${total.toLocaleString('en-IN')} & Book`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function BookMultiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F7' }}>
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#A5F3FC', borderTopColor: '#06B6D4' }}/>
      </div>
    }>
      <BookMultiContent/>
    </Suspense>
  )
}