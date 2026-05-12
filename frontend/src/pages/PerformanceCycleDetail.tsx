import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users, Target, UserPlus, X } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'

const ACTIVITY_TYPES = [
  { key: 'SELF_REVIEW',     label: 'Selbstbeurteilungen',            color: '#FF6B00' },
  { key: 'MANAGER_REVIEW',  label: 'Beurteilungen durch Führungskräfte', color: '#F5C400' },
  { key: 'PEER_REVIEW',     label: '360°-Feedback',                  color: '#a855f7' },
  { key: 'GOAL_SETTING',    label: 'Zielsetzung',                    color: '#22c55e' },
  { key: 'DEVELOPMENT_PLAN',label: 'Entwicklungsplan',               color: '#3b82f6' },
  { key: 'CALIBRATION',     label: 'Kalibrierung',                   color: '#f97316' },
]

const typeMap = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.key, t]))

const statusLabel: Record<string, string> = {
  DRAFT: 'Entwurf', ACTIVE: 'Aktiv', COMPLETED: 'Abgeschlossen', CANCELLED: 'Abgebrochen',
}
const statusColor: Record<string, string> = {
  DRAFT:     'bg-[#ffffff11] text-[#666]',
  ACTIVE:    'bg-[#FF6B0022] text-[#FF6B00]',
  COMPLETED: 'bg-[#22c55e22] text-[#22c55e]',
}

