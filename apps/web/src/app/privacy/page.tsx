import LegalPage from '@/components/LegalPage'

export default function PrivacyPage() {
  return (
    <LegalPage
      titleKey="privacyTitle"
      introKey="privacyIntro"
      sections={[
        { titleKey: 'privacySection1Title', bodyKey: 'privacySection1Body' },
        { titleKey: 'privacySection2Title', bodyKey: 'privacySection2Body' },
        { titleKey: 'privacySection3Title', bodyKey: 'privacySection3Body' },
        { titleKey: 'privacySection4Title', bodyKey: 'privacySection4Body' },
        { titleKey: 'privacySection5Title', bodyKey: 'privacySection5Body' },
      ]}
    />
  )
}
