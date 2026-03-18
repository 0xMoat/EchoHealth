'use client'

import Link from 'next/link'
import Footer from '@/components/Footer'
import { useT } from '@/hooks/useT'
import { PRO_MONTHLY_PRICE, PASS_PRICE } from '@/lib/constants'

const stepIcons = [
  <svg key="upload" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>,
  <svg key="ai" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  </svg>,
  <svg key="video" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>,
]

export default function Home() {
  const t = useT()

  const steps = [
    { number: '01', title: t.stepUploadTitle, description: t.stepUploadDesc, icon: stepIcons[0] },
    { number: '02', title: t.stepAITitle, description: t.stepAIDesc, icon: stepIcons[1] },
    { number: '03', title: t.stepVideoTitle, description: t.stepVideoDesc, icon: stepIcons[2] },
  ]

  const benefits = [
    { title: t.benefit1Title, desc: t.benefit1Desc },
    { title: t.benefit2Title, desc: t.benefit2Desc },
    { title: t.benefit3Title, desc: t.benefit3Desc },
  ]

  const testimonials = [
    { quote: t.testimonial1Quote, author: t.testimonial1Author, role: t.testimonial1Role },
    { quote: t.testimonial2Quote, author: t.testimonial2Author, role: t.testimonial2Role },
  ]

  return (
    <>
      {/* ── 1. Hero ── */}
      <section id="main-content" className="overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-28 sm:pb-20 sm:pt-36">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-slate-800 text-balance sm:text-5xl lg:text-6xl">
              {t.heroTitle1}{' '}
              <span className="text-cyan-700">{t.heroTitle2}</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
              {t.heroDesc}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-[background-color] hover:bg-cyan-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
              >
                {t.tryItFree}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                {t.howItWorks} &darr;
              </a>
            </div>
          </div>

          {/* Product preview placeholder */}
          <div className="mt-16 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="flex aspect-video items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
                <span className="text-sm">{t.heroPreview}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Benefits (核心优势) ── */}
      <section className="border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800 text-balance sm:text-4xl">
            {t.benefitsTitle}
          </h2>
          <p className="mt-3 max-w-md text-base text-slate-500">
            {t.benefitsSubtitle}
          </p>

          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-12">
            {benefits.map((b, i) => (
              <div key={i} className="animate-fadeInUp" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mb-4 h-0.5 w-8 rounded-full bg-cyan-600" />
                <h3 className="text-base font-semibold text-slate-800">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section id="how-it-works" className="border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800 text-balance sm:text-4xl">
            {t.threeSteps}
          </h2>
          <p className="mt-3 max-w-md text-base text-slate-500">
            {t.threeStepsDesc}
          </p>

          <div className="mt-14 space-y-12 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-x-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="animate-fadeInUp"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-display text-3xl font-bold text-slate-200">{step.number}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Features (功能介绍) ── */}
      <section className="border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800 text-balance sm:text-4xl">
            {t.featuresTitle}
          </h2>

          {/* Feature 1: text left, mockup right */}
          <div className="mt-16 grid grid-cols-1 items-center gap-10 sm:grid-cols-2 sm:gap-16">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-800">{t.feature1Title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{t.feature1Desc}</p>
            </div>
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50" aria-label={t.featureMockReport}>
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="text-xs">{t.featureMockReport}</span>
              </div>
            </div>
          </div>

          {/* Feature 2: mockup left, text right */}
          <div className="mt-16 grid grid-cols-1 items-center gap-10 sm:grid-cols-2 sm:gap-16">
            <div className="order-last sm:order-first flex aspect-[4/3] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50" aria-label={t.featureMockVideo}>
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span className="text-xs">{t.featureMockVideo}</span>
              </div>
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-slate-800">{t.feature2Title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{t.feature2Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Testimonials (用户证言) ── */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800 text-balance sm:text-4xl">
            {t.testimonialsTitle}
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-12">
            {testimonials.map((item, i) => (
              <blockquote key={i} className="animate-fadeInUp" style={{ animationDelay: `${i * 120}ms` }}>
                <p className="text-base leading-relaxed text-slate-700">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <footer className="mt-4">
                  <p className="text-sm font-semibold text-slate-800">{item.author}</p>
                  <p className="text-sm text-slate-500">{item.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CTA (行动召唤) ── */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-slate-400">
            {t.ctaDesc}
          </p>
          <Link
            href="/upload"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-[background-color] hover:bg-cyan-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {t.ctaButton}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── 7. Pricing preview (价格方案) ── */}
      <section className="border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
              {t.pricingPreviewTitle}
            </h2>
            <p className="mt-3 text-base text-slate-500">{t.pricingPreviewDesc}</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Free */}
            <div className="rounded-xl border border-neutral-200 px-6 py-5 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.freePlan}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-800">$0</p>
              <p className="mt-1 text-xs text-slate-500">{t.forever}</p>
            </div>

            {/* Pro */}
            <div className="rounded-xl bg-gradient-to-br from-red-400 to-orange-600 px-6 py-5 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">{t.proPlan}</p>
              <p className="mt-2 text-3xl font-extrabold">${PRO_MONTHLY_PRICE}<span className="text-base font-medium text-white/70">{t.pricingPreviewPerMonth}</span></p>
              <p className="mt-1 text-xs text-white/70">{t.cancelAnytime}</p>
            </div>

            {/* Pass */}
            <div className="rounded-xl border-2 border-amber-300 px-6 py-5 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">{t.passTitle}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-800">${PASS_PRICE}</p>
              <p className="mt-1 text-xs text-slate-500">{t.pricingPreviewOneTime}</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="text-sm font-medium text-cyan-700 transition-colors hover:text-cyan-800"
            >
              {t.pricingPreviewLink} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. Footer ── */}
      <Footer />
    </>
  )
}
