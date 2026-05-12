import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ─── GET /api/departments ──────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { companyId: req.user!.companyId },
      include: {
        _count: { select: { employees: true, jobPostings: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Abteilungen.' });
  }
});

// ─── GET /api/departments/:id ──────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const department = await prisma.department.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        employees:   { select: { id: true, firstName: true, lastName: true, position: true, status: true } },
        jobPostings: { select: { id: true, title: true, status: true } },
      },
    });
    if (!department) return res.status(404).json({ error: 'Abteilung nicht gefunden.' });
    res.json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Abteilung.' });
  }
});

// ─── POST /api/departments ─────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, managerId } = req.body;
  if (!name) return res.status(400).json({ error: 'Pflichtfeld "name" fehlt.' });

  try {
    const department = await prisma.department.create({
      data: {
        companyId: req.user!.companyId,
        name,
        managerId: managerId ? parseInt(managerId) : null,
      },
    });
    res.status(201).json(department);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'Abteilungsname bereits vergeben.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen der Abteilung.' });
  }
});

// ─── PUT /api/departments/:id ──────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const { name, managerId } = req.body;

  try {
    const result = await prisma.department.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: {
        ...(name      && { name }),
        ...(managerId !== undefined && {
          managerId: managerId ? parseInt(managerId) : null,
        }),
      },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Abteilung nicht gefunden.' });
    const department = await prisma.department.findUnique({ where: { id } });
    res.json(department);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'Abteilungsname bereits vergeben.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Abteilung.' });
  }
});

// ─── DELETE /api/departments/:id ───────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const result = await prisma.department.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Abteilung nicht gefunden.' });
    res.status(204).send();
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return res.status(409).json({ error: 'Abteilung hat noch Mitarbeiter oder Stellen. Bitte zuerst umbuchen.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen der Abteilung.' });
  }
});

export default router;
