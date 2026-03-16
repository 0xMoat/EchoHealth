'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
