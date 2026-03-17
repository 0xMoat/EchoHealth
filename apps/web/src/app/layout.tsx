import type { Metadata, Viewport } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'EchoHealth — AI Health Report Video Interpreter',
  description: 'Upload your health checkup report and get a personalized video explanation powered by AI.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
