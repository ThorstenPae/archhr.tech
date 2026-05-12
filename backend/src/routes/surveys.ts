import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ─── GET /api/surveys ─────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const surveys = await prisma.survey.findMany({
      where: { companyId: req.user!.companyId },
      include: {
        _count: { select: { questions: true, responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(surveys);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── GET /api/surveys/:id ──────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const survey = await prisma.survey.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!survey) return res.status(404).json({ error: 'Nicht gefunden.' });

    // Aggregate answer distribution per question
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: id },
      include: { answers: true },
    });

    const totalResponses = responses.length;
    const employeeCount = await prisma.employee.count({
      where: { companyId: req.user!.companyId, status: 'ACTIVE' },
    });
    const responseRate = employeeCount > 0 ? Math.round((totalResponses / employeeCount) * 100) : 0;

    const questionStats = survey.questions.map(q => {
      const allAnswers = responses.flatMap(r => r.answers.filter(a => a.questionId === q.id));
      const dist: Record<string, number> = {};
      for (const a of allAnswers) {
        dist[a.value] = (dist[a.value] ?? 0) + 1;
      }
      const ratings = allAnswers.map(a => parseInt(a.value)).filter(v => !isNaN(v));
      const agreement = ratings.length > 0
        ? Math.round((ratings.filter(v => v >= 4).length / ratings.length) * 100)
        : null;

      return { ...q, distribution: dist, totalAnswers: allAnswers.length, agreement };
    });

    res.json({ ...survey, totalResponses, responseRate, employeeCount, questionStats });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── POST /api/surveys ────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, status, privacy, startDate, endDate, questions } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich.' });
  try {
    const survey = await prisma.survey.create({
      data: {
        companyId:   req.user!.companyId,
        title,
        description: description ?? null,
        status:      status      ?? 'DRAFT',
        privacy:     privacy     ?? 'PRIVATE',
        startDate:   startDate   ? new Date(startDate) : null,
        endDate:     endDate     ? new Date(endDate)   : null,
        questions: questions?.length ? {
          create: (questions as any[]).map((q: any, i: number) => ({
            text:  q.text,
            type:  q.type  ?? 'RATING',
            order: i,
          })),
        } : undefined,
      },
      include: { questions: true, _count: { select: { responses: true } } },
    });
    res.status(201).json(survey);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── PUT /api/surveys/:id ─────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { title, description, status, privacy, startDate, endDate } = req.body;
  try {
    const result = await prisma.survey.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status      !== undefined && { status }),
        ...(privacy     !== undefined && { privacy }),
        ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate     !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
    const updated = await prisma.survey.findUnique({ where: { id }, include: { questions: true, _count: { select: { responses: true } } } });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── DELETE /api/surveys/:id ──────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const result = await prisma.survey.deleteMany({ where: { id, companyId: req.user!.companyId } });
    if (result.count === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// ─── POST /api/surveys/:id/respond ────────────────────────────────────────
router.post('/:id/respond', async (req: AuthRequest, res: Response) => {
  const surveyId = parseInt(req.params.id);
  if (isNaN(surveyId)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { answers, employeeId } = req.body;
  try {
    const survey = await prisma.survey.findFirst({ where: { id: surveyId, companyId: req.user!.companyId } });
    if (!survey) return res.status(404).json({ error: 'Nicht gefunden.' });

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        employeeId: employeeId ?? null,
        answers: {
          create: (answers as any[]).map((a: any) => ({
            questionId: a.questionId,
            value: String(a.value),
          })),
        },
      },
    });
    res.status(201).json(response);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

export default router;
