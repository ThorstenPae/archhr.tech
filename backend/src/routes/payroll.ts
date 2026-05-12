import path from 'path';
import fs from 'fs';
import { Router, Response, Request } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGEMENT'));

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(authenticate);

// ─── GET /api/payroll/summary ──────────────────────────────────────────────
router.get('/summary', async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [employees, newHires, departments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true, firstName: true, lastName: true,
        salary: true, position: true,
        department: { select: { id: true, name: true } },
        startDate: true,
      },
    }),
    prisma.employee.findMany({
      where: { companyId, startDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true },
    }),
    prisma.department.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
  ]);

  const departed = await prisma.employee.findMany({
    where: { companyId, status: 'TERMINATED', endDate: { gte: monthStart, lte: monthEnd } },
    select: { id: true },
  });

  const withSalary = employees.filter(e => (e.salary ?? 0) > 0);
  const totalAnnual  = withSalary.reduce((s, e) => s + e.salary!, 0);
  const totalMonthly = totalAnnual / 12;
  const avgSalary    = withSalary.length ? totalAnnual / withSalary.length : 0;

  const topEarners = withSalary
    .map(e => ({
      id:         e.id,
      name:       `${e.firstName} ${e.lastName}`,
      position:   e.position,
      department: e.department?.name ?? null,
      monthly:    Math.round(e.salary! / 12),
      deviation:  avgSalary > 0 ? Math.round(((e.salary! - avgSalary) / avgSalary) * 100) : 0,
    }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, 6);

  const byDept = departments.map(d => {
    const dEmps = employees.filter(e => e.department?.id === d.id && (e.salary ?? 0) > 0);
    return {
      name:    d.name,
      count:   employees.filter(e => e.department?.id === d.id).length,
      monthly: Math.round(dEmps.reduce((s, e) => s + e.salary!, 0) / 12),
    };
  }).filter(d => d.count > 0).sort((a, b) => b.monthly - a.monthly);

  res.json({
    cycle: { start: monthStart.toISOString(), end: monthEnd.toISOString(), status: 'READY' },
    totalMonthlyGross:   Math.round(totalMonthly),
    headcount:           employees.length,
    headcountWithSalary: withSalary.length,
    newHires:            newHires.length,
    departures:          departed.length,
    avgMonthlySalary:    Math.round(avgSalary / 12),
    topEarners,
    byDept,
  });
});

// ─── GET /api/payroll/documents ────────────────────────────────────────────
router.get('/documents', async (req: AuthRequest, res: Response) => {
  try {
    const docs = await prisma.payrollDocument.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Dokumente.' });
  }
});

// ─── POST /api/payroll/documents ───────────────────────────────────────────
router.post('/documents', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });

  const { name, category, month } = req.body;
  if (!name || !category || !month) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'name, category und month sind erforderlich.' });
  }

  try {
    const doc = await prisma.payrollDocument.create({
      data: {
        companyId:    req.user!.companyId,
        name,
        category,
        month,
        filename:     req.file.filename,
        originalName: req.file.originalname,
        mimeType:     req.file.mimetype,
        size:         req.file.size,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Speichern des Dokuments.' });
  }
});

// ─── GET /api/payroll/documents/:id/download ──────────────────────────────
router.get('/documents/:id/download', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const doc = await prisma.payrollDocument.findFirst({
      where: { id, companyId: req.user!.companyId },
    });
    if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

    const filePath = path.join(UPLOADS_DIR, doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden.' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader('Content-Type', doc.mimeType);
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Herunterladen.' });
  }
});

// ─── DELETE /api/payroll/documents/:id ────────────────────────────────────
router.delete('/documents/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });

  try {
    const doc = await prisma.payrollDocument.findFirst({
      where: { id, companyId: req.user!.companyId },
    });
    if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

    const filePath = path.join(UPLOADS_DIR, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.payrollDocument.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen.' });
  }
});

export default router;
