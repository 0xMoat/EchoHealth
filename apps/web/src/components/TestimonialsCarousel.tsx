'use client'

import Image from 'next/image'

type TestimonialVariant = 'default' | 'tinted' | 'tall'

export type TestimonialItem = {
  quote: string
  author: string
  role: string
  tag?: string
  avatar: string
  variant?: TestimonialVariant
}

type TestimonialsCarouselProps = {
  title: string
  subtitle: string
  items: TestimonialItem[]
}

const CARD_VARIANTS: Record<TestimonialVariant, string> = {
  default: 'bg-white/95',
  tinted: 'bg-cyan-50/80',
  tall: 'bg-rose-50/70 md:min-h-[23rem]',
}

function TestimonialCard({
  item,
  exposeForTesting = false,
}: {
  item: TestimonialItem
  exposeForTesting?: boolean
}) {
  return (
    <article
      data-testid={exposeForTesting ? 'testimonial-card' : undefined}
      className={`flex min-h-[20rem] w-[17.5rem] shrink-0 flex-col justify-between rounded-[1.75rem] border border-white/80 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-sm md:min-h-[21rem] md:w-[18.75rem] ${CARD_VARIANTS[item.variant ?? 'default']}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <Image
            data-testid={exposeForTesting ? 'testimonial-avatar' : undefined}
            src={item.avatar}
            alt={`${item.author} avatar`}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-white"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{item.author}</p>
            <p className="truncate text-sm text-slate-500">{item.role}</p>
          </div>
        </div>

        <p className="mt-4 min-h-[8.75rem] text-[0.95rem] leading-7 text-slate-700 md:min-h-[10.5rem]">
          &ldquo;{item.quote}&rdquo;
        </p>
      </div>

      {item.tag ? (
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-white/85 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {item.tag}
          </span>
        </div>
      ) : null}
    </article>
  )
}

function MarqueeTrack({
  items,
  reverse = false,
  durationClass,
  className = '',
}: {
  items: TestimonialItem[]
  reverse?: boolean
  durationClass: string
  className?: string
}) {
  return (
    <div className={`marquee-fade overflow-hidden ${className}`}>
      <div
        data-testid="testimonial-track"
        className={`marquee-track ${durationClass} ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} hover:[animation-play-state:paused] motion-reduce:animate-none`}
      >
        {[0, 1].map((groupIndex) => (
          <div
            key={groupIndex}
            className="flex shrink-0 gap-4 pr-4 md:gap-5 md:pr-5"
            aria-hidden={groupIndex === 1}
          >
            {items.map((item, itemIndex) => (
              <TestimonialCard
                key={`${groupIndex}-${item.author}-${itemIndex}`}
                item={item}
                exposeForTesting={groupIndex === 0}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TestimonialsCarousel({ title, subtitle, items }: TestimonialsCarouselProps) {
  const midpoint = Math.ceil(items.length / 2)
  const firstRow = items.slice(0, midpoint)
  const secondRow = items.slice(midpoint)

  return (
    <section
      aria-label={title}
      className="relative overflow-hidden border-t border-neutral-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
    >
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800 text-balance sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 min-h-[3.5rem] max-w-xl text-base leading-7 text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="mt-12 space-y-4 md:mt-14 md:space-y-5">
          <MarqueeTrack items={firstRow} durationClass="marquee-duration-slow" />
          <MarqueeTrack
            items={secondRow}
            reverse
            durationClass="marquee-duration-fast"
            className="hidden md:block"
          />
        </div>
      </div>
    </section>
  )
}
