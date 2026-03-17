const en = {
  // Navbar
  upgradeProBtn: '✨ Upgrade Pro',
  proBadge: '✨ Pro',
  langEN: 'EN',
  langZH: '中',

  // QuotaBar
  freeLimit: 'Free limit reached ❤️',
  upgradeToHelp: 'Upgrade to keep helping your family',
  upgrade: 'Upgrade →',

  // Upload blocker
  allFreeUsed: "You've used all 3 free reports",
  upgradeToKeep: 'Upgrade to keep interpreting health reports\nfor you and your family',
  subscribeMonthly: 'Subscribe $4.99/mo',
  buyPass: '$7.99 Pass',
  seePricing: 'See pricing',

  // Pricing page
  pricingTagline: '❤️ GIVE YOUR FAMILY THE CARE THEY DESERVE',
  pricingTitle: 'Simple, Honest Pricing',
  pricingSubtitle: 'No surprises. Cancel anytime.',
  freePlan: 'Free',
  forever: 'forever',
  currentPlan: 'Current Plan',
  proPlan: 'Pro',
  popular: 'POPULAR',
  cancelAnytime: 'Cancel anytime',
  subscribeNow: 'Subscribe Now →',
  passTitle: '30-Day Pass',
  oneTime: 'one-time, no auto-renew',
  buyPassBtn: 'Buy Pass →',
  secureCheckout: '🔒 Secure checkout via Creem · Instant activation · Cancel anytime',

  // Free plan features
  free3Reports: '3 reports / month',
  freeImagesAndPdf: 'Images & PDF support',
  freeAutoLang: 'Auto language detection',
  freeVideoHistory: 'Video history: 30 days',
  freeQueue: 'Standard queue',

  // Pro plan features
  pro30Reports: '30 reports / month',
  pro10Images: 'Up to 10 images/report',
  proPdf20: 'PDF up to 20 pages',
  proVideoHistory: 'Video history: 1 year',
  proPriority: 'Priority processing',

  // Pass plan features
  passAllPro: 'All Pro features',
  pass30Reports: '30 reports in 30 days',
  passExamSeason: 'Perfect for exam season',
  passNoSub: 'No subscription needed',
  passInstant: 'Instant activation',

  // Toast
  welcomePro: '🎉 Welcome to Pro! You now have 30 reports/month.',
  paymentPending: 'Payment received — your Pro access will activate shortly.',
} as const

export default en
export type TranslationKey = keyof typeof en
