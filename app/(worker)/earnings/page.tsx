'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Entry = { id:string; final_amount:number; scheduled_at:string; service_name:string }

export default function WorkerEarnings() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState<'week'|'month'|'all'>('month')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('bookings').select('id,final_amount,scheduled_at,services(name)')
        .eq('worker_id', user.id).eq('status','completed').order('scheduled_at',{ascending:false})
      if (data) setEntries(data.map(b=>({
        id:b.id, final_amount:b.final_amount??0, scheduled_at:b.scheduled_at,
        service_name:(b.services as any)?.name??'Service'
      })))
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const filtered = entries.filter(e => {
    const d = new Date(e.scheduled_at)
    if (period==='week') { const w=new Date(now); w.setDate(now.getDate()-7); return d>=w }
    if (period==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    return true
  })

  const total    = filtered.reduce((s,e)=>s+e.final_amount,0)
  const avg      = filtered.length>0?Math.round(total/filtered.length):0
  const todayEarned = entries.filter(e=>new Date(e.scheduled_at).toDateString()===now.toDateString()).reduce((s,e)=>s+e.final_amount,0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#F0FDFE' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor:'#A5F3FC', borderTopColor:'#06B6D4' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#F0FDFE' }}>
      <div style={{ background:'linear-gradient(135deg,#06B6D4,#0891B2)', paddingTop:'52px' }}>
        <div className="px-5 pb-0">
          <h1 className="text-white font-black text-2xl mb-1">My Earnings</h1>
          <p className="text-cyan-100 text-sm mb-4">Track your income</p>

          <div className="rounded-3xl p-5 mb-4"
            style={{ background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)' }}>
            <p className="text-cyan-100 text-xs font-semibold mb-1">
              {period==='week'?'This Week':period==='month'?'This Month':'All Time'}
            </p>
            <p className="text-white text-4xl font-black leading-none">₹{total.toLocaleString('en-IN')}</p>
            <p className="text-cyan-100 text-xs mt-2">{filtered.length} jobs completed</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-6">
            {[{l:'Today',v:`₹${todayEarned.toLocaleString('en-IN')}`},{l:'Avg/Job',v:`₹${avg.toLocaleString('en-IN')}`}].map(s=>(
              <div key={s.l} className="rounded-2xl p-3" style={{ background:'rgba(255,255,255,0.18)' }}>
                <p className="text-white font-black text-lg leading-none">{s.v}</p>
                <p className="text-cyan-100 text-[10px] mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 390 32" fill="none" preserveAspectRatio="none" style={{ display:'block',width:'100%',height:'32px' }}>
          <path d="M0 32C65 10 130 0 195 0C260 0 325 10 390 32H0Z" fill="#F0FDFE"/>
        </svg>
      </div>

      <div className="px-4 -mt-1 pb-4">
        <div className="flex gap-2 mb-4">
          {(['week','month','all'] as const).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background:period===p?'#06B6D4':'#fff', color:period===p?'#fff':'#64748B', border:`1px solid ${period===p?'#06B6D4':'#E0F2FE'}` }}>
              {p==='all'?'All Time':`This ${p.charAt(0).toUpperCase()+p.slice(1)}`}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {filtered.length===0?(
            <div className="rounded-3xl p-10 text-center" style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
              <div className="text-4xl mb-2">💰</div>
              <p className="text-gray-600 font-bold">No earnings in this period</p>
            </div>
          ):filtered.map(e=>(
            <div key={e.id} className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
              style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
              <div>
                <p className="text-gray-900 font-bold text-sm">{e.service_name}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {new Date(e.scheduled_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
              <p className="font-black text-base" style={{ color:'#10B981' }}>
                +₹{e.final_amount.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}