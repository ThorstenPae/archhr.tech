import { prisma } from './prisma'

type Payload = Record<string, any>

export async function runWorkflows(companyId: number, event: string, payload: Payload) {
  try {
    const workflows = await prisma.workflow.findMany({ where: { companyId, active: true } })
    for (const wf of workflows) {
      const nodes: any[] = JSON.parse(wf.nodes)
      const edges: any[] = JSON.parse(wf.edges)
      const trigger = nodes.find(n => n.type === 'trigger' && n.data?.event === event)
      if (trigger) await execute(trigger.id, nodes, edges, payload, companyId)
    }
  } catch (err) {
    console.error('[WorkflowEngine]', err)
  }
}

async function execute(nodeId: string, nodes: any[], edges: any[], payload: Payload, companyId: number) {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return

  if (node.type === 'action') {
    await runAction(node.data, payload, companyId)
    for (const edge of edges.filter(e => e.source === nodeId))
      await execute(edge.target, nodes, edges, payload, companyId)
    return
  }

  if (node.type === 'condition') {
    const result = evalCondition(node.data, payload)
    const branch = result ? 'true' : 'false'
    for (const edge of edges.filter(e => e.source === nodeId && (e.label === branch || (!e.label && result))))
      await execute(edge.target, nodes, edges, payload, companyId)
    return
  }

  // trigger or unknown: follow all outgoing edges
  for (const edge of edges.filter(e => e.source === nodeId))
    await execute(edge.target, nodes, edges, payload, companyId)
}

function evalCondition(data: any, payload: Payload): boolean {
  const left = String(payload[data.field] ?? '').toLowerCase()
  const right = String(data.value ?? '').toLowerCase()
  switch (data.operator) {
    case 'equals':     return left === right
    case 'not_equals': return left !== right
    case 'contains':   return left.includes(right)
    default:           return true
  }
}

async function runAction(data: any, payload: Payload, companyId: number) {
  const title = interpolate(data.title ?? '', payload)
  const body  = interpolate(data.body  ?? '', payload)
  const link  = data.link || null

  switch (data.action) {
    case 'notify.user': {
      if (!data.userId) return
      await prisma.notification.create({ data: { userId: parseInt(data.userId), companyId, title, body, link } })
      break
    }
    case 'notify.role': {
      if (!data.role) return
      const users = await prisma.user.findMany({ where: { companyId, role: data.role } })
      await Promise.all(users.map(u => prisma.notification.create({ data: { userId: u.id, companyId, title, body, link } })))
      break
    }
    case 'notify.manager': {
      if (!payload.employeeId) return
      const emp = await prisma.employee.findUnique({
        where: { id: payload.employeeId },
        include: { manager: { include: { user: { select: { id: true } } } } },
      })
      const managerId = emp?.manager?.user?.id
      if (managerId) await prisma.notification.create({ data: { userId: managerId, companyId, title, body, link } })
      break
    }
    case 'notify.employee': {
      if (!payload.employeeId) return
      const emp = await prisma.employee.findUnique({
        where: { id: payload.employeeId },
        include: { user: { select: { id: true } } },
      })
      const userId = emp?.user?.id
      if (userId) await prisma.notification.create({ data: { userId, companyId, title, body, link } })
      break
    }
    case 'notify.department': {
      if (!data.departmentId) return
      const emps = await prisma.employee.findMany({
        where: { companyId, departmentId: parseInt(data.departmentId) },
        include: { user: { select: { id: true } } },
      })
      const userIds = emps.map(e => e.user?.id).filter(Boolean) as number[]
      await Promise.all(userIds.map(uid => prisma.notification.create({ data: { userId: uid, companyId, title, body, link } })))
      break
    }
  }
}

function interpolate(template: string, payload: Payload): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o: any, k: string) => o?.[k], payload)
    return val != null ? String(val) : ''
  })
}
