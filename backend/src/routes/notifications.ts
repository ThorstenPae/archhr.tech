import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Fehler.' }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: 'Fehler.' }); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' });
  try {
    await prisma.notification.updateMany({ where: { id, userId: req.user!.id }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Fehler.' }); }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Fehler.' }); }
});

export default router;
