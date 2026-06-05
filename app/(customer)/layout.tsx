'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const val = localStorage.getItem('cleenzo_user')
    if (!val) return null
    return JSON.parse(val) as { id: string; phone: string; role: string; full_name: string }
  } catch {
    return null
  }
}

const tabs = [
  {
    href: '/services',
    label: 'Services',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-cyan-500' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/bookings',
    label: 'Bookings',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-cyan-500' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Account',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-cyan-500' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user) { router.replace('/login'); return }
    if (user.role === 'worker') { router.replace('/worker/dashboard'); return }
    if (user.role === 'owner') { router.replace('/admin-overview'); return }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100
        flex items-center justify-around z-50 safe-area-pb">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href}
              className="flex flex-col items-center gap-1 py-3 px-6 min-w-[80px]">
              {tab.icon(active)}
              <span className={`text-xs font-medium ${active ? 'text-cyan-500' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}