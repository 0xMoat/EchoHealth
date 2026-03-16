import Link from 'next/link'
import Footer from '@/components/Footer'

const steps = [
  {
    number: '01',
    title: 'Upload',
    description: 'Take a photo or upload a PDF of your health checkup report.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'AI Analysis',
    description: 'Our AI reads every metric, flags anomalies, and prepares a clear breakdown.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Watch Video',
    description: 'Receive a personalized video that walks you through your results in plain language.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
      </svg>
    ),
  },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle dot grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-28 sm:pb-32 sm:pt-36">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="mb-6 flex items-center gap-2">
              <div className="h-px w-8 bg-neutral-400" />
              <span className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                AI-Powered Health Insights
              </span>
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Your Health Report,{' '}
              <span className="relative">
                Explained in Video
                <span className="absolute -bottom-1 left-0 h-[3px] w-full bg-neutral-900/10" />
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-600">
              Upload your checkup results and get a personalized video that
              breaks down every metric in plain, understandable language.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-neutral-900/10 transition-all hover:bg-neutral-700 hover:shadow-neutral-900/20"
              >
                Try it free
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Decorative element */}
          <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 lg:block">
            <div className="relative h-72 w-72">
              <div className="absolute inset-0 rounded-full border border-neutral-200" />
              <div className="absolute inset-6 rounded-full border border-neutral-200/70" />
              <div className="absolute inset-12 rounded-full border border-neutral-200/50" />
              <div className="absolute inset-[4.5rem] rounded-full bg-neutral-100" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-neutral-200 bg-neutral-50/50">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="mb-16 max-w-lg">
            <span className="text-xs font-medium uppercase tracking-widest text-neutral-500">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Three simple steps
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              From paper report to video explanation in under two minutes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative rounded-2xl border border-neutral-200 bg-white p-8 transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
                    {step.icon}
                  </div>
                  <span className="text-xs font-medium tabular-nums text-neutral-300">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Connector line between cards (visual only, hidden on mobile) */}
          <div className="mt-8 hidden items-center justify-center gap-2 sm:flex">
            <div className="h-px w-16 bg-neutral-300" />
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <div className="h-px w-16 bg-neutral-300" />
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <div className="h-px w-16 bg-neutral-300" />
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
