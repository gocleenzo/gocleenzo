'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type User = { id: string; full_name: string | null; phone: string | null; email: string | null }
type Address = { id: string; label: string; flat_no: string | null; building: string | null; area: string; city: string; is_default: boolean }

export default function AccountPage() {
  const [user, setUser]             = useState<User | null>(null)
  const [loading, setLoading]       = useState(true)
  const [addresses, setAddresses]   = useState<Address[]>([])
  const [editing, setEditing]       = useState(false)
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [showAddAddr, setShowAddAddr] = useState(false)
  const [newAddr, setNewAddr]       = useState({ label: 'Home', flat_no: '', building: '', area: '', city: 'Mumbai', pincode: '' })
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const authUser   = session.user
      const authUserId = authUser.id

      // Values from auth (set at sign-up / login)
      const authEmail    = authUser.email ?? null
      const authName     = (authUser.user_metadata?.full_name as string | undefined) ?? null
      const authPhone    = authUser.phone ?? null

      // Try to read existing profile row
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single()

      if (profile) {
        // Profile exists — backfill any missing fields from auth metadata
        const needsSync =
          (!profile.full_name && authName) ||
          (!profile.email && authEmail)

        if (needsSync) {
          const patch: Record<string, string | null> = {}
          if (!profile.full_name && authName)  patch.full_name = authName
          if (!profile.email    && authEmail)  patch.email     = authEmail
          await supabase.from('users').update(patch).eq('id', authUserId)
          const merged = { ...profile, ...patch }
          setUser(merged)
          setName(merged.full_name ?? '')
          setEmail(merged.email ?? '')
        } else {
          setUser(profile)
          setName(profile.full_name ?? authName ?? '')
          setEmail(profile.email    ?? authEmail ?? '')
        }
      } else {
        // No profile row yet — create one seeded from auth metadata
        const newProfile = {
          id:        authUserId,
          full_name: authName,
          email:     authEmail,
          phone:     authPhone,
        }
        await supabase.from('users').upsert(newProfile)
        setUser(newProfile)
        setName(authName ?? '')
        setEmail(authEmail ?? '')
      }

      const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', authUserId)
      if (addrs) setAddresses(addrs)

      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    if (!user) return
    setSaving(true)

    // 1. Update the users profile table
    const { error } = await supabase
      .from('users')
      .update({ full_name: name, email })
      .eq('id', user.id)

    if (!error) {
      // 2. If email changed, also update Supabase Auth email
      if (email && email !== user.email) {
        await supabase.auth.updateUser({ email })
      }
      // 3. If name changed, sync to auth metadata too
      if (name !== user.full_name) {
        await supabase.auth.updateUser({ data: { full_name: name } })
      }
      setUser(prev => prev ? { ...prev, full_name: name, email } : prev)
    }

    setSaving(false)
    setEditing(false)
  }

  async function addAddress() {
    if (!user || !newAddr.area) return
    const { data } = await supabase.from('addresses')
      .insert({ user_id: user.id, ...newAddr, is_default: addresses.length === 0 })
      .select().single()
    if (data) setAddresses(prev => [...prev, data])
    setShowAddAddr(false)
    setNewAddr({ label: 'Home', flat_no: '', building: '', area: '', city: 'Mumbai', pincode: '' })
  }

  async function deleteAddress(addrId: string) {
    await supabase.from('addresses').delete().eq('id', addrId)
    setAddresses(prev => prev.filter(a => a.id !== addrId))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
        <p className="text-sm text-indigo-400 font-medium tracking-wide">Loading your account…</p>
      </div>
    </div>
  )

  const initials = (user?.full_name ?? user?.phone ?? 'U').slice(0, 2).toUpperCase()
  const displayName = user?.full_name ?? 'Add your name'

  return (
    <div className="min-h-screen bg-[#f0f4ff] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .hero-blob {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #0ea5e9 100%);
        }
        .glass-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .slide-down {
          animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        input:focus { box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
      `}</style>

      {/* ── Hero Header ── */}
      <div className="hero-blob relative overflow-hidden px-5 pt-14 pb-24">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute top-6 right-16 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-indigo-800/30" />

        <div className="relative flex items-center justify-between mb-1">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Sign out
          </button>
        </div>

        <div className="relative flex items-center gap-4 mt-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-white/25 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xl font-bold leading-tight truncate">{displayName}</p>
            <p className="text-indigo-200 text-sm mt-0.5">{user?.phone ?? user?.email ?? '—'}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span className="text-white/80 text-xs font-medium">Active member</span>
            </div>
          </div>
          <button onClick={() => setEditing(v => !v)}
            className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Edit Profile Card (floats over hero) ── */}
      {editing && (
        <div className="px-4 -mt-2 mb-4 slide-down">
          <div className="glass-card rounded-3xl p-5 shadow-xl border border-white/60">
            <p className="text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-3">Edit Profile</p>
            <div className="space-y-2.5">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 text-sm">👤</span>
                <input type="text" placeholder="Full name" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 transition-all" />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 text-sm">✉️</span>
                <input type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 transition-all" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)}
                  className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={saveProfile} disabled={saving}
                  className="flex-1 bg-indigo-500 text-white py-3 rounded-2xl text-sm font-semibold disabled:opacity-60 shadow-md shadow-indigo-200">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Stats Strip ── */}
      <div className={`px-4 ${editing ? '' : '-mt-10'} mb-5`}>
        <div className="glass-card rounded-3xl px-5 py-4 shadow-xl border border-white/60 flex justify-around">
          {[
            { label: 'Bookings', value: '—', icon: '📋' },
            { label: 'Addresses', value: addresses.length, icon: '📍' },
            { label: 'Coupons', value: '0', icon: '🎟' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="text-xl">{s.icon}</span>
              <span className="text-gray-900 text-lg font-bold leading-none">{s.value}</span>
              <span className="text-gray-400 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 pb-12">

        {/* ── Addresses ── */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
          <button
            onClick={() => setActiveSection(activeSection === 'addr' ? null : 'addr')}
            className="w-full flex items-center gap-3 px-5 py-4"
          >
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-lg">📍</div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 font-semibold text-sm">Saved addresses</p>
              <p className="text-gray-400 text-xs">{addresses.length} saved</p>
            </div>
            <div className={`transition-transform duration-300 ${activeSection === 'addr' ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {activeSection === 'addr' && (
            <div className="px-4 pb-4 slide-down">
              <div className="border-t border-gray-50 pt-3 space-y-2.5">
                {/* Add new address toggle */}
                <button onClick={() => setShowAddAddr(v => !v)}
                  className="w-full flex items-center gap-2 py-2.5 px-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-500 text-sm font-semibold hover:bg-indigo-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add new address
                </button>

                {showAddAddr && (
                  <div className="p-4 bg-indigo-50 rounded-2xl space-y-2.5 slide-down">
                    <div className="flex gap-2">
                      {['Home', 'Office', 'Other'].map(l => (
                        <button key={l} onClick={() => setNewAddr(a => ({ ...a, label: l }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all
                            ${newAddr.label === l
                              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
                              : 'bg-white text-gray-500 border border-gray-200'}`}>
                          {l === 'Home' ? '🏠 ' : l === 'Office' ? '🏢 ' : '📍 '}{l}
                        </button>
                      ))}
                    </div>
                    {[
                      { key: 'flat_no',  placeholder: 'Flat / Unit no.' },
                      { key: 'building', placeholder: 'Building / Society name' },
                      { key: 'area',     placeholder: 'Area / Locality *' },
                      { key: 'pincode',  placeholder: 'Pincode' },
                    ].map(f => (
                      <input key={f.key} type="text" placeholder={f.placeholder}
                        value={(newAddr as any)[f.key]}
                        onChange={e => setNewAddr(a => ({ ...a, [f.key]: e.target.value }))}
                        className="w-full bg-white rounded-xl px-4 py-2.5 text-sm outline-none border border-gray-200 focus:border-indigo-400 transition-all" />
                    ))}
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddAddr(false)}
                        className="flex-1 bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-semibold">
                        Cancel
                      </button>
                      <button onClick={addAddress}
                        className="flex-1 bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-200">
                        Save address
                      </button>
                    </div>
                  </div>
                )}

                {addresses.length === 0 && !showAddAddr ? (
                  <div className="text-center py-5">
                    <p className="text-3xl mb-1">🗺️</p>
                    <p className="text-gray-400 text-sm">No addresses saved yet</p>
                  </div>
                ) : (
                  addresses.map(addr => (
                    <div key={addr.id} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl">
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-base shadow-sm flex-shrink-0">
                        {addr.label === 'Home' ? '🏠' : addr.label === 'Office' ? '🏢' : '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-gray-900 text-sm font-semibold">{addr.label}</p>
                          {addr.is_default && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Default</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          {addr.flat_no && `${addr.flat_no}, `}
                          {addr.building && `${addr.building}, `}
                          {addr.area}, {addr.city}
                        </p>
                      </div>
                      <button onClick={() => deleteAddress(addr.id)}
                        className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 hover:bg-red-100 transition-colors">
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Quick Links ── */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
          {[
            { icon: '📋', label: 'My bookings',      sub: 'View all past & upcoming', href: '/bookings',                  color: 'bg-violet-50' },
            { icon: '🎟', label: 'Offers & coupons', sub: 'Save more on every order',  href: '/offers',                    color: 'bg-amber-50' },
            { icon: '💬', label: 'Help & support',   sub: 'Chat with us on WhatsApp',  href: '/help',                      color: 'bg-emerald-50' },
            { icon: '📜', label: 'Terms & Privacy',  sub: 'Legal information',         href: '/terms',                     color: 'bg-blue-50' },
          ].map((item, i, arr) => (
            <a key={item.label} href={item.href}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center text-xl flex-shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-semibold">{item.label}</p>
                <p className="text-gray-400 text-xs">{item.sub}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-gray-300 pt-1">Cleenzo v1.0 · Made with ❤️ in Mumbai</p>
      </div>
    </div>
  )
}