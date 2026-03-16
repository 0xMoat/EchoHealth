import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''

interface TokenPayload {
  userId: string
  email?: string
}

export function signToken(payload: TokenPayload, expiresIn: string = '7d'): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set')
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any })
}

export function verifyToken(token: string): TokenPayload {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set')
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & TokenPayload
  return { userId: decoded.userId, email: decoded.email }
}
