import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Building2, ChevronDown, X, List, GitBranch } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'
import OrgChart from '../components/OrgChart'

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-[#FF6B0022] text-[#FF6B00]',
  INACTIVE: 'bg-[#ffffff11] text-[#666]',
  ON_LEAVE: 'bg-[#F5C40022] text-[#F5C400]',
  TERMINATED: 'bg-[#ff000022] text-[#ff6666]',
}
const statusLabel: Record<string, string> = {
  ACTIVE: 'Aktiv', INACTIVE: 'Inaktiv', ON_LEAVE: 'Abwesend', TERMINATED: 'Ausgeschieden',
}
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']

const ROLES = [
  { value: '',           label: 'Kein Zugang' },
  { value: 'ADMIN',      label: 'Admin' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'EMPLOYEE',   label: 'Mitarbeiter' },
]

const emptyEmp = { firstName: '', lastName: '', email: '', position: '', departmentId: '', startDate: '', status: 'ACTIVE', userRole: '', userPassword: '' }
const emptyDept = { name: '' }
const sel = 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer appearance-none'
const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#555] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function FilterSelect({ value, onChange, children, active }: { value: string; onChange: (v: string) => void; children: React.ReactNode; active: boolean }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${sel} pr-7 ${active ? 'border-[#FF6B00] text-[#FF6B00]' : 'text-[#666]'}`}
      >
        {children}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" />
    </div>
  )
}

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'orgchart'>('list')
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [empForm, setEmpForm] = useState(emptyEmp)
  const [deptForm, setDeptForm] = useState(emptyDept)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const navigate = useNavigate()

  const load = () => Promise.all([
    apiFetch('/api/employees').then(d => setEmployees(d.data ?? d)),
    apiFetch('/api/departments').then(d => setDepartments(d.data ?? d)),
  ]).then(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filtered = employees.filter(e => {
    if (filterStatus && e.status !== filterStatus) return false
    if (filterDept && String(e.departmentId) !== filterDept) return false
    if (search && !`${e.firstName} ${e.lastName} ${e.position} ${e.department?.name}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeFilters = [filterStatus, filterDept].filter(Boolean).length
  const clearFilters = () => { setFilterStatus(''); setFilterDept(''); setSearch('') }

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setWarning(''); setSaving(true)
    try {
      const result = await apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify({ ...empForm, departmentId: empForm.departmentId ? Number(empForm.departmentId) : undefined }),
      })
      if (result._warning) {
        setWarning(result._warning)
      } else {
        setShowEmpModal(false)
      }
      setEmpForm(emptyEmp); load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(deptForm) })
      setShowDeptModal(false); setDeptForm(emptyDept); load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-8 min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Mitarbeiter</h1>
          <p className="text-[#666] text-sm mt-0.5">
            {filtered.length} von {employees.length} Personen
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'list' ? 'bg-[#FF6B00] text-white' : 'text-[#555] hover:text-white'}`}
            >
              <List size={13} /> Personen
            </button>
            <button
              onClick={() => setView('orgchart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'orgchart' ? 'bg-[#FF6B00] text-white' : 'text-[#555] hover:text-white'}`}
            >
              <GitBranch size={13} /> Orgchart
            </button>
          </div>

          <button onClick={() => { setShowDeptModal(true); setError('') }}
            className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] text-sm rounded-lg hover:border-[#F5C400] hover:text-[#F5C400] transition-all">
            <Building2 size={14} /> Abteilung
          </button>
          <button onClick={() => { setShowEmpModal(true); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
            <Plus size={14} /> Mitarbeiter anlegen
          </button>
        </div>
      </div>

      {/* Org Chart View */}
      {view === 'orgchart' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          {loading ? <p className="p-8 text-[#555]">Laden…</p> : <OrgChart employees={employees} />}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (<>
        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, Position suchen…"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors" />
          </div>

          <FilterSelect value={filterStatus} onChange={setFilterStatus} active={!!filterStatus}>
            <option value="">Alle Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </FilterSelect>

          <FilterSelect value={filterDept} onChange={setFilterDept} active={!!filterDept}>
            <option value="">Alle Abteilungen</option>
            {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </FilterSelect>

          {(activeFilters > 0 || search) && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs text-[#FF6B00] border border-[#FF6B0033] rounded-lg hover:bg-[#FF6B0011] transition-colors">
              <X size={12} /> Filter zurücksetzen
            </button>
          )}

          {activeFilters > 0 && (
            <span className="text-xs text-[#555]">{activeFilters} Filter aktiv</span>
          )}
        </div>

        {/* Abteilungs-Chips */}
        {departments.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <button onClick={() => setFilterDept('')}
              className={`px-3 py-1 rounded-full text-xs transition-all ${!filterDept ? 'bg-[#FF6B00] text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#666] hover:border-[#FF6B00] hover:text-[#FF6B00]'}`}>
              Alle
            </button>
            {departments.map(d => (
              <button key={d.id} onClick={() => setFilterDept(String(d.id))}
                className={`px-3 py-1 rounded-full text-xs transition-all ${filterDept === String(d.id) ? 'bg-[#FF6B00] text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#666] hover:border-[#FF6B00] hover:text-[#FF6B00]'}`}>
                {d.name} <span className="opacity-60">· {d._count?.employees ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? <p className="text-[#555]">Laden…</p> : (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Name', 'Position', 'Abteilung', 'Eintrittsdatum', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[#555] font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-[#555]">
                    Keine Mitarbeiter gefunden.
                    {(activeFilters > 0 || search) && (
                      <button onClick={clearFilters} className="ml-2 text-[#FF6B00] hover:underline">Filter zurücksetzen</button>
                    )}
                  </td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id} onClick={() => navigate(`/employees/${e.id}`)}
                    className="hover:bg-[#2A2A2A] cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-xs font-bold group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
                          {e.firstName[0]}{e.lastName[0]}
                        </div>
                        <span className="text-white font-medium">{e.firstName} {e.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#888]">{e.position}</td>
                    <td className="px-6 py-4 text-[#888]">{e.department?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-[#888]">{new Date(e.startDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[e.status] ?? ''}`}>
                        {statusLabel[e.status] ?? e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {/* Mitarbeiter Modal */}
      {showEmpModal && (
        <Modal title="Mitarbeiter anlegen" onClose={() => { setShowEmpModal(false); setWarning('') }}>
          <form onSubmit={createEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vorname *"><input required value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))} className={inp} placeholder="Max" /></Field>
              <Field label="Nachname *"><input required value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))} className={inp} placeholder="Mustermann" /></Field>
            </div>
            <Field label="E-Mail *"><input required type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="max@firma.de" /></Field>
            <Field label="Position *"><input required value={empForm.position} onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))} className={inp} placeholder="z.B. Entwickler, HR Manager…" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Abteilung">
                <select value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))} className={inp}>
                  <option value="">— keine —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Eintrittsdatum *"><input required type="date" value={empForm.startDate} onChange={e => setEmpForm(f => ({ ...f, startDate: e.target.value }))} className={inp + ' [color-scheme:dark]'} /></Field>
            </div>

            {/* System access */}
            <div className="border-t border-[#2A2A2A] pt-4">
              <p className="text-xs text-[#888] mb-3 uppercase tracking-widest">Systemzugang (optional)</p>
              <Field label="Rolle">
                <select value={empForm.userRole} onChange={e => setEmpForm(f => ({ ...f, userRole: e.target.value }))} className={inp}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              {empForm.userRole && (
                <div className="mt-3">
                  <Field label={`Passwort für Login (min. 8 Zeichen)`}>
                    <input required type="password" value={empForm.userPassword}
                      onChange={e => setEmpForm(f => ({ ...f, userPassword: e.target.value }))}
                      className={inp} placeholder="••••••••" />
                  </Field>
                  <p className="text-xs text-[#555] mt-1">Login-E-Mail: <span className="text-[#888]">{empForm.email || 'wird aus E-Mail-Feld übernommen'}</span></p>
                </div>
              )}
            </div>

            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            {warning && <p className="text-[#F5C400] text-sm">{warning}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowEmpModal(false); setWarning('') }} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">{saving ? 'Speichern…' : 'Anlegen'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Abteilung Modal */}
      {showDeptModal && (
        <Modal title="Abteilung anlegen" onClose={() => setShowDeptModal(false)}>
          <form onSubmit={createDepartment} className="space-y-4">
            <Field label="Name *"><input required value={deptForm.name} onChange={e => setDeptForm({ name: e.target.value })} className={inp} placeholder="z.B. Engineering, HR, Sales…" /></Field>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#F5C400] text-black text-sm font-medium rounded-lg hover:bg-[#e0b300] disabled:opacity-50 transition-colors">{saving ? 'Speichern…' : 'Anlegen'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
