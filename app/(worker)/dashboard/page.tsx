'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Job = {
  id: string
  status: string
  final_amount: number
  scheduled_at: string
  service_names: string[]
  customer_name: string
  customer_phone: string
  area: string
  city: string
  total_services: number
  total_duration: number
}

export default function WorkerDashboard() {
  const router   = useRouter()
  const supabase = createClient()

  const [workerId,   setWorkerId]   = useState('')
  const [workerName, setWorkerName] = useState('Worker')
  const [available,  setAvailable]  = useState(true)
  const [newJobs,    setNewJobs]    = useState<Job[]>([])
  const [activeJob,  setActiveJob]  = useState<Job | null>(null)
  const [stats,      setStats]      = useState({ earned: 0, completed: 0 })
  const [loading,    setLoading]    = useState(true)
  const [actionId,   setActionId]   = useState('')

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
    link.rel  = 'stylesheet'
    document.head.appendChild(link)
    loadAll()
    const ch = supabase.channel('wdash-final')
      .on('postgres_changes', { event:'*', schema:'public', table:'bookings' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('users').select('full_name').eq('id', user.id).single()
    setWorkerName(u?.full_name ?? 'Worker')
    setWorkerId(user.id)
    const { data: wData } = await supabase.from('workers').select('is_available').eq('user_id', user.id).single()
    setAvailable(wData?.is_available ?? true)
    const { data: all } = await supabase
      .from('bookings')
      .select(`id,status,final_amount,scheduled_at,worker_id,service_names,total_services,services(name,duration_minutes),addresses(area,city),customer:users!customer_id(full_name,phone)`)
      .order('created_at', { ascending: false })
    if (!all) { setLoading(false); return }
    function mapJob(b: any): Job {
      const names = b.service_names?.length ? b.service_names : [(b.services as any)?.name ?? 'Service']
      return {
        id: b.id, status: b.status, final_amount: b.final_amount ?? 0, scheduled_at: b.scheduled_at,
        service_names: names,
        customer_name: (b.customer as any)?.full_name ?? 'Customer',
        customer_phone: (b.customer as any)?.phone ?? '—',
        area: (b.addresses as any)?.area ?? '—', city: (b.addresses as any)?.city ?? 'Mumbai',
        total_services: b.total_services ?? 1,
        total_duration: ((b.services as any)?.duration_minutes ?? 60) * (b.total_services ?? 1),
      }
    }
    setNewJobs(all.filter(b => b.status === 'pending').map(mapJob))
    const myActive = all.find(b => b.worker_id === user.id && ['accepted','otp_verified','in_progress'].includes(b.status))
    setActiveJob(myActive ? mapJob(myActive) : null)
    const myDone = all.filter(b => b.worker_id === user.id && b.status === 'completed')
    setStats({ earned: myDone.reduce((s,b) => s+(b.final_amount??0),0), completed: myDone.length })
    setLoading(false)
  }

  async function acceptJob(jobId: string) {
    setActionId(jobId)
    const { error } = await supabase.from('bookings').update({ worker_id: workerId, status: 'accepted' }).eq('id', jobId).eq('status', 'pending')
    setActionId('')
    if (!error) router.push(`/jobs/${jobId}`)
    else alert('Job already taken')
  }
  function skipJob(id: string) { setNewJobs(prev => prev.filter(j => j.id !== id)) }
  async function toggleAvailable() {
    const next = !available; setAvailable(next)
    await supabase.from('workers').update({ is_available: next }).eq('user_id', workerId)
  }

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    @keyframes floatUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin      { to{transform:rotate(360deg)} }
    @keyframes ripple    { 0%{transform:scale(.8);opacity:1} 100%{transform:scale(2.2);opacity:0} }
    @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.6} }
    @keyframes sweep     { 0%{background-position:200% center} 100%{background-position:-200% center} }

    .u0{animation:floatUp .42s cubic-bezier(.22,1,.36,1) both}
    .u1{animation:floatUp .42s .07s cubic-bezier(.22,1,.36,1) both}
    .u2{animation:floatUp .42s .14s cubic-bezier(.22,1,.36,1) both}
    .u3{animation:floatUp .42s .21s cubic-bezier(.22,1,.36,1) both}
    .u4{animation:floatUp .42s .28s cubic-bezier(.22,1,.36,1) both}
    .u5{animation:floatUp .42s .34s cubic-bezier(.22,1,.36,1) both}

    .card { transition: transform .16s ease, box-shadow .16s ease; }
    .card:active { transform: scale(0.974); }

    .btn-skip  { transition: background .15s ease, color .15s ease; }
    .btn-skip:active  { background: #F0FDFE !important; }
    .btn-accept { transition: background .15s ease, color .15s ease; }
    .btn-accept:active { background: #CFFAFE !important; }

    .sweep-text {
      background: linear-gradient(90deg, #0E7490, #06B6D4, #22D3EE, #06B6D4, #0E7490);
      background-size: 300% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: sweep 4s linear infinite;
    }

    .online-ring::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: #22D3EE;
      animation: ripple 2s ease-out infinite;
    }
  `

  const FONT = `'Plus Jakarta Sans', sans-serif`
  const MONO = `'JetBrains Mono', monospace`

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#F0FDFE', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:FONT }}>
      <style>{css}</style>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #CFFAFE', borderTopColor:'#0891B2', animation:'spin .75s linear infinite' }}/>
      <p style={{ color:'#0891B2', fontSize:12, fontFamily:MONO, letterSpacing:'.12em' }}>LOADING</p>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#F0FDFE', fontFamily:FONT, color:'#0C1A2E' }}>
      <style>{css}</style>

      {/* ═══ HERO ════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', overflow:'hidden', paddingTop:52 }}>

        {/* layered cyan gradient bg */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg, #0E7490 0%, #0891B2 40%, #06B6D4 75%, #22D3EE 100%)' }}/>

        {/* big decorative circles */}
        <div style={{ position:'absolute', top:-80, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:-20, right:30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:20, left:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }}/>

        {/* dot grid overlay */}
        <div style={{
          position:'absolute', inset:0, opacity:.12, pointerEvents:'none',
          backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize:'24px 24px'
        }}/>

        <div style={{ position:'relative', padding:'0 20px' }}>

          {/* greeting row */}
          <div className="u0" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
            <div>
              <p style={{ fontFamily:MONO, fontSize:10, color:'rgba(255,255,255,0.65)', letterSpacing:'.16em', marginBottom:5 }}>
                GOOD {greet.toUpperCase()} 👋
              </p>
              <h1 style={{ fontSize:34, fontWeight:800, margin:0, letterSpacing:'-.03em', lineHeight:1, color:'#fff' }}>
                {workerName.split(' ')[0]}
              </h1>
            </div>

            {/* availability toggle */}
            <button onClick={toggleAvailable} className="card"
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 15px',
                borderRadius:100, cursor:'pointer',
                background: available ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                backdropFilter:'blur(8px)',
                color:'#fff',
                fontFamily:MONO, fontSize:10, letterSpacing:'.1em',
              }}>
              <span style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                {available && <span className="online-ring" style={{ position:'absolute', width:8, height:8, borderRadius:'50%' }}/>}
                <span style={{
                  width:8, height:8, borderRadius:'50%', display:'inline-block', position:'relative', zIndex:1,
                  background: available ? '#4ADE80' : 'rgba(255,255,255,0.4)',
                  animation: available ? 'pulse-dot 2s ease infinite' : 'none',
                }}/>
              </span>
              {available ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>

          {/* stat cards */}
          <div className="u1" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:28 }}>
            {[
              { label:'EARNED',   val:`₹${stats.earned.toLocaleString('en-IN')}` },
              { label:'DONE',     val:String(stats.completed) },
              { label:'WAITING',  val:String(newJobs.length) },
            ].map(s => (
              <div key={s.label} style={{
                background:'rgba(255,255,255,0.18)',
                border:'1.5px solid rgba(255,255,255,0.3)',
                borderRadius:16, padding:'13px 10px', textAlign:'center',
                backdropFilter:'blur(12px)',
              }}>
                <p style={{ fontFamily:MONO, fontSize:8, color:'rgba(255,255,255,0.6)', margin:'0 0 6px', letterSpacing:'.14em' }}>{s.label}</p>
                <p style={{ fontSize:18, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-.02em' }}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* wave cutout */}
        <svg viewBox="0 0 390 48" preserveAspectRatio="none" style={{ display:'block', width:'100%', height:48, position:'relative' }}>
          <path d="M0 48 C80 10 160 0 195 0 C230 0 310 10 390 48 Z" fill="#F0FDFE"/>
          <path d="M0 48 L0 48 C80 20 160 8 195 8 C230 8 310 20 390 48 Z" fill="rgba(255,255,255,0.15)"/>
        </svg>
      </div>

      {/* ═══ CONTENT ═════════════════════════════════════════════════ */}
      <div style={{ padding:'4px 16px 40px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* ── ACTIVE JOB ──────────────────────────────────────────── */}
        {activeJob && (() => {
          const smap: Record<string,{label:string;dot:string;bg:string;border:string;color:string}> = {
            accepted:     { label:'Accepted',     dot:'#22D3EE', bg:'#ECFEFF', border:'#A5F3FC', color:'#0E7490' },
            otp_verified: { label:'OTP Verified', dot:'#818CF8', bg:'#EEF2FF', border:'#C7D2FE', color:'#4338CA' },
            in_progress:  { label:'In Progress',  dot:'#34D399', bg:'#ECFDF5', border:'#A7F3D0', color:'#065F46' },
          }
          const s = smap[activeJob.status] ?? smap.accepted
          return (
            <div className="u2">
              <SectionHead label="Active Job" dotColor="#22D3EE" pulse mono={MONO}/>
              <button onClick={() => router.push(`/jobs/${activeJob.id}`)} className="card"
                style={{
                  width:'100%', textAlign:'left', cursor:'pointer', display:'block',
                  background:'#fff',
                  border:'1.5px solid #A5F3FC',
                  borderRadius:22,
                  boxShadow:'0 4px 24px rgba(6,182,212,0.14), 0 1px 4px rgba(6,182,212,0.08)',
                  overflow:'hidden',
                }}>

                {/* cyan top stripe */}
                <div style={{ height:4, background:'linear-gradient(90deg, #0E7490, #06B6D4, #22D3EE)' }}/>

                <div style={{ padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <span style={{
                      fontSize:10, fontFamily:MONO, fontWeight:500,
                      color:s.color, background:s.bg,
                      border:`1px solid ${s.border}`,
                      padding:'4px 10px', borderRadius:100, letterSpacing:'.08em',
                      display:'flex', alignItems:'center', gap:5
                    }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, display:'inline-block', animation:'pulse-dot 2s ease infinite' }}/>
                      {s.label.toUpperCase()}
                    </span>
                    <p style={{ fontSize:26, fontWeight:800, color:'#0891B2', margin:0, letterSpacing:'-.03em' }}>
                      ₹{activeJob.final_amount.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div style={{ marginBottom:14 }}>
                    {activeJob.service_names.map((n,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:i<activeJob.service_names.length-1?7:0 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#06B6D4', flexShrink:0 }}/>
                        <p style={{ fontSize:15, fontWeight:600, color:'#164E63', margin:0 }}>{n}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid #CFFAFE' }}>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:'#0891B2', margin:0 }}>{activeJob.customer_name}</p>
                      <p style={{ fontFamily:MONO, fontSize:10, color:'#67B5C4', margin:'3px 0 0' }}>{activeJob.area}, {activeJob.city}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:MONO, fontSize:10, color:'#67B5C4', margin:0 }}>~{activeJob.total_duration} min</p>
                      <p style={{ fontSize:12, fontWeight:700, color:'#0891B2', margin:'4px 0 0' }}>Continue →</p>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )
        })()}

        {/* ── NEW REQUESTS ─────────────────────────────────────────── */}
        <div className="u3">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <SectionHead label="New Requests" dotColor="#06B6D4" mono={MONO}/>
            <span style={{
              fontFamily:MONO, fontSize:9, letterSpacing:'.1em',
              color: newJobs.length > 0 ? '#0E7490' : '#94A3B8',
              background: newJobs.length > 0 ? '#ECFEFF' : '#F8FAFC',
              border: `1px solid ${newJobs.length>0?'#A5F3FC':'#E2E8F0'}`,
              padding:'4px 10px', borderRadius:100
            }}>
              {newJobs.length} PENDING
            </span>
          </div>

          {!available ? (
            <div style={{ background:'#fff', border:'1.5px solid #CFFAFE', borderRadius:22, padding:'36px 24px', textAlign:'center', boxShadow:'0 2px 16px rgba(6,182,212,0.08)' }}>
              <div style={{ width:56, height:56, borderRadius:18, background:'#ECFEFF', border:'1.5px solid #A5F3FC', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px' }}>😴</div>
              <p style={{ fontSize:17, fontWeight:700, color:'#164E63', margin:'0 0 5px' }}>You're Offline</p>
              <p style={{ fontFamily:MONO, fontSize:10, color:'#94A3B8', margin:'0 0 20px', letterSpacing:'.06em' }}>GO ONLINE TO RECEIVE JOBS</p>
              <button onClick={toggleAvailable} className="card"
                style={{ padding:'12px 28px', borderRadius:100, cursor:'pointer', background:'linear-gradient(135deg,#0891B2,#06B6D4)', border:'none', color:'#fff', fontFamily:MONO, fontSize:11, letterSpacing:'.08em', boxShadow:'0 4px 16px rgba(6,182,212,0.35)' }}>
                GO ONLINE
              </button>
            </div>
          ) : newJobs.length === 0 ? (
            <div style={{ background:'#fff', border:'1.5px solid #E0F2FE', borderRadius:22, padding:'38px 24px', textAlign:'center', boxShadow:'0 2px 12px rgba(6,182,212,0.06)' }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'#F0FDFE', border:'1.5px solid #BAE6FD', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 14px' }}>🔍</div>
              <p style={{ fontSize:15, fontWeight:700, color:'#164E63', margin:'0 0 5px' }}>No jobs right now</p>
              <p style={{ fontFamily:MONO, fontSize:10, color:'#94A3B8', letterSpacing:'.07em' }}>REQUESTS APPEAR AUTOMATICALLY</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {newJobs.map((job, idx) => (
                <div key={job.id} className={`card u${Math.min(idx+3,5)}`}
                  style={{
                    background:'#fff',
                    border:'1.5px solid #E0F7FA',
                    borderRadius:22, overflow:'hidden',
                    boxShadow:'0 2px 16px rgba(6,182,212,0.09)',
                    position:'relative',
                  }}>

                  {/* left accent */}
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'linear-gradient(180deg,#06B6D4,#0891B2)' }}/>

                  <div style={{ padding:'15px 15px 13px 22px' }}>

                    {/* services */}
                    <div style={{ marginBottom:12 }}>
                      {job.service_names.map((name, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<job.service_names.length-1?8:0 }}>
                          <div style={{
                            width:32, height:32, borderRadius:10, flexShrink:0,
                            background:'#ECFEFF', border:'1.5px solid #A5F3FC',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:15
                          }}>🧹</div>
                          <p style={{ fontSize:14, fontWeight:700, color:'#164E63', margin:0, flex:1 }}>{name}</p>
                          {job.total_services > 1 && i === 0 && (
                            <span style={{ fontFamily:MONO, fontSize:9, color:'#0E7490', background:'#ECFEFF', border:'1px solid #A5F3FC', padding:'3px 8px', borderRadius:100, letterSpacing:'.06em' }}>
                              {job.total_services}×
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* customer info */}
                    <div style={{ background:'#F0FDFE', border:'1px solid #CFFAFE', borderRadius:12, padding:'10px 12px', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'#0E7490', margin:0 }}>{job.customer_name}</p>
                        {job.customer_phone !== '—' && (
                          <a href={`tel:${job.customer_phone}`} style={{ fontFamily:MONO, fontSize:10, color:'#06B6D4', textDecoration:'none', fontWeight:500 }}>
                            {job.customer_phone}
                          </a>
                        )}
                      </div>
                      <p style={{ fontFamily:MONO, fontSize:10, color:'#67B5C4', margin:'4px 0 0' }}>{job.area}, {job.city}</p>
                      <p style={{ fontFamily:MONO, fontSize:10, color:'#67B5C4', margin:'2px 0 0' }}>
                        {new Date(job.scheduled_at).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>

                    {/* amount row */}
                    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                      <p style={{ fontFamily:MONO, fontSize:10, color:'#94A3B8', margin:0 }}>~{job.total_duration} min</p>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontFamily:MONO, fontSize:9, color:'#67B5C4', margin:'0 0 2px', letterSpacing:'.08em' }}>EARNINGS</p>
                        <p className="sweep-text" style={{ fontSize:28, fontWeight:800, margin:0, letterSpacing:'-.03em', lineHeight:1 }}>
                          ₹{job.final_amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* actions */}
                  <div style={{ display:'flex', borderTop:'1.5px solid #F0FDFE' }}>
                    <button className="btn-skip" onClick={() => skipJob(job.id)}
                      style={{ flex:1, padding:'14px 0', background:'transparent', border:'none', cursor:'pointer', fontFamily:MONO, fontSize:11, color:'#94A3B8', letterSpacing:'.08em', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      SKIP
                    </button>
                    <div style={{ width:1.5, background:'#F0FDFE' }}/>
                    <button className="btn-accept" onClick={() => acceptJob(job.id)}
                      disabled={!!actionId || !!activeJob}
                      style={{ flex:1, padding:'14px 0', background:'transparent', border:'none', cursor:'pointer', fontFamily:MONO, fontSize:11, color:(!!actionId||!!activeJob)?'#94A3B8':'#0891B2', letterSpacing:'.08em', fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:5, opacity:(!!actionId||!!activeJob)?.35:1 }}>
                      {actionId === job.id
                        ? <span style={{ display:'inline-block', animation:'spin .7s linear infinite', fontSize:14 }}>◌</span>
                        : 'ACCEPT JOB'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ label, dotColor, pulse, mono }: { label:string; dotColor:string; pulse?:boolean; mono:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
      <span style={{
        width:7, height:7, borderRadius:'50%', background:dotColor,
        display:'inline-block',
        animation: pulse ? 'pulse-dot 2s ease infinite' : 'none'
      }}/>
      <p style={{ fontFamily:mono, fontSize:10, fontWeight:500, color:'#67B5C4', margin:0, letterSpacing:'.14em' }}>
        {label.toUpperCase()}
      </p>
    </div>
  )
} 