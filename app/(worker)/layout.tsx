'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href:'/dashboard', label:'Jobs',
    icon:(a:boolean)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  { href:'/history',   label:'History',
    icon:(a:boolean)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { href:'/earnings',  label:'Earnings',
    icon:(a:boolean)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { href:'/profile',   label:'Profile',
    icon:(a:boolean)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#F0FDFE' }}>
      <main style={{ flex:1, paddingBottom:72 }}>{children}</main>
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:50,
        background:'rgba(255,255,255,0.92)',
        backdropFilter:'blur(16px)',
        borderTop:'1.5px solid #CFFAFE',
        boxShadow:'0 -4px 24px rgba(6,182,212,0.1)',
      }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-around',
          padding:`10px 8px calc(10px + env(safe-area-inset-bottom))`
        }}>
          {TABS.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link key={tab.href} href={tab.href}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  padding:'8px 16px', borderRadius:16, textDecoration:'none',
                  background: active ? '#ECFEFF' : 'transparent',
                  border: active ? '1.5px solid #A5F3FC' : '1.5px solid transparent',
                  color: active ? '#0891B2' : '#94A3B8',
                  transition:'all .18s ease', minWidth:58,
                }}>
                {tab.icon(active)}
                <span style={{
                  fontSize:9,
                  fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:'.07em',
                  color: active ? '#0891B2' : '#94A3B8',
                  fontWeight: active ? 500 : 400,
                }}>
                  {tab.label.toUpperCase()}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');`}</style>
    </div>
  )
}