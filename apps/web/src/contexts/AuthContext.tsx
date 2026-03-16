'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<User>('/api/saas/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (idToken: string) => {
    await apiFetch<{ userId: string; isPro: boolean }>('/api/saas/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
    await refresh()
  }

  const logout = async () => {
    await apiFetch('/api/saas/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
