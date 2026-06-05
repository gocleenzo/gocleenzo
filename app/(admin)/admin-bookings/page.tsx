'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Booking = { id: string; status: string; final_amount: number; scheduled_at: string; service_name: string; customer: string; customer_phone: string; worker: string; area: string; otp: string }

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',     color: '#F59E0B' },
  accepted:     { label: 'Accepted',    color: '#3B82F6' },
  otp_verified: { label: 'Started',     color: '#8B5CF6' },
  in_progress:  { label: 'In Progress', color: '#06B6D4' },
  completed:    { label: 'Completed',   color: '#10B981' },
  cancelled:    { label: 'Cancelled',   color: '#EF4444' },
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('id,status,final_amount,scheduled_at,otp,services(name),addresses(area,city),customer:users!customer_id(full_name,phone),worker:users!worker_id(full_name)')
        .order('created_at', { ascending: false })

      if (data) setBookings(data.map(b => ({
        id: b.id, status: b.status, final_amount: b.final_amount ?? 0,
        scheduled_at: b.scheduled_at, otp: b.otp ?? '—',
        service_name:   (b.services as any)?.name ?? 'Service',
        customer:       (b.customer as any)?.full_name ?? 'Customer',
        customer_phone: (b.customer as any)?.phone ?? '—',
        worker:         (b.worker as any)?.full_name ?? 'Unassigned',
        area:           (b.addresses as any)?.area ?? '—',
      })))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    return (b.service_name.toLowerCase().includes(q) || b.customer.toLowerCase().includes(q) || b.customer_phone.includes(q)) &&
           (filter === 'all' || b.status === filter)
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#8B5CF640', borderTopColor: '#8B5CF6' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0A0F1E' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Bookings</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>{filtered.length} bookings</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none w-40"
            style={{ background: '#0D1426', border: '1px solid #1E2A45' }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0D1426', border: '1px solid #1E2A45' }}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* status counts */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {Object.entries(STATUS_CFG).map(([k, v]) => {
          const count = bookings.filter(b => b.status === k).length
          return (
            <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                background: filter === k ? `${v.color}25` : `${v.color}10`,
                color:      v.color,
                border:     `1px solid ${filter === k ? v.color + '40' : v.color + '20'}`,
              }}>
              {count} {v.label}
            </button>
          )
        })}
      </div>

      {/* mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(b => {
          const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.pending
          return (
            <div key={b.id} className="rounded-2xl p-4 border" style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">{b.service_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{b.customer} · {b.area}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: `${cfg.color}20`, color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-2 text-center" style={{ background: '#ffffff05' }}>
                  <p className="font-black text-sm" style={{ color: '#06B6D4' }}>₹{b.final_amount.toLocaleString('en-IN')}</p>
                  <p className="text-[9px]" style={{ color: '#475569' }}>Amount</p>
                </div>
                <div className="rounded-xl p-2 text-center" style={{ background: '#ffffff05' }}>
                  <p className="font-bold text-sm text-white font-mono">{b.otp}</p>
                  <p className="text-[9px]" style={{ color: '#475569' }}>OTP</p>
                </div>
                <div className="rounded-xl p-2 text-center" style={{ background: '#ffffff05' }}>
                  <p className="font-semibold text-xs text-white truncate">{b.worker === 'Unassigned' ? '—' : b.worker.split(' ')[0]}</p>
                  <p className="text-[9px]" style={{ color: '#475569' }}>Worker</p>
                </div>
              </div>
              <p className="text-[10px] mt-2" style={{ color: '#475569' }}>
                {new Date(b.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl p-10 text-center text-sm" style={{ background: '#0D1426', color: '#475569' }}>No bookings found</div>
        )}
      </div>

      {/* desktop table */}
      <div className="hidden md:block rounded-3xl border overflow-hidden" style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2A45' }}>
                {['Service','Customer','Worker','Area','Amount','OTP','Status','Scheduled'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.pending
                return (
                  <tr key={b.id} className="hover:bg-white/5 transition-all" style={{ borderBottom: '1px solid #1E2A4530' }}>
                    <td className="px-5 py-4 text-white text-sm font-medium">{b.service_name}</td>
                    <td className="px-5 py-4"><p className="text-white text-sm">{b.customer}</p><p className="text-xs" style={{ color: '#475569' }}>{b.customer_phone}</p></td>
                    <td className="px-5 py-4 text-sm" style={{ color: b.worker === 'Unassigned' ? '#F59E0B' : '#64748B' }}>{b.worker}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#64748B' }}>{b.area}</td>
                    <td className="px-5 py-4 font-black text-sm" style={{ color: '#06B6D4' }}>₹{b.final_amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 font-mono text-white font-bold text-sm">{b.otp}</td>
                    <td className="px-5 py-4"><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${cfg.color}20`, color: cfg.color }}>{cfg.label}</span></td>
                    <td className="px-5 py-4 text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                      {new Date(b.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: '#475569' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}