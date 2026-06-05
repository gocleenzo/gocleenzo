'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const FAQS = [
  {
    category: 'Bookings',
    icon: '📋',
    items: [
      { q: 'How do I reschedule my booking?', a: 'You can reschedule a booking up to 2 hours before the scheduled time. Go to My Bookings, tap the booking, and select "Reschedule".' },
      { q: 'Can I cancel my booking?', a: 'Yes, cancellations are free if done 4+ hours before the service. Cancellations within 4 hours may attract a small convenience fee.' },
      { q: "What if the professional doesn't show up?", a: "We'll reassign another professional immediately or give you a full refund. Contact us via the form below for instant resolution." },
    ],
  },
  {
    category: 'Payments',
    icon: '💳',
    items: [
      { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and cash on service. All digital payments are 100% secure.' },
      { q: 'When will I get my refund?', a: 'Refunds are processed within 5–7 business days to the original payment method. UPI refunds may be faster.' },
      { q: 'Is my payment information safe?', a: 'Absolutely. We use industry-standard encryption and never store your card details on our servers.' },
    ],
  },
  {
    category: 'Services',
    icon: '🧹',
    items: [
      { q: 'What areas do you cover in Mumbai?', a: 'We currently cover all of Mumbai including Andheri, Bandra, Powai, Thane, Navi Mumbai, and more. Enter your pincode to check availability.' },
      { q: 'Do I need to provide cleaning supplies?', a: 'No, our professionals bring all necessary equipment and eco-friendly cleaning products.' },
      { q: 'Are your professionals verified?', a: 'Yes, all Cleenzo professionals undergo background checks, ID verification, and training before joining our platform.' },
    ],
  },
]

