import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserCheck, Plus, Check, Trash2, ChevronRight, X, Calendar, Tag } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'

const CATEGORIES = [
  { value: 'IT',          label: 'IT & Technik',    color: '#3b82f6' },
  { value: 'HR',          label: 'HR & Dokumente',  color: '#F5C400' },
  { value: 'LEGAL',       label: 'Recht & Compliance', color: '#ff6666' },
  { value: 'OFFICE',      label: 'Büro & Zugang',   color: '#22c55e' },
  { value: 'INTRO',       label: 'Einführung',       color: '#a855f7' },
  { value: 'OTHER',       label: 'Sonstiges',        color: '#555' },
]

const DEFAULT_TASKS = [
  { title: 'Laptop einrichten & Software installieren', category: 'IT' },
  { title: 'E-Mail-Account & Zugänge anlegen', category: 'IT' },
  { title: 'VPN-Zugang einrichten', category: 'IT' },
  { title: 'Vertragsunterlagen unterzeichnen', category: 'HR' },
  { title: 'Steuerklasse & Bankverbindung erfassen', category: 'HR' },
  { title: 'NDA unterzeichnen', category: 'LEGAL' },
  { title: 'DSGVO-Einweisung', category: 'LEGAL' },
  { title: 'Bürozugang & Badge ausstellen', category: 'OFFICE' },
  { title: 'Arbeitsplatz vorbereiten', category: 'OFFICE' },
  { title: 'Team vorstellen', category: 'INTRO' },
  { title: 'Einführungsgespräch mit Vorgesetztem', category: 'INTRO' },
  { title: 'Unternehmensrundgang', category: 'INTRO' },
]

const catMeta = (v: string) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[5]

const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function progress(tasks: any[]) {
  if (!tasks.length) return 0
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
}

