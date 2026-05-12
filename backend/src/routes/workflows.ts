import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)
router.use(requireRole('ADMIN', 'MANAGEMENT'))

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.workflow.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(list)
  } catch (err) { res.status(500).json({ error: 'Fehler.' }) }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  try {
    const wf = await prisma.workflow.create({
      data: { companyId: req.user!.companyId, name: name ?? 'Neuer Workflow' },
    })
    res.status(201).json(wf)
  } catch (err) { res.status(500).json({ error: 'Fehler.' }) }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' })
  try {
    const wf = await prisma.workflow.findFirst({ where: { id, companyId: req.user!.companyId } })
    if (!wf) return res.status(404).json({ error: 'Nicht gefunden.' })
    res.json(wf)
  } catch (err) { res.status(500).json({ error: 'Fehler.' }) }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' })
  const { name, active, nodes, edges } = req.body
  try {
    const data: any = {}
    if (name   !== undefined) data.name   = name
    if (active !== undefined) data.active = active
    if (nodes  !== undefined) data.nodes  = JSON.stringify(nodes)
    if (edges  !== undefined) data.edges  = JSON.stringify(edges)
    const wf = await prisma.workflow.update({ where: { id }, data })
    res.json(wf)
  } catch (err) { res.status(500).json({ error: 'Fehler.' }) }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID.' })
  try {
    await prisma.workflow.deleteMany({ where: { id, companyId: req.user!.companyId } })
    res.status(204).send()
  } catch (err) { res.status(500).json({ error: 'Fehler.' }) }
})

export default router
