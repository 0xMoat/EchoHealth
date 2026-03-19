# Homepage Testimonials Carousel Design

## Goal

Replace the static testimonial block on the homepage with a higher-trust social proof section that feels active, human, and credible.

The new section should:

- show multiple testimonial cards instead of 2 static quotes
- include realistic family-user avatars
- auto-scroll continuously to suggest ongoing usage
- remain calm, trustworthy, and readable on mobile
- preserve bilingual support and reduced-motion accessibility

## User And Brand Fit

The primary audience is adult children helping parents understand health reports. The section should reinforce:

- reassurance: other families are already using this successfully
- credibility: real people, not anonymous marketing copy
- warmth: humane and family-centered, not social-media noisy

The visual tone should stay aligned with the existing product direction:

- light-first
- soft neutral backgrounds
- slate text
- cyan trust cues
- restrained motion

## Recommended Direction

Use a dual-track horizontally scrolling testimonial wall.

- desktop: two rows of cards, each row scrolling continuously in the opposite direction
- mobile: one row only, slower motion, fewer simultaneous cards visible
- cards repeat in sequence to create a seamless loop

This gives stronger social proof than a single carousel while still fitting the calm EchoHealth tone.

## Section Structure

### Header

Keep the existing testimonial heading area, but strengthen the supporting message so it frames the section as active family usage rather than generic praise.

Header content:

- title: existing localized testimonial title can remain
- subtitle: add a short supporting line about families using EchoHealth to explain reports more clearly and with less stress

### Testimonial Wall

Under the heading:

- a masked overflow container
- row 1 scrolling right-to-left
- row 2 scrolling left-to-right
- each row duplicates its testimonial list to create an infinite-loop effect

### Card Anatomy

Each card contains:

- avatar
- name
- role or context label
- short quote
- optional small benefit tag for selected cards

Cards should be compact enough to feel numerous, but large enough to read quickly.

## Visual Design

### Card Style

Cards should feel polished and trustworthy, not like a social feed.

Recommended treatment:

- soft off-white or warm white card background
- subtle border
- gentle shadow or elevated surface, but restrained
- rounded corners
- consistent spacing and typography

Allow 2 to 3 subtle card variants for rhythm:

- standard card
- highlighted card with slightly tinted background
- slightly taller card for one longer quote

Variation should be small. The section should still read as a coherent system.

### Avatar Style

Avatars should feel real and believable.

Requirements:

- photo-style portrait avatars, not illustrations
- natural lighting, neutral backgrounds, non-glamorous presentation
- representation biased toward adult children users, with a small number of older-parent profiles
- visually consistent crop and size

Avoid:

- AI-generated uncanny faces
- cartoon avatars
- heavily stylized stock photos
- overly corporate headshots

## Content Strategy

Expand from 2 testimonials to 6 to 8 short quotes.

Each quote should be:

- short enough to scan during motion
- concrete rather than generic
- emotionally grounded
- focused on outcomes like clarity, relief, speed, sharing with parents, and reduced anxiety

Suggested content mix:

- understanding blood test numbers
- sharing video with parents
- saving time for busy caregivers
- reducing stress before follow-up appointments
- making reports easier to explain across generations
- preferring video over reading dense results

Each testimonial should include:

- localized quote
- localized role/context label
- avatar reference

## Motion Design

The motion should communicate liveliness without becoming decorative noise.

Rules:

- linear, slow, continuous marquee motion
- row speeds should differ slightly for a natural feel
- second row moves in the opposite direction
- on hover, pause row motion on desktop
- for `prefers-reduced-motion: reduce`, disable the marquee and show a static list or horizontally scrollable row

Avoid:

- bounce
- scale pulses
- staggered hover theatrics
- abrupt resets

## Responsive Behavior

### Desktop

- two rows
- 3 to 4 cards partially visible per row depending on width
- larger mask fade on left/right edges

### Mobile

- single row
- slightly larger cards relative to viewport
- slower animation or optionally no auto-loop if readability suffers
- quotes may clamp to preserve consistent card height

## Implementation Plan

### Data

Replace the inline 2-item testimonial array in `apps/web/src/app/page.tsx` with a richer localized testimonial dataset.

Prefer moving testimonial content into a dedicated structure so each entry can hold:

- quote
- author
- role
- avatar
- optional tag
- optional style variant

### Components

Introduce a focused testimonial UI component, likely under `apps/web/src/components/`, for example:

- `TestimonialsCarousel.tsx`

Supporting subparts can stay internal to the file unless complexity grows.

Component responsibilities:

- accept localized testimonial data
- render one or two rows based on viewport
- duplicate rows for loop continuity
- apply animation classes
- render avatars and tags consistently

### Assets

Avatar images should live in the web app public assets area, for example:

- `apps/web/public/testimonials/`

Use optimized static files with consistent dimensions.

### Styling

Prefer Tailwind utility classes plus a few global animation utilities in `globals.css` if needed for reusable marquee keyframes and reduced-motion handling.

## Accessibility

- preserve semantic heading structure
- keep testimonial text readable without requiring motion
- disable auto motion for reduced-motion users
- ensure sufficient contrast for names, roles, and quote text
- treat avatars as decorative if they add no unique information, otherwise use concise alt text

## Testing

Add focused coverage for:

- testimonial section renders multiple cards
- localized content still switches correctly between English and Chinese
- reduced-motion fallback does not break layout
- desktop and mobile layouts remain stable

If browser-level animation assertions are too brittle, prefer structural assertions and targeted layout measurements over timing-sensitive motion tests.

## Risks And Mitigations

### Risk: Section feels noisy

Mitigation:

- keep palette restrained
- use small card variation only
- keep quotes short

### Risk: Avatars feel fake

Mitigation:

- use realistic, consistent photo-style portraits
- avoid obvious stock-photo polish

### Risk: Motion hurts readability

Mitigation:

- keep speed slow
- use short quotes
- pause on hover
- disable for reduced-motion users

## Success Criteria

The redesign succeeds if:

- the testimonial section feels more trustworthy and alive than the current 2-quote layout
- users can quickly scan multiple real-looking testimonials
- the section remains calm and readable on mobile
- the motion feels subtle rather than flashy
- Chinese and English both look intentional