const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function fmtDt(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  const h = d.getHours(), m = d.getMinutes()
  if (h === 0 && m === 0) return date
  return `${date}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} Uhr`
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-[#555] mb-1.5">{label}</label>{children}</div>
}

// ── Gantt chart ────────────────────────────────────────────────────────────
function GanttChart({ activities, cycleStart, cycleEnd }: { activities: any[]; cycleStart: Date | null; cycleEnd: Date | null }) {
  if (activities.length === 0) {
    return <p className="text-[#555] text-sm py-4 text-center">Noch keine Aktivitäten hinzugefügt.</p>
  }

  const starts = activities.map(a => new Date(a.startDate).getTime())
  const ends   = activities.map(a => new Date(a.endDate).getTime())
  const rangeStart = cycleStart ?? new Date(Math.min(...starts))
  const rangeEnd   = cycleEnd   ?? new Date(Math.max(...ends))
  const totalMs    = rangeEnd.getTime() - rangeStart.getTime()

  const months: { label: string; left: number; width: number }[] = []
  const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  while (cur <= rangeEnd) {
    const mStart = Math.max(cur.getTime(), rangeStart.getTime())
    const mEnd   = Math.min(new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getTime(), rangeEnd.getTime())
    months.push({
      label: cur.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase(),
      left:  ((mStart - rangeStart.getTime()) / totalMs) * 100,
      width: ((mEnd - mStart) / totalMs) * 100,
    })
    cur.setMonth(cur.getMonth() + 1)
  }

  const today = new Date()
  const todayPct = totalMs > 0 ? ((today.getTime() - rangeStart.getTime()) / totalMs) * 100 : -1

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="relative h-7 mb-1 ml-48">
          {months.map((m, i) => (
            <div key={i} className="absolute top-0 text-[10px] text-[#444] uppercase tracking-widest"
              style={{ left: `${m.left}%`, width: `${m.width}%` }}>
              {m.label}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {activities.map(act => {
            const info  = typeMap[act.type] ?? { label: act.name, color: '#666' }
            const left  = Math.max(0, ((new Date(act.startDate).getTime() - rangeStart.getTime()) / totalMs) * 100)
            const right = Math.min(100, ((new Date(act.endDate).getTime()   - rangeStart.getTime()) / totalMs) * 100)
            const width = Math.max(1, right - left)
            return (
              <div key={act.id} className="flex items-center gap-0">
                <div className="w-48 shrink-0 pr-3">
                  <p className="text-sm truncate" style={{ color: info.color }}>{act.name}</p>
                </div>
                <div className="flex-1 relative h-8 bg-[#111] rounded-lg overflow-hidden">
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 w-px bg-[#FF6B00] z-10" style={{ left: `${todayPct}%` }} />
                  )}
                  <div className="absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: `${info.color}33`, borderLeft: `3px solid ${info.color}` }}>
                    <span className="text-[10px] font-medium truncate" style={{ color: info.color }}>
                      {new Date(act.startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(act.endDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Participant avatars ────────────────────────────────────────────────────
function ParticipantPills({ participants }: { participants: any[] }) {
  if (participants.length === 0) return <span className="text-[#444] text-xs">Keine Teilnehmer</span>
  const shown = participants.slice(0, 5)
  const rest  = participants.length - shown.length
  return (
    <div className="flex items-center gap-0.5">
      {shown.map(p => (
        <div key={p.employeeId}
          title={`${p.employee.firstName} ${p.employee.lastName}`}
          className="w-6 h-6 rounded-full bg-[#FF6B0033] text-[#FF6B00] flex items-center justify-center text-[9px] font-bold border border-[#0D0D0D] -ml-1 first:ml-0">
          {initials(p.employee.firstName, p.employee.lastName)}
        </div>
      ))}
      {rest > 0 && (
        <div className="w-6 h-6 rounded-full bg-[#2A2A2A] text-[#555] flex items-center justify-center text-[9px] -ml-1">
          +{rest}
        </div>
      )}
    </div>
  )
}

// ── Manage participants modal ──────────────────────────────────────────────
function ParticipantsModal({ activity, allEmployees, onClose, onSaved }: {
  activity: any
  allEmployees: any[]
  onClose: () => void
  onSaved: () => void
}) {
  const currentIds = new Set<number>(activity.participants.map((p: any) => p.employeeId))
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState(false)

  const filtered = allEmployees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.position ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = async (emp: any) => {
    setPending(true)
    try {
      if (currentIds.has(emp.id)) {
        await apiFetch(`/api/performance/activities/${activity.id}/participants/${emp.id}`, { method: 'DELETE' })
      } else {
        await apiFetch(`/api/performance/activities/${activity.id}/participants`, {
          method: 'POST', body: JSON.stringify({ employeeId: emp.id }),
        })
      }
      onSaved()
    } finally { setPending(false) }
  }

  return (
    <Modal title={`Teilnehmer – ${activity.name}`} onClose={onClose}>
      <div className="space-y-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Mitarbeiter suchen…"
          className={inp}
        />
        <p className="text-xs text-[#555]">{activity.participants.length} Teilnehmer ausgewählt</p>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {filtered.map(emp => {
            const active = currentIds.has(emp.id)
            return (
              <button
                key={emp.id}
                disabled={pending}
                onClick={() => toggle(emp)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left
                  ${active ? 'bg-[#FF6B0015] border border-[#FF6B0040]' : 'hover:bg-[#1A1A1A] border border-transparent'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${active ? 'bg-[#FF6B0033] text-[#FF6B00]' : 'bg-[#2A2A2A] text-[#555]'}`}>
                  {initials(emp.firstName, emp.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-[#aaa]'}`}>
                    {emp.firstName} {emp.lastName}
                  </p>
                  {emp.position && <p className="text-[#555] text-xs truncate">{emp.position}</p>}
                </div>
                {active && <X size={13} className="text-[#FF6B00] shrink-0" />}
              </button>
            )
          })}
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white bg-[#FF6B00] rounded-lg hover:bg-[#e55e00] transition-colors">
            Fertig
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PerformanceCycleDetail() {
  const { id } = useParams()
  const [cycle, setCycle]             = useState<any>(null)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [showModal, setShowModal]     = useState(false)
  const [participantsFor, setParticipantsFor] = useState<any | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [actForm, setActForm]         = useState({
    name: '', type: 'SELF_REVIEW', startDate: '', endDate: '', description: '',
  })

  const load = () => apiFetch(`/api/performance/cycles/${id}`).then(setCycle)

  useEffect(() => {
    load()
    apiFetch('/api/employees').then(setAllEmployees)
  }, [id])

  // Keep participantsFor in sync after reload
  useEffect(() => {
    if (participantsFor && cycle) {
      const updated = cycle.activities.find((a: any) => a.id === participantsFor.id)
      if (updated) setParticipantsFor(updated)
    }
  }, [cycle])

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch(`/api/performance/cycles/${id}/activities`, {
        method: 'POST', body: JSON.stringify(actForm),
      })
      setShowModal(false)
      setActForm({ name: '', type: 'SELF_REVIEW', startDate: '', endDate: '', description: '' })
      load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const removeActivity = async (actId: number) => {
    if (!confirm('Aktivität löschen?')) return
    await apiFetch(`/api/performance/activities/${actId}`, { method: 'DELETE' })
    load()
  }

  if (!cycle) return <div className="p-8 text-[#555] bg-[#0D0D0D] min-h-screen">Laden…</div>

  return (
    <div className="p-8 max-w-4xl bg-[#0D0D0D] min-h-screen space-y-6">
      <Link to="/performance" className="inline-flex items-center gap-1 text-sm text-[#555] hover:text-[#FF6B00] transition-colors">
        <ArrowLeft size={14} /> Alle Zyklen
      </Link>

      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center">
              <Target size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{cycle.name}</h1>
              {cycle.description && <p className="text-[#555] text-sm mt-0.5">{cycle.description}</p>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${statusColor[cycle.status] ?? ''}`}>
            {statusLabel[cycle.status] ?? cycle.status}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-[#555] border-t border-[#2A2A2A] pt-4">
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>Teilnehmende: <strong className="text-white">{cycle.participantCount}</strong></span>
          </div>
          {cycle.startDate && (
            <span>
              {new Date(cycle.startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' – '}
              {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '?'}
            </span>
          )}
        </div>
      </div>

      {/* Gantt */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Zeitplan</h2>
          <div className="flex gap-3 flex-wrap">
            {ACTIVITY_TYPES.slice(0, 4).map(t => (
              <div key={t.key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
                <span className="text-[10px] text-[#555]">{t.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
        <GanttChart
          activities={cycle.activities}
          cycleStart={cycle.startDate ? new Date(cycle.startDate) : null}
          cycleEnd={cycle.endDate ? new Date(cycle.endDate) : null}
        />
      </div>

      {/* Activity list */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Aktivitäten ({cycle.activities.length})</h2>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#FF6B00] border border-[#FF6B0033] rounded-lg hover:bg-[#FF6B0011] transition-colors">
            <Plus size={12} /> Aktivität hinzufügen
          </button>
        </div>

        {cycle.activities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[#555] text-sm mb-2">Noch keine Aktivitäten</p>
            <button onClick={() => setShowModal(true)} className="text-[#FF6B00] text-sm hover:underline">
              + Erste Aktivität hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[#2A2A2A]">
            {cycle.activities.map((act: any) => {
              const info = typeMap[act.type] ?? { label: act.type, color: '#666' }
              return (
                <div key={act.id} className="flex items-center gap-4 py-3.5 group">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{act.name}</p>
                    <p className="text-[#555] text-xs">{info.label}</p>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-2 shrink-0">
                    <ParticipantPills participants={act.participants} />
                    <button
                      onClick={() => setParticipantsFor(act)}
                      title="Teilnehmer verwalten"
                      className="p-1.5 text-[#444] hover:text-[#FF6B00] transition-colors rounded-md hover:bg-[#FF6B0011]">
                      <UserPlus size={13} />
                    </button>
                  </div>

                  <div className="text-right text-xs text-[#555] shrink-0">
                    <p>{fmtDt(act.startDate)}</p>
                    <p>{fmtDt(act.endDate)}</p>
                  </div>
                  {act.description && (
                    <div className="hidden group-hover:block w-48 text-xs text-[#666] truncate">{act.description}</div>
                  )}
                  <button onClick={() => removeActivity(act.id)}
                    className="p-1.5 text-[#333] hover:text-[#ff6666] transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {showModal && (
        <Modal title="Aktivität hinzufügen" onClose={() => setShowModal(false)}>
          <form onSubmit={addActivity} className="space-y-4">
            <Field label="Name *">
              <input required value={actForm.name} onChange={e => setActForm(f => ({ ...f, name: e.target.value }))}
                className={inp} placeholder="z.B. Selbstbeurteilungen Q1" />
            </Field>
            <Field label="Typ *">
              <select required value={actForm.type} onChange={e => setActForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start (Datum & Uhrzeit) *">
                <input required type="datetime-local" value={actForm.startDate}
                  onChange={e => setActForm(f => ({ ...f, startDate: e.target.value }))}
                  className={inp + ' [color-scheme:dark]'} />
              </Field>
              <Field label="Ende (Datum & Uhrzeit) *">
                <input required type="datetime-local" value={actForm.endDate}
                  onChange={e => setActForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inp + ' [color-scheme:dark]'} />
              </Field>
            </div>
            <Field label="Beschreibung">
              <textarea value={actForm.description} onChange={e => setActForm(f => ({ ...f, description: e.target.value }))}
                className={inp + ' h-16 resize-none'} placeholder="Optionale Zusatzinfos…" />
            </Field>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">{saving ? 'Hinzufügen…' : 'Hinzufügen'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Participants Modal */}
      {participantsFor && (
        <ParticipantsModal
          activity={participantsFor}
          allEmployees={allEmployees}
          onClose={() => setParticipantsFor(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
