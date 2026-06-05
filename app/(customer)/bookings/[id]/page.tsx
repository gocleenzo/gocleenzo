'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type BookingDetail = {
  id: string
  status: string
  scheduled_at: string
  base_price: number
  discount_amount: number
  final_amount: number
  otp: string | null
  special_instructions: string | null
  payment_status: string
  services: { name: string; category: string; duration_minutes: number } | null
  addresses: { label: string; flat_no: string | null; building: string | null; area: string; city: string } | null
  worker?: { full_name: string | null; phone: string | null } | null
}

const STEPS = [
  { status: 'pending',      label: 'Booking placed',    icon: '📋' },
  { status: 'accepted',     label: 'Worker assigned',   icon: '👷' },
  { status: 'otp_verified', label: 'Work started',     icon: '⚡' },
  { status: 'completed',    label: 'Service complete',  icon: '✅' },
]

const STATUS_ORDER = ['pending', 'accepted', 'otp_verified', 'in_progress', 'completed']

export default function BookingDetailPage() {
  const { id }         = useParams<{ id: string }>()
  const searchParams   = useSearchParams()
  const isNew          = searchParams.get('new') === 'true'
  const router         = useRouter()
  const supabase       = createClient()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOtp, setShowOtp] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select(`*, services(name,category,duration_minutes),
          addresses(label,flat_no,building,area,city),
          worker:users!worker_id(full_name,phone)`)
        .eq('id', id)
        .single()
      if (data) setBooking(data as BookingDetail)
      setLoading(false)
    }
    load()

    // realtime status updates
    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => {
          setBooking(prev => prev ? { ...prev, ...payload.new } : prev)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent
          rounded-full animate-spin" />
      </div>
    )
  }

  if (!booking) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Booking not found</p>
    </div>
  }

  const currentStep = STATUS_ORDER.indexOf(booking.status)
  const isCancelled = booking.status === 'cancelled'
  const isCompleted = booking.status === 'completed'
  const isActive    = !isCancelled && !isCompleted

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long'
    }) + ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  async function cancelBooking() {
    if (!confirm('Cancel this booking?')) return
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
    setBooking(prev => prev ? { ...prev, status: 'cancelled' } : prev)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* new booking success banner */}
      {isNew && (
        <div className="bg-green-500 text-white text-center py-3 px-5 text-sm font-semibold">
          🎉 Booking confirmed! We&apos;re finding you a professional.
        </div>
      )}

      {/* header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/bookings')}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Booking Details</h1>
            <p className="text-xs text-gray-400">#{id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-10 space-y-4">

        {/* service summary */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center
              justify-center text-3xl">🧹</div>
            <div className="flex-1">
              <p className="text-gray-900 font-bold text-base">
                {booking.services?.name}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {formatDateTime(booking.scheduled_at)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-500 text-xs">
              📍 {booking.addresses?.flat_no && `${booking.addresses.flat_no}, `}
              {booking.addresses?.building && `${booking.addresses.building}, `}
              {booking.addresses?.area}, {booking.addresses?.city}
            </p>
            {booking.special_instructions && (
              <p className="text-gray-400 text-xs mt-2">
                💬 {booking.special_instructions}
              </p>
            )}
          </div>
        </div>

        {/* live tracking */}
        {!isCancelled && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              {isCompleted ? 'Service completed' : 'Live tracking'}
            </h2>
            <div className="space-y-1">
              {STEPS.map((s, i) => {
                const done    = currentStep > i || isCompleted
                const current = STATUS_ORDER.indexOf(s.status) === currentStep && !isCompleted
                return (
                  <div key={s.status}>
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center
                        text-base transition-all flex-shrink-0
                        ${done || current
                          ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-200'
                          : 'bg-gray-100 text-gray-300'}`}>
                        {s.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold
                          ${done || current ? 'text-gray-900' : 'text-gray-300'}`}>
                          {s.label}
                        </p>
                        {current && (
                          <p className="text-xs text-cyan-500 font-medium animate-pulse mt-0.5">
                            In progress...
                          </p>
                        )}
                      </div>
                      {(done || current) && (
                        <div className={`w-5 h-5 rounded-full flex items-center
                          justify-center flex-shrink-0
                          ${done && !current ? 'bg-green-100' : 'bg-cyan-100'}`}>
                          <svg className={`w-3 h-3 ${done && !current
                            ? 'text-green-600' : 'text-cyan-600'}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`ml-4 w-px h-5 ml-[17px] my-1
                        ${done ? 'bg-cyan-300' : 'bg-gray-100'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* OTP card — show when worker assigned */}
        {['accepted', 'otp_verified', 'in_progress'].includes(booking.status) && booking.otp && (
          <div className="bg-cyan-500 rounded-3xl p-5 shadow-lg shadow-cyan-200">
            <p className="text-cyan-100 text-sm font-medium mb-2">
              Share this OTP with the worker on arrival
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(showOtp ? booking.otp : '****').split('').map((ch, i) => (
                  <div key={i} className="w-12 h-14 bg-white/20 rounded-xl flex items-center
                    justify-center text-white text-2xl font-bold">
                    {ch}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowOtp(v => !v)}
                className="text-white text-sm font-medium bg-white/20 px-4 py-2 rounded-xl"
              >
                {showOtp ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}

        {/* worker info */}
        {booking.worker && booking.status !== 'pending' && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">Your professional</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center
                justify-center text-cyan-600 font-bold text-lg">
                {(booking.worker.full_name ?? 'W')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-semibold">
                  {booking.worker.full_name ?? 'Professional'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor"
                      viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-xs text-gray-400 ml-1">Verified</span>
                </div>
              </div>
              {booking.worker.phone && (
                <a href={`tel:${booking.worker.phone}`}
                  className="w-10 h-10 rounded-full bg-green-100 flex items-center
                    justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* price breakdown */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-3">Payment</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service price</span>
              <span className="text-gray-900">₹{booking.base_price}</span>
            </div>
            {booking.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount</span>
                <span className="text-green-600">- ₹{booking.discount_amount}</span>
              </div>
            )}
            <div className="h-px bg-gray-100 my-1" />
            <div className="flex justify-between">
              <span className="text-gray-900 font-bold">Total</span>
              <span className="text-cyan-600 font-bold text-lg">₹{booking.final_amount}</span>
            </div>
            <div className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-full
              inline-block
              ${booking.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'}`}>
              {booking.payment_status === 'paid' ? '✓ Payment received' : '⏳ Payment pending'}
            </div>
          </div>
        </div>

        {/* cancel button */}
        {booking.status === 'pending' && (
          <button
            onClick={cancelBooking}
            className="w-full py-4 rounded-2xl border-2 border-red-200 text-red-500
              font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Cancel Booking
          </button>
        )}

        {/* WhatsApp support */}
        <a
          href="https://wa.me/919999999999?text=Hi, I need help with booking %23${id.slice(0,8).toUpperCase()}"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl
            bg-green-500 text-white font-semibold text-sm"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Chat with Support
        </a>
      </div>
    </div>
  )
}