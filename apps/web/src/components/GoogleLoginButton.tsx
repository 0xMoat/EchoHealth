'use client'

import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/hooks/useT'

export default function GoogleLoginButton() {
  const { login } = useAuth()
  const router = useRouter()
  const t = useT()
  const [error, setError] = useState<string | null>(null)

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError(t.noCredential)
      return
    }
    try {
      await login(response.credential)
      router.push('/dashboard')
    } catch {
      setError(t.loginFailed)
    }
  }

  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError(t.googleLoginFailed)}
        shape="rectangular"
        size="large"
        text="signin_with"
        width="300"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
