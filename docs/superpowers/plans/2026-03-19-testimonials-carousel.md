# Testimonials Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage static testimonial block with a dual-row scrolling testimonial wall with realistic avatars and bilingual content.

**Architecture:** Keep testimonial data local to the web app, render the section through a focused reusable component, and use CSS marquee animation with duplicated rows for seamless looping. Preserve reduced-motion behavior by degrading to a static horizontally scrollable list.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Playwright

---

### Task 1: Lock the desired UI with failing tests

**Files:**
- Modify: `apps/web/e2e/landing.spec.ts`

- [ ] Step 1: Add a test that expects a testimonials region with multiple cards, avatars, and at least one scrolling track marker.
- [ ] Step 2: Run `pnpm --filter web test:e2e --project=chromium apps/web/e2e/landing.spec.ts -g "renders testimonials carousel"` and confirm it fails before implementation.

### Task 2: Build localized testimonial carousel UI

**Files:**
- Create: `apps/web/src/components/TestimonialsCarousel.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/lib/translations/en.ts`
- Modify: `apps/web/src/lib/translations/zh.ts`
- Modify: `apps/web/src/app/globals.css`

- [ ] Step 1: Add richer testimonial data including avatar path, role, tag, and optional accent variant.
- [ ] Step 2: Implement the carousel component with dual rows on desktop and a single row on mobile.
- [ ] Step 3: Add marquee and reduced-motion styles in `globals.css`.
- [ ] Step 4: Swap the old static testimonial section in `page.tsx` for the new component.

### Task 3: Verify layout and responsiveness

**Files:**
- Modify: `apps/web/e2e/responsive.spec.ts`

- [ ] Step 1: Add a mobile assertion that the testimonial section does not cause horizontal page overflow.
- [ ] Step 2: Run focused Playwright coverage for landing and mobile responsive specs.
- [ ] Step 3: Run `pnpm --filter web exec eslint src/app/page.tsx src/components/TestimonialsCarousel.tsx e2e/landing.spec.ts e2e/responsive.spec.ts`.
