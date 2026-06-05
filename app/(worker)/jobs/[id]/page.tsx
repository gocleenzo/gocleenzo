'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Booking = {
  id: string; status: string; final_amount: number
  scheduled_at: string; otp: string; service_name: string
  customer_name: string; customer_phone: string
  area: string; city: string; flat_no: string; building: string
  duration: number; instructions: string | null; includes: string[]
}

const STEPS = [
  { key: 'accepted',     label: 'Job Accepted',     icon: '✓',  color: '#06B6D4' },
  { key: 'otp_verified', label: 'OTP Verified',     icon: '🔑', color: '#8B5CF6' },
  { key: 'in_progress',  label: 'Work In Progress', icon: '🧹', color: '#F59E0B' },
  { key: 'completed',    label: 'Job Completed',    icon: '🎉', color: '#10B981' },
]

export default function WorkerJobPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const supabase = createClient()

  const [booking,   setBooking]   = useState<Booking | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [otp,       setOtp]       = useState(['','','',''])
  const [otpErr,    setOtpErr]    = useState('')
  const [showOtp,   setShowOtp]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [acting,    setActing]    = useState(false)

  useEffect(() => {
    load()
    const ch = supabase.channel(`job-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id])

  async function load() {
    const { data } = await supabase
      .from('bookings')
      .select('id,status,final_amount,scheduled_at,otp,special_instructions,services(name,duration_minutes,includes),addresses(area,city,flat_no,building),customer:users!customer_id(full_name,phone)')
      .eq('id', id as string).single()
    if (data) setBooking({
      id: data.id, status: data.status, final_amount: data.final_amount ?? 0,
      scheduled_at: data.scheduled_at, otp: data.otp ?? '',
      service_name:   (data.services as any)?.name ?? 'Service',
      customer_name:  (data.customer as any)?.full_name ?? 'Customer',
      customer_phone: (data.customer as any)?.phone ?? '',
      area:           (data.addresses as any)?.area ?? '—',
      city:           (data.addresses as any)?.city ?? 'Mumbai',
      flat_no:        (data.addresses as any)?.flat_no ?? '',
      building:       (data.addresses as any)?.building ?? '',
      duration:       (data.services as any)?.duration_minutes ?? 60,
      instructions:   data.special_instructions,
      includes:       (data.services as any)?.includes ?? [],
    })
    setLoading(false)
  }

  function handleOtp(val: string, i: number) {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next)
    if (val && i < 3) document.getElementById(`wotp-${i+1}`)?.focus()
  }

  async function verifyOtp() {
    const entered = otp.join('')
    if (entered.length < 4) { setOtpErr('Enter 4-digit OTP'); return }
    if (entered !== booking?.otp) { setOtpErr('Wrong OTP! Ask customer again.'); return }
    setVerifying(true)
    await supabase.from('bookings').update({ status: 'otp_verified' }).eq('id', id as string)
    setVerifying(false); setOtpErr(''); setShowOtp(false); load()
  }

  async function startWork() {
    setActing(true)
    await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', id as string)
    setActing(false); load()
  }

  async function completeJob() {
    if (!confirm('Mark this job as completed?')) return
    setActing(true)
    await supabase.from('bookings').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id as string)
    setActing(false)
    router.push('/dashboard')
  }

  if (loading || !booking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FDFE' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#A5F3FC', borderTopColor: '#06B6D4' }} />
    </div>
  )

  const stepIdx = STEPS.findIndex(s => s.key === booking.status)

  return (
    <div className="min-h-screen pb-6" style={{ background: '#F0FDFE' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', paddingTop: '52px' }}>
        <div className="px-5 pb-0">
          <button onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 active:scale-90"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-black text-xl mb-0.5">{booking.service_name}</h1>
          <p className="text-cyan-100 text-sm">
            {new Date(booking.scheduled_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-white font-black text-3xl mt-2 mb-6">₹{booking.final_amount.toLocaleString('en-IN')}</p>
        </div>
        <svg viewBox="0 0 390 32" fill="none" preserveAspectRatio="none" style={{ display:'block', width:'100%', height:'32px' }}>
          <path d="M0 32C65 10 130 0 195 0C260 0 325 10 390 32H0Z" fill="#F0FDFE"/>
        </svg>
      </div>

      <div className="px-4 -mt-1 space-y-4">

        {/* PROGRESS */}
        <div className="rounded-3xl p-5" style={{ background: '#fff', border: '1px solid #E0F2FE', boxShadow: '0 2px 12px rgba(6,182,212,0.08)' }}>
          <h3 className="text-sm font-black text-gray-700 mb-4">Job Progress</h3>
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const done = i < stepIdx
              const curr = i === stepIdx
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-black transition-all"
                    style={{ background: done || curr ? `${step.color}18` : '#F8FAFC', color: done || curr ? step.color : '#CBD5E1', border: curr ? `2px solid ${step.color}` : '2px solid transparent' }}>
                    {done ? '✓' : step.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: i > stepIdx ? '#94A3B8' : '#111827' }}>{step.label}</p>
                    {curr && <p className="text-xs font-semibold" style={{ color: step.color }}>Current step</p>}
                  </div>
                  {curr && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: step.color }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* ADDRESS */}
        <div className="rounded-3xl p-5" style={{ background: '#fff', border: '1px solid #E0F2FE' }}>
          <h3 className="text-sm font-black text-gray-700 mb-3">📍 Service Location</h3>
          <div className="rounded-2xl p-4" style={{ background: '#F0FDFE', border: '1px solid #A5F3FC' }}>
            {booking.flat_no && <p className="text-gray-900 font-bold text-sm">{booking.flat_no}{booking.building ? `, ${booking.building}` : ''}</p>}
            <p className="text-gray-600 text-sm">{booking.area}, {booking.city}</p>
          </div>
          {booking.instructions && (
            <div className="mt-3 rounded-2xl p-3.5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-xs font-black text-amber-700 mb-1">⚠️ Special Instructions</p>
              <p className="text-amber-600 text-sm">{booking.instructions}</p>
            </div>
          )}
        </div>

        {/* CUSTOMER */}
        <div className="rounded-3xl p-5" style={{ background: '#fff', border: '1px solid #E0F2FE' }}>
          <h3 className="text-sm font-black text-gray-700 mb-3">👤 Customer</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg"
                style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)' }}>
                {booking.customer_name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm">{booking.customer_name}</p>
                <p className="text-gray-400 text-xs">{booking.customer_phone}</p>
              </div>
            </div>
            <a href={`tel:${booking.customer_phone}`}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl active:scale-90 transition-transform"
              style={{ background: '#F0FDFE', border: '1px solid #A5F3FC' }}>
              📞
            </a>
          </div>
        </div>

        {/* TASK LIST */}
        {booking.includes?.length > 0 && (
          <div className="rounded-3xl p-5" style={{ background: '#fff', border: '1px solid #E0F2FE' }}>
            <h3 className="text-sm font-black text-gray-700 mb-3">📋 Tasks to Complete</h3>
            <div className="space-y-2">
              {booking.includes.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: '#F0FDFE', border: '1px solid #CFFAFE' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#06B6D4' }}>
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION CARDS */}

        {/* accepted → enter OTP */}
        {booking.status === 'accepted' && (
          <div className="rounded-3xl p-5"
            style={{ background: 'linear-gradient(135deg,#ECFEFF,#CFFAFE)', border: '2px solid #06B6D4', boxShadow: '0 4px 20px rgba(6,182,212,0.15)' }}>
            <h3 className="text-sm font-black text-gray-900 mb-1">🔑 Verify Customer OTP</h3>
            <p className="text-cyan-700 text-xs mb-4">Ask the customer to show their 4-digit OTP</p>
            {!showOtp ? (
              <button onClick={() => setShowOtp(true)}
                className="w-full h-12 rounded-2xl font-black text-sm border-2 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ borderColor: '#06B6D4', color: '#06B6D4', background: '#fff' }}>
                🔑 Enter OTP from Customer
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3 justify-center">
                  {otp.map((d, i) => (
                    <input key={i} id={`wotp-${i}`} type="text" inputMode="numeric" value={d} maxLength={1}
                      onChange={e => handleOtp(e.target.value, i)}
                      onKeyDown={e => { if(e.key==='Backspace'&&!d&&i>0) document.getElementById(`wotp-${i-1}`)?.focus() }}
                      className="w-14 h-16 text-center text-2xl font-black rounded-2xl outline-none transition-all"
                      style={{ border: d?'2px solid #06B6D4':'2px solid #A5F3FC', background: d?'#fff':'#F0FDFE', color:'#0891B2', boxShadow: d?'0 4px 12px rgba(6,182,212,0.2)':'none' }} />
                  ))}
                </div>
                {otpErr && <p className="text-red-500 text-xs text-center font-bold">{otpErr}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setShowOtp(false); setOtp(['','','','']); setOtpErr('') }}
                    className="flex-1 h-11 rounded-2xl font-bold text-sm" style={{ background: '#F0F4F8', color: '#64748B' }}>
                    Cancel
                  </button>
                  <button onClick={verifyOtp} disabled={verifying || otp.join('').length < 4}
                    className="flex-1 h-11 rounded-2xl text-white font-black text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)' }}>
                    {verifying ? 'Verifying...' : '✓ Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* otp_verified → start work */}
        {booking.status === 'otp_verified' && (
          <div className="rounded-3xl p-5"
            style={{ background: 'linear-gradient(135deg,#F5F3FF,#EDE9FE)', border: '2px solid #8B5CF6' }}>
            <h3 className="text-sm font-black text-gray-900 mb-1">✅ OTP Verified!</h3>
            <p className="text-purple-600 text-xs mb-4">Great! Now start the cleaning work</p>
            <button onClick={startWork} disabled={acting}
              className="w-full h-13 h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', boxShadow: '0 4px 16px rgba(139,92,246,0.4)' }}>
              {acting ? 'Starting...' : '🧹 Start Work Now'}
            </button>
          </div>
        )}

        {/* in_progress → complete */}
        {booking.status === 'in_progress' && (
          <div className="rounded-3xl p-5"
            style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '2px solid #10B981' }}>
            <h3 className="text-sm font-black text-gray-900 mb-1">🧹 Work In Progress</h3>
            <p className="text-green-600 text-xs mb-4">Complete all tasks then mark as done</p>
            <button onClick={completeJob} disabled={acting}
              className="w-full h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.4)' }}>
              {acting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : '🎉 Mark Job as Completed'}
            </button>
          </div>
        )}

        {/* completed */}
        {booking.status === 'completed' && (
          <div className="rounded-3xl p-6 text-center"
            style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '2px solid #10B981' }}>
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-gray-900 font-black text-lg mb-1">Job Completed!</p>
            <p className="text-green-600 text-sm mb-4">₹{booking.final_amount.toLocaleString('en-IN')} will be credited to your account</p>
            <button onClick={() => router.push('/dashboard')}
              className="px-8 py-3 rounded-2xl text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}