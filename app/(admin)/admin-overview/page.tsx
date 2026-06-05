'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Stats = { totalRevenue: number; totalOrders: number; totalWorkers: number; totalCustomers: number; pendingBookings: number; completedToday: number }
type WorkerStat = { id: string; name: string; phone: string; totalOrders: number; totalRevenue: number; completed: number }
type AreaStat = { area: string; totalOrders: number; totalRevenue: number }
type RecentBooking = { id: string; service_name: string; customer: string; worker: string; amount: number; status: string; scheduled_at: string; area: string }

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',     color: '#F59E0B' },
  accepted:     { label: 'Accepted',    color: '#3B82F6' },
  otp_verified: { label: 'Started',     color: '#8B5CF6' },
  in_progress:  { label: 'In Progress', color: '#06B6D4' },
  completed:    { label: 'Completed',   color: '#10B981' },
  cancelled:    { label: 'Cancelled',   color: '#EF4444' },
}

function StatCard({ icon, label, value, color, sub }: { icon: string; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden border transition-all hover:scale-[1.02]"
      style={{ background: `${color}0F`, borderColor: `${color}25` }}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10"
        style={{ background: color }} />
      <div className="relative z-10">
        <div className="text-2xl mb-2">{icon}</div>
        <p className="text-2xl font-black leading-none mb-1" style={{ color }}>{value}</p>
        <p className="text-xs font-semibold" style={{ color: '#64748B' }}>{label}</p>
        {sub && <p className="text-[10px] mt-1" style={{ color: `${color}80` }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [workers,   setWorkers]   = useState<WorkerStat[]>([])
  const [areas,     setAreas]     = useState<AreaStat[]>([])
  const [recent,    setRecent]    = useState<RecentBooking[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'workers' | 'areas'>('workers')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id,status,final_amount,scheduled_at,worker_id,services(name),addresses(area,city),customer:users!customer_id(full_name),worker:users!worker_id(full_name)')
        .order('created_at', { ascending: false })

      if (!bookings) { setLoading(false); return }

      const completed = bookings.filter(b => b.status === 'completed')
      const today     = new Date().toDateString()

      const { data: workerUsers }   = await supabase.from('users').select('id,full_name,phone').eq('role', 'worker')
      const { data: customerUsers } = await supabase.from('users').select('id').eq('role', 'customer')

      setStats({
        totalRevenue:    completed.reduce((s, b) => s + (b.final_amount ?? 0), 0),
        totalOrders:     bookings.length,
        totalWorkers:    workerUsers?.length ?? 0,
        totalCustomers:  customerUsers?.length ?? 0,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        completedToday:  completed.filter(b => new Date(b.scheduled_at).toDateString() === today).length,
      })

      // worker stats
      const wStats: WorkerStat[] = (workerUsers ?? []).map(w => {
        const wb   = bookings.filter(b => b.worker_id === w.id)
        const comp = wb.filter(b => b.status === 'completed')
        return {
          id: w.id, name: w.full_name ?? 'Unknown', phone: w.phone ?? '',
          totalOrders: wb.length, completed: comp.length,
          totalRevenue: comp.reduce((s, b) => s + (b.final_amount ?? 0), 0),
        }
      }).sort((a, b) => b.totalRevenue - a.totalRevenue)
      setWorkers(wStats)

      // area stats
      const aMap: Record<string, AreaStat> = {}
      completed.forEach(b => {
        const area = (b.addresses as any)?.area ?? 'Unknown'
        if (!aMap[area]) aMap[area] = { area, totalOrders: 0, totalRevenue: 0 }
        aMap[area].totalOrders++
        aMap[area].totalRevenue += b.final_amount ?? 0
      })
      setAreas(Object.values(aMap).sort((a, b) => b.totalRevenue - a.totalRevenue))

      setRecent(bookings.slice(0, 8).map(b => ({
        id: b.id, status: b.status, amount: b.final_amount ?? 0,
        scheduled_at: b.scheduled_at,
        service_name: (b.services as any)?.name ?? 'Service',
        customer:     (b.customer as any)?.full_name ?? 'Customer',
        worker:       (b.worker as any)?.full_name ?? 'Unassigned',
        area:         (b.addresses as any)?.area ?? '—',
      })))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#06B6D440', borderTopColor: '#06B6D4' }} />
        <p className="text-sm font-semibold" style={{ color: '#475569' }}>Loading dashboard...</p>
      </div>
    </div>
  )

  const totalWorkerRev = workers.reduce((s, w) => s + w.totalRevenue, 0)
  const totalAreaRev   = areas.reduce((s, a) => s + a.totalRevenue, 0)

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0A0F1E' }}>

      {/* header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#475569' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard icon="💰" label="Total Revenue"  value={`₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`} color="#06B6D4" sub="All time" />
        <StatCard icon="📋" label="Total Orders"   value={stats?.totalOrders ?? 0}     color="#8B5CF6" />
        <StatCard icon="👷" label="Workers"        value={stats?.totalWorkers ?? 0}    color="#F59E0B" />
        <StatCard icon="👥" label="Customers"      value={stats?.totalCustomers ?? 0}  color="#10B981" />
        <StatCard icon="⏳" label="Pending"         value={stats?.pendingBookings ?? 0} color="#EF4444" sub="Need action" />
        <StatCard icon="✅" label="Done Today"      value={stats?.completedToday ?? 0} color="#06B6D4" sub="Completed" />
      </div>

      {/* worker / area tabs */}
      <div className="rounded-3xl border mb-6 overflow-hidden" style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
        <div className="flex p-3 gap-2 border-b" style={{ borderColor: '#1E2A45' }}>
          {(['workers', 'areas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab === t ? '#06B6D4' : 'transparent',
                color:      tab === t ? '#fff' : '#475569',
                boxShadow:  tab === t ? '0 4px 12px rgba(6,182,212,0.4)' : 'none',
              }}>
              {t === 'workers' ? '👷 Workers' : '📍 Areas'}
            </button>
          ))}
        </div>

        {/* WORKER TABLE */}
        {tab === 'workers' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2A45' }}>
                  {['Worker', 'Orders', 'Revenue', 'Avg/Order', 'Share'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider" style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: '#475569' }}>No worker data yet</td></tr>
                ) : workers.map((w, i) => {
                  const share = totalWorkerRev > 0 ? Math.round((w.totalRevenue / totalWorkerRev) * 100) : 0
                  return (
                    <tr key={w.id} className="transition-all hover:bg-white/5" style={{ borderBottom: '1px solid #1E2A4530' }}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                            style={{ background: `hsl(${i * 47}, 70%, 50%)` }}>
                            {w.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">{w.name}</p>
                            <p className="text-[10px]" style={{ color: '#475569' }}>#{i + 1}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-white font-bold text-sm">{w.totalOrders}</td>
                      <td className="px-4 py-3.5 font-black text-sm" style={{ color: '#06B6D4' }}>
                        ₹{w.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>
                        ₹{w.completed > 0 ? Math.round(w.totalRevenue / w.completed).toLocaleString('en-IN') : 0}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
                            <div className="h-full rounded-full" style={{ width: `${share}%`, background: '#06B6D4' }} />
                          </div>
                          <span className="text-xs font-bold text-white">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* AREA TABLE */}
        {tab === 'areas' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2A45' }}>
                  {['Area', 'Orders', 'Revenue', 'Avg/Order', 'Share'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider" style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: '#475569' }}>No area data yet</td></tr>
                ) : areas.map((a, i) => {
                  const share = totalAreaRev > 0 ? Math.round((a.totalRevenue / totalAreaRev) * 100) : 0
                  const colors = ['#06B6D4','#8B5CF6','#F59E0B','#10B981','#EC4899','#EF4444']
                  const c = colors[i % colors.length]
                  return (
                    <tr key={a.area} className="transition-all hover:bg-white/5" style={{ borderBottom: '1px solid #1E2A4530' }}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                            style={{ background: `${c}20` }}>📍</div>
                          <p className="text-white text-sm font-semibold">{a.area}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-white font-bold text-sm">{a.totalOrders}</td>
                      <td className="px-4 py-3.5 font-black text-sm" style={{ color: c }}>
                        ₹{a.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>
                        ₹{a.totalOrders > 0 ? Math.round(a.totalRevenue / a.totalOrders).toLocaleString('en-IN') : 0}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
                            <div className="h-full rounded-full" style={{ width: `${share}%`, background: c }} />
                          </div>
                          <span className="text-xs font-bold text-white">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* recent bookings */}
      <div className="rounded-3xl border overflow-hidden" style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1E2A45' }}>
          <h2 className="text-white font-extrabold">Recent Bookings</h2>
          <a href="/admin-bookings" className="text-xs font-bold transition-colors" style={{ color: '#06B6D4' }}>View all →</a>
        </div>
        <div className="divide-y" style={{ borderColor: '#1E2A4530' }}>
          {recent.map(b => {
            const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.pending
            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: `${cfg.color}18` }}>🧹</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{b.service_name}</p>
                  <p className="text-[10px] truncate" style={{ color: '#475569' }}>
                    {b.customer} · {b.area}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm" style={{ color: '#06B6D4' }}>
                    ₹{b.amount.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${cfg.color}18`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            )
          })}
          {recent.length === 0 && (
            <div className="px-4 py-10 text-center text-sm" style={{ color: '#475569' }}>No bookings yet</div>
          )}
        </div>
      </div>
    </div>
  )
}