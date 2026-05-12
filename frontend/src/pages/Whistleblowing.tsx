import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Plus, AlertTriangle, MessageCircle, User, ChevronDown, X } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'

const CATEGORIES = [
  { value: 'DISCRIMINATION', label: 'Diskriminierung' },
  { value: 'FRAUD',          label: 'Betrug' },
  { value: 'HARASSMENT',     label: 'Belästigung' },
  { value: 'LEAK',           label: 'Datenleck' },
  { value: 'CORRUPTION',     label: 'Korruption' },
  { value: 'SAFETY',         label: 'Sicherheit' },
  { value: 'OTHER',          label: 'Sonstiges' },
]
const PRIORITIES = [
  { value: 'LOW',      label: 'Niedrig',  color: '#22c55e' },
  { value: 'MEDIUM',   label: 'Mittel',   color: '#F5C400' },
  { value: 'HIGH',     label: 'Hoch',     color: '#FF6B00' },
  { value: 'CRITICAL', label: 'Kritisch', color: '#ff6666' },
]
const STATUSES = [
  { value: 'TODO',        label: 'To do' },
  { value: 'IN_PROGRESS', label: 'Wird bearbeitet' },
  { value: 'WAITING',     label: 'Wartend' },
  { value: 'CLOSED',      label: 'Geschlossen' },
]

const statusColor: Record<string, string> = {
  TODO:        'bg-[#3b82f622] text-[#3b82f6]',
  IN_PROGRESS: 'bg-[#F5C40022] text-[#F5C400]',
  WAITING:     'bg-[#ff666622] text-[#ff6666]',
  CLOSED:      'bg-[#ffffff11] text-[#555]',
}
const priorityColor: Record<string, string> = {
  LOW:      'text-[#22c55e]',
  MEDIUM:   'text-[#F5C400]',
  HIGH:     'text-[#FF6B00]',
  CRITICAL: 'text-[#ff6666]',
}

const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days > 1)  return `Vor ${days} Tagen`
  if (days === 1) return 'Gestern'
  if (hours > 0) return `Vor ${hours} Stunden`
  return 'Gerade eben'
}

