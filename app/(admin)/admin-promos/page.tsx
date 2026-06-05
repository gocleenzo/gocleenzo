'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Promo = { id: string; code: string; discount_type: string; discount_value: number; max_discount_amount: number | null; min_order_amount: number | null; usage_limit: number | null; used_count: number; is_active: boolean; valid_until: string | null }

export default function AdminPromos() {
  const [promos,  setPromos]  = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({ code: '', discount_type: 'percent', discount_value: '', max_discount_amount: '', min_order_amount: '', usage_limit: '', valid_until: '' })
  const supabase = createClient()

  async function load() {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    if (data) setPromos(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addPromo() {
    if (!form.code || !form.discount_value) { alert('Code and value required'); return }
    setSaving(true)
    await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase(), discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      min_order_amount:    form.min_order_amount    ? Number(form.min_order_amount)    : null,
      usage_limit:         form.usage_limit         ? Number(form.usage_limit)         : null,
      valid_until: form.valid_until || null, is_active: true, used_count: 0,
    })
    setSaving(false); setShowAdd(false)
    setForm({ code: '', discount_type: 'percent', discount_value: '', max_discount_amount: '', min_order_amount: '', usage_limit: '', valid_until: '' })
    load()
  }

  async function toggle(id: string, cur: boolean) {
    await supabase.from('promo_codes').update({ is_active: !cur }).eq('id', id)
    setPromos(p => p.map(x => x.id === id ? { ...x, is_active: !cur } : x))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#EC489940', borderTopColor: '#EC4899' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0A0F1E' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Promo Codes</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>{promos.length} promo codes</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: showAdd ? '#1E2A45' : 'linear-gradient(135deg,#EC4899,#BE185D)', boxShadow: showAdd ? 'none' : '0 4px 12px rgba(236,72,153,0.4)' }}>
          {showAdd ? '✕ Cancel' : '+ Add Promo'}
        </button>
      </div>

      {/* add form */}
      {showAdd && (
        <div className="rounded-3xl border p-5 mb-5" style={{ background: '#0D1426', borderColor: '#EC489930' }}>
          <h2 className="text-white font-extrabold mb-4">New Promo Code</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {[
              { key: 'code',                label: 'Code *',           placeholder: 'CLEAN20' },
              { key: 'discount_value',      label: 'Discount Value *', placeholder: '20'      },
              { key: 'max_discount_amount', label: 'Max Discount (₹)', placeholder: '100'     },
              { key: 'min_order_amount',    label: 'Min Order (₹)',    placeholder: '200'     },
              { key: 'usage_limit',         label: 'Usage Limit',      placeholder: '100'     },
              { key: 'valid_until',         label: 'Valid Until',      placeholder: '',   type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: '#64748B' }}>{f.label}</label>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-pink-500 transition-all"
                  style={{ background: '#ffffff08', border: '1px solid #1E2A45' }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: '#64748B' }}>Discount Type</label>
              <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: '#ffffff08', border: '1px solid #1E2A45' }}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
          </div>
          <button onClick={addPromo} disabled={saving}
            className="px-6 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#EC4899,#BE185D)', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }}>
            {saving ? 'Saving...' : 'Save Promo Code'}
          </button>
        </div>
      )}

      {/* promo cards */}
      <div className="grid md:grid-cols-2 gap-3">
        {promos.map(p => (
          <div key={p.id} className="rounded-2xl p-4 border transition-all hover:border-pink-500/30"
            style={{ background: '#0D1426', borderColor: p.is_active ? '#EC489930' : '#1E2A45' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-black text-xl tracking-widest font-mono" style={{ color: '#EC4899' }}>{p.code}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  {p.discount_type === 'percent' ? `${p.discount_value}% off` : `₹${p.discount_value} off`}
                  {p.max_discount_amount ? ` · max ₹${p.max_discount_amount}` : ''}
                </p>
              </div>
              <button onClick={() => toggle(p.id, p.is_active)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: p.is_active ? '#10B98120' : '#EF444420',
                  color:      p.is_active ? '#10B981' : '#EF4444',
                }}>
                {p.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Used',      v: `${p.used_count}/${p.usage_limit ?? '∞'}` },
                { l: 'Min Order', v: p.min_order_amount ? `₹${p.min_order_amount}` : '—' },
                { l: 'Expires',   v: p.valid_until ? new Date(p.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—' },
              ].map(s => (
                <div key={s.l} className="rounded-xl p-2 text-center" style={{ background: '#ffffff05' }}>
                  <p className="text-white font-bold text-xs">{s.v}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: '#475569' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {promos.length === 0 && (
          <div className="col-span-2 rounded-2xl p-10 text-center text-sm" style={{ background: '#0D1426', color: '#475569' }}>No promo codes yet</div>
        )}
      </div>
    </div>
  )
}