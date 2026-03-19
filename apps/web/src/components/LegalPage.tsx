'use client'

import { useT } from '@/hooks/useT'

type LegalSection = {
  titleKey:
    | 'privacySection1Title'
    | 'privacySection2Title'
    | 'privacySection3Title'
    | 'privacySection4Title'
    | 'privacySection5Title'
    | 'termsSection1Title'
    | 'termsSection2Title'
    | 'termsSection3Title'
    | 'termsSection4Title'
    | 'termsSection5Title'
  bodyKey:
    | 'privacySection1Body'
    | 'privacySection2Body'
    | 'privacySection3Body'
    | 'privacySection4Body'
    | 'privacySection5Body'
    | 'termsSection1Body'
    | 'termsSection2Body'
    | 'termsSection3Body'
    | 'termsSection4Body'
    | 'termsSection5Body'
}

type LegalPageProps = {
  titleKey: 'privacyTitle' | 'termsTitle'
  introKey: 'privacyIntro' | 'termsIntro'
  sections: LegalSection[]
}

export default function LegalPage({ titleKey, introKey, sections }: LegalPageProps) {
  const t = useT()

  return (
    <main className="bg-neutral-50">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <div className="rounded-[2rem] border border-neutral-200 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:px-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            EchoHealth
          </p>
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {t[titleKey]}
          </h1>
          <p className="mt-3 text-sm text-slate-500">{t.legalLastUpdated}</p>
          <p className="mt-8 text-base leading-8 text-slate-600">
            {t[introKey]}
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.titleKey}>
                <h2 className="text-lg font-semibold text-slate-900">{t[section.titleKey]}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  {t[section.bodyKey]}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
