import { API_BASE } from './constants'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.json()
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // No Content-Type header — browser sets multipart boundary automatically
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.json()
}

export { ApiError }