export default function Whistleblowing() {
  const navigate = useNavigate()
  const [cases, setCases]       = useState<any[]>([])
  const [users, setUsers]       = useState<any[]>([])
  const [view, setView]         = useState<'all' | 'unassigned' | 'mine' | 'archived'>('all')
  const [filterCat, setFilterCat]   = useState('')
  const [filterPrio, setFilterPrio] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: 'OTHER', priority: 'MEDIUM' })

  const load = () => {
    const params = new URLSearchParams()
    if (view === 'archived') params.set('archived', 'true')
    if (filterCat)    params.set('category', filterCat)
    if (filterPrio)   params.set('priority', filterPrio)
    if (filterStatus) params.set('status', filterStatus)
    apiFetch(`/api/whistleblowing?${params}`).then(setCases)
  }

  useEffect(() => { load() }, [view, filterCat, filterPrio, filterStatus])
  useEffect(() => { apiFetch('/auth/users').then(setUsers) }, [])

  const displayed = cases.filter(c => {
    if (view === 'unassigned') return !c.assigneeId
    if (view === 'mine')       return c.assignee != null
    return true
  })

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/whistleblowing', { method: 'POST', body: JSON.stringify(form) })
      setShowModal(false)
      setForm({ title: '', description: '', category: 'OTHER', priority: 'MEDIUM' })
      load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v
  const prioLabel = (v: string) => PRIORITIES.find(p => p.value === v)?.label ?? v

  const unassignedCount = cases.filter(c => !c.assigneeId).length

  return (
    <div className="flex h-full bg-[#0D0D0D]">
      {/* Left sidebar */}
      <div className="w-56 shrink-0 border-r border-[#2A2A2A] p-4 flex flex-col gap-1">
        <p className="text-[#555] text-[10px] uppercase tracking-widest font-semibold mb-2 px-2">Fälle</p>

        {([
          { id: 'all',        label: 'Alle Fälle' },
          { id: 'unassigned', label: 'Nicht zugewiesen', count: unassignedCount },
          { id: 'mine',       label: 'Zugewiesen' },
          { id: 'archived',   label: 'Archiv' },
        ] as const).map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${view === item.id ? 'bg-[#FF6B0022] text-[#FF6B00]' : 'text-[#666] hover:text-white hover:bg-[#1A1A1A]'}`}>
            <span>{item.label}</span>
            {'count' in item && item.count > 0 && (
              <span className="bg-[#FF6B00] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{item.count}</span>
            )}
          </button>
        ))}

        <div className="flex-1" />
        <div className="border-t border-[#2A2A2A] pt-3 mt-2">
          <p className="text-[#555] text-[10px] uppercase tracking-widest font-semibold mb-2 px-2">Info</p>
          <p className="text-[#444] text-xs px-2 leading-relaxed">Alle Meldungen werden anonym behandelt und sind nur für Berechtigte sichtbar.</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A] shrink-0">
          <Shield size={18} className="text-[#FF6B00]" />
          <h1 className="text-white font-semibold">Whistleblowing</h1>
          <span className="text-[#555] text-sm">· {displayed.length} Fälle</span>
          <div className="flex-1" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <FilterSelect value={filterCat} onChange={setFilterCat}>
              <option value="">Alle Kategorien</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </FilterSelect>
            <FilterSelect value={filterPrio} onChange={setFilterPrio}>
              <option value="">Alle Prioritäten</option>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </FilterSelect>
            <FilterSelect value={filterStatus} onChange={setFilterStatus}>
              <option value="">Alle Statuse</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </FilterSelect>
            {(filterCat || filterPrio || filterStatus) && (
              <button onClick={() => { setFilterCat(''); setFilterPrio(''); setFilterStatus('') }}
                className="p-1.5 text-[#555] hover:text-[#ff6666] transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
            <Plus size={14} /> Fall melden
          </button>
        </div>

        {/* Case list */}
        <div className="flex-1 overflow-auto p-6 space-y-3">
          {displayed.length === 0 && (
            <div className="text-center py-20 text-[#555]">
              <Shield size={40} className="mx-auto mb-3 opacity-30" />
              <p>Keine Fälle vorhanden.</p>
            </div>
          )}
          {displayed.map(c => (
            <div key={c.id} onClick={() => navigate(`/whistleblowing/${c.id}`)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-5 py-4 cursor-pointer hover:border-[#FF6B00] transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[#555] text-xs">{timeAgo(c.createdAt)} anonym gemeldet</span>
                    {c.slaBreached && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#ff6666] bg-[#ff666622] px-2 py-0.5 rounded-full">
                        <AlertTriangle size={9} /> Überschrittenes SLA
                      </span>
                    )}
                    {c.hasUnread && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#F5C400] bg-[#F5C40022] px-2 py-0.5 rounded-full">
                        <MessageCircle size={9} /> Ungelesene Nachricht
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm group-hover:text-[#FF6B00] transition-colors">{c.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    {c.assignee && (
                      <div className="w-5 h-5 rounded-full bg-[#FF6B0033] text-[#FF6B00] flex items-center justify-center text-[9px] font-bold">
                        {c.assignee.firstName[0]}{c.assignee.lastName[0]}
                      </div>
                    )}
                    {!c.assignee && (
                      <div className="w-5 h-5 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                        <User size={10} className="text-[#555]" />
                      </div>
                    )}
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#2A2A2A] rounded-full text-[11px] text-[#888]">
                      {catLabel(c.category)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold ${priorityColor[c.priority] ?? 'text-[#555]'}`}>
                    {prioLabel(c.priority)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[c.status] ?? 'bg-[#2A2A2A] text-[#666]'}`}>
                    {STATUSES.find(s => s.value === c.status)?.label ?? c.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <Modal title="Fall melden" onClose={() => setShowModal(false)}>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Titel *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inp} placeholder="Kurze Beschreibung des Vorfalls" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Beschreibung</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} className={inp + ' resize-none'} placeholder="Detaillierte Beschreibung…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Kategorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Priorität</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inp}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
                {saving ? 'Melden…' : 'Fall melden'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer pr-6 appearance-none ${value ? 'border-[#FF6B00] text-[#FF6B00]' : ''}`}>
        {children}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" />
    </div>
  )
}
