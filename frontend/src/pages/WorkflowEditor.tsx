import { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  addEdge, Background, Controls, useNodesState, useEdgesState,
  Connection, Edge, Node, Handle, Position, ReactFlowProvider, useReactFlow, NodeProps,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { ArrowLeft, Save, Zap, Bell, Play, Pause, GitBranch } from 'lucide-react'

// ── Definitions ──────────────────────────────────────────────────────────────
export const TRIGGERS = [
  // Mitarbeiter
  { group: 'Mitarbeiter', event: 'employee.created',       label: 'Mitarbeiter angelegt',          vars: ['employeeName', 'position'] },
  { group: 'Mitarbeiter', event: 'employee.updated',       label: 'Mitarbeiterdaten geändert',      vars: ['employeeName'] },
  // Onboarding
  { group: 'Onboarding',  event: 'onboarding.plan.created', label: 'Onboarding Plan erstellt',      vars: ['employeeName', 'planName'] },
  // Abwesenheit
  { group: 'Abwesenheit', event: 'absence.requested',      label: 'Abwesenheit beantragt',          vars: ['employeeName', 'absenceType', 'startDate', 'endDate'] },
  { group: 'Abwesenheit', event: 'absence.approved',       label: 'Abwesenheit genehmigt',          vars: ['employeeName', 'absenceType'] },
  { group: 'Abwesenheit', event: 'absence.rejected',       label: 'Abwesenheit abgelehnt',          vars: ['employeeName', 'absenceType'] },
  // Recruiting
  { group: 'Recruiting',  event: 'recruiting.candidate.applied', label: 'Neue Bewerbung eingegangen', vars: ['candidateName', 'jobTitle', 'candidateEmail'] },
  { group: 'Recruiting',  event: 'recruiting.candidate.status',  label: 'Bewerberstatus geändert',    vars: ['candidateName', 'jobTitle', 'status'] },
  // Whistleblowing
  { group: 'Compliance',  event: 'whistleblow.case.created', label: 'Whistleblowing-Fall erstellt',  vars: ['caseTitle', 'category'] },
]

export const ACTIONS = [
  { action: 'notify.user',       label: 'Benutzer benachrichtigen' },
  { action: 'notify.role',       label: 'Alle einer Rolle benachrichtigen' },
  { action: 'notify.manager',    label: 'Vorgesetzten benachrichtigen' },
  { action: 'notify.employee',   label: 'Betroffenen Mitarbeiter benachrichtigen' },
  { action: 'notify.department', label: 'Abteilung benachrichtigen' },
]

const CONDITION_FIELDS = [
  { value: 'absenceType',    label: 'Abwesenheitstyp' },
  { value: 'status',         label: 'Status' },
  { value: 'employeeName',   label: 'Mitarbeitername' },
  { value: 'jobTitle',       label: 'Stellentitel' },
  { value: 'category',       label: 'Kategorie' },
]

const OPERATORS = [
  { value: 'equals',     label: 'ist gleich' },
  { value: 'not_equals', label: 'ist nicht gleich' },
  { value: 'contains',   label: 'enthält' },
]

// ── Custom Nodes ─────────────────────────────────────────────────────────────
function TriggerNode({ data, selected }: NodeProps) {
  const t = TRIGGERS.find(x => x.event === data.event)
  return (
    <div style={{ minWidth: 200 }}
      className={`px-4 py-3 rounded-xl border-2 bg-[#1A1A1A] shadow-xl ${selected ? 'border-[#FF6B00]' : 'border-[#FF6B0055]'}`}>
      <div className="text-[9px] font-bold text-[#FF6B00] uppercase tracking-widest mb-1.5 flex items-center gap-1">
        <Zap size={9} /> Trigger {t?.group && <span className="text-[#FF6B0088]">· {t.group}</span>}
      </div>
      <div className="text-white text-sm font-semibold">{t?.label ?? '— nicht konfiguriert —'}</div>
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: '#FF6B00', border: '2px solid #0D0D0D', bottom: -5 }} />
    </div>
  )
}

function ActionNode({ data, selected }: NodeProps) {
  const a = ACTIONS.find(x => x.action === data.action)
  return (
    <div style={{ minWidth: 200 }}
      className={`px-4 py-3 rounded-xl border-2 bg-[#1A1A1A] shadow-xl ${selected ? 'border-[#3b82f6]' : 'border-[#3b82f655]'}`}>
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: '#3b82f6', border: '2px solid #0D0D0D', top: -5 }} />
      <div className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-widest mb-1.5 flex items-center gap-1">
        <Bell size={9} /> Aktion
      </div>
      <div className="text-white text-sm font-semibold">{a?.label ?? '— nicht konfiguriert —'}</div>
      {data.title && <div className="text-[#666] text-xs mt-1 truncate" style={{ maxWidth: 170 }}>{data.title}</div>}
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: '#3b82f6', border: '2px solid #0D0D0D', bottom: -5 }} />
    </div>
  )
}

