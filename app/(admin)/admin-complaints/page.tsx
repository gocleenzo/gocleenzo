'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Complaint = { id: string; booking_id: string; type: string; description: string; status: string; created_at: string; customer: string; service: string }

const STATUS_CFG = {
  open:        { color: '#EF4444', label: 'Open'        },
  in_progress: { color: '#F59E0B', label: 'In Progress' },
  resolved:    { color: '#10B981', label: 'Resolved'    },
  closed:      { color: '#475569', label: 'Closed'      },
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('complaints')
        .select('id,type,description,status,created_at,booking_id,bookings(services(name),customer:users!customer_id(full_name))')
        .order('created_at', { ascending: false })

      if (data) setComplaints(data.map(c => ({
        id: c.id, booking_id: c.booking_id, type: c.type,
        description: c.description, status: c.status, created_at: c.created_at,
        customer: (c.bookings as any)?.customer?.full_name ?? 'Customer',
        service:  (c.bookings as any)?.services?.name ?? 'Service',
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: string) {
    await supabase.from('complaints').update({ status }).eq('id', id)
    setComplaints(c => c.map(x => x.id === id ? { ...x, status } : x))
  }

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#EF444440', borderTopColor: '#EF4444' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0A0F1E' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Complaints</h1>
        <p className="text-sm mt-1" style={{ color: '#475569' }}>{complaints.length} total</p>
      </div>

      {/* filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {[{ k: 'all', label: 'All', color: '#64748B' }, ...Object.entries(STATUS_CFG).map(([k,v]) => ({ k, label: v.label, color: v.color }))].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: filter === f.k ? `${f.color}25` : `${f.color}10`,
              color:      f.color,
              border:     `1px solid ${filter === f.k ? f.color + '50' : f.color + '20'}`,
            }}>
            {f.label} ({f.k === 'all' ? complaints.length : complaints.filter(c => c.status === f.k).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: '#0D1426' }}>
            <div className="text-5xl mb-3">✅</div>
            <p className="font-semibold text-sm" style={{ color: '#475569' }}>No complaints here</p>
          </div>
        ) : filtered.map(c => {
          const cfg = (STATUS_CFG as any)[c.status] ?? STATUS_CFG.open
          return (
            <div key={c.id} className="rounded-2xl p-4 border transition-all"
              style={{ background: '#0D1426', borderColor: `${cfg.color}25` }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${cfg.color}20`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-xs capitalize" style={{ color: '#64748B' }}>{c.type?.replace('_',' ')}</span>
                  </div>
                  <p className="text-white font-semibold text-sm">{c.service}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>by {c.customer}</p>
                </div>
                <p className="text-[10px] flex-shrink-0" style={{ color: '#475569' }}>
                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#94A3B8' }}>{c.description}</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { s: 'in_progress', label: '🔄 Working', color: '#F59E0B' },
                  { s: 'resolved',    label: '✅ Resolved', color: '#10B981' },
                  { s: 'closed',      label: '🔒 Close',    color: '#475569' },
                ].map(a => (
                  <button key={a.s} onClick={() => updateStatus(c.id, a.s)}
                    disabled={c.status === a.s}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                    style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30` }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}