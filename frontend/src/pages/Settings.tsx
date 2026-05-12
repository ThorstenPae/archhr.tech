import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, Users, UserCheck, Bell } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'ADMIN',      label: 'Admin',      desc: 'Voller Zugriff inkl. Benutzerverwaltung', color: '#ff6666' },
  { value: 'MANAGEMENT', label: 'Management', desc: 'HR-Verwaltung, kein Benutzerzugriff',     color: '#F5C400' },
  { value: 'EMPLOYEE',   label: 'Mitarbeiter', desc: 'Nur eigene Daten sichtbar',              color: '#22c55e' },
]

const roleColor: Record<string, string> = {
  ADMIN:      'bg-[#ff666622] text-[#ff6666]',
  MANAGEMENT: 'bg-[#F5C40022] text-[#F5C400]',
  EMPLOYEE:   'bg-[#22c55e22] text-[#22c55e]',
}

const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-[#888] mb-1.5">{label}</label>{children}</div>
}

export default function Settings() {
  const { user: me } = useAuth()
  const [users, setUsers]         = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', employeeId: '' })
  const [company, setCompany]         = useState<any>(null)
  const [slaDays, setSlaDays]         = useState('')
  const [slaSaving, setSlaSaving]     = useState(false)
  const [slaMsg, setSlaMsg]           = useState('')
  const [catAssignees, setCatAssignees] = useState<Record<string, string>>({})
  const [catSaving, setCatSaving]     = useState(false)
  const [catMsg, setCatMsg]           = useState('')

  const CATEGORIES = [
    { value: 'IT',     label: 'IT & Technik' },
    { value: 'HR',     label: 'HR & Dokumente' },
    { value: 'LEGAL',  label: 'Recht & Compliance' },
    { value: 'OFFICE', label: 'Büro & Zugang' },
    { value: 'INTRO',  label: 'Einführung' },
    { value: 'OTHER',  label: 'Sonstiges' },
  ]

  const loadUsers = () => apiFetch('/auth/users').then(setUsers)

  const loadCatAssignees = () =>
    apiFetch('/api/onboarding/category-assignees').then((list: any[]) => {
      const map: Record<string, string> = {}
      list.forEach(a => { map[a.category] = String(a.userId) })
      setCatAssignees(map)
    }).catch(() => {})

  useEffect(() => {
    loadUsers()
    apiFetch('/api/employees').then(d => setEmployees(d.data ?? d))
    apiFetch('/auth/company').then(c => { setCompany(c); setSlaDays(String(c.whistleblowSlaDays ?? 5)) })
    loadCatAssignees()
  }, [])

  const saveCatAssignees = async (e: React.FormEvent) => {
    e.preventDefault(); setCatMsg(''); setCatSaving(true)
    try {
      const updates = CATEGORIES.map(c => ({ category: c.value, userId: catAssignees[c.value] ? parseInt(catAssignees[c.value]) : null }))
      await apiFetch('/api/onboarding/category-assignees', { method: 'PUT', body: JSON.stringify(updates) })
      setCatMsg('Gespeichert.')
      setTimeout(() => setCatMsg(''), 2000)
    } catch (err: any) { setCatMsg(err.message) }
    finally { setCatSaving(false) }
  }

  const saveSla = async (e: React.FormEvent) => {
    e.preventDefault(); setSlaMsg(''); setSlaSaving(true)
    try {
      const updated = await apiFetch('/auth/company', { method: 'PUT', body: JSON.stringify({ whistleblowSlaDays: slaDays }) })
      setCompany(updated)
      setSlaMsg('Gespeichert.')
      setTimeout(() => setSlaMsg(''), 2000)
    } catch (err: any) { setSlaMsg(err.message) }
    finally { setSlaSaving(false) }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(form) })
      setShowModal(false)
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', employeeId: '' })
      loadUsers()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const changeRole = async (userId: number, role: string) => {
    await apiFetch(`/auth/users/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) })
    loadUsers()
  }

  const removeUser = async (userId: number) => {
    if (!confirm('Benutzer löschen?')) return
    await apiFetch(`/auth/users/${userId}`, { method: 'DELETE' })
    loadUsers()
  }

  const unlinkedEmployees = employees.filter(
    (e: any) => !users.some(u => u.employeeId === e.id)
  )

  return (
    <div className="p-8 min-h-screen bg-[#0D0D0D] space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
          <p className="text-[#666] text-sm mt-0.5">Benutzerverwaltung & Zugriffsrechte</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
          <Plus size={14} /> Benutzer anlegen
        </button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map(r => (
          <div key={r.value} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} style={{ color: r.color }} />
              <span className="text-white text-sm font-semibold">{r.label}</span>
            </div>
            <p className="text-[#555] text-xs">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Benutzer ({users.length})</h2>
        <div className="space-y-0 divide-y divide-[#2A2A2A]">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-4 py-3.5 group">
              <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs font-bold text-[#888] shrink-0">
                {u.firstName[0]}{u.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  {u.firstName} {u.lastName}
                  {u.id === me?.id && <span className="ml-2 text-[10px] text-[#FF6B00]">(du)</span>}
                </p>
                <p className="text-[#555] text-xs">{u.email}</p>
                {u.employee && (
                  <p className="text-[#444] text-xs flex items-center gap-1 mt-0.5">
                    <UserCheck size={10} /> Verknüpft: {u.employee.firstName} {u.employee.lastName}
                    {u.employee.position ? ` · ${u.employee.position}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={u.role}
                  disabled={u.id === me?.id}
                  onChange={e => changeRole(u.id, e.target.value)}
                  className={`px-2 py-1 rounded-full text-xs font-medium border-0 focus:outline-none cursor-pointer [color-scheme:dark] disabled:opacity-50 ${roleColor[u.role] ?? 'bg-[#2A2A2A] text-white'}`}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value} style={{ background: '#1A1A1A', color: '#fff' }}>{r.label}</option>
                  ))}
                </select>
                {u.id !== me?.id && (
                  <button onClick={() => removeUser(u.id)}
                    className="p-1.5 text-[#333] hover:text-[#ff6666] transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Whistleblowing SLA */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold mb-1">Whistleblowing SLA</h2>
        <p className="text-[#555] text-xs mb-4">Anzahl Tage bis ein offener Fall als "SLA überschritten" markiert wird.</p>
        <form onSubmit={saveSla} className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-[#888] mb-1.5">Tage</label>
            <input
              type="number" min={1} max={365} required
              value={slaDays}
              onChange={e => setSlaDays(e.target.value)}
              className="w-24 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00] transition-colors"
            />
          </div>
          <button type="submit" disabled={slaSaving}
            className="px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
            {slaSaving ? 'Speichern…' : 'Speichern'}
          </button>
          {slaMsg && <span className={`text-sm ${slaMsg === 'Gespeichert.' ? 'text-[#22c55e]' : 'text-[#ff6666]'}`}>{slaMsg}</span>}
        </form>
      </div>

      {/* Onboarding Category Assignees */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={14} className="text-[#FF6B00]" />
          <h2 className="text-white font-semibold">Onboarding-Verantwortliche</h2>
        </div>
        <p className="text-[#555] text-xs mb-5">
          Wer bekommt automatisch eine Benachrichtigung, wenn ein neuer Onboarding-Plan mit der Standard-Checkliste erstellt wird?
        </p>
        <form onSubmit={saveCatAssignees} className="space-y-3">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center gap-4">
              <span className="text-sm text-[#888] w-44 shrink-0">{cat.label}</span>
              <select
                value={catAssignees[cat.value] ?? ''}
                onChange={e => setCatAssignees(prev => ({ ...prev, [cat.value]: e.target.value }))}
                className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00] transition-colors [color-scheme:dark]"
              >
                <option value="">— Niemand —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={catSaving}
              className="px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
              {catSaving ? 'Speichern…' : 'Speichern'}
            </button>
            {catMsg && <span className={`text-sm ${catMsg === 'Gespeichert.' ? 'text-[#22c55e]' : 'text-[#ff6666]'}`}>{catMsg}</span>}
          </div>
        </form>
      </div>

      {showModal && (
        <Modal title="Benutzer anlegen" onClose={() => setShowModal(false)}>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vorname *">
                <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className={inp} placeholder="Max" />
              </Field>
              <Field label="Nachname *">
                <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className={inp} placeholder="Mustermann" />
              </Field>
            </div>
            <Field label="E-Mail *">
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inp} placeholder="max@firma.de" />
            </Field>
            <Field label="Passwort * (min. 8 Zeichen)">
              <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className={inp} placeholder="••••••••" />
            </Field>
            <Field label="Rolle *">
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inp}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </Field>
            {form.role === 'EMPLOYEE' && (
              <Field label="Mitarbeiter verknüpfen">
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className={inp}>
                  <option value="">— Kein Mitarbeiter —</option>
                  {unlinkedEmployees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.position ? ` (${e.position})` : ''}</option>
                  ))}
                </select>
              </Field>
            )}
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
                {saving ? 'Anlegen…' : 'Anlegen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
