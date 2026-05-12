import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { runWorkflows } from '../lib/workflowEngine';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGEMENT'));

function withSla(c: any, slaDays: number) {
  const ageMs = Date.now() - new Date(c.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const hasUnread = (c.messages ?? []).some((m: any) => m.fromReporter && !m.read);
  return { ...c, slaBreached: ageDays > slaDays && c.status !== 'CLOSED', hasUnread };
}

async function getSlaDays(companyId: number): Promise<number> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { whistleblowSlaDays: true } });
  return company?.whistleblowSlaDays ?? 5;
}

const caseInclude = {
  assignee: { select: { id: true, firstName: true, lastName: true } },
  messages: { select: { id: true, fromReporter: true, read: true } },
};

// GET /api/whistleblowing
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, priority, assigneeId, archived } = req.query;
    const where: any = {
      companyId: req.user!.companyId,
      archived: archived === 'true',
    };
    if (status)     where.status = status;
    if (category)   where.category = category;
    if (priority)   where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId === 'unassigned' ? null : parseInt(assigneeId as string);

    const [cases, slaDays] = await Promise.all([
      prisma.whistleblowCase.findMany({ where, include: caseInclude, orderBy: { updatedAt: 'desc' } }),
      getSlaDays(req.user!.companyId),
    ]);
    res.json(cases.map(c => withSla(c, slaDays)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Fälle.' });
  }
});

// POST /api/whistleblowing
router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, category, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel ist erforderlich.' });
  try {
    const [c, slaDays] = await Promise.all([
      prisma.whistleblowCase.create({
        data: { companyId: req.user!.companyId, title, description: description ?? null, category: category ?? 'OTHER', priority: priority ?? 'MEDIUM' },
        include: caseInclude,
      }),
      getSlaDays(req.user!.companyId),
    ]);
    runWorkflows(req.user!.companyId, 'whistleblow.case.created', {
      caseTitle: c.title,
      category: c.category,
    })
    res.status(201).json(withSla(c, slaDays));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Falls.' });
  }
});

// GET /api/whistleblowing/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const c = await prisma.whistleblowCase.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) return res.status(404).json({ error: 'Fall nicht gefunden.' });
    await prisma.whistleblowMessage.updateMany({
      where: { caseId: id, fromReporter: true, read: false },
      data: { read: true },
    });
    const slaDays = await getSlaDays(req.user!.companyId);
    res.json(withSla(c, slaDays));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Falls.' });
  }
});

// PUT /api/whistleblowing/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { title, description, category, priority, status, assigneeId, archived } = req.body;
  try {
    const data: any = {};
    if (title       !== undefined) data.title       = title;
    if (description !== undefined) data.description = description || null;
    if (category    !== undefined) data.category    = category;
    if (priority    !== undefined) data.priority    = priority;
    if (status      !== undefined) data.status      = status;
    if (archived    !== undefined) data.archived    = archived;
    if (assigneeId  !== undefined) data.assigneeId  = assigneeId ? parseInt(assigneeId) : null;

    const result = await prisma.whistleblowCase.updateMany({
      where: { id, companyId: req.user!.companyId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Fall nicht gefunden.' });

    const updated = await prisma.whistleblowCase.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    const slaDays = await getSlaDays(req.user!.companyId);
    res.json(withSla(updated, slaDays));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Falls.' });
  }
});

// DELETE /api/whistleblowing/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const result = await prisma.whistleblowCase.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Fall nicht gefunden.' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Falls.' });
  }
});

// POST /api/whistleblowing/:id/messages
router.post('/:id/messages', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { body, fromReporter } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Nachricht darf nicht leer sein.' });
  try {
    const exists = await prisma.whistleblowCase.findFirst({ where: { id, companyId: req.user!.companyId } });
    if (!exists) return res.status(404).json({ error: 'Fall nicht gefunden.' });
    const msg = await prisma.whistleblowMessage.create({
      data: { caseId: id, body, fromReporter: fromReporter ?? false, read: true },
    });
    await prisma.whistleblowCase.update({ where: { id }, data: { updatedAt: new Date() } });
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Senden der Nachricht.' });
  }
});

export default router;
