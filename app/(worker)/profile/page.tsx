'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type P = { id:string; name:string; phone:string; is_available:boolean; total_jobs:number; total_earned:number; rating:number; joined:string }

export default function WorkerProfile() {
  const [profile,  setProfile]  = useState<P|null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(()=>{ load() },[])

  async function load() {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data:u } = await supabase.from('users').select('*').eq('id',user.id).single()
    const { data:w } = await supabase.from('workers').select('*').eq('user_id',user.id).single()
    const { data:done } = await supabase.from('bookings').select('final_amount').eq('worker_id',user.id).eq('status','completed')
    setProfile({
      id: user.id, name: u?.full_name??'Worker', phone: u?.phone??'',
      is_available: w?.is_available??true,
      total_jobs:   done?.length??0,
      total_earned: (done??[]).reduce((s:number,b:any)=>s+(b.final_amount??0),0),
      rating:       w?.rating_avg??4.8,
      joined:       u?.created_at??'',
    })
    setName(u?.full_name??'')
    setLoading(false)
  }

  async function save() {
    if (!profile||!name.trim()) return
    setSaving(true)
    await supabase.from('users').update({full_name:name.trim()}).eq('id',profile.id)
    setProfile(p=>p?{...p,name:name.trim()}:p)
    setSaving(false); setEditing(false)
  }

  async function toggleAvail() {
    if (!profile) return
    const next=!profile.is_available
    setProfile(p=>p?{...p,is_available:next}:p)
    await supabase.from('workers').update({is_available:next}).eq('user_id',profile.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading||!profile) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#F0FDFE' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor:'#A5F3FC', borderTopColor:'#06B6D4' }} />
    </div>
  )

  return (
    <div className="min-h-screen pb-24" style={{ background:'#F0FDFE' }}>
      <div style={{ background:'linear-gradient(135deg,#06B6D4,#0891B2)', paddingTop:'52px' }}>
        <div className="px-5 pb-0 text-center">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-3 flex items-center justify-center text-white font-black text-3xl shadow-xl"
            style={{ background:'rgba(255,255,255,0.25)', backdropFilter:'blur(8px)', border:'2px solid rgba(255,255,255,0.4)' }}>
            {profile.name[0]?.toUpperCase()}
          </div>
          <h1 className="text-white font-black text-xl">{profile.name}</h1>
          <p className="text-cyan-100 text-sm mt-0.5">{profile.phone}</p>
          <div className="flex items-center justify-center gap-2 mt-2 mb-0 pb-5">
            <span className="text-yellow-300">★</span>
            <span className="text-white font-bold text-sm">{profile.rating.toFixed(1)}</span>
            <span className="text-cyan-200 text-xs">worker rating</span>
          </div>
        </div>
        <svg viewBox="0 0 390 32" fill="none" preserveAspectRatio="none" style={{ display:'block',width:'100%',height:'32px' }}>
          <path d="M0 32C65 10 130 0 195 0C260 0 325 10 390 32H0Z" fill="#F0FDFE"/>
        </svg>
      </div>

      <div className="px-4 -mt-1 space-y-4">

        {/* stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {l:'Jobs Done', v:profile.total_jobs,                                          c:'#06B6D4'},
            {l:'Earned',    v:`₹${profile.total_earned.toLocaleString('en-IN')}`,           c:'#10B981'},
            {l:'Rating',    v:`${profile.rating.toFixed(1)}★`,                             c:'#F59E0B'},
          ].map(s=>(
            <div key={s.l} className="rounded-2xl p-3.5 text-center"
              style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
              <p className="font-black text-lg leading-none" style={{ color:s.c }}>{s.v}</p>
              <p className="text-gray-400 text-[10px] mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* availability */}
        <div className="rounded-3xl p-4 flex items-center justify-between"
          style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
          <div>
            <p className="text-gray-900 font-bold text-sm">Availability</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {profile.is_available?'Visible to customers for new jobs':'Hidden from new job requests'}
            </p>
          </div>
          <button onClick={toggleAvail}
            className="relative w-13 w-12 h-6 rounded-full transition-all flex-shrink-0"
            style={{ background:profile.is_available?'#06B6D4':'#CBD5E1', width:'48px' }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
              style={{ left:profile.is_available?'26px':'2px' }} />
          </button>
        </div>

        {/* profile info */}
        <div className="rounded-3xl p-5" style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-700">Profile Info</h3>
            <button onClick={()=>setEditing(v=>!v)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ background:editing?'#FEF2F2':'#F0FDFE', color:editing?'#EF4444':'#06B6D4' }}>
              {editing?'Cancel':'Edit'}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Full Name</label>
              {editing?(
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-gray-900 font-bold outline-none border-2 transition-all"
                  style={{ background:'#F0FDFE', borderColor:'#A5F3FC' }} />
              ):(
                <p className="text-gray-900 font-semibold text-sm">{profile.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Phone</label>
              <p className="text-gray-900 font-semibold text-sm">{profile.phone}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Member Since</label>
              <p className="text-gray-900 font-semibold text-sm">
                {profile.joined?new Date(profile.joined).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'—'}
              </p>
            </div>
          </div>
          {editing&&(
            <button onClick={save} disabled={saving}
              className="w-full mt-4 h-12 rounded-2xl text-white font-black text-sm disabled:opacity-60 active:scale-95 transition-transform"
              style={{ background:'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow:'0 4px 16px rgba(6,182,212,0.35)' }}>
              {saving?'Saving...':'Save Changes'}
            </button>
          )}
        </div>

        {/* links */}
        <div className="rounded-3xl overflow-hidden" style={{ background:'#fff', border:'1px solid #E0F2FE' }}>
          {[
            {icon:'📋', label:'My Job History',  fn:()=>router.push('/history')},
            {icon:'💰', label:'My Earnings',     fn:()=>router.push('/earnings')},
            {icon:'💬', label:'Chat with Support',fn:()=>window.open('https://wa.me/918999569604')},
          ].map((item,i)=>(
            <button key={item.label} onClick={item.fn}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-all border-b last:border-0"
              style={{ borderColor:'#F0F9FF' }}>
              <span className="text-xl w-8">{item.icon}</span>
              <span className="flex-1 text-gray-800 text-sm font-semibold">{item.label}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>

        <button onClick={logout}
          className="w-full py-4 rounded-2xl font-black text-sm border-2 text-red-500 active:scale-95 transition-transform"
          style={{ borderColor:'#FEE2E2', background:'#FEF2F2' }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}