function ConditionNode({ data, selected }: NodeProps) {
  const field = CONDITION_FIELDS.find(f => f.value === data.field)
  const op    = OPERATORS.find(o => o.value === data.operator)
  return (
    <div style={{ minWidth: 200 }}
      className={`px-4 py-3 rounded-xl border-2 bg-[#1A1A1A] shadow-xl ${selected ? 'border-[#F5C400]' : 'border-[#F5C40055]'}`}>
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: '#F5C400', border: '2px solid #0D0D0D', top: -5 }} />
      <div className="text-[9px] font-bold text-[#F5C400] uppercase tracking-widest mb-1.5 flex items-center gap-1">
        <GitBranch size={9} /> Bedingung
      </div>
      <div className="text-white text-sm font-semibold">
        {field ? `${field.label} ${op?.label ?? '='} "${data.value ?? '?'}"` : '— nicht konfiguriert —'}
      </div>
      <div className="flex justify-between mt-2 text-[10px]">
        <span className="text-[#22c55e]">✓ Ja →</span>
        <span className="text-[#ff6666]">✗ Nein →</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true"
        style={{ width: 10, height: 10, background: '#22c55e', border: '2px solid #0D0D0D', bottom: -5, left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false"
        style={{ width: 10, height: 10, background: '#ff6666', border: '2px solid #0D0D0D', bottom: -5, left: '70%' }} />
    </div>
  )
}

const nodeTypes = { trigger: TriggerNode, action: ActionNode, condition: ConditionNode }

// ── Config Panel ──────────────────────────────────────────────────────────────
const sel = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00] [color-scheme:dark]'
const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B00]'

