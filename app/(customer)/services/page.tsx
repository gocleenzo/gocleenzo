'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string; name: string; description: string
  base_price: number; duration_minutes: number
  category: string; image_url: string | null
}
type CartItem = { id: string; name: string; price: number; duration: number; qty: number }

const EMOJIS = ['🧹','🍳','🚿','🧺','🪴','❄️','🛋','🧽','🏠','🎉','🪟','🧴']
const CARD_BG = ['#E0F9FF','#E8FFF0','#FFF0E8','#F0E8FF','#FFFBE8','#E8F0FF','#FFE8F5','#E8FFFA']

function getBadge(name: string) {
  const n = name.toLowerCase()
  if (n.includes('full') || n.includes('house')) return { label:'BEST', color:'#10B981' }
  if (n.includes('party') || n.includes('express')) return { label:'HOT', color:'#EF4444' }
  if (n.includes('wardrobe') || n.includes('cabinet')) return { label:'NEW', color:'#06B6D4' }
  return null
}

export default function ServicesPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [services,   setServices]   = useState<Service[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeTab,  setActiveTab]  = useState('All')
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [cart,       setCart]       = useState<CartItem[]>([])
  const [showDrawer, setShowDrawer] = useState(false)
  const [userArea,   setUserArea]   = useState('Mumbai')
  const [userName,   setUserName]   = useState('User')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profile, addr, svcs] = await Promise.all([
        supabase.from('users').select('full_name').eq('id', user.id).single(),
        supabase.from('addresses').select('area,city').eq('user_id', user.id).limit(1).single(),
        supabase.from('services').select('*').eq('is_active', true).order('category'),
      ])

      if (profile.data) setUserName(profile.data.full_name?.split(' ')[0] ?? 'User')
      if (addr.data) setUserArea(`${addr.data.area}, ${addr.data.city}`)
      if (svcs.data) {
        setServices(svcs.data)
        const cats = ['All', ...Array.from(new Set(svcs.data.map((s: Service) => s.category).filter(Boolean)))] as string[]
        setCategories(cats)
      }
      setLoading(false)
    }
    load()
  }, [])

  const getQty   = (id: string) => cart.find(c => c.id === id)?.qty ?? 0
  const cartTotal    = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const cartCount    = cart.reduce((s, c) => s + c.qty, 0)
  const cartDuration = cart.reduce((s, c) => s + c.duration * c.qty, 0)

  function addItem(svc: Service) {
    setCart(p => {
      const ex = p.find(c => c.id === svc.id)
      return ex ? p.map(c => c.id===svc.id?{...c,qty:c.qty+1}:c)
               : [...p,{id:svc.id,name:svc.name,price:svc.base_price,duration:svc.duration_minutes,qty:1}]
    })
  }
  function removeItem(id: string) {
    setCart(p => {
      const ex = p.find(c => c.id===id)
      if (!ex||ex.qty<=1) return p.filter(c=>c.id!==id)
      return p.map(c=>c.id===id?{...c,qty:c.qty-1}:c)
    })
  }

  const filtered = services.filter(s =>
    (activeTab==='All'||s.category===activeTab) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function proceedToBook() {
    const ids = cart.flatMap(c => Array(c.qty).fill(c.id)).join(',')
    router.push(`/book/multi?services=${ids}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#F0FDFF'}}>
      <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
        style={{borderColor:'#A5F3FC',borderTopColor:'#06B6D4'}}/>
    </div>
  )

  return (
    <div className="min-h-screen pb-32" style={{background:'#F0FDFF'}}>
      <style>{`
        .sh{::-webkit-scrollbar{display:none}}
        .scrollbar-hide::-webkit-scrollbar{display:none}
        @keyframes slideUp{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}
        .drawer{animation:slideUp .3s cubic-bezier(.22,1,.36,1) forwards}
        @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
        .pop{animation:pop .2s ease}
      `}</style>

      {/* ══ SCROLLABLE HEADER (not sticky) ══ */}
      <div style={{background:'linear-gradient(160deg,#06B6D4 0%,#0891B2 60%,#0E7490 100%)'}}>

        {/* top bar */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between">
          <div>
            <p className="text-cyan-100 text-xs font-semibold">👋 Hey, {userName}!</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-white/80 text-xs">📍</span>
              <p className="text-white font-bold text-sm leading-none truncate max-w-[200px]">{userArea}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => router.push('/bookings')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
              style={{background:'rgba(255,255,255,0.18)',border:'1.5px solid rgba(255,255,255,0.3)'}}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </button>
            <button onClick={() => router.push('/account')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
              style={{background:'rgba(255,255,255,0.25)',border:'2px solid rgba(255,255,255,0.5)'}}>
              <span className="text-white font-black text-lg leading-none">{userName[0]?.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* search bar */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{background:'rgba(255,255,255,0.95)',boxShadow:'0 4px 20px rgba(0,0,0,0.12)'}}>
            <span className="text-cyan-400 text-lg flex-shrink-0">🔍</span>
            <input type="text" placeholder="Search services..."
              value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-800 text-sm placeholder-gray-400 font-medium"/>
            {search && (
              <button onClick={()=>setSearch('')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 flex-shrink-0"
                style={{background:'#F0F4F8'}}>✕</button>
            )}
          </div>
        </div>

        {/* hero */}
        <div className="mx-5 mb-0 rounded-3xl overflow-hidden relative"
          style={{background:'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.05))',border:'1px solid rgba(255,255,255,0.2)',minHeight:140}}>
          <div className="px-5 py-4 relative z-10">
            <span className="text-[10px] font-black px-3 py-1 rounded-full tracking-wider inline-block"
              style={{background:'rgba(255,255,255,0.25)',color:'#fff'}}>
              ✦ EXCLUSIVE
            </span>
            <h2 className="text-white font-black text-2xl leading-tight mt-2">Deep Clean<br/>Any Room</h2>
            <p className="text-white/75 text-xs mt-1 mb-3">Expert cleaners · Verified pros</p>
            <button
              onClick={()=>{navigator.clipboard.writeText('CLEAN20');alert('CLEAN20 copied! 🎉')}}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black active:scale-95 transition-transform"
              style={{background:'#fff',color:'#0891B2',boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
              🎟 CLEAN20 — 20% OFF
            </button>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-70 rotate-12 pointer-events-none">🧹</div>
        </div>

        {/* wave */}
        <svg viewBox="0 0 390 28" fill="none" preserveAspectRatio="none"
          style={{display:'block',width:'100%',height:'28px',marginTop:'16px'}}>
          <path d="M0 28C65 8 130 0 195 0C260 0 325 8 390 28H0Z" fill="#F0FDFF"/>
        </svg>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="px-4 -mt-1">

        {/* category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-1">
          {categories.map(cat => (
            <button key={cat} onClick={()=>setActiveTab(cat)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
              style={{
                background: activeTab===cat?'#06B6D4':'#fff',
                color:      activeTab===cat?'#fff':'#475569',
                border:     `1.5px solid ${activeTab===cat?'#06B6D4':'#BAE6FD'}`,
                boxShadow:  activeTab===cat?'0 4px 14px rgba(6,182,212,0.4)':'0 1px 4px rgba(0,0,0,0.06)',
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* section title */}
        <div className="flex items-center justify-between mt-4 mb-3">
          <div>
            <h3 className="text-gray-900 font-black text-lg">All Services</h3>
            <p className="text-cyan-500 text-xs font-semibold mt-0.5">{filtered.length} available</p>
          </div>
          {cartCount > 0 && (
            <button onClick={()=>setShowDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black active:scale-95 transition-transform"
              style={{background:'#ECFEFF',color:'#0891B2',border:'1px solid #A5F3FC'}}>
              🛒 {cartCount} · ₹{cartTotal.toLocaleString('en-IN')}
            </button>
          )}
        </div>

        {/* ══ 3-COLUMN GRID ══ */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((svc, i) => {
            const qty   = getQty(svc.id)
            const badge = getBadge(svc.name)
            const bg    = CARD_BG[i % CARD_BG.length]
            return (
              <div key={svc.id} className="rounded-2xl overflow-hidden bg-white flex flex-col transition-all"
                style={{
                  boxShadow: qty>0 ? '0 4px 16px rgba(6,182,212,0.3)' : '0 2px 8px rgba(0,0,0,0.07)',
                  border:    qty>0 ? '2px solid #06B6D4' : '1.5px solid #E0F9FF',
                }}>

                {/* image tap to detail */}
                <button onClick={()=>router.push(`/services/${svc.id}`)}
                  className="relative flex items-center justify-center active:opacity-90"
                  style={{background:bg, height:'80px'}}>
                  {badge && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white z-10"
                      style={{background:badge.color}}>
                      {badge.label}
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded-full z-10"
                    style={{background:'rgba(255,255,255,0.9)'}}>
                    <span className="text-yellow-400 text-[8px]">★</span>
                    <span className="text-gray-700 text-[8px] font-black">{(4.2+(i%8)*0.1).toFixed(1)}</span>
                  </div>
                  <span className="text-3xl">{EMOJIS[i % EMOJIS.length]}</span>
                  {qty > 0 && (
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                      style={{background:'#06B6D4'}}>
                      {qty}
                    </div>
                  )}
                </button>

                {/* info */}
                <div className="px-2 pt-2 pb-1 flex-1">
                  <p className="text-gray-900 font-black text-[11px] leading-tight" style={{
                    overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'
                  }}>
                    {svc.name}
                  </p>
                  <p className="text-gray-400 text-[9px] mt-0.5">⏱{svc.duration_minutes}m</p>
                </div>

                {/* price + button */}
                <div className="px-2 pb-2.5">
                  <p className="font-black text-xs mb-1.5" style={{color:'#06B6D4'}}>
                    ₹{svc.base_price.toLocaleString('en-IN')}
                  </p>

                  {qty === 0 ? (
                    <button onClick={()=>addItem(svc)}
                      className="w-full h-7 rounded-lg flex items-center justify-center gap-1 font-black text-xs text-white active:scale-95 transition-transform"
                      style={{
                        background:'linear-gradient(135deg,#06B6D4,#0891B2)',
                        boxShadow: '0 2px 8px rgba(6,182,212,0.5)',
                      }}>
                      <span className="text-sm leading-none">+</span> Add
                    </button>
                  ) : (
                    <div className="w-full h-7 rounded-lg flex items-center justify-between overflow-hidden"
                      style={{
                        background:'linear-gradient(135deg,#06B6D4,#0891B2)',
                        boxShadow: '0 2px 8px rgba(6,182,212,0.5)',
                      }}>
                      <button onClick={()=>removeItem(svc.id)}
                        className="flex-1 h-full flex items-center justify-center font-black text-white text-base active:opacity-70 transition-opacity">
                        −
                      </button>
                      <span className="text-white font-black text-xs min-w-[16px] text-center">{qty}</span>
                      <button onClick={()=>addItem(svc)}
                        className="flex-1 h-full flex items-center justify-center font-black text-white text-base active:opacity-70 transition-opacity">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-gray-600 font-bold">No services found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
          </div>
        )}

        {/* trust badges */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            {icon:'🛡',title:'Verified Pros', sub:'Background checked'},
            {icon:'⚡',title:'Same Day',      sub:'Quick booking'},
            {icon:'❤️',title:'Satisfaction',  sub:'100% guaranteed'},
          ].map(b => (
            <div key={b.title} className="rounded-2xl p-3 text-center bg-white"
              style={{border:'1px solid #BAE6FD',boxShadow:'0 1px 6px rgba(6,182,212,0.08)'}}>
              <div className="text-xl mb-1">{b.icon}</div>
              <p className="text-gray-800 font-black text-[10px]">{b.title}</p>
              <p className="text-gray-400 text-[9px] mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FLOATING CART BAR ══ */}
      {cartCount > 0 && !showDrawer && (
        <div className="fixed bottom-[72px] left-4 right-4 z-40">
          <button onClick={()=>setShowDrawer(true)}
            className="w-full rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all"
            style={{
              background:'linear-gradient(135deg,#06B6D4,#0891B2)',
              boxShadow:'0 8px 32px rgba(6,182,212,0.55)',
            }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{background:'rgba(255,255,255,0.25)'}}>
                <span className="text-xl">🛒</span>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{background:'#EF4444'}}>
                  {cartCount}
                </div>
              </div>
              <div>
                <p className="text-white font-black text-sm leading-none">
                  {cartCount} {cartCount===1?'service':'services'}
                </p>
                <p className="text-cyan-100 text-[10px] mt-0.5">~{cartDuration} min total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white font-black text-xl">₹{cartTotal.toLocaleString('en-IN')}</p>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{background:'rgba(255,255,255,0.25)'}}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
                </svg>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ══ CART DRAWER ══ */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowDrawer(false)}/>
          <div className="drawer relative w-full bg-white" style={{borderRadius:'32px 32px 0 0',maxHeight:'88vh'}}>

            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-gray-200"/>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <h3 className="text-gray-900 font-black text-xl">Your Cart 🛒</h3>
                <p className="text-gray-400 text-xs mt-0.5">{cartCount} items · ~{cartDuration} min total</p>
              </div>
              <button onClick={()=>setShowDrawer(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 font-bold"
                style={{background:'#F0F9FF',border:'1px solid #BAE6FD'}}>✕</button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-3" style={{maxHeight:'42vh'}}>
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl p-4"
                  style={{background:'#F0FDFF',border:'1.5px solid #BAE6FD'}}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{background:'#E0F9FF'}}>🧹</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-bold text-sm truncate">{item.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">₹{item.price.toLocaleString('en-IN')} each</p>
                  </div>
                  <div className="flex items-center rounded-xl overflow-hidden flex-shrink-0"
                    style={{background:'linear-gradient(135deg,#06B6D4,#0891B2)',boxShadow:'0 2px 8px rgba(6,182,212,0.4)'}}>
                    <button onClick={()=>removeItem(item.id)}
                      className="w-9 h-9 flex items-center justify-center font-black text-white text-xl active:opacity-70">−</button>
                    <span className="text-white font-black text-sm w-7 text-center">{item.qty}</span>
                    <button onClick={()=>addItem({id:item.id,name:item.name,base_price:item.price,duration_minutes:item.duration,category:'',description:'',image_url:null})}
                      className="w-9 h-9 flex items-center justify-center font-black text-white text-xl active:opacity-70">+</button>
                  </div>
                  <p className="font-black text-sm flex-shrink-0" style={{color:'#06B6D4'}}>
                    ₹{(item.price*item.qty).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <div className="rounded-2xl p-4 mb-4 space-y-2"
                style={{background:'#F0FDFF',border:'1px solid #BAE6FD'}}>
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-gray-500 text-sm">{item.name} × {item.qty}</span>
                    <span className="text-gray-700 text-sm font-bold">₹{(item.price*item.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="h-px bg-cyan-100"/>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-black text-base">Total</span>
                  <span className="font-black text-2xl" style={{color:'#06B6D4'}}>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button onClick={proceedToBook}
                className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 active:scale-95 transition-all mb-4"
                style={{background:'linear-gradient(135deg,#06B6D4,#0891B2)',boxShadow:'0 8px 24px rgba(6,182,212,0.45)'}}>
                Proceed to Book
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}