export default function Onboarding() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans]         = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selected, setSelected]   = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [users, setUsers]         = useState<any[]>([])
  const [sentTo, setSentTo]       = useState('')
  const [newTask, setNewTask]     = useState('')
  const [newTaskCat, setNewTaskCat] = useState('OTHER')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [form, setForm] = useState({ employeeId: '', name: '', startDate: '', useDefault: true })

  const load = async () => {
    const data = await apiFetch('/api/onboarding')
    setPlans(data)
    if (selected) setSelected(data.find((p: any) => p.id === selected.id) ?? null)
    return data
  }

  useEffect(() => {
    const planId = searchParams.get('plan')
    load().then(data => {
      if (planId) {
        const target = data.find((p: any) => p.id === parseInt(planId))
        if (target) setSelected(target)
        setSearchParams({}, { replace: true })
      }
    })
    apiFetch('/api/employees').then(d => setEmployees(d.data ?? d))
    apiFetch('/auth/users').then(setUsers)
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload: any = {
        employeeId: form.employeeId,
        name: form.name,
        startDate: form.startDate,
      }
      if (form.useDefault) payload.tasks = DEFAULT_TASKS
      const result = await apiFetch('/api/onboarding', { method: 'POST', body: JSON.stringify(payload) })
      const { notifiedUsers, ...plan } = result
      setPlans(p => [plan, ...p])
      setSelected(plan)
      setShowModal(false)
      setForm({ employeeId: '', name: '', startDate: '', useDefault: true })
      if (notifiedUsers?.length) {
        const names = notifiedUsers.map((n: any) => {
          const u = users.find((u: any) => u.id === n.userId)
          return u ? `${u.firstName} ${u.lastName}` : `User #${n.userId}`
        }).join(', ')
        setSentTo(names)
        setTimeout(() => setSentTo(''), 5000)
        window.dispatchEvent(new Event('notification:refresh'))
      }
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const toggleTask = async (task: any) => {
    const updated = await apiFetch(`/api/onboarding/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !task.completed }),
    })
    setSelected((p: any) => ({ ...p, tasks: p.tasks.map((t: any) => t.id === task.id ? { ...t, ...updated } : t) }))
    setPlans(ps => ps.map(p => p.id === selected.id
      ? { ...p, tasks: p.tasks.map((t: any) => t.id === task.id ? { ...t, ...updated } : t) }
      : p))
  }

  const deleteTask = async (taskId: number) => {
    await apiFetch(`/api/onboarding/tasks/${taskId}`, { method: 'DELETE' })
    setSelected((p: any) => ({ ...p, tasks: p.tasks.filter((t: any) => t.id !== taskId) }))
    setPlans(ps => ps.map(p => p.id === selected.id ? { ...p, tasks: p.tasks.filter((t: any) => t.id !== taskId) } : p))
  }

  const addTask = async () => {
    if (!newTask.trim()) return
    const task = await apiFetch(`/api/onboarding/${selected.id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title: newTask, category: newTaskCat, assigneeId: newTaskAssignee || undefined }),
    })
    setSelected((p: any) => ({ ...p, tasks: [...p.tasks, task] }))
    setPlans(ps => ps.map(p => p.id === selected.id ? { ...p, tasks: [...p.tasks, task] } : p))
    if (newTaskAssignee) {
      const u = users.find((u: any) => String(u.id) === String(newTaskAssignee))
      if (u) { setSentTo(`${u.firstName} ${u.lastName}`); setTimeout(() => setSentTo(''), 4000) }
      window.dispatchEvent(new Event('notification:refresh'))
    }
    setNewTask(''); setNewTaskCat('OTHER'); setNewTaskAssignee(''); setAddingTask(false)
  }

  const deletePlan = async (planId: number) => {
    if (!confirm('Onboarding-Plan löschen?')) return
    await apiFetch(`/api/onboarding/${planId}`, { method: 'DELETE' })
    setPlans(ps => ps.filter(p => p.id !== planId))
    if (selected?.id === planId) setSelected(null)
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    tasks: selected?.tasks?.filter((t: any) => t.category === cat.value) ?? [],
  })).filter(g => g.tasks.length > 0)

  const pct = selected ? progress(selected.tasks) : 0
  const done = selected?.tasks?.filter((t: any) => t.completed).length ?? 0
  const total = selected?.tasks?.length ?? 0

  return (
    <div className="flex h-full bg-[#0D0D0D]">
      {/* Left: plan list */}
      <div className="w-72 shrink-0 border-r border-[#2A2A2A] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-[#FF6B00]" />
            <span className="text-white font-semibold text-sm">Onboarding</span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-7 h-7 rounded-lg bg-[#FF6B00] flex items-center justify-center hover:bg-[#e55e00] transition-colors">
            <Plus size={14} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {plans.length === 0 && (
            <p className="text-[#444] text-xs text-center py-8">Noch keine Pläne.</p>
          )}
          {plans.map(p => {
            const pct = progress(p.tasks)
            const isActive = selected?.id === p.id
            return (
              <button key={p.id} onClick={() => setSelected(p)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-[#FF6B0011] border-[#FF6B00]' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#444]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium truncate flex-1">{p.employee.firstName} {p.employee.lastName}</span>
                  <ChevronRight size={12} className="text-[#555] shrink-0" />
                </div>
                <p className="text-[#555] text-xs truncate mb-2">{p.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[#555] text-[10px] shrink-0">{pct}%</span>
                </div>
                <p className="text-[#444] text-[10px] mt-1">
                  {p.tasks.filter((t: any) => t.completed).length}/{p.tasks.length} erledigt
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: checklist */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <UserCheck size={48} className="mx-auto mb-3 text-[#2A2A2A]" />
            <p className="text-[#444] text-sm">Plan auswählen oder neuen anlegen</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors mx-auto">
              <Plus size={14} /> Neuer Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#2A2A2A] shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">{selected.employee.firstName} {selected.employee.lastName}</h2>
                <p className="text-[#555] text-sm">{selected.name} · Start: {new Date(selected.startDate).toLocaleDateString('de-DE')}</p>
              </div>
              <button onClick={() => deletePlan(selected.id)} className="p-2 text-[#333] hover:text-[#ff6666] transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div className="h-full bg-[#FF6B00] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-white text-sm font-semibold">{pct}%</span>
              <span className="text-[#555] text-xs">{done}/{total} erledigt</span>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-5">
            {grouped.map(group => (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: group.color }}>{group.label}</span>
                  <span className="text-[#444] text-xs">
                    {group.tasks.filter((t: any) => t.completed).length}/{group.tasks.length}
                  </span>
                </div>
                <div className="space-y-1 ml-4">
                  {group.tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-3 group py-1.5">
                      <button onClick={() => toggleTask(task)}
                        className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${task.completed ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-[#333] hover:border-[#FF6B00]'}`}>
                        {task.completed && <Check size={11} className="text-white" />}
                      </button>
                      <span className={`flex-1 text-sm transition-colors ${task.completed ? 'line-through text-[#444]' : 'text-white'}`}>
                        {task.title}
                      </span>
                      {task.assignee && (
                        <span className="text-[#FF6B00] text-[10px] bg-[#FF6B0022] px-2 py-0.5 rounded-full shrink-0">
                          {task.assignee.firstName} {task.assignee.lastName}
                        </span>
                      )}
                    {task.dueDate && (
                        <span className="text-[#444] text-xs flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(task.dueDate).toLocaleDateString('de-DE')}
                        </span>
                      )}
                      <button onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#333] hover:text-[#ff6666] transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Uncategorized / empty state */}
            {selected.tasks?.length === 0 && (
              <p className="text-[#444] text-sm text-center py-8">Noch keine Aufgaben. Füge die erste hinzu.</p>
            )}

            {/* Add task */}
            {sentTo && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#22c55e22] border border-[#22c55e44] rounded-lg text-[#22c55e] text-sm">
                <Check size={13} /> Mitteilung gesendet an <strong>{sentTo}</strong>
              </div>
            )}

            {addingTask ? (
              <div className="flex flex-col gap-2 mt-2 bg-[#1A1A1A] border border-[#FF6B00] rounded-xl p-3">
                <input autoFocus value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setAddingTask(false); setNewTask('') } }}
                  placeholder="Aufgabe eingeben…"
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00]" />
                <div className="flex items-center gap-2">
                  <select value={newTaskCat} onChange={e => setNewTaskCat(e.target.value)}
                    className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-2 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#FF6B00] [color-scheme:dark]">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}
                    className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-2 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#FF6B00] [color-scheme:dark]">
                    <option value="">— Verantwortlich —</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
                  </select>
                </div>
                {newTaskAssignee && <p className="text-[10px] text-[#FF6B00]">✓ Mitteilung wird automatisch gesendet</p>}
                <div className="flex gap-2">
                  <button onClick={addTask} className="px-3 py-1.5 bg-[#FF6B00] text-white text-sm rounded-lg hover:bg-[#e55e00]">Hinzufügen</button>
                  <button onClick={() => { setAddingTask(false); setNewTask(''); setNewTaskAssignee('') }} className="p-1.5 text-[#555] hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 text-sm text-[#555] hover:text-[#FF6B00] transition-colors mt-2">
                <Plus size={14} /> Aufgabe hinzufügen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create plan modal */}
      {showModal && (
        <Modal title="Onboarding-Plan anlegen" onClose={() => setShowModal(false)}>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Mitarbeiter *</label>
              <select required value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className={inp}>
                <option value="">— Mitarbeiter auswählen —</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.position ? ` · ${e.position}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Plan-Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inp} placeholder="z.B. Standard Onboarding, IT Onboarding…" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Startdatum *</label>
              <input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className={inp + ' [color-scheme:dark]'} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setForm(f => ({ ...f, useDefault: !f.useDefault }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.useDefault ? 'bg-[#FF6B00]' : 'bg-[#2A2A2A]'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.useDefault ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-[#888]">Standard-Checkliste ({DEFAULT_TASKS.length} Aufgaben) einfügen</span>
            </label>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
                {saving ? 'Anlegen…' : 'Plan anlegen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
