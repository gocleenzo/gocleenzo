'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Job = { id: string; status: string; final_amount: number; scheduled_at: string; service_name: string; customer: string; area: string }

const S: Record<string, {l:string;c:string;bg:string}> = {
  completed:  {l:'Completed', c:'#10B981', bg:'#ECFDF5'},
  cancelled:  {l:'Cancelled', c:'#EF4444', bg:'#FEF2F2'},
  in_progress:{l:'In Progress',c:'#F59E0B',bg:'#FFFBEB'},
  accepted:   {l:'Accepted',  c:'#06B6D4', bg:'#ECFEFF'},
}

export default function WorkerHistory() {
  const [jobs,    setJobs]    = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('bookings')
        .select('id,status,final_amount,scheduled_at,services(name),addresses(area,city),customer:users!customer_id(full_name)')
        .eq('worker_id', user.id)
        .order('scheduled_at', { ascending: false })
      if (data) setJobs(data.map(b => ({
        id: b.id, status: b.status, final_amount: b.final_amount ?? 0, scheduled_at: b.scheduled_at,
        service_name: (b.services as any)?.name ?? 'Service',
        customer:     (b.customer as any)?.full_name ?? 'Customer',
        area:         (b.addresses as any)?.area ?? '—',
      })))
      setLoading(false)
    }
    load()
  }, [])

  const shown   = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)
  const earned  = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + j.final_amount, 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FDFE' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#A5F3FC', borderTopColor: '#06B6D4' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F0FDFE' }}>
      <div style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', paddingTop: '52px' }}>
        <div className="px-5 pb-0">
          <h1 className="text-white font-black text-2xl mb-4">Job History</h1>
          <div className="grid grid-cols-3 gap-3 mb-0 pb-6">
            {[
              {l:'Total Jobs', v:jobs.length},
              {l:'Completed',  v:jobs.filter(j=>j.status==='completed').length},
              {l:'Earned',     v:`₹${earned.toLocaleString('en-IN')}`},
            ].map(s=>(
              <div key={s.l} className="rounded-2xl p-3 text-center"
                style={{ background:'rgba(255,255,255,0.18)' }}>
                <p className="text-white font-black text-lg leading-none">{s.v}</p>
                <p className="text-cyan-100 text-[10px] mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 390 32" fill="none" preserveAspectRatio="none" style={{ display:'block', width:'100%', height:'32px' }}>
          <path d="M0 32C65 10 130 0 195 0C260 0 325 10 390 32H0Z" fill="#F0FDFE"/>
        </svg>
      </div>

      <div className="px-4 -mt-1 pb-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {['all','completed','cancelled','accepted'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className="px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap flex-shrink-0 transition-all"
              style={{ background: filter===f?'#06B6D4':'#fff', color: filter===f?'#fff':'#64748B', border:`1px solid ${filter===f?'#06B6D4':'#E0F2FE'}` }}>
              {f==='all'?'All Jobs':f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {shown.length === 0 ? (
            <div className="rounded-3xl p-10 text-center" style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 font-bold">No jobs found</p>
            </div>
          ) : shown.map(job => {
            const cfg = S[job.status] ?? S.completed
            return (
              <button key={job.id} onClick={() => router.push(`/jobs/${job.id}`)}
                className="w-full text-left rounded-3xl p-4 active:scale-[0.98] transition-all"
                style={{ background:'#fff', border:'1px solid #E0F2FE', boxShadow:'0 2px 8px rgba(6,182,212,0.06)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-900 font-bold text-sm">{job.service_name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{job.customer} · {job.area}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base" style={{ color:'#06B6D4' }}>₹{job.final_amount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:cfg.bg, color:cfg.c }}>{cfg.l}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">
                  📅 {new Date(job.scheduled_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}