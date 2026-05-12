import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest, JWT_SECRET, requireRole } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

function makeToken(user: any) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, companyId: user.companyId, employeeId: user.employeeId ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function safeUser(user: any) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, companyId: user.companyId, employeeId: user.employeeId ?? null }
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { companyName, email, password, firstName, lastName } = req.body
  if (!companyName || !email || !password || !firstName || !lastName)
    return res.status(400).json({ error: 'Alle Felder sind Pflicht.' })
  if (password.length < 8)
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' })

  try {
    if (await prisma.user.findUnique({ where: { email } }))
      return res.status(409).json({ error: 'E-Mail bereits vergeben.' })

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now()
    const hashed = await bcrypt.hash(password, 12)
    const company = await prisma.company.create({ data: { name: companyName, slug } })
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, role: 'ADMIN', companyId: company.id },
    })
    await prisma.department.create({ data: { name: 'Allgemein', companyId: company.id } })

    res.status(201).json({
      token: makeToken(user),
      user: safeUser(user),
      company: { id: company.id, name: company.name },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registrierung fehlgeschlagen.' })
  }
})

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' })

  try {
    const user = await prisma.user.findUnique({ where: { email }, include: { company: true } })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' })

    res.json({
      token: makeToken(user),
      user: safeUser(user),
      company: { id: user.company.id, name: user.company.name },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login fehlgeschlagen.' })
  }
})

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { company: true } })
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden.' })
  res.json({ ...safeUser(user), company: user.company })
})

// ─── User management (ADMIN only) ─────────────────────────────────────────

// GET /auth/users
router.get('/users', authenticate, requireRole('ADMIN', 'MANAGEMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user!.companyId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, employeeId: true, createdAt: true,
        employee: { select: { id: true, firstName: true, lastName: true, position: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }) }
})

// POST /auth/users  — create user with role
router.post('/users', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { email, password, firstName, lastName, role, employeeId } = req.body
  if (!email || !password || !firstName || !lastName || !role)
    return res.status(400).json({ error: 'Pflichtfelder fehlen.' })
  if (password.length < 8)
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' })
  const VALID_ROLES = ['ADMIN', 'MANAGEMENT', 'EMPLOYEE']
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Ungültige Rolle.' })
  try {
    if (await prisma.user.findUnique({ where: { email } }))
      return res.status(409).json({ error: 'E-Mail bereits vergeben.' })

    if (employeeId) {
      const existing = await prisma.user.findUnique({ where: { employeeId: parseInt(employeeId) } })
      if (existing) return res.status(409).json({ error: 'Mitarbeiter hat bereits einen Account.' })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email, password: hashed, firstName, lastName, role,
        companyId: req.user!.companyId,
        employeeId: employeeId ? parseInt(employeeId) : null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, position: true } } },
    })
    res.status(201).json(safeUser(user))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Erstellen.' }) }
})

// PUT /auth/users/:id — update role or employeeId
router.put('/users/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { role, employeeId } = req.body
  try {
    const target = await prisma.user.findFirst({ where: { id, companyId: req.user!.companyId } })
    if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' })

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(employeeId !== undefined && { employeeId: employeeId ? parseInt(employeeId) : null }),
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, position: true } } },
    })
    res.json(safeUser(updated))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }) }
})

// DELETE /auth/users/:id
router.delete('/users/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  if (id === req.user!.id) return res.status(400).json({ error: 'Eigenen Account nicht löschbar.' })
  try {
    const result = await prisma.user.deleteMany({ where: { id, companyId: req.user!.companyId } })
    if (result.count === 0) return res.status(404).json({ error: 'Nicht gefunden.' })
    res.status(204).send()
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }) }
})

// ─── GET /auth/company ────────────────────────────────────────────────────
router.get('/company', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      select: { id: true, name: true, slug: true, whistleblowSlaDays: true },
    })
    res.json(company)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }) }
})

// ─── PUT /auth/company ────────────────────────────────────────────────────
router.put('/company', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { whistleblowSlaDays } = req.body
  const data: any = {}
  if (whistleblowSlaDays !== undefined) {
    const days = parseInt(whistleblowSlaDays)
    if (isNaN(days) || days < 1 || days > 365)
      return res.status(400).json({ error: 'SLA-Tage müssen zwischen 1 und 365 liegen.' })
    data.whistleblowSlaDays = days
  }
  try {
    const company = await prisma.company.update({
      where: { id: req.user!.companyId },
      data,
      select: { id: true, name: true, slug: true, whistleblowSlaDays: true },
    })
    res.json(company)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }) }
})

export default router
