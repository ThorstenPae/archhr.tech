import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { runWorkflows } from '../lib/workflowEngine';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGEMENT'));

const taskInclude = { assignee: { select: { id: true, firstName: true, lastName: true } } };
const planInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, position: true, department: { select: { name: true } } } },
  tasks: { include: taskInclude, orderBy: [{ order: 'asc' as const }, { id: 'asc' as const }] },
};

async function notifyAssignee(assigneeId: number, companyId: number, taskTitle: string, employeeName: string, planId: number) {
  await prisma.notification.create({
    data: {
      userId: assigneeId,
      companyId,
      title: `Onboarding-Aufgabe zugewiesen`,
      body: `"${taskTitle}" für ${employeeName}`,
      link: `/onboarding?plan=${planId}`,
    },
  });
}

// GET /api/onboarding/category-assignees
router.get('/category-assignees', async (req: AuthRequest, res: Response) => {
  try {
    const assignees = await prisma.onboardingCategoryAssignee.findMany({
      where: { companyId: req.user!.companyId },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    res.json(assignees);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// PUT /api/onboarding/category-assignees
router.put('/category-assignees', async (req: AuthRequest, res: Response) => {
  const updates: { category: string; userId: number | null }[] = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'Array erwartet.' });
  try {
    for (const { category, userId } of updates) {
      if (!userId) {
        await prisma.onboardingCategoryAssignee.deleteMany({
          where: { companyId: req.user!.companyId, category },
        });
      } else {
        await prisma.onboardingCategoryAssignee.upsert({
          where: { companyId_category: { companyId: req.user!.companyId, category } },
          update: { userId },
          create: { companyId: req.user!.companyId, category, userId },
        });
      }
    }
    const result = await prisma.onboardingCategoryAssignee.findMany({
      where: { companyId: req.user!.companyId },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// GET /api/onboarding
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.onboardingPlan.findMany({
      where: { companyId: req.user!.companyId },
      include: planInclude,
      orderBy: { startDate: 'desc' },
    });
    res.json(plans);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// POST /api/onboarding
router.post('/', async (req: AuthRequest, res: Response) => {
  const { employeeId, name, startDate, tasks } = req.body;
  if (!employeeId || !name || !startDate)
    return res.status(400).json({ error: 'employeeId, name und startDate sind erforderlich.' });
  try {
    const catAssignees = await prisma.onboardingCategoryAssignee.findMany({
      where: { companyId: req.user!.companyId },
    });
    const catMap = new Map(catAssignees.map(ca => [ca.category, ca.userId]));

    const taskData = tasks?.length
      ? tasks.map((t: any, i: number) => ({
          title: t.title,
          category: t.category ?? 'OTHER',
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          order: i,
          assigneeId: catMap.get(t.category ?? 'OTHER') ?? null,
        }))
      : [];

    const plan = await prisma.onboardingPlan.create({
      data: {
        companyId: req.user!.companyId,
        employeeId: parseInt(employeeId),
        name,
        startDate: new Date(startDate),
        tasks: taskData.length ? { create: taskData } : undefined,
      },
      include: planInclude,
    });

    // Group tasks by assignee and send one notification per person
    const tasksByAssignee = new Map<number, string[]>();
    for (const task of plan.tasks) {
      if (task.assigneeId) {
        if (!tasksByAssignee.has(task.assigneeId)) tasksByAssignee.set(task.assigneeId, []);
        tasksByAssignee.get(task.assigneeId)!.push(task.title);
      }
    }

    const empName = `${plan.employee.firstName} ${plan.employee.lastName}`;
    const notifiedUsers: { userId: number; taskCount: number }[] = [];

    for (const [assigneeId, taskTitles] of tasksByAssignee) {
      const preview = taskTitles.slice(0, 2).join(', ') + (taskTitles.length > 2 ? ` +${taskTitles.length - 2}` : '');
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          companyId: req.user!.companyId,
          title: `Onboarding: ${empName}`,
          body: `${taskTitles.length} Aufgabe${taskTitles.length > 1 ? 'n' : ''} zugewiesen — ${preview}`,
          link: `/onboarding?plan=${plan.id}`,
        },
      });
      notifiedUsers.push({ userId: assigneeId, taskCount: taskTitles.length });
    }

    // Trigger workflow engine
    runWorkflows(req.user!.companyId, 'onboarding.plan.created', {
      employeeName: empName,
      planName: plan.name,
    })

    res.status(201).json({ ...plan, notifiedUsers });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler beim Anlegen.' }); }
});

// GET /api/onboarding/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const plan = await prisma.onboardingPlan.findFirst({ where: { id, companyId: req.user!.companyId }, include: planInclude });
    if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden.' });
    res.json(plan);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// DELETE /api/onboarding/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    const result = await prisma.onboardingPlan.deleteMany({ where: { id, companyId: req.user!.companyId } });
    if (result.count === 0) return res.status(404).json({ error: 'Plan nicht gefunden.' });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// POST /api/onboarding/:id/tasks
router.post('/:id/tasks', async (req: AuthRequest, res: Response) => {
  const planId = parseInt(req.params.id);
  if (isNaN(planId)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { title, category, dueDate, assigneeId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titel erforderlich.' });
  try {
    const plan = await prisma.onboardingPlan.findFirst({
      where: { id: planId, companyId: req.user!.companyId },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });
    if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden.' });

    const count = await prisma.onboardingTask.count({ where: { planId } });
    const parsedAssigneeId = assigneeId ? parseInt(assigneeId) : null;
    const task = await prisma.onboardingTask.create({
      data: { planId, title, category: category ?? 'OTHER', dueDate: dueDate ? new Date(dueDate) : null, order: count, assigneeId: parsedAssigneeId },
      include: taskInclude,
    });

    if (parsedAssigneeId) {
      const empName = `${plan.employee.firstName} ${plan.employee.lastName}`;
      await notifyAssignee(parsedAssigneeId, req.user!.companyId, title, empName, planId);
    }

    res.status(201).json(task);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// PATCH /api/onboarding/tasks/:taskId
router.patch('/tasks/:taskId', async (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId);
  if (isNaN(taskId)) return res.status(400).json({ error: 'Ungültige ID.' });
  const { completed, title, category, dueDate, assigneeId } = req.body;
  try {
    const before = await prisma.onboardingTask.findUnique({
      where: { id: taskId },
      include: { plan: { include: { employee: { select: { firstName: true, lastName: true } } } } },
    });

    const data: any = {};
    if (title      !== undefined) data.title      = title;
    if (category   !== undefined) data.category   = category;
    if (dueDate    !== undefined) data.dueDate     = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) data.assigneeId  = assigneeId ? parseInt(assigneeId) : null;
    if (completed  !== undefined) {
      data.completed   = completed;
      data.completedAt = completed ? new Date() : null;
    }

    const task = await prisma.onboardingTask.update({ where: { id: taskId }, data, include: taskInclude });

    // Notify new assignee if changed
    if (assigneeId !== undefined && assigneeId && before && parseInt(assigneeId) !== before.assigneeId) {
      const empName = `${before.plan.employee.firstName} ${before.plan.employee.lastName}`;
      await notifyAssignee(parseInt(assigneeId), req.user!.companyId, before.title, empName, before.planId);
    }

    res.json(task);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// DELETE /api/onboarding/tasks/:taskId
router.delete('/tasks/:taskId', async (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId);
  if (isNaN(taskId)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    await prisma.onboardingTask.delete({ where: { id: taskId } });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

export default router;
