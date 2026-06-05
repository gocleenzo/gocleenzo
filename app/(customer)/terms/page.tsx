'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  {
    id: 'terms',
    label: 'Terms of Service',
    icon: '📜',
    content: [
      {
        title: '1. Acceptance of Terms',
        body: 'By accessing or using the Cleenzo platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our Service. Cleenzo reserves the right to update these terms at any time, and continued use of the Service constitutes acceptance of the revised terms.',
      },
      {
        title: '2. Use of the Service',
        body: 'Cleenzo provides an on-demand home cleaning and services platform connecting customers with verified service professionals in Mumbai. You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not use the Service to engage in any activity that is illegal, harmful, or fraudulent.',
      },
      {
        title: '3. Bookings & Cancellations',
        body: 'Bookings are confirmed upon successful payment or selection of pay-at-service. Cancellations made at least 4 hours before the scheduled slot are free of charge. Late cancellations may incur a convenience fee of up to ₹99. No-shows may result in full charge. Cleenzo reserves the right to cancel bookings due to professional unavailability, in which case a full refund will be issued.',
      },
      {
        title: '4. Payments & Refunds',
        body: 'Payments are processed securely through third-party payment gateways. Cleenzo does not store your payment credentials. Refunds for valid claims are processed within 5–7 business days. Disputes must be raised within 48 hours of service completion through our support channels.',
      },
      {
        title: '5. Professional Conduct',
        body: 'All service professionals on Cleenzo are background-verified. However, Cleenzo acts as a marketplace and is not liable for incidental damages caused by professionals. Any incidents must be reported to support within 24 hours for resolution.',
      },
      {
        title: '6. Limitation of Liability',
        body: 'Cleenzo\'s liability in any circumstance is limited to the amount paid for the specific service. We are not liable for indirect, incidental, or consequential damages. Our Service is provided "as is" without warranties of any kind, express or implied.',
      },
      {
        title: '7. Governing Law',
        body: 'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    icon: '🔒',
    content: [
      {
        title: '1. Information We Collect',
        body: 'We collect information you provide when creating an account (name, phone number, email), booking services (address, service preferences), and using the app (device info, usage data). We may also collect location data when you use the app to improve service matching.',
      },
      {
        title: '2. How We Use Your Information',
        body: 'Your information is used to process bookings, match you with nearby professionals, send service confirmations and reminders, improve our platform, and prevent fraud. We do not use your data for unrelated advertising purposes.',
      },
      {
        title: '3. Data Sharing',
        body: 'We share your details (name, contact, address) with your assigned service professional only for the purpose of completing your booking. We do not sell your personal data to third parties. We may share anonymised, aggregate data with analytics partners.',
      },
      {
        title: '4. Data Storage & Security',
        body: 'Your data is stored on secure, encrypted servers. We follow industry-standard security practices including HTTPS encryption, access controls, and regular security audits. Your payment data is handled solely by PCI-DSS compliant payment processors.',
      },
      {
        title: '5. Your Rights',
        body: 'You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us via WhatsApp or email. Account deletion requests are processed within 7 business days and result in permanent removal of your data from our systems.',
      },
      {
        title: '6. Cookies',
        body: 'Our web app uses cookies to maintain your session and remember your preferences. You can disable cookies in your browser settings, but some features may not work correctly without them.',
      },
      {
        title: '7. Changes to This Policy',
        body: 'We may update this Privacy Policy periodically. Significant changes will be communicated via in-app notification or email. Continued use of Cleenzo after changes constitutes your acceptance of the updated policy.',
      },
    ],
  },
]

export default function TermsPage() {
  const [activeTab, setActiveTab]   = useState<'terms' | 'privacy'>('terms')
  const [openItem, setOpenItem]     = useState<string | null>('0')
  const router = useRouter()

  const section = SECTIONS.find(s => s.id === activeTab)!

  return (
    <div className="min-h-screen bg-[#f0f4ff]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .hero-grad { background: linear-gradient(135deg,#6366f1 0%,#4f46e5 50%,#0ea5e9 100%); }
        .tab-active { background: white; box-shadow: 0 2px 8px rgba(99,102,241,0.15); color: #4f46e5; }
        .tab-inactive { color: rgba(255,255,255,0.65); }
        .accordion-body { overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease; }
        .accordion-body.open   { max-height: 600px; opacity: 1; }
        .accordion-body.closed { max-height: 0;     opacity: 0; }
        .card { background: white; border-radius: 20px; box-shadow: 0 2px 12px rgba(99,102,241,0.07); }
      `}</style>

      {/* Hero */}
      <div className="hero-grad relative overflow-hidden px-5 pt-14 pb-8">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-10 w-24 h-24 rounded-full bg-indigo-800/30" />
        <button onClick={() => router.back()}
          className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative mb-5">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Legal</p>
          <h1 className="text-white text-2xl font-bold">Terms & Privacy 📜</h1>
          <p className="text-indigo-200 text-sm mt-1">Last updated: June 2025</p>
        </div>

        {/* Tab switcher inside header */}
        <div className="relative bg-white/20 rounded-2xl p-1 flex gap-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => { setActiveTab(s.id as any); setOpenItem('0') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === s.id ? 'tab-active' : 'tab-inactive'}`}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 pb-16 space-y-3">

        {/* Summary badge */}
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3.5">
          <span className="text-xl mt-0.5">💡</span>
          <div>
            <p className="text-indigo-700 text-sm font-semibold">Plain English summary</p>
            <p className="text-indigo-500 text-xs mt-0.5 leading-relaxed">
              {activeTab === 'terms'
                ? 'We connect you with trusted cleaning professionals. Book freely, cancel with notice, and we\'ll always be fair.'
                : 'We collect only what\'s needed to serve you, never sell your data, and you can delete your account anytime.'}
            </p>
          </div>
        </div>

        {/* Accordion sections */}
        <div className="card overflow-hidden">
          {section.content.map((item, i) => {
            const key    = String(i)
            const isOpen = openItem === key
            return (
              <div key={key} className={i < section.content.length - 1 ? 'border-b border-gray-50' : ''}>
                <button
                  onClick={() => setOpenItem(isOpen ? null : key)}
                  className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left">
                  <p className="text-gray-800 text-sm font-semibold leading-snug flex-1">{item.title}</p>
                  <div className={`transition-transform duration-300 mt-0.5 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div className={`accordion-body ${isOpen ? 'open' : 'closed'}`}>
                  <p className="text-gray-500 text-sm leading-relaxed px-5 pb-5">{item.body}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Contact for legal queries */}
        <div className="text-center pt-2">
          <p className="text-gray-400 text-xs">Questions about our policies?</p>
          <a href="mailto:legal@cleenzo.in" className="text-indigo-500 text-xs font-semibold mt-0.5 block">legal@cleenzo.in</a>
          <p className="text-gray-300 text-xs mt-4">Cleenzo Technologies Pvt. Ltd. · Mumbai, India</p>
          <p className="text-gray-300 text-xs">CIN: U74999MH2024PTC000000</p>
        </div>

      </div>
    </div>
  )
}