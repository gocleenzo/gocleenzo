'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin-overview',   icon: '📊', label: 'Overview',   activeColor: '#06B6D4' },
  { href: '/admin-bookings',   icon: '📋', label: 'Bookings',   activeColor: '#8B5CF6' },
  { href: '/admin-workers',    icon: '👷', label: 'Workers',    activeColor: '#F59E0B' },
  { href: '/admin-reports',    icon: '📈', label: 'Reports',    activeColor: '#10B981' },
  { href: '/admin-promos',     icon: '🎟', label: 'Promos',     activeColor: '#EC4899' },
  { href: '/admin-complaints', icon: '⚠️', label: 'Complaints', activeColor: '#EF4444' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeNav = NAV.find(n => pathname.startsWith(n.href))

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0F1E' }}>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 flex-col fixed h-full z-40 border-r"
        style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: '#1E2A45' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center
              text-white font-black text-xl"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                       boxShadow: '0 8px 20px rgba(6,182,212,0.4)' }}>
              C
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none">Cleenzo</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#06B6D4' }}>Admin Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all relative overflow-hidden"
                style={{
                  background: active ? `${item.activeColor}18` : 'transparent',
                  color:      active ? item.activeColor : '#64748B',
                  border:     active ? `1px solid ${item.activeColor}30` : '1px solid transparent',
                }}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: item.activeColor }} />}
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {active && <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: item.activeColor }} />}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: '#1E2A45' }}>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all">
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col border-r"
            style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
            <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: '#1E2A45' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black"
                  style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>C</div>
                <p className="text-white font-black">Cleenzo Admin</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400" style={{ background: '#1E2A45' }}>✕</button>
            </div>
            <nav className="flex-1 px-4 py-5 space-y-1.5">
              {NAV.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: active ? `${item.activeColor}18` : 'transparent',
                      color:      active ? item.activeColor : '#64748B',
                      border:     active ? `1px solid ${item.activeColor}30` : '1px solid transparent',
                    }}>
                    <span className="text-lg">{item.icon}</span><span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="px-4 py-4 border-t" style={{ borderColor: '#1E2A45' }}>
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-400">
                <span>🚪</span> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen">
        <div className="md:hidden flex items-center justify-between px-4 py-4 border-b sticky top-0 z-30"
          style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1E2A45' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>C</div>
            <span className="text-white font-bold text-sm">{activeNav?.label ?? 'Admin'}</span>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#1E2A45' }}>
            {activeNav?.icon ?? '📊'}
          </div>
        </div>
        <div className="flex-1 pb-24 md:pb-0">{children}</div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{ background: '#0D1426', borderColor: '#1E2A45' }}>
        <div className="flex items-center justify-around py-2 px-1">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all"
                style={{ background: active ? `${item.activeColor}18` : 'transparent' }}>
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[9px] font-bold" style={{ color: active ? item.activeColor : '#475569' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}