'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Order = {
  id: string
  status: string
  scheduled_at: string
  final_amount: number
  otp: string
  service_names: string[]
  total_services: number
  area: string
  city: string
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:      { label: 'Finding worker',  color: '#D97706', bg: '#FEF3C7', icon: '🔍' },
  accepted:     { label: 'Worker assigned', color: '#2563EB', bg: '#DBEAFE', icon: '👷' },
  otp_verified: { label: 'Work started',    color: '#7C3AED', bg: '#EDE9FE', icon: '⚡' },
  in_progress:  { label: 'In progress',     color: '#0891B2', bg: '#CFFAFE', icon: '🧹' },
  completed:    { label: 'Completed',       color: '#059669', bg: '#D1FAE5', icon: '✅' },
  cancelled:    { label: 'Cancelled',       color: '#DC2626', bg: '#FEE2E2', icon: '❌' },
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}

function shortId(id: string) {
  return id.replace(/-/g,'').substring(0,8).toUpperCase()
}

export default function BookingsPage() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [tab,     setTab]     = useState<'upcoming'|'past'>('upcoming')
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('bookings')
      .select(`
        id, status, scheduled_at, final_amount, otp,
        service_names, total_services,
        services ( name ),
        addresses ( area, city )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const orders: Order[] = data.map(b => ({
      id:             b.id,
      status:         b.status,
      scheduled_at:   b.scheduled_at,
      final_amount:   b.final_amount ?? 0,
      otp:            (b as any).otp ?? '0000',
      // use service_names array if exists, else single service name
      service_names:  (b as any).service_names?.length
        ? (b as any).service_names
        : [(b.services as any)?.name ?? 'Service'],
      total_services: (b as any).total_services ?? 1,
      area:           (b.addresses as any)?.area ?? '—',
      city:           (b.addresses as any)?.city ?? 'Mumbai',
    }))

    setOrders(orders)
    setLoading(false)
  }

  const upcoming = orders.filter(o => ['pending','accepted','otp_verified','in_progress'].includes(o.status))
  const past      = orders.filter(o => ['completed','cancelled'].includes(o.status))
  const shown     = tab === 'upcoming' ? upcoming : past

  return (
    <div className="min-h-screen" style={{ background:'#F0FDFE' }}>

      {/* header */}
      <div style={{ background:'linear-gradient(135deg,#06B6D4,#0891B2)', paddingTop:'52px' }}>
        <div className="px-5 pb-0">
          <h1 className="text-white font-black text-2xl mb-4">My Bookings</h1>
        </div>
        <div className="flex px-5 gap-1 pb-0">
          {(['upcoming','past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 text-sm font-black capitalize border-b-2 transition-all"
              style={{ borderColor:tab===t?'#fff':'transparent', color:tab===t?'#fff':'rgba(255,255,255,0.6)' }}>
              {t} ({t==='upcoming'?upcoming.length:past.length})
            </button>
          ))}
        </div>
        <svg viewBox="0 0 390 24" fill="none" preserveAspectRatio="none"
          style={{ display:'block', width:'100%', height:'24px' }}>
          <path d="M0 24C65 8 130 0 195 0C260 0 325 8 390 24H0Z" fill="#F0FDFE"/>
        </svg>
      </div>

      <div className="px-4 -mt-1 pb-24">
        {loading ? (
          <div className="space-y-3 mt-4">
            {[1,2,3].map(i=><div key={i} className="rounded-3xl h-32 animate-pulse bg-white"/>)}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{tab==='upcoming'?'📅':'📋'}</div>
            <p className="text-gray-700 font-bold text-lg">
              {tab==='upcoming'?'No upcoming bookings':'No past bookings'}
            </p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              {tab==='upcoming'?'Book a service to get started':'Completed bookings appear here'}
            </p>
            {tab==='upcoming' && (
              <button onClick={() => router.push('/services')}
                className="text-white px-8 py-3 rounded-2xl font-bold shadow-lg"
                style={{ background:'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow:'0 4px 16px rgba(6,182,212,0.4)' }}>
                Browse Services
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {shown.map(order => {
              const cfg = STATUS[order.status] ?? STATUS.pending
              return (
                <div key={order.id} className="rounded-3xl overflow-hidden"
                  style={{ background:'#fff', boxShadow:'0 2px 16px rgba(6,182,212,0.1)', border:'1px solid #E0F2FE' }}>

                  {/* order id bar */}
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background:'#F0FDFE', borderBottom:'1px solid #E0F2FE' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-cyan-600 uppercase tracking-wider">Order</span>
                      <span className="font-black text-xs text-cyan-800">#{shortId(order.id)}</span>
                      {order.total_services > 1 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
                          style={{ background:'#06B6D4' }}>
                          {order.total_services} services
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                      style={{ background:cfg.bg, color:cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  <div className="p-4">
                    {/* all services */}
                    <div className="mb-3 space-y-1.5">
                      {order.service_names.map((name, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background:'#ECFEFF' }}>🧹</div>
                          <p className="text-gray-900 font-semibold text-sm">{name}</p>
                        </div>
                      ))}
                    </div>

                    {/* date + amount */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-gray-400 text-xs">📅 {fmt(order.scheduled_at)}</p>
                        <p className="text-gray-400 text-xs mt-0.5">📍 {order.area}, {order.city}</p>
                      </div>
                      <p className="font-black text-xl" style={{ color:'#06B6D4' }}>
                        ₹{order.final_amount.toLocaleString('en-IN')}
                      </p>
                    </div>

                    {/* OTP */}
                    {['pending','accepted'].includes(order.status) && (
                      <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
                        style={{ background:'linear-gradient(135deg,#ECFEFF,#CFFAFE)', border:'1.5px solid #06B6D4' }}>
                        <div>
                          <p className="text-cyan-800 font-black text-xs">Your OTP</p>
                          <p className="text-cyan-600 text-[10px] mt-0.5">Share with worker on arrival</p>
                        </div>
                        <div className="flex gap-1.5">
                          {order.otp.split('').map((d, i) => (
                            <div key={i} className="w-8 h-9 rounded-xl flex items-center justify-center font-black text-base text-white shadow-sm"
                              style={{ background:'linear-gradient(135deg,#06B6D4,#0891B2)' }}>
                              {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={() => router.push(`/bookings/${order.id}`)}
                      className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
                      style={{ background:'#F0FDFE', color:'#0891B2', border:'1px solid #A5F3FC' }}>
                      View Details →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}