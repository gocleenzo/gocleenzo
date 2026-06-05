'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Worker = {
  id: string; name: string; phone: string; email: string
  totalOrders: number; totalRevenue: number; completed: number
  cancelled: number; pending: number; avgOrder: number; joinedAt: string
}

export default function AdminWorkers() {
  const [workers,  setWorkers]  = useState<Worker[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<Worker | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: users }    = await supabase.from('users').select('id,full_name,phone,email,created_at').eq('role', 'worker')
      const { data: bookings } = await supabase.from('bookings').select('worker_id,status,final_amount')

      const list: Worker[] = (users ?? []).map(w => {
        const wb   = (bookings ?? []).filter(b => b.worker_id === w.id)
        const comp = wb.filter(b => b.status === 'completed')
        const rev  = comp.reduce((s, b) => s + (b.final_amount ?? 0), 0)
        return {
          id: w.id, name: w.full_name ?? 'Unknown', phone: w.phone ?? '—',
          email: w.email ?? '—', totalOrders: wb.length,
          totalRevenue: rev, completed: comp.length,
          cancelled: wb.filter(b => b.status === 'cancelled').length,
          pending:   wb.filter(b => b.status === 'pending').length,
          avgOrder:  comp.length > 0 ? Math.round(rev / comp.length) : 0,
          joinedAt:  w.created_at,
        }
      }).sort((a, b) => b.totalRevenue - a.totalRevenue)

      setWorkers(list)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = workers.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) || w.phone.includes(search)
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#F59E0B40', borderTopColor: '#F59E0B' }} />
    </div>
  )

  const totalRev = workers.reduce((s, w) => s + w.totalRevenue, 0)

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0A0F1E' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Workers</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>{workers.length} registered workers</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500 transition-all w-40 md:w-56"
            style={{ background: '#0D1426', border: '1px solid #1E2A45' }} />
        </div>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Workers',  value: workers.length, color: '#F59E0B', icon: '👷' },
          { label: 'Total Revenue',  value: `₹${totalRev.toLocaleString('en-IN')}`, color: '#06B6D4', icon: '💰' },
          { label: 'Total Orders',   value: workers.reduce((s, w) => s + w.totalOrders, 0), color: '#8B5CF6', icon: '📋' },
          { label: 'Avg / Worker',   value: `₹${workers.length > 0 ? Math.round(totalRev / workers.length).toLocaleString('en-IN') : 0}`, color: '#10B981', icon: '📊' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 border" style={{ background: `${c.color}0F`, borderColor: `${c.color}25` }}>
            <span className="text-xl">{c.icon}</span>
            <p className="text-xl font-black mt-2 leading-none mb-1" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs" style={{ color: '#64748B' }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* list */}
        <div className={`${selected ? 'hidden md:block md:w-1/2' : 'w-full'}`}>
          <div className="rounded-3xl border overflow-hidden" style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
            <div className="px-4 py-4 border-b" style={{ borderColor: '#1E2A45' }}>
              <p className="text-white font-extrabold text-sm">All Workers ({filtered.length})</p>
            </div>
            <div className="divide-y" style={{ borderColor: '#1E2A4530' }}>
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm" style={{ color: '#475569' }}>No workers found</div>
              ) : filtered.map((w, i) => (
                <button key={w.id} onClick={() => setSelected(selected?.id === w.id ? null : w)}
                  className="w-full text-left px-4 py-4 transition-all hover:bg-white/5"
                  style={{ background: selected?.id === w.id ? '#ffffff08' : 'transparent' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
                      style={{ background: `hsl(${i * 47}, 70%, 45%)` }}>
                      {w.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm truncate">{w.name}</p>
                        <span className="text-[9px] font-bold" style={{ color: '#475569' }}>#{i+1}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: '#475569' }}>{w.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm" style={{ color: '#06B6D4' }}>₹{w.totalRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px]" style={{ color: '#475569' }}>{w.totalOrders} orders</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* detail */}
        {selected && (
          <div className="w-full md:w-1/2">
            <div className="rounded-3xl border overflow-hidden" style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
              <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: '#1E2A45' }}>
                <p className="text-white font-extrabold text-sm">Worker Detail</p>
                <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: '#1E2A45', color: '#64748B' }}>✕</button>
              </div>
              <div className="p-5 space-y-4">
                {/* profile */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                    {selected.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-extrabold text-lg">{selected.name}</p>
                    <p className="text-sm" style={{ color: '#64748B' }}>{selected.phone}</p>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block" style={{ background: '#10B98120', color: '#10B981' }}>Active</span>
                  </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Revenue', value: `₹${selected.totalRevenue.toLocaleString('en-IN')}`, color: '#06B6D4' },
                    { label: 'Total Orders',  value: selected.totalOrders, color: '#8B5CF6' },
                    { label: 'Completed',     value: selected.completed,   color: '#10B981' },
                    { label: 'Cancelled',     value: selected.cancelled,   color: '#EF4444' },
                    { label: 'Pending',       value: selected.pending,     color: '#F59E0B' },
                    { label: 'Avg / Order',   value: `₹${selected.avgOrder.toLocaleString('en-IN')}`, color: '#EC4899' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-3.5 border" style={{ background: `${s.color}0F`, borderColor: `${s.color}25` }}>
                      <p className="text-xl font-black leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs" style={{ color: '#64748B' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* completion rate */}
                <div className="rounded-2xl p-4 border" style={{ background: '#ffffff05', borderColor: '#1E2A45' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Completion Rate</p>
                    <p className="text-white font-bold text-sm">
                      {selected.totalOrders > 0 ? Math.round((selected.completed / selected.totalOrders) * 100) : 0}%
                    </p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
                    <div className="h-full rounded-full" style={{
                      background: 'linear-gradient(90deg, #06B6D4, #0891B2)',
                      width: `${selected.totalOrders > 0 ? Math.round((selected.completed / selected.totalOrders) * 100) : 0}%`
                    }} />
                  </div>
                </div>

                <p className="text-xs rounded-xl px-4 py-3" style={{ background: '#1E2A45', color: '#64748B' }}>
                  Joined: {new Date(selected.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}