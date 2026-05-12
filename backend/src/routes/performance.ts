import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const activityInclude = {
  participants: {
    include: { employee: { select: { id: true, firstName: true, lastName: true, position: true } } },
  },
};

// ─── GET /api/performance/cycles ──────────────────────────────────────────
router.get('/cycles', async (req: AuthRequest, res: Response) => {
  try {
    const cycles = await prisma.performanceCycle.findMany({
      where: { companyId: req.user!.companyId },
      include: {
        activities: { orderBy: { startDate: 'asc' }, include: activityInclude },
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cycles);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── GET /api/performance/cycles/:id ──────────────────────────────────────
router.get('/cycles/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const cycle = await prisma.performanceCycle.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: { activities: { orderBy: { startDate: 'asc' }, include: activityInclude } },
    });
    if (!cycle) return res.status(404).json({ error: 'Zyklus nicht gefunden.' });

    const employeeCount = await prisma.employee.count({
      where: { companyId: req.user!.companyId, status: 'ACTIVE' },
    });
    res.json({ ...cycle, participantCount: employeeCount });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── POST /api/performance/cycles ─────────────────────────────────────────
router.post('/cycles', async (req: AuthRequest, res: Response) => {
  const { name, description, status, startDate, endDate } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich.' });
  try {
    const cycle = await prisma.performanceCycle.create({
      data: {
        companyId:   req.user!.companyId,
        name,
        description: description ?? null,
        status:      status      ?? 'DRAFT',
        startDate:   startDate   ? new Date(startDate) : null,
        endDate:     endDate     ? new Date(endDate)   : null,
      },
      include: { activities: true },
    });
    res.status(201).json(cycle);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Erstellen.' }); }
});

// ─── PUT /api/performance/cycles/:id ──────────────────────────────────────
router.put('/cycles/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { name, description, status, startDate, endDate } = req.body;
  try {
    const result = await prisma.performanceCycle.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status      !== undefined && { status }),
        ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate     !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Zyklus nicht gefunden.' });
    const cycle = await prisma.performanceCycle.findUnique({ where: { id }, include: { activities: true } });
    res.json(cycle);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Aktualisieren.' }); }
});

// ─── DELETE /api/performance/cycles/:id ───────────────────────────────────
router.delete('/cycles/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const result = await prisma.performanceCycle.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Zyklus nicht gefunden.' });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Löschen.' }); }
});

// ─── POST /api/performance/cycles/:id/activities ──────────────────────────
router.post('/cycles/:id/activities', async (req: AuthRequest, res: Response) => {
  const cycleId = parseInt(req.params.id);
  if (isNaN(cycleId)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { name, type, startDate, endDate, description } = req.body;
  if (!name || !type || !startDate || !endDate)
    return res.status(400).json({ error: 'name, type, startDate, endDate erforderlich.' });
  try {
    const cycle = await prisma.performanceCycle.findFirst({
      where: { id: cycleId, companyId: req.user!.companyId },
    });
    if (!cycle) return res.status(404).json({ error: 'Zyklus nicht gefunden.' });
    const activity = await prisma.performanceActivity.create({
      data: { cycleId, name, type, startDate: new Date(startDate), endDate: new Date(endDate), description: description ?? null },
      include: activityInclude,
    });
    res.status(201).json(activity);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Hinzufügen.' }); }
});

// ─── DELETE /api/performance/activities/:id ────────────────────────────────
router.delete('/activities/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const activity = await prisma.performanceActivity.findFirst({
      where: { id },
      include: { cycle: { select: { companyId: true } } },
    });
    if (!activity || activity.cycle.companyId !== req.user!.companyId)
      return res.status(404).json({ error: 'Aktivität nicht gefunden.' });
    await prisma.performanceActivity.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Löschen.' }); }
});

// ─── POST /api/performance/activities/:id/participants ─────────────────────
router.post('/activities/:id/participants', async (req: AuthRequest, res: Response) => {
  const activityId = parseInt(req.params.id);
  const { employeeId } = req.body;
  if (isNaN(activityId) || !employeeId) return res.status(400).json({ error: 'Ungültige Parameter.' });
  try {
    const activity = await prisma.performanceActivity.findFirst({
      where: { id: activityId },
      include: { cycle: { select: { companyId: true } } },
    });
    if (!activity || activity.cycle.companyId !== req.user!.companyId)
      return res.status(404).json({ error: 'Aktivität nicht gefunden.' });

    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId), companyId: req.user!.companyId },
    });
    if (!employee) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });

    await prisma.activityParticipant.upsert({
      where: { activityId_employeeId: { activityId, employeeId: employee.id } },
      create: { activityId, employeeId: employee.id },
      update: {},
    });
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── DELETE /api/performance/activities/:id/participants/:empId ────────────
router.delete('/activities/:id/participants/:empId', async (req: AuthRequest, res: Response) => {
  const activityId = parseInt(req.params.id);
  const employeeId = parseInt(req.params.empId);
  if (isNaN(activityId) || isNaN(employeeId)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const activity = await prisma.performanceActivity.findFirst({
      where: { id: activityId },
      include: { cycle: { select: { companyId: true } } },
    });
    if (!activity || activity.cycle.companyId !== req.user!.companyId)
      return res.status(404).json({ error: 'Aktivität nicht gefunden.' });

    await prisma.activityParticipant.deleteMany({ where: { activityId, employeeId } });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

export default router;
