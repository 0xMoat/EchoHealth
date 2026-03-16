import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('JWT_SECRET', 'test-secret-key-for-unit-tests')

describe('JWT utilities', () => {
  it('signs and verifies a token', async () => {
    const { signToken, verifyToken } = await import('../lib/jwt.js')
    const token = signToken({ userId: 'user_123', email: 'test@example.com' })
    const payload = verifyToken(token)
    expect(payload.userId).toBe('user_123')
    expect(payload.email).toBe('test@example.com')
  })

  it('rejects expired tokens', async () => {
    const { signToken, verifyToken } = await import('../lib/jwt.js')
    const token = signToken({ userId: 'user_123' }, '0s')
    await new Promise(r => setTimeout(r, 100))
    expect(() => verifyToken(token)).toThrow()
  })

  it('rejects tampered tokens', async () => {
    const { verifyToken } = await import('../lib/jwt.js')
    expect(() => verifyToken('invalid.token.here')).toThrow()
  })
})
