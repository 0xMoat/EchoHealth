'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { UploadModalProvider } from '@/contexts/UploadModalContext'
import GlobalUploadModal from '@/components/GlobalUploadModal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <LanguageProvider>
          <UploadModalProvider>
            {children}
            <GlobalUploadModal />
          </UploadModalProvider>
        </LanguageProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