function ConfigPanel({ node, users, departments, onChange }: { node: Node; users: any[]; departments: any[]; onChange: (id: string, data: any) => void }) {
  const d = node.data
  const set = (patch: any) => onChange(node.id, { ...d, ...patch })
  const t = TRIGGERS.find(x => x.event === d.event)

  if (node.type === 'trigger') return (
    <div className="space-y-4">
      <p className="text-[#FF6B00] text-[10px] font-bold uppercase tracking-widest">Trigger konfigurieren</p>
      {/* Grouped select */}
      <div>
        <label className="text-xs text-[#888] block mb-1.5">Auslöser</label>
        <select value={d.event ?? ''} onChange={e => set({ event: e.target.value })} className={sel}>
          <option value="">— Auslöser wählen —</option>
          {Array.from(new Set(TRIGGERS.map(t => t.group))).map(group => (
            <optgroup key={group} label={group}>
              {TRIGGERS.filter(t => t.group === group).map(t => (
                <option key={t.event} value={t.event}>{t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {t && (
        <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3">
          <p className="text-[#555] text-[10px] font-semibold uppercase mb-2">Verfügbare Variablen</p>
          <div className="flex flex-wrap gap-1">
            {t.vars.map(v => (
              <span key={v} className="bg-[#FF6B0022] text-[#FF6B00] text-[10px] px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (node.type === 'condition') return (
    <div className="space-y-4">
      <p className="text-[#F5C400] text-[10px] font-bold uppercase tracking-widest">Bedingung konfigurieren</p>
      <div>
        <label className="text-xs text-[#888] block mb-1.5">Feld</label>
        <select value={d.field ?? ''} onChange={e => set({ field: e.target.value })} className={sel}>
          <option value="">— Feld wählen —</option>
          {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-[#888] block mb-1.5">Operator</label>
        <select value={d.operator ?? 'equals'} onChange={e => set({ operator: e.target.value })} className={sel}>
          {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-[#888] block mb-1.5">Wert</label>
        <input value={d.value ?? ''} onChange={e => set({ value: e.target.value })}
          placeholder="z.B. VACATION oder INTERVIEW" className={inp} />
      </div>
      <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3 text-[10px] text-[#555]">
        Verbinde den <span className="text-[#22c55e]">grünen Handle</span> mit dem "Ja"-Pfad
        und den <span className="text-[#ff6666]">roten Handle</span> mit dem "Nein"-Pfad.
      </div>
    </div>
  )

  if (node.type === 'action') return (
    <div className="space-y-4">
      <p className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest">Aktion konfigurieren</p>
      <div>
        <label className="text-xs text-[#888] block mb-1.5">Aktion</label>
        <select value={d.action ?? ''} onChange={e => set({ action: e.target.value, userId: '', role: '', departmentId: '' })} className={sel}>
          <option value="">— Aktion wählen —</option>
          {ACTIONS.map(a => <option key={a.action} value={a.action}>{a.label}</option>)}
        </select>
      </div>
      {d.action === 'notify.user' && (
        <div>
          <label className="text-xs text-[#888] block mb-1.5">Empfänger</label>
          <select value={d.userId ?? ''} onChange={e => set({ userId: e.target.value })} className={sel}>
            <option value="">— Benutzer wählen —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
          </select>
        </div>
      )}
      {d.action === 'notify.role' && (
        <div>
          <label className="text-xs text-[#888] block mb-1.5">Rolle</label>
          <select value={d.role ?? ''} onChange={e => set({ role: e.target.value })} className={sel}>
            <option value="">— Rolle wählen —</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGEMENT">Management</option>
            <option value="EMPLOYEE">Alle Mitarbeiter</option>
          </select>
        </div>
      )}
      {d.action === 'notify.department' && (
        <div>
          <label className="text-xs text-[#888] block mb-1.5">Abteilung</label>
          <select value={d.departmentId ?? ''} onChange={e => set({ departmentId: e.target.value })} className={sel}>
            <option value="">— Abteilung wählen —</option>
            {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
          </select>
        </div>
      )}
      {(d.action === 'notify.manager' || d.action === 'notify.employee') && (
        <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3 text-[10px] text-[#555]">
          Wird automatisch aus dem Trigger-Ereignis ermittelt (kein weiteres Setup nötig).
        </div>
      )}
      {d.action && (
        <>
          <div>
            <label className="text-xs text-[#888] block mb-1.5">Benachrichtigungs-Titel</label>
            <input value={d.title ?? ''} onChange={e => set({ title: e.target.value })}
              placeholder="z.B. Neue Bewerbung: {{candidateName}}" className={inp} />
          </div>
          <div>
            <label className="text-xs text-[#888] block mb-1.5">Text (optional)</label>
            <input value={d.body ?? ''} onChange={e => set({ body: e.target.value })}
              placeholder="Details…" className={inp} />
          </div>
          <div>
            <label className="text-xs text-[#888] block mb-1.5">Link (optional)</label>
            <input value={d.link ?? ''} onChange={e => set({ link: e.target.value })}
              placeholder="/recruiting" className={inp} />
          </div>
        </>
      )}
    </div>
  )

  return null
}

// ── Node Palette Groups ───────────────────────────────────────────────────────
const triggerGroups = Array.from(new Set(TRIGGERS.map(t => t.group)))

// ── Inner Editor ─────────────────────────────────────────────────────────────
function EditorInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { project } = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)

  const [name, setName]       = useState('Neuer Workflow')
  const [active, setActive]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected] = useState<Node | null>(null)
  const [users, setUsers]       = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    apiFetch('/auth/users').then(setUsers).catch(() => {})
    apiFetch('/api/departments').then(setDepartments).catch(() => {})
    if (id) {
      apiFetch(`/api/workflows/${id}`).then(wf => {
        setName(wf.name)
        setActive(wf.active)
        setNodes(JSON.parse(wf.nodes))
        setEdges(JSON.parse(wf.edges))
      }).catch(() => navigate('/workflows'))
    }
  }, [id])

  const onConnect = useCallback(
    (p: Connection | Edge) => {
      const label = (p as any).sourceHandle === 'true' ? 'true' : (p as any).sourceHandle === 'false' ? 'false' : undefined
      setEdges(es => addEdge({
        ...p, animated: true,
        label: label ? (label === 'true' ? '✓ Ja' : '✗ Nein') : undefined,
        style: { stroke: label === 'true' ? '#22c55e' : label === 'false' ? '#ff6666' : '#FF6B00', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: label === 'true' ? '#22c55e' : label === 'false' ? '#ff6666' : '#FF6B00' },
        data: { branch: label },
      }, es))
    }, []
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('nodeType')
    if (!type || !wrapper.current) return
    const bounds = wrapper.current.getBoundingClientRect()
    const position = project({ x: e.clientX - bounds.left, y: e.clientY - bounds.top })
    const initData: any = type === 'trigger' ? { event: e.dataTransfer.getData('nodeEvent') }
      : type === 'condition' ? { field: '', operator: 'equals', value: '' }
      : { action: e.dataTransfer.getData('nodeAction'), title: '', body: '', link: '' }
    setNodes(ns => ns.concat({ id: `${Date.now()}`, type, position, data: initData }))
  }, [project])

  const updateNodeData = (nodeId: string, data: any) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data } : n))
    setSelected(s => s?.id === nodeId ? { ...s, data } : s)
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/workflows/${id}`, { method: 'PUT', body: JSON.stringify({ name, active, nodes, edges }) })
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const toggleActive = async () => {
    const next = !active
    setActive(next)
    await apiFetch(`/api/workflows/${id}`, { method: 'PUT', body: JSON.stringify({ active: next }) })
      .catch(() => setActive(!next))
  }

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0D]" style={{ fontFamily: 'inherit' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A2A] shrink-0 bg-[#111]">
        <button onClick={() => navigate('/workflows')}
          className="p-2 text-[#555] hover:text-white transition-colors rounded-lg hover:bg-[#2A2A2A]">
          <ArrowLeft size={15} />
        </button>
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-[#FF6B00] pb-0.5 transition-colors" />
        <button onClick={toggleActive}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-[#22c55e22] text-[#22c55e]' : 'bg-[#2A2A2A] text-[#555] hover:text-white'}`}>
          {active ? <><Play size={10} /> Aktiv</> : <><Pause size={10} /> Inaktiv</>}
        </button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6B00] text-white text-xs font-semibold rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
          <Save size={12} /> {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-52 shrink-0 border-r border-[#2A2A2A] bg-[#111] p-3 overflow-auto space-y-4">
          {/* Triggers grouped */}
          {triggerGroups.map(group => (
            <div key={group}>
              <p className="text-[9px] font-bold text-[#FF6B00] uppercase tracking-widest mb-1.5">{group}</p>
              {TRIGGERS.filter(t => t.group === group).map(t => (
                <div key={t.event} draggable
                  onDragStart={e => { e.dataTransfer.setData('nodeType', 'trigger'); e.dataTransfer.setData('nodeEvent', t.event) }}
                  className="mb-1 px-2.5 py-1.5 bg-[#1A1A1A] border border-[#FF6B0033] rounded-lg text-[11px] text-[#FF6B00] cursor-grab active:cursor-grabbing hover:border-[#FF6B00] hover:bg-[#FF6B0011] transition-colors select-none">
                  ⚡ {t.label}
                </div>
              ))}
            </div>
          ))}

          {/* Condition */}
          <div>
            <p className="text-[9px] font-bold text-[#F5C400] uppercase tracking-widest mb-1.5">Logik</p>
            <div draggable
              onDragStart={e => { e.dataTransfer.setData('nodeType', 'condition') }}
              className="mb-1 px-2.5 py-1.5 bg-[#1A1A1A] border border-[#F5C40033] rounded-lg text-[11px] text-[#F5C400] cursor-grab active:cursor-grabbing hover:border-[#F5C400] hover:bg-[#F5C40011] transition-colors select-none">
              🔀 Wenn / Dann
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-widest mb-1.5">Aktionen</p>
            {ACTIONS.map(a => (
              <div key={a.action} draggable
                onDragStart={e => { e.dataTransfer.setData('nodeType', 'action'); e.dataTransfer.setData('nodeAction', a.action) }}
                className="mb-1 px-2.5 py-1.5 bg-[#1A1A1A] border border-[#3b82f633] rounded-lg text-[11px] text-[#3b82f6] cursor-grab active:cursor-grabbing hover:border-[#3b82f6] hover:bg-[#3b82f611] transition-colors select-none">
                🔔 {a.label}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div ref={wrapper} className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => setSelected(null)}
            nodeTypes={nodeTypes}
            fitView deleteKeyCode="Delete"
            style={{ background: '#0D0D0D' }}
          >
            <Background color="#1A1A1A" gap={24} size={1} />
            <Controls style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8 }} />
          </ReactFlow>
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Zap size={32} className="mx-auto mb-3 text-[#2A2A2A]" />
                <p className="text-[#2A2A2A] text-sm">Node aus der Seitenleiste hierher ziehen</p>
                <p className="text-[#1A1A1A] text-xs mt-1">Trigger → Bedingung (optional) → Aktion</p>
              </div>
            </div>
          )}
        </div>

        {/* Right config */}
        {selected && (
          <div className="w-64 shrink-0 border-l border-[#2A2A2A] bg-[#111] p-4 overflow-auto">
            <ConfigPanel node={selected} users={users} departments={departments} onChange={updateNodeData} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  )
}
