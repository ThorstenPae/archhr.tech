import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { runWorkflows } from '../lib/workflowEngine';

function isEmployee(req: AuthRequest) { return req.user!.role === 'EMPLOYEE' }

const router = Router();
router.use(authenticate);

// ─── GET /api/absences ─────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId  = req.user!.companyId;
    const page       = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit      = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip       = (page - 1) * limit;
    const status     = req.query.status as string | undefined;
    const type       = req.query.type as string | undefined;
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;

    const forcedEmployeeId = isEmployee(req) ? req.user!.employeeId ?? -1 : undefined;
    const where: Prisma.AbsenceRequestWhereInput = {
      companyId,
      ...(forcedEmployeeId !== undefined ? { employeeId: forcedEmployeeId } : {}),
      ...(status     && { status }),
      ...(type       && { type }),
      ...(!forcedEmployeeId && employeeId && { employeeId }),
    };

    const [absences, total] = await Promise.all([
      prisma.absenceRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true,
              manager: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      prisma.absenceRequest.count({ where }),
    ]);

    res.json({
      data: absences,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Abwesenheitsanträge.' });
  }
});

// ─── GET /api/absences/:id ─────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const absence = await prisma.absenceRequest.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true,
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!absence) return res.status(404).json({ error: 'Abwesenheitsantrag nicht gefunden.' });
    res.json(absence);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Abwesenheitsantrags.' });
  }
});

// ─── POST /api/absences ────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  const { employeeId, type, startDate, endDate, reason } = req.body;

  if (!employeeId || !type || !startDate || !endDate) {
    return res.status(400).json({
      error: 'Pflichtfelder fehlen.',
      required: ['employeeId', 'type', 'startDate', 'endDate'],
    });
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (end < start) {
    return res.status(400).json({ error: 'Enddatum muss nach dem Startdatum liegen.' });
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId), companyId: req.user!.companyId },
    });
    if (!employee) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId:  req.user!.companyId,
        employeeId: parseInt(employeeId),
        type,
        startDate:  start,
        endDate:    end,
        reason:     reason ?? null,
        status:     'PENDING',
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, manager: { select: { id: true, firstName: true, lastName: true } } } } },
    });

    runWorkflows(req.user!.companyId, 'absence.requested', {
      employeeName: `${absence.employee.firstName} ${absence.employee.lastName}`,
      absenceType: type,
      startDate: start.toLocaleDateString('de-DE'),
      endDate: end.toLocaleDateString('de-DE'),
    })
    res.status(201).json(absence);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Abwesenheitsantrags.' });
  }
});

// ─── PATCH /api/absences/:id/status ───────────────────────────────────────
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const { status } = req.body;
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status muss einer von: ${validStatuses.join(', ')} sein.` });
  }

  try {
    const result = await prisma.absenceRequest.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: { status },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Abwesenheitsantrag nicht gefunden.' });

    const absence = await prisma.absenceRequest.findUnique({
      where: { id },
      include: { employee: { select: { id: true, firstName: true, lastName: true, manager: { select: { id: true, firstName: true, lastName: true } } } } },
    });
    if (absence) {
      const empName = `${absence.employee.firstName} ${absence.employee.lastName}`
      const event = status === 'APPROVED' ? 'absence.approved' : status === 'REJECTED' ? 'absence.rejected' : null
      if (event) runWorkflows(req.user!.companyId, event, {
        employeeId: absence.employee.id,
        employeeName: empName,
        absenceType: absence.type,
        status,
      })
    }
    res.json(absence);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Statuswechsel.' });
  }
});

// ─── DELETE /api/absences/:id ──────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const result = await prisma.absenceRequest.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Abwesenheitsantrag nicht gefunden.' });
    res.status(204).send();
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Abwesenheitsantrag nicht gefunden.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Abwesenheitsantrags.' });
  }
});

export default router;