export default function HelpPage() {
  const [form, setForm]           = useState({ name: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [openFaq, setOpenFaq]     = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error: dbError } = await supabase.from('support_queries').insert({
        name:       form.name,
        email:      form.email,
        phone:      form.phone || null,
        message:    form.message,
        user_id:    session?.user?.id ?? null,
        status:     'open',
        created_at: new Date().toISOString(),
      })
      if (dbError) setError('Something went wrong. Please try again.')
      else setSubmitted(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily:"'Outfit','DM Sans',sans-serif", background:'#fff', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .contact-input { width:100%;border:1.5px solid #e5e7eb;border-radius:14px;padding:13px 16px;font-size:14px;font-family:'Outfit',sans-serif;color:#111827;outline:none;transition:border-color .2s;background:#fff; }
        .contact-input:focus { border-color:#06b6d4;box-shadow:0 0 0 3px rgba(6,182,212,.1); }
        .contact-input::placeholder { color:#9ca3af; }
        .submit-btn { width:100%;background:#06b6d4;color:#fff;border:none;border-radius:50px;padding:14px;font-size:15px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .22s;display:flex;align-items:center;justify-content:center;gap:8px; }
        .submit-btn:hover:not(:disabled) { background:#0891b2;transform:translateY(-2px);box-shadow:0 8px 24px rgba(6,182,212,.4); }
        .submit-btn:disabled { opacity:.7;cursor:not-allowed; }
        .info-card { display:flex;align-items:flex-start;gap:14px;background:#f0fdfe;border:1.5px solid #a5f3fc;border-radius:16px;padding:18px 20px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fade-up { animation:fadeUp .6s ease both; }
        .spinner { width:18px;height:18px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0; }
        .faq-body { overflow:hidden;transition:max-height 0.35s cubic-bezier(0.16,1,0.3,1),opacity 0.25s ease; }
        .faq-body.open   { max-height:300px;opacity:1; }
        .faq-body.closed { max-height:0;opacity:0; }
        @media(max-width:768px){ .help-grid{grid-template-columns:1fr!important;} .name-row{grid-template-columns:1fr!important;} }
      `}</style>

      {/* Back */}
      <div style={{ padding:'20px 28px 0' }}>
        <button onClick={() => router.back()}
          style={{ display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:'#06b6d4',fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Hero */}
      <section style={{ background:'linear-gradient(145deg,#f0fdfe,#e0f7fa)',padding:'60px 28px 52px',textAlign:'center',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-80,right:-80,width:300,height:300,background:'radial-gradient(circle,rgba(6,182,212,.12) 0%,transparent 70%)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',bottom:-60,left:-60,width:250,height:250,background:'radial-gradient(circle,rgba(6,182,212,.08) 0%,transparent 70%)',pointerEvents:'none' }}/>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11.5,fontWeight:700,letterSpacing:3,textTransform:'uppercase',color:'#06b6d4',marginBottom:10 }}>Help Centre</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:'clamp(32px,5vw,52px)',color:'#0c4a6e',marginBottom:16,lineHeight:1.1 }}>
            How can we<br/>help you?
          </h1>
          <p style={{ fontSize:17,color:'#374151',maxWidth:480,margin:'0 auto',lineHeight:1.75 }}>
            Find answers to common questions below, or send us a message and we'll get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section style={{ maxWidth:780,margin:'0 auto',padding:'60px 28px 0' }}>
        <div style={{ textAlign:'center',marginBottom:36 }}>
          <div style={{ fontSize:11.5,fontWeight:700,letterSpacing:3,textTransform:'uppercase',color:'#06b6d4',marginBottom:8 }}>FAQ</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3vw,34px)',fontWeight:800,color:'#0c4a6e' }}>Frequently asked questions</h2>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {FAQS.map(section => (
            <div key={section.category} style={{ border:'1.5px solid #e5e7eb',borderRadius:20,overflow:'hidden',background:'#fff',boxShadow:'0 2px 12px rgba(0,0,0,.04)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:12,padding:'16px 22px',borderBottom:'1.5px solid #f3f4f6',background:'#fafafa' }}>
                <span style={{ fontSize:20 }}>{section.icon}</span>
                <span style={{ fontWeight:700,color:'#0c4a6e',fontSize:15 }}>{section.category}</span>
              </div>
              {section.items.map((faq, i) => {
                const key    = `${section.category}-${i}`
                const isOpen = openFaq === key
                return (
                  <div key={key} style={{ borderBottom:i < section.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : key)}
                      style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'16px 22px',background:'none',border:'none',cursor:'pointer',textAlign:'left' }}>
                      <span style={{ fontSize:14,fontWeight:600,color:'#1f2937',flex:1,lineHeight:1.5 }}>{faq.q}</span>
                      <span style={{ transition:'transform .3s',transform:isOpen?'rotate(180deg)':'rotate(0)',flexShrink:0,color:'#06b6d4' }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    <div className={`faq-body ${isOpen ? 'open' : 'closed'}`}>
                      <p style={{ padding:'0 22px 18px',fontSize:14,color:'#6b7280',lineHeight:1.8 }}>{faq.a}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      {/* Contact section */}
      <section style={{ maxWidth:1060,margin:'0 auto',padding:'72px 28px 100px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'start' }} className="help-grid">

        {/* LEFT */}
        <div className="fade-up">
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:'#0c4a6e',marginBottom:10 }}>Still need help?</h2>
          <p style={{ fontSize:15,color:'#6b7280',lineHeight:1.8,marginBottom:36 }}>
            Can't find what you're looking for? Send us a message and our support team will respond within 24 hours.
          </p>
          <div style={{ display:'flex',flexDirection:'column',gap:14,marginBottom:44 }}>
            {[
              { icon:'📧', label:'Email us', value:'hello@cleenzo.in',    sub:'We reply within 24 hours' },
              { icon:'📍', label:'Based in', value:'Mumbai, Maharashtra', sub:'Serving 6 cities across Maharashtra' },
            ].map(item => (
              <div key={item.label} className="info-card">
                <div style={{ width:44,height:44,background:'#fff',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,boxShadow:'0 2px 8px rgba(6,182,212,.12)' }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize:11.5,fontWeight:700,color:'#06b6d4',letterSpacing:1.5,textTransform:'uppercase',marginBottom:3 }}>{item.label}</div>
                  <div style={{ fontSize:15,fontWeight:600,color:'#0c4a6e' }}>{item.value}</div>
                  <div style={{ fontSize:12.5,color:'#6b7280',marginTop:2 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:'#374151',marginBottom:12,letterSpacing:.5 }}>We currently serve</div>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {['Andheri', 'Vile Parle'].map(city => (
                <span key={city} style={{ background:'#f0fdfe',border:'1.5px solid #a5f3fc',color:'#0e7490',borderRadius:50,padding:'6px 16px',fontSize:13,fontWeight:500 }}>{city}</span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={{ background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:28,padding:36,boxShadow:'0 12px 48px rgba(0,0,0,.06)' }} className="fade-up">
          {submitted ? (
            <div style={{ textAlign:'center',padding:'24px 0' }}>
              <div style={{ fontSize:56,marginBottom:18 }}>✅</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:'#0c4a6e',marginBottom:10 }}>Message sent!</h3>
              <p style={{ fontSize:15,color:'#6b7280',lineHeight:1.75 }}>
                Thanks for reaching out, <strong>{form.name.split(' ')[0]}</strong>!<br/>
                We'll get back to you at <strong style={{ color:'#06b6d4' }}>{form.email}</strong> within 24 hours.
              </p>
              <button onClick={() => { setForm({ name:'',email:'',phone:'',message:'' }); setSubmitted(false) }}
                style={{ marginTop:28,background:'#f0fdfe',border:'1.5px solid #a5f3fc',color:'#0e7490',borderRadius:50,padding:'10px 24px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:"'Outfit',sans-serif" }}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:18 }}>
              <div>
                <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:'#0c4a6e',marginBottom:6 }}>Send us a message</h3>
                <p style={{ fontSize:13.5,color:'#9ca3af' }}>We'll respond within 24 hours.</p>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }} className="name-row">
                <div>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6,letterSpacing:.5 }}>YOUR NAME *</label>
                  <input className="contact-input" name="name" placeholder="Rahul Sharma" value={form.name} onChange={handle} required />
                </div>
                <div>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6,letterSpacing:.5 }}>PHONE</label>
                  <input className="contact-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handle} />
                </div>
              </div>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6,letterSpacing:.5 }}>EMAIL ADDRESS *</label>
                <input className="contact-input" type="email" name="email" placeholder="rahul@example.com" value={form.email} onChange={handle} required />
              </div>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6,letterSpacing:.5 }}>YOUR MESSAGE *</label>
                <textarea className="contact-input" name="message" placeholder="Tell us how we can help..." rows={5} value={form.message} onChange={handle} required style={{ resize:'vertical',minHeight:120 }} />
              </div>
              {error && (
                <div style={{ background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',fontSize:13.5,color:'#dc2626',display:'flex',gap:8,alignItems:'center' }}>
                  ⚠️ {error}
                </div>
              )}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><span className="spinner"/>Sending...</> : 'Send message →'}
              </button>
              <p style={{ fontSize:12,color:'#9ca3af',textAlign:'center',lineHeight:1.6 }}>
                By submitting you agree to our{' '}
                <a href="/terms" style={{ color:'#06b6d4',textDecoration:'none' }}>Privacy Policy</a>.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ background:'linear-gradient(135deg,#0c4a6e,#0e7490)',padding:'60px 28px',textAlign:'center' }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3.5vw,36px)',fontWeight:800,color:'#fff',marginBottom:12 }}>Ready to book a clean?</h2>
        <p style={{ color:'rgba(255,255,255,.75)',fontSize:16,marginBottom:28 }}>Download the Cleenzo app and get your home sparkling today.</p>

        <button
          onClick={() => router.push('/services')}
          style={{ display:'inline-block',background:'#06b6d4',color:'#fff',border:'none',borderRadius:50,padding:'13px 32px',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:"'Outfit',sans-serif" }}>
          View our services →
        </button>
      </section>
    </div>
  )
}