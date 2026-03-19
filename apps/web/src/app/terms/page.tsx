import LegalPage from '@/components/LegalPage'

export default function TermsPage() {
  return (
    <LegalPage
      titleKey="termsTitle"
      introKey="termsIntro"
      sections={[
        { titleKey: 'termsSection1Title', bodyKey: 'termsSection1Body' },
        { titleKey: 'termsSection2Title', bodyKey: 'termsSection2Body' },
        { titleKey: 'termsSection3Title', bodyKey: 'termsSection3Body' },
        { titleKey: 'termsSection4Title', bodyKey: 'termsSection4Body' },
        { titleKey: 'termsSection5Title', bodyKey: 'termsSection5Body' },
      ]}
    />
  )
}
