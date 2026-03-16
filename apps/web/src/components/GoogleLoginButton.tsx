'use client'

import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function GoogleLoginButton() {
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError('No credential received')
      return
    }
    try {
      await login(response.credential)
      router.push('/dashboard')
    } catch {
      setError('Login failed. Please try again.')
    }
  }

  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError('Google login failed')}
        shape="rectangular"
        size="large"
        text="signin_with"
        width="300"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
