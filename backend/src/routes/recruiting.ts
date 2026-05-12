import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { runWorkflows } from '../lib/workflowEngine';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGEMENT'));

// ══════════════════════════════════════════════════════════════════════════
// JOB POSTINGS
// ══════════════════════════════════════════════════════════════════════════

// ─── GET /api/recruiting/jobs ──────────────────────────────────────────────
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip   = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const deptId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;

    const where: Prisma.JobPostingWhereInput = {
      companyId,
      ...(status && { status }),
      ...(deptId && { departmentId: deptId }),
    };

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: { select: { id: true, name: true } },
          _count:     { select: { candidates: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    res.json({
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Stellenausschreibungen.' });
  }
});

// ─── GET /api/recruiting/jobs/:id ─────────────────────────────────────────
router.get('/jobs/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const job = await prisma.jobPosting.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        department: { select: { id: true, name: true } },
        candidates: { orderBy: { appliedAt: 'desc' } },
        _count:     { select: { candidates: true } },
      },
    });

    if (!job) return res.status(404).json({ error: 'Stellenausschreibung nicht gefunden.' });
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Stellenausschreibung.' });
  }
});

// ─── POST /api/recruiting/jobs ─────────────────────────────────────────────
router.post('/jobs', async (req: AuthRequest, res: Response) => {
  const {
    title, departmentId, description, status,
    location, address, employmentType, salaryType, salaryMin, salaryMax,
    benefits, tasks, requirements, shiftModel,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Pflichtfeld "title" fehlt.' });

  try {
    const job = await prisma.jobPosting.create({
      data: {
        companyId:      req.user!.companyId,
        title,
        description:    description    ?? null,
        status:         status         ?? 'OPEN',
        location:       location       ?? null,
        address:        address        ?? null,
        employmentType: employmentType ?? null,
        salaryType:     salaryType     ?? null,
        salaryMin:      salaryMin      != null ? parseFloat(salaryMin) : null,
        salaryMax:      salaryMax      != null ? parseFloat(salaryMax) : null,
        benefits:       benefits       ?? null,
        tasks:          tasks          ?? null,
        requirements:   requirements   ?? null,
        shiftModel:     shiftModel     ?? null,
        ...(departmentId && { departmentId: parseInt(departmentId) }),
      },
      include: { department: { select: { id: true, name: true } } },
    });

    res.status(201).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen der Stellenausschreibung.' });
  }
});

// ─── PUT /api/recruiting/jobs/:id ─────────────────────────────────────────
router.put('/jobs/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const {
    title, departmentId, description, status,
    location, address, employmentType, salaryType, salaryMin, salaryMax,
    benefits, tasks, requirements, shiftModel,
  } = req.body;

  try {
    const result = await prisma.jobPosting.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: {
        ...(title            !== undefined && { title }),
        ...(description      !== undefined && { description }),
        ...(status           !== undefined && { status }),
        ...(location         !== undefined && { location }),
        ...(address          !== undefined && { address }),
        ...(employmentType   !== undefined && { employmentType }),
        ...(salaryType       !== undefined && { salaryType }),
        ...(salaryMin        !== undefined && { salaryMin: salaryMin != null ? parseFloat(salaryMin) : null }),
        ...(salaryMax        !== undefined && { salaryMax: salaryMax != null ? parseFloat(salaryMax) : null }),
        ...(benefits         !== undefined && { benefits }),
        ...(tasks            !== undefined && { tasks }),
        ...(requirements     !== undefined && { requirements }),
        ...(shiftModel       !== undefined && { shiftModel }),
        ...(departmentId     !== undefined && { departmentId: departmentId ? parseInt(departmentId) : null }),
      },
    });

    if (result.count === 0) return res.status(404).json({ error: 'Stellenausschreibung nicht gefunden.' });
    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } } },
    });
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Stellenausschreibung.' });
  }
});

