import { useEffect, useState } from 'react'
import { Plus, Check, X, ChevronDown, Search, CalendarDays, List, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'
import AbsenceCalendar from '../components/AbsenceCalendar'

const typeLabel: Record<string, string> = {
  VACATION: 'Urlaub', SICK_LEAVE: 'Krankmeldung',
  PARENTAL_LEAVE: 'Elternzeit', UNPAID_LEAVE: 'Unbezahlt', OTHER: 'Sonstiges',
}
const statusStyle: Record<string, string> = {
  PENDING: 'bg-[#F5C40022] text-[#F5C400]',
  APPROVED: 'bg-[#FF6B0022] text-[#FF6B00]',
  REJECTED: 'bg-[#ff000022] text-[#ff6666]',
  CANCELLED: 'bg-[#ffffff11] text-[#555]',
}
const statusLabel: Record<string, string> = {
  PENDING: 'Ausstehend', APPROVED: 'Genehmigt', REJECTED: 'Abgelehnt', CANCELLED: 'Storniert',
}

const emptyForm = { employeeId: '', type: 'VACATION', startDate: '', endDate: '', reason: '' }
const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'
const sel = 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer appearance-none pr-7'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-[#555] mb-1.5">{label}</label>{children}</div>
}

function FilterSelect({ value, onChange, children, active }: { value: string; onChange: (v: string) => void; children: React.ReactNode; active: boolean }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${sel} ${active ? 'border-[#FF6B00] text-[#FF6B00]' : 'text-[#666]'}`}>
        {children}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" />
    </div>
  )
}

export default function Absences() {
  const [absences, setAbsences] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'calendar' | 'list' | 'approvals'>('calendar')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')

  const load = () => Promise.all([
    apiFetch('/api/absences').then(d => setAbsences(d.data ?? d)),
    apiFetch('/api/employees').then(d => setEmployees(d.data ?? d)),
  ]).then(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filtered = absences.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false
    if (filterType && a.type !== filterType) return false
    if (filterEmployee && String(a.employeeId) !== filterEmployee) return false
    if (search) {
      const name = a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : ''
      if (!name.toLowerCase().includes(search.toLowerCase())) return false
    }
    return true
  })

  const pending = filtered.filter(a => a.status === 'PENDING')
  const rest = filtered.filter(a => a.status !== 'PENDING')
  const activeFilters = [filterStatus, filterType, filterEmployee].filter(Boolean).length

  const createAbsence = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/absences', {
        method: 'POST',
        body: JSON.stringify({ ...form, employeeId: Number(form.employeeId) }),
      })
      setShowModal(false); setForm(emptyForm); load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const updateStatus = async (id: number, status: string) => {
    await apiFetch(`/api/absences/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    load()
  }

  return (
    <div className="p-8 min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Abwesenheiten</h1>
          <p className="text-[#666] text-sm mt-0.5">
            {absences.filter(a => a.status === 'PENDING').length} ausstehend · {absences.length} gesamt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1">
            <button onClick={() => setTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${tab === 'calendar' ? 'bg-[#FF6B00] text-white' : 'text-[#666] hover:text-white'}`}>
              <CalendarDays size={13} /> Kalender
            </button>
            <button onClick={() => setTab('approvals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all relative ${tab === 'approvals' ? 'bg-[#FF6B00] text-white' : 'text-[#666] hover:text-white'}`}>
              <ShieldCheck size={13} /> Freigaben
              {absences.filter(a => a.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F5C400] text-black text-[9px] font-bold flex items-center justify-center">
                  {absences.filter(a => a.status === 'PENDING').length}
                </span>
              )}
            </button>
            <button onClick={() => setTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${tab === 'list' ? 'bg-[#FF6B00] text-white' : 'text-[#666] hover:text-white'}`}>
              <List size={13} /> Liste
            </button>
          </div>
          <button onClick={() => { setShowModal(true); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
            <Plus size={14} /> Antrag anlegen
          </button>
        </div>
      </div>

      {loading ? <p className="text-[#555]">Laden…</p> : (
        <>
          {/* ── Kalender Tab ── */}
          {tab === 'calendar' && (
            <AbsenceCalendar employees={employees} absences={absences} />
          )}

          {/* ── Freigaben Tab ── */}
          {tab === 'approvals' && (
            <ApprovalsView absences={absences} onStatus={updateStatus} />
          )}

          {/* ── Listen Tab ── */}
          {tab === 'list' && (
            <div className="space-y-5">
              {/* Filter Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Mitarbeiter suchen…"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors" />
                </div>
                <FilterSelect value={filterStatus} onChange={setFilterStatus} active={!!filterStatus}>
                  <option value="">Alle Status</option>
                  {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </FilterSelect>
                <FilterSelect value={filterType} onChange={setFilterType} active={!!filterType}>
                  <option value="">Alle Typen</option>
                  {Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </FilterSelect>
                <FilterSelect value={filterEmployee} onChange={setFilterEmployee} active={!!filterEmployee}>
                  <option value="">Alle Mitarbeiter</option>
                  {employees.map(e => <option key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</option>)}
                </FilterSelect>
                {(activeFilters > 0 || search) && (
                  <button onClick={() => { setFilterStatus(''); setFilterType(''); setFilterEmployee(''); setSearch('') }}
                    className="flex items-center gap-1 px-3 py-2 text-xs text-[#FF6B00] border border-[#FF6B0033] rounded-lg hover:bg-[#FF6B0011] transition-colors">
                    <X size={12} /> Zurücksetzen
                  </button>
                )}
              </div>

              {pending.length > 0 && (
                <div>
                  <h2 className="text-[#F5C400] text-xs uppercase tracking-widest mb-3">Ausstehend ({pending.length})</h2>
                  <div className="bg-[#1A1A1A] border border-[#F5C40033] rounded-xl overflow-hidden">
                    <AbsenceTable rows={pending} onStatus={updateStatus} />
                  </div>
                </div>
              )}
              <div>
                <h2 className="text-[#555] text-xs uppercase tracking-widest mb-3">
                  Alle Anträge ({filtered.length}{filtered.length !== absences.length ? ` von ${absences.length}` : ''})
                </h2>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                  {filtered.length === 0
                    ? <p className="px-6 py-8 text-center text-[#555] text-sm">
                        {absences.length === 0 ? 'Noch keine Anträge vorhanden.' : 'Keine Anträge gefunden.'}
                      </p>
                    : <AbsenceTable rows={[...pending, ...rest]} onStatus={updateStatus} />
                  }
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal title="Abwesenheitsantrag anlegen" onClose={() => setShowModal(false)}>
          <form onSubmit={createAbsence} className="space-y-4">
            <Field label="Mitarbeiter *">
              <select required value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className={inp}>
                <option value="">Mitarbeiter wählen…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </Field>
            <Field label="Typ *">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                {Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Von *"><input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inp} /></Field>
              <Field label="Bis *"><input required type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inp} /></Field>
            </div>
            <Field label="Grund"><input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className={inp} placeholder="Optional…" /></Field>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">{saving ? 'Speichern…' : 'Anlegen'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

const typeLabel2: Record<string, string> = {
  VACATION: 'Urlaub', SICK_LEAVE: 'Krankmeldung',
  PARENTAL_LEAVE: 'Elternzeit', UNPAID_LEAVE: 'Unbezahlt', OTHER: 'Sonstiges',
}

function ApprovalsView({ absences, onStatus }: { absences: any[]; onStatus: (id: number, status: string) => void }) {
  const pending = absences.filter(a => a.status === 'PENDING')

  if (pending.length === 0) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
        <ShieldCheck size={32} className="mx-auto mb-3 text-[#FF6B00]" />
        <p className="text-white font-semibold">Alle Anträge bearbeitet</p>
        <p className="text-[#555] text-sm mt-1">Keine ausstehenden Freigaben.</p>
      </div>
    )
  }

  // Group by manager
  const byManager: Record<string, { manager: any; absences: any[] }> = {}
  const noManager: any[] = []

  pending.forEach(a => {
    const mgr = a.employee?.manager
    if (mgr) {
      const key = String(mgr.id)
      if (!byManager[key]) byManager[key] = { manager: mgr, absences: [] }
      byManager[key].absences.push(a)
    } else {
      noManager.push(a)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-[#F5C40011] border border-[#F5C40033] rounded-xl">
        <ShieldCheck size={18} className="text-[#F5C400] shrink-0" />
        <div>
          <p className="text-[#F5C400] text-sm font-medium">{pending.length} Antrag/Anträge warten auf Freigabe</p>
          <p className="text-[#888] text-xs mt-0.5">
            Die Vorgesetzten müssen die Anträge ihrer Mitarbeiter genehmigen oder ablehnen.
          </p>
        </div>
      </div>

      {/* Grouped by manager */}
      {Object.values(byManager).map(({ manager, absences: mgAbsences }) => (
        <div key={manager.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A] bg-[#111]">
            <div className="w-8 h-8 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-xs font-bold shrink-0">
              {manager.firstName[0]}{manager.lastName[0]}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Vorgesetzter: {manager.firstName} {manager.lastName}</p>
              <p className="text-[#555] text-xs">{mgAbsences.length} ausstehende{mgAbsences.length > 1 ? '' : 'r'} Antrag</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => mgAbsences.forEach(a => onStatus(a.id, 'APPROVED'))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B0022] text-[#FF6B00] text-xs font-medium rounded-lg hover:bg-[#FF6B00] hover:text-white transition-all">
                <Check size={12} /> Alle genehmigen
              </button>
              <button
                onClick={() => mgAbsences.forEach(a => onStatus(a.id, 'REJECTED'))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff000022] text-[#ff6666] text-xs font-medium rounded-lg hover:bg-[#ff4444] hover:text-white transition-all">
                <X size={12} /> Alle ablehnen
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#222]">
            {mgAbsences.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#1D1D1D] transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#2A2A2A] text-[#888] flex items-center justify-center text-[10px] font-bold shrink-0">
                  {a.employee?.firstName?.[0]}{a.employee?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {a.employee?.firstName} {a.employee?.lastName}
                  </p>
                  <p className="text-[#555] text-xs">
                    {typeLabel2[a.type] ?? a.type} · {new Date(a.startDate).toLocaleDateString('de-DE')} – {new Date(a.endDate).toLocaleDateString('de-DE')}
                    {a.reason && ` · "${a.reason}"`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onStatus(a.id, 'APPROVED')} title="Genehmigen"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#FF6B0022] text-[#FF6B00] text-xs rounded-lg hover:bg-[#FF6B00] hover:text-white transition-all">
                    <Check size={12} /> Genehmigen
                  </button>
                  <button onClick={() => onStatus(a.id, 'REJECTED')} title="Ablehnen"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#ff000022] text-[#ff6666] text-xs rounded-lg hover:bg-[#ff4444] hover:text-white transition-all">
                    <X size={12} /> Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Requests without a manager */}
      {noManager.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A] bg-[#111]">
            <div className="w-8 h-8 rounded-full bg-[#2A2A2A] text-[#555] flex items-center justify-center text-xs">?</div>
            <div>
              <p className="text-[#888] text-sm font-semibold">Kein Vorgesetzter zugewiesen</p>
              <p className="text-[#555] text-xs">{noManager.length} Antrag/Anträge — bitte Vorgesetzten im Mitarbeiterprofil hinterlegen</p>
            </div>
          </div>
          <div className="divide-y divide-[#222]">
            {noManager.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#1D1D1D] transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#2A2A2A] text-[#888] flex items-center justify-center text-[10px] font-bold shrink-0">
                  {a.employee?.firstName?.[0]}{a.employee?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{a.employee?.firstName} {a.employee?.lastName}</p>
                  <p className="text-[#555] text-xs">
                    {typeLabel2[a.type] ?? a.type} · {new Date(a.startDate).toLocaleDateString('de-DE')} – {new Date(a.endDate).toLocaleDateString('de-DE')}
                  </p>
                  <p className="text-[#F5C400] text-[10px] mt-0.5">⚠ Kein Manager im Mitarbeiterprofil hinterlegt</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onStatus(a.id, 'APPROVED')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#FF6B0022] text-[#FF6B00] text-xs rounded-lg hover:bg-[#FF6B00] hover:text-white transition-all">
                    <Check size={12} /> HR genehmigt
                  </button>
                  <button onClick={() => onStatus(a.id, 'REJECTED')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#ff000022] text-[#ff6666] text-xs rounded-lg hover:bg-[#ff4444] hover:text-white transition-all">
                    <X size={12} /> Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AbsenceTable({ rows, onStatus }: { rows: any[]; onStatus: (id: number, status: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#2A2A2A]">
          {['Mitarbeiter', 'Typ', 'Von', 'Bis', 'Grund', 'Status', ''].map(h => (
            <th key={h} className="text-left px-6 py-3 text-[#555] font-medium text-xs uppercase tracking-wide">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#2A2A2A]">
        {rows.map(a => (
          <tr key={a.id} className="hover:bg-[#2A2A2A] transition-colors">
            <td className="px-6 py-4 text-white font-medium">
              {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : `#${a.employeeId}`}
            </td>
            <td className="px-6 py-4 text-[#888]">{typeLabel[a.type] ?? a.type}</td>
            <td className="px-6 py-4 text-[#888]">{new Date(a.startDate).toLocaleDateString('de-DE')}</td>
            <td className="px-6 py-4 text-[#888]">{new Date(a.endDate).toLocaleDateString('de-DE')}</td>
            <td className="px-6 py-4 text-[#666]">{a.reason ?? '—'}</td>
            <td className="px-6 py-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[a.status] ?? ''}`}>
                {statusLabel[a.status] ?? a.status}
              </span>
            </td>
            <td className="px-6 py-4">
              {a.status === 'PENDING' && (
                <div className="flex items-center gap-1">
                  <button onClick={() => onStatus(a.id, 'APPROVED')} title="Genehmigen"
                    className="w-7 h-7 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center hover:bg-[#FF6B00] hover:text-white transition-all">
                    <Check size={12} />
                  </button>
                  <button onClick={() => onStatus(a.id, 'REJECTED')} title="Ablehnen"
                    className="w-7 h-7 rounded-full bg-[#ff000022] text-[#ff6666] flex items-center justify-center hover:bg-[#ff4444] hover:text-white transition-all">
                    <X size={12} />
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
