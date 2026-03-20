import type { Metadata, Viewport } from 'next'
import { DM_Sans, Instrument_Serif, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-heading' })
const notoSansSC = Noto_Sans_SC({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-cjk' })
const notoSerifSC = Noto_Serif_SC({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-cjk-serif' })

export const metadata: Metadata = {
  title: 'EchoHealth — AI Health Report Video Interpreter',
  description: 'Upload your health checkup report and get a personalized video explanation powered by AI.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable} ${notoSansSC.variable} ${notoSerifSC.variable}`}>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-800 focus:shadow-lg focus:ring-2 focus:ring-cyan-600"
        >
          Skip to content
        </a>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
