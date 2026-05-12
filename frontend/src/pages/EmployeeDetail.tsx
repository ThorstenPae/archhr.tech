import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar, MapPin, AlertCircle, Clock, Euro, User, Plus, X, Check, Shield } from 'lucide-react'
import InlineEdit from '../components/InlineEdit'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'ADMIN',      label: 'Admin',       color: '#ff6666' },
  { value: 'MANAGEMENT', label: 'Management',  color: '#F5C400' },
  { value: 'EMPLOYEE',   label: 'Mitarbeiter', color: '#22c55e' },
]
const roleColor: Record<string, string> = {
  ADMIN:      'bg-[#ff666622] text-[#ff6666]',
  MANAGEMENT: 'bg-[#F5C40022] text-[#F5C400]',
  EMPLOYEE:   'bg-[#22c55e22] text-[#22c55e]',
}

const statusOptions = [
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'INACTIVE', label: 'Inaktiv' },
  { value: 'ON_LEAVE', label: 'Abwesend' },
  { value: 'TERMINATED', label: 'Ausgeschieden' },
]
const employmentOptions = [
  { value: 'FULL_TIME', label: 'Vollzeit' },
  { value: 'PART_TIME', label: 'Teilzeit' },
  { value: 'FREELANCE', label: 'Freiberuflich' },
  { value: 'INTERN', label: 'Praktikum' },
  { value: 'WORKING_STUDENT', label: 'Werkstudent' },
]
const statusColor: Record<string, string> = {
  ACTIVE: 'bg-[#FF6B0022] text-[#FF6B00]',
  INACTIVE: 'bg-[#ffffff11] text-[#666]',
  ON_LEAVE: 'bg-[#F5C40022] text-[#F5C400]',
  TERMINATED: 'bg-[#ff000022] text-[#ff6666]',
}
const absenceTypeLabel: Record<string, string> = {
  VACATION: 'Urlaub', SICK_LEAVE: 'Krankmeldung', PARENTAL_LEAVE: 'Elternzeit',
  UNPAID_LEAVE: 'Unbezahlt', OTHER: 'Sonstiges',
}
const absenceStatusColor: Record<string, string> = {
  PENDING: 'bg-[#F5C40022] text-[#F5C400]',
  APPROVED: 'bg-[#FF6B0022] text-[#FF6B00]',
  REJECTED: 'bg-[#ff000022] text-[#ff6666]',
  CANCELLED: 'bg-[#ffffff11] text-[#555]',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <h2 className="text-[#888] text-xs uppercase tracking-widest mb-4 pb-2 border-b border-[#2A2A2A]">{title}</h2>
      {children}
    </div>
  )
}

function FieldRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon size={15} className="text-[#FF6B00] mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const [employee, setEmployee] = useState<any>(null)
  const [absences, setAbsences] = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [accessForm, setAccessForm] = useState({ role: 'EMPLOYEE', email: '', password: '' })
  const [showAccessForm, setShowAccessForm] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessError, setAccessError] = useState('')

  useEffect(() => {
    apiFetch(`/api/employees/${id}`).then(setEmployee)
    apiFetch(`/api/absences?employeeId=${id}`).then(d => setAbsences(d.data ?? d))
    apiFetch('/api/employees').then(d => setAllEmployees(d.data ?? d))
  }, [id])

  const patch = async (field: string, value: string) => {
    const body: any = { [field]: value }
    if (field === 'salary' || field === 'weeklyHours') body[field] = Number(value)
    if (field === 'managerId') body[field] = value === '' ? null : Number(value)
    const updated = await apiFetch(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    setEmployee(updated.data ?? updated)
  }

  const addSkill = async () => {
    if (!newSkill.trim()) return
    const current = employee.skills ? employee.skills.split(',').map((s: string) => s.trim()) : []
    await patch('skills', [...current, newSkill.trim()].join(','))
    setNewSkill('')
    setAddingSkill(false)
  }

  const createAccess = async (e: React.FormEvent) => {
    e.preventDefault(); setAccessError(''); setAccessSaving(true)
    try {
      await apiFetch('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: employee.firstName, lastName: employee.lastName,
          email: accessForm.email || employee.email,
          password: accessForm.password,
          role: accessForm.role,
          employeeId: employee.id,
        }),
      })
      setShowAccessForm(false)
      apiFetch(`/api/employees/${id}`).then(setEmployee)
    } catch (err: any) { setAccessError(err.message) }
    finally { setAccessSaving(false) }
  }

  const changeRole = async (userId: number, role: string) => {
    await apiFetch(`/auth/users/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) })
    apiFetch(`/api/employees/${id}`).then(setEmployee)
  }

  const removeSkill = async (skill: string) => {
    const current = employee.skills.split(',').map((s: string) => s.trim())
    await patch('skills', current.filter((s: string) => s !== skill).join(','))
  }

  if (!employee) return <div className="p-8 text-[#555]">Laden…</div>

  const skills = employee.skills ? employee.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []

  return (
    <div className="p-8 max-w-4xl bg-[#0D0D0D] min-h-screen space-y-5">
      <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-[#555] hover:text-[#FF6B00] transition-colors">
        <ArrowLeft size={14} /> Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex items-center gap-6">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <InlineEdit value={employee.firstName} onSave={v => patch('firstName', v)} />
            <InlineEdit value={employee.lastName} onSave={v => patch('lastName', v)} />
          </div>
          <InlineEdit value={employee.position} onSave={v => patch('position', v)} placeholder="Position" emptyText="Position hinzufügen…" />
          <InlineEdit value={employee.bio} onSave={v => patch('bio', v)} placeholder="Bio / Beschreibung" emptyText="Bio hinzufügen…" />
        </div>
        <div>
          <p className="text-xs text-[#555] mb-2">Status</p>
          <select
            value={employee.status}
            onChange={e => patch('status', e.target.value)}
            className={`px-3 py-1 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] cursor-pointer [color-scheme:dark] ${statusColor[employee.status] ?? 'bg-[#2A2A2A] text-white'}`}
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value} style={{ background: '#1A1A1A', color: '#fff' }}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kontakt */}
        <Section title="Kontaktdaten">
          <div className="space-y-1">
            <FieldRow icon={Mail} label="E-Mail">
              <InlineEdit value={employee.email} onSave={v => patch('email', v)} type="email" placeholder="E-Mail" />
            </FieldRow>
            <FieldRow icon={Phone} label="Telefon">
              <InlineEdit value={employee.phone} onSave={v => patch('phone', v)} type="tel" placeholder="Telefonnummer" emptyText="Telefon hinzufügen…" />
            </FieldRow>
            <FieldRow icon={User} label="Geburtsdatum">
              <InlineEdit value={employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : ''} onSave={v => patch('dateOfBirth', v)} type="date" emptyText="Geburtsdatum hinzufügen…" />
            </FieldRow>
            <FieldRow icon={MapPin} label="Straße">
              <InlineEdit value={employee.street} onSave={v => patch('street', v)} placeholder="Straße" emptyText="Adresse hinzufügen…" />
            </FieldRow>
            <FieldRow icon={MapPin} label="PLZ / Stadt">
              <div className="flex gap-2">
                <InlineEdit value={employee.postalCode} onSave={v => patch('postalCode', v)} placeholder="PLZ" emptyText="PLZ…" />
                <InlineEdit value={employee.city} onSave={v => patch('city', v)} placeholder="Stadt" emptyText="Stadt…" />
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* Anstellung */}
        <Section title="Anstellung">
          <div className="space-y-1">
            <FieldRow icon={Briefcase} label="Position">
              <InlineEdit value={employee.position} onSave={v => patch('position', v)} placeholder="Position" />
            </FieldRow>
            <FieldRow icon={Building2} label="Abteilung">
              <span className="text-white text-sm font-medium">{employee.department?.name ?? '—'}</span>
            </FieldRow>
            <FieldRow icon={User} label="Vorgesetzter">
              <select
                value={employee.managerId ?? ''}
                onChange={e => patch('managerId', e.target.value)}
                className="bg-[#2A2A2A] border border-[#333] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#FF6B00] w-full"
              >
                <option value="">— Kein Vorgesetzter —</option>
                {allEmployees
                  .filter((e: any) => String(e.id) !== id)
                  .map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}{e.position ? ` (${e.position})` : ''}
                    </option>
                  ))}
              </select>
            </FieldRow>
            <FieldRow icon={Calendar} label="Eintrittsdatum">
              <InlineEdit value={employee.startDate ? employee.startDate.split('T')[0] : ''} onSave={v => patch('startDate', v)} type="date" />
            </FieldRow>
            <FieldRow icon={Clock} label="Vertragsart">
              <InlineEdit value={employee.employmentType} onSave={v => patch('employmentType', v)} type="select" options={employmentOptions} />
            </FieldRow>
            <FieldRow icon={Clock} label="Wochenstunden">
              <InlineEdit value={String(employee.weeklyHours ?? '')} onSave={v => patch('weeklyHours', v)} type="number" suffix=" h/Woche" emptyText="Stunden hinzufügen…" />
            </FieldRow>
            <FieldRow icon={Euro} label="Gehalt (€/Jahr)">
              <InlineEdit value={String(employee.salary ?? '')} onSave={v => patch('salary', v)} type="number" suffix=" €" emptyText="Gehalt hinzufügen…" />
            </FieldRow>
            <FieldRow icon={Euro} label="Gehaltsklasse">
              <InlineEdit value={employee.salaryGrade} onSave={v => patch('salaryGrade', v)} placeholder="z.B. E4" emptyText="Gehaltsklasse hinzufügen…" />
            </FieldRow>
          </div>
        </Section>

        {/* Notfallkontakt */}
        <Section title="Notfallkontakt">
          <div className="space-y-1">
            <FieldRow icon={AlertCircle} label="Name">
              <InlineEdit value={employee.emergencyName} onSave={v => patch('emergencyName', v)} placeholder="Name" emptyText="Name hinzufügen…" />
            </FieldRow>
            <FieldRow icon={Phone} label="Telefon">
              <InlineEdit value={employee.emergencyPhone} onSave={v => patch('emergencyPhone', v)} type="tel" placeholder="Telefon" emptyText="Telefon hinzufügen…" />
            </FieldRow>
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills & Qualifikationen">
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s: string) => (
              <span key={s} className="group flex items-center gap-1 px-3 py-1 bg-[#FF6B0022] text-[#FF6B00] rounded-full text-sm font-medium">
                {s}
                <button onClick={() => removeSkill(s)} className="text-[#FF6B0088] hover:text-[#ff4444] transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          {addingSkill ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSkill(); if (e.key === 'Escape') setAddingSkill(false) }}
                placeholder="Skill eingeben…"
                className="bg-[#2A2A2A] border border-[#FF6B00] rounded px-2 py-1 text-sm text-white focus:outline-none"
              />
              <button onClick={addSkill} className="text-[#FF6B00] hover:text-white transition-colors"><Check size={14} /></button>
              <button onClick={() => setAddingSkill(false)} className="text-[#555] hover:text-[#ff6666] transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSkill(true)} className="flex items-center gap-1 text-sm text-[#555] hover:text-[#FF6B00] transition-colors">
              <Plus size={14} /> Skill hinzufügen
            </button>
          )}
        </Section>
      </div>

      {/* Systemzugang */}
      {me?.role === 'ADMIN' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-[#888] text-xs uppercase tracking-widest mb-4 pb-2 border-b border-[#2A2A2A]">Systemzugang</h2>
          {employee.user ? (
            <div className="flex items-center gap-4">
              <Shield size={16} className="text-[#FF6B00] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{employee.user.email}</p>
                <p className="text-[#555] text-xs">Aktiver Zugang</p>
              </div>
              <select
                value={employee.user.role}
                onChange={e => changeRole(employee.user.id, e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] cursor-pointer [color-scheme:dark] ${roleColor[employee.user.role] ?? 'bg-[#2A2A2A] text-white'}`}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value} style={{ background: '#1A1A1A', color: '#fff' }}>{r.label}</option>
                ))}
              </select>
            </div>
          ) : showAccessForm ? (
            <form onSubmit={createAccess} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs text-[#888] mb-1.5">Rolle</label>
                  <select value={accessForm.role} onChange={e => setAccessForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00] [color-scheme:dark]">
                    {ROLES.map(r => <option key={r.value} value={r.value} style={{ background: '#1A1A1A', color: '#fff' }}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-[#888] mb-1.5">E-Mail (Login)</label>
                  <input value={accessForm.email || employee.email} onChange={e => setAccessForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={employee.email}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00]" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-[#888] mb-1.5">Passwort (min. 8)</label>
                  <input type="password" required value={accessForm.password} onChange={e => setAccessForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00]" />
                </div>
              </div>
              {accessError && <p className="text-[#ff6666] text-sm">{accessError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={accessSaving}
                  className="px-4 py-1.5 bg-[#FF6B00] text-white text-sm rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
                  {accessSaving ? 'Anlegen…' : 'Zugang anlegen'}
                </button>
                <button type="button" onClick={() => setShowAccessForm(false)}
                  className="px-4 py-1.5 text-[#555] text-sm hover:text-white transition-colors">Abbrechen</button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-[#555] text-sm flex-1">Kein Systemzugang vorhanden.</p>
              <button onClick={() => setShowAccessForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#FF6B00] border border-[#FF6B0033] rounded-lg hover:bg-[#FF6B0011] transition-colors">
                <Plus size={11} /> Zugang anlegen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Abwesenheiten */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-[#888] text-xs uppercase tracking-widest mb-4 pb-2 border-b border-[#2A2A2A]">
          Abwesenheiten ({absences.length})
        </h2>
        {absences.length === 0 ? (
          <p className="text-sm text-white">Keine Abwesenheiten vorhanden.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs border-b border-[#2A2A2A]">
                {['Typ', 'Von', 'Bis', 'Grund', 'Status'].map(h => (
                  <th key={h} className="pb-2 font-medium text-[#888] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {absences.map((a: any) => (
                <tr key={a.id}>
                  <td className="py-2 text-white">{absenceTypeLabel[a.type] ?? a.type}</td>
                  <td className="py-2 text-white">{new Date(a.startDate).toLocaleDateString('de-DE')}</td>
                  <td className="py-2 text-white">{new Date(a.endDate).toLocaleDateString('de-DE')}</td>
                  <td className="py-2 text-white">{a.reason ?? '—'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${absenceStatusColor[a.status] ?? ''}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
