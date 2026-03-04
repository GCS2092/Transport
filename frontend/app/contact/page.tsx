'use client'

import { useTranslation } from '@/lib/i18n'

export default function ContactPage() {
  const { t } = useTranslation()
  const c = t.contact

  return (
    <div className="bg-[var(--bg)] pb-6">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--ink)]">{c.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{c.subtitle}</p>
        </div>

{(() => {
          const contacts = [
            {
              label: 'Téléphone', value: '+221 77 000 00 00', sub: c.phoneSub,
              href: 'tel:+221770000000',
              svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 6.18 2 2 0 0 1 4.11 4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 11.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
            },
            {
              label: 'WhatsApp', value: '+221 77 000 00 00', sub: c.whatsappSub,
              href: 'https://wa.me/221770000000',
              svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
            },
            {
              label: 'Email', value: 'contact@vtcdakar.com', sub: c.emailSub,
              href: 'mailto:contact@vtcdakar.com',
              svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
            },
            {
              label: 'Adresse', value: 'Dakar, Sénégal', sub: c.addressSub,
              href: null,
              svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
            },
          ]
          return (
            <div className="bg-[var(--primary)] rounded-2xl p-5 mb-4 space-y-4">
              {contacts.map(item => (
                <a key={item.label} href={item.href || undefined} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    {item.svg}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-xs">{item.label}</p>
                    <p className="text-white font-semibold text-sm truncate">{item.value}</p>
                    <p className="text-white/50 text-xs">{item.sub}</p>
                  </div>
                  {item.href && (
                    <svg className="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  )}
                </a>
              ))}
            </div>
          )
        })()}

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--ink)]">{c.faqTitle}</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {c.faq.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                  <span className="text-sm font-semibold text-[var(--ink)] pr-4">{item.q}</span>
                  <span className="text-[var(--muted)] text-lg flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-[var(--ink2)] leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <a
          href="/"
          className="block w-full py-4 bg-[var(--accent)] text-white rounded-2xl text-sm font-bold text-center hover:bg-[var(--accent-hover)] transition-all"
        >
          {c.cta}
        </a>

      </div>
    </div>
  )
}
