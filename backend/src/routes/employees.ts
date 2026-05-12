import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { runWorkflows } from '../lib/workflowEngine';

const router = Router();
router.use(authenticate);

function isEmployee(req: AuthRequest) { return req.user!.role === 'EMPLOYEE' }

// ─── GET /api/employees ────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  // EMPLOYEE: redirect to own record only
  if (isEmployee(req)) {
    if (!req.user!.employeeId) return res.status(403).json({ error: 'Kein verknüpfter Mitarbeiter.' })
    const emp = await prisma.employee.findFirst({
      where: { id: req.user!.employeeId, companyId: req.user!.companyId },
      include: { department: { select: { id: true, name: true } } },
    })
    return res.json({ data: emp ? [emp] : [], meta: { total: 1, page: 1, limit: 1, totalPages: 1 } })
  }
  try {
    const companyId = req.user!.companyId;
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip   = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const deptId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;

    const where: Prisma.EmployeeWhereInput = {
      companyId,
      ...(status && { status }),
      ...(deptId && { departmentId: deptId }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName:  { contains: search } },
          { email:     { contains: search } },
          { position:  { contains: search } },
        ],
      }),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: { department: { select: { id: true, name: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      data: employees,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Mitarbeiter.' });
  }
});

// ─── GET /api/employees/:id ────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  if (isEmployee(req) && req.user!.employeeId !== id)
    return res.status(403).json({ error: 'Keine Berechtigung.' })

  try {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        department:     { select: { id: true, name: true } },
        absenceRequests: { orderBy: { startDate: 'desc' }, take: 10 },
        user:           { select: { id: true, email: true, role: true } },
      },
    });

    if (!employee) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Mitarbeiters.' });
  }
});

// ─── POST /api/employees ───────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  if (isEmployee(req)) return res.status(403).json({ error: 'Keine Berechtigung.' })

  const { firstName, lastName, email, departmentId, position, startDate, status,
          userRole, userPassword } = req.body;

  if (!firstName || !lastName || !email || !position || !startDate)
    return res.status(400).json({ error: 'Pflichtfelder fehlen.', required: ['firstName', 'lastName', 'email', 'position', 'startDate'] });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });

  if (userRole && (!userPassword || userPassword.length < 8))
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' });

  try {
    const employee = await prisma.employee.create({
      data: {
        companyId: req.user!.companyId,
        firstName, lastName, email, position,
        startDate: new Date(startDate),
        status: status ?? 'ACTIVE',
        ...(departmentId && { departmentId: parseInt(departmentId) }),
      },
    });

    // Try to create linked user — independent of employee creation
    let userWarning: string | null = null;
    if (userRole && userPassword) {
      try {
        const bcrypt = await import('bcryptjs')
        const hashed = await bcrypt.hash(userPassword, 12)
        await prisma.user.create({
          data: {
            email, password: hashed, firstName, lastName,
            role: userRole,
            companyId: req.user!.companyId,
            employeeId: employee.id,
          },
        })
      } catch {
        userWarning = 'Mitarbeiter angelegt, aber Login-Account konnte nicht erstellt werden (E-Mail bereits vergeben?).'
      }
    }

    const full = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        department: { select: { id: true, name: true } },
        user:       { select: { id: true, email: true, role: true } },
      },
    })
    runWorkflows(req.user!.companyId, 'employee.created', {
      employeeName: `${firstName} ${lastName}`,
      position: position ?? '',
    })
    res.status(201).json({ ...full, _warning: userWarning });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'E-Mail-Adresse bereits vergeben.' });
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Mitarbeiters.' });
  }
});

// ─── PUT /api/employees/:id ────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  if (isEmployee(req) && req.user!.employeeId !== id)
    return res.status(403).json({ error: 'Keine Berechtigung.' });

  const body = req.body;
  const data: any = {};
  const str = (k: string) => { if (body[k] !== undefined) data[k] = body[k] || null };
  const num = (k: string) => { if (body[k] !== undefined) data[k] = body[k] ? Number(body[k]) : null };

  str('firstName'); str('lastName'); str('email'); str('position'); str('status');
  str('phone'); str('gender'); str('street'); str('city'); str('postalCode'); str('country');
  str('emergencyName'); str('emergencyPhone'); str('employmentType');
  str('salaryGrade'); str('bio'); str('skills');
  num('weeklyHours'); num('salary'); num('departmentId'); num('managerId');
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.dateOfBirth) data.dateOfBirth = new Date(body.dateOfBirth);
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;

  try {
    const employee = await prisma.employee.updateMany({
      where: { id, companyId: req.user!.companyId },
      data,
    });

    if (employee.count === 0) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });

    const updated = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        user:       { select: { id: true, email: true, role: true } },
      },
    });
    res.json(updated);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'E-Mail-Adresse bereits vergeben.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Mitarbeiters.' });
  }
});

// ─── PATCH /api/employees/:id/status ──────────────────────────────────────
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const { status } = req.body;
  const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status muss einer von: ${validStatuses.join(', ')} sein.` });
  }

  try {
    const result = await prisma.employee.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: { status },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });
    res.json({ id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Statuswechsel.' });
  }
});

// ─── DELETE /api/employees/:id ────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const result = await prisma.employee.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Mitarbeiters.' });
  }
});

export default router;