// ─── PATCH /api/recruiting/jobs/:id/status ────────────────────────────────
router.patch('/jobs/:id/status', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const { status } = req.body;
  const validStatuses = ['OPEN', 'CLOSED', 'DRAFT', 'FILLED'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status muss einer von: ${validStatuses.join(', ')} sein.` });
  }

  try {
    const result = await prisma.jobPosting.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: { status },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Stellenausschreibung nicht gefunden.' });
    res.json({ id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Statuswechsel.' });
  }
});

// ─── DELETE /api/recruiting/jobs/:id ──────────────────────────────────────
router.delete('/jobs/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const result = await prisma.jobPosting.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Stellenausschreibung nicht gefunden.' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// CANDIDATES
// ══════════════════════════════════════════════════════════════════════════

// ─── GET /api/recruiting/candidates ───────────────────────────────────────
router.get('/candidates', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip   = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const jobId  = req.query.jobPostingId ? parseInt(req.query.jobPostingId as string) : undefined;
    const search = req.query.search as string | undefined;

    const where: Prisma.CandidateWhereInput = {
      companyId,
      ...(status && { status }),
      ...(jobId  && { jobPostingId: jobId }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName:  { contains: search } },
          { email:     { contains: search } },
        ],
      }),
    };

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        include: { jobPosting: { select: { id: true, title: true } } },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.candidate.count({ where }),
    ]);

    res.json({
      data: candidates,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Bewerber.' });
  }
});

// ─── GET /api/recruiting/candidates/:id ───────────────────────────────────
router.get('/candidates/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: { jobPosting: true },
    });

    if (!candidate) return res.status(404).json({ error: 'Bewerber nicht gefunden.' });
    res.json(candidate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Bewerbers.' });
  }
});

// ─── POST /api/recruiting/candidates ──────────────────────────────────────
router.post('/candidates', async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email, jobPostingId, notes } = req.body;

  if (!firstName || !lastName || !email || !jobPostingId) {
    return res.status(400).json({
      error: 'Pflichtfelder fehlen.',
      required: ['firstName', 'lastName', 'email', 'jobPostingId'],
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  try {
    const job = await prisma.jobPosting.findFirst({
      where: { id: parseInt(jobPostingId), companyId: req.user!.companyId },
    });
    if (!job) return res.status(404).json({ error: 'Stellenausschreibung nicht gefunden.' });
    if (job.status !== 'OPEN') return res.status(409).json({ error: 'Diese Stelle ist nicht mehr offen.' });

    const candidate = await prisma.candidate.create({
      data: {
        companyId:    req.user!.companyId,
        firstName,
        lastName,
        email,
        jobPostingId: parseInt(jobPostingId),
        notes:        notes ?? null,
        status:       'APPLIED',
      },
      include: { jobPosting: { select: { id: true, title: true } } },
    });

    runWorkflows(req.user!.companyId, 'recruiting.candidate.applied', {
      candidateName: `${firstName} ${lastName}`,
      jobTitle: candidate.jobPosting.title,
      candidateEmail: email,
    })
    res.status(201).json(candidate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen der Bewerbung.' });
  }
});

// ─── PATCH /api/recruiting/candidates/:id/status ──────────────────────────
router.patch('/candidates/:id/status', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const { status } = req.body;
  const validStatuses = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status muss einer von: ${validStatuses.join(', ')} sein.` });
  }

  try {
    const result = await prisma.candidate.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: { status },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Bewerber nicht gefunden.' });

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { jobPosting: { select: { id: true, title: true } } },
    });
    if (candidate) runWorkflows(req.user!.companyId, 'recruiting.candidate.status', {
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: candidate.jobPosting.title,
      status,
    })
    res.json(candidate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Statuswechsel.' });
  }
});

// ─── PUT /api/recruiting/candidates/:id ───────────────────────────────────
router.put('/candidates/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  const { firstName, lastName, email, notes, status } = req.body;

  try {
    const result = await prisma.candidate.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName  && { lastName }),
        ...(email     && { email }),
        ...(notes     !== undefined && { notes }),
        ...(status    && { status }),
      },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Bewerber nicht gefunden.' });

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { jobPosting: { select: { id: true, title: true } } },
    });
    res.json(candidate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Bewerbers.' });
  }
});

// ─── DELETE /api/recruiting/candidates/:id ────────────────────────────────
router.delete('/candidates/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const result = await prisma.candidate.deleteMany({
      where: { id, companyId: req.user!.companyId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Bewerber nicht gefunden.' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Bewerbers.' });
  }
});

// ─── GET /api/recruiting/stats ─────────────────────────────────────────────
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const [openJobs, totalCandidates, byStatus, recentApplications] = await Promise.all([
      prisma.jobPosting.count({ where: { companyId, status: 'OPEN' } }),
      prisma.candidate.count({ where: { companyId } }),
      prisma.candidate.groupBy({ by: ['status'], where: { companyId }, _count: { id: true } }),
      prisma.candidate.findMany({
        where: { companyId },
        orderBy: { appliedAt: 'desc' },
        take: 5,
        include: { jobPosting: { select: { title: true } } },
      }),
    ]);

    res.json({
      openJobs,
      totalCandidates,
      candidatesByStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      recentApplications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Recruiting-Statistiken.' });
  }
});

export default router;
