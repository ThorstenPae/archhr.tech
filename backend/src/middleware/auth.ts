import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'hr-app-secret-change-in-production'

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; companyId: number; employeeId?: number | null }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht authentifiziert.' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET) as any
    next()
  } catch {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen.' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Nicht authentifiziert.' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Keine Berechtigung.' })
    next()
  }
}
