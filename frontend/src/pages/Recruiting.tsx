import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, Plus, ChevronDown, Search, X, ClipboardList, Clock, CheckSquare, ArrowRight } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'

const candColor: Record<string, string> = {
  APPLIED:   'bg-[#FF6B0022] text-[#FF6B00]',
  SCREENING: 'bg-[#F5C40022] text-[#F5C400]',
  INTERVIEW: 'bg-[#a855f722] text-[#a855f7]',
  OFFER:     'bg-[#22c55e22] text-[#22c55e]',
  HIRED:     'bg-[#22c55e33] text-[#22c55e]',
  REJECTED:  'bg-[#ff000022] text-[#ff6666]',
}
const candLabel: Record<string, string> = {
  APPLIED: 'Beworben', SCREENING: 'Vorauswahl', INTERVIEW: 'Interview',
  OFFER: 'Angebot', HIRED: 'Eingestellt', REJECTED: 'Abgelehnt',
}
const jobStatusLabel: Record<string, string> = {
  OPEN: 'Offen', DRAFT: 'Entwurf', CLOSED: 'Geschlossen', FILLED: 'Besetzt',
}
const TABS = ['Startseite', 'Stellen', 'Bewerbungen'] as const
type Tab = typeof TABS[number]

const BENEFIT_OPTIONS = [
  { key: 'TRAINING',             label: 'Betriebliche Weiterbildung' },
  { key: 'DISCOUNT',             label: 'Mitarbeiter-Rabatt' },
  { key: 'LIFE_INSURANCE',       label: 'Lebensversicherung' },
  { key: 'EAP',                  label: 'Employee Assistance Program' },
  { key: 'DEUTSCHLAND_TICKET',   label: 'Deutschland-Ticket' },
  { key: 'DISABILITY_INSURANCE', label: 'Berufsunfähigkeitsversicherung' },
  { key: 'CAREER_CHOICE',        label: 'Weiterbildungsprogramm' },
  { key: 'HOME_OFFICE',          label: 'Home Office' },
  { key: 'FLEXIBLE_HOURS',       label: 'Flexible Arbeitszeiten' },
  { key: 'COMPANY_CAR',          label: 'Firmenwagen' },
  { key: 'SHUTTLE',              label: 'Shuttle-Service' },
  { key: 'CANTEEN',              label: 'Kantine' },
  { key: 'BONUS',                label: 'Bonus / Prämien' },
  { key: 'PENSION',              label: 'Betriebliche Altersvorsorge' },
]

const emptyJob = {
  title: '', departmentId: '', description: '', status: 'OPEN',
  location: '', address: '', employmentType: '', salaryType: 'MONTHLY',
  salaryMin: '', salaryMax: '', benefits: [] as string[],
  tasks: '', requirements: '', shiftModel: '',
}
const emptyCand = { firstName: '', lastName: '', email: '', jobPostingId: '', notes: '' }
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

function getTasks(candidates: any[]) {
  const order: Record<string, number> = { APPLIED: 0, SCREENING: 1, INTERVIEW: 2, OFFER: 3 }
  const actionLabel: Record<string, string> = {
    APPLIED:   'Bewerbung prüfen',
    SCREENING: 'Vorauswahl abschließen',
    INTERVIEW: 'Interview vorbereiten',
    OFFER:     'Angebot nachverfolgen',
  }
  return candidates
    .filter(c => ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'].includes(c.status))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
    .map(c => ({
      id:     c.id,
      label:  `${actionLabel[c.status]}: ${c.firstName} ${c.lastName}`,
      sub:    c.jobPosting?.title ?? '—',
      status: c.status,
    }))
}

export default function Recruiting() {
  const [tab, setTab]               = useState<Tab>('Startseite')
  const [jobs, setJobs]             = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  const [jobSearch, setJobSearch]   = useState('')
  const [jobStatus, setJobStatus]   = useState('')
  const [jobDept, setJobDept]       = useState('')
  const [candSearch, setCandSearch] = useState('')
  const [candStatus, setCandStatus] = useState('')
  const [candJob, setCandJob]       = useState('')

  const [showJobModal, setShowJobModal]   = useState(false)
  const [showCandModal, setShowCandModal] = useState(false)
  const [jobForm, setJobForm]   = useState(emptyJob)
  const [candForm, setCandForm] = useState(emptyCand)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()

  const load = () => Promise.all([
    apiFetch('/api/recruiting/jobs').then(d => setJobs(d.data ?? d)),
    apiFetch('/api/recruiting/candidates').then(d => setCandidates(d.data ?? d)),
    apiFetch('/api/departments').then(d => setDepartments(d.data ?? d)),
  ]).then(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filteredJobs  = jobs.filter(j => {
    if (jobStatus && j.status !== jobStatus) return false
    if (jobDept && String(j.departmentId) !== jobDept) return false
    if (jobSearch && !j.title.toLowerCase().includes(jobSearch.toLowerCase())) return false
    return true
  })
  const filteredCands = candidates.filter(c => {
    if (candStatus && c.status !== candStatus) return false
    if (candJob && String(c.jobPostingId) !== candJob) return false
    if (candSearch && !`${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(candSearch.toLowerCase())) return false
    return true
  })

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/recruiting/jobs', { method: 'POST',
        body: JSON.stringify({
          ...jobForm,
          departmentId: jobForm.departmentId ? Number(jobForm.departmentId) : undefined,
          benefits: jobForm.benefits.join(','),
          salaryMin: jobForm.salaryMin !== '' ? jobForm.salaryMin : undefined,
          salaryMax: jobForm.salaryMax !== '' ? jobForm.salaryMax : undefined,
        }) })
      setShowJobModal(false); setJobForm(emptyJob); load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }
  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/recruiting/candidates', { method: 'POST',
        body: JSON.stringify({ ...candForm, jobPostingId: Number(candForm.jobPostingId) }) })
      setShowCandModal(false); setCandForm(emptyCand); load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 bg-[#0D0D0D] min-h-screen text-[#555]">Laden…</div>

  const tasks       = getTasks(candidates)
  const interviews  = candidates.filter(c => c.status === 'INTERVIEW')
  const recent      = [...candidates].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()).slice(0, 8)

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-0">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-white">Recruiting</h1>
          <div className="flex gap-3">
            <button onClick={() => { setShowCandModal(true); setError('') }}
              className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] text-sm rounded-lg hover:border-[#F5C400] hover:text-[#F5C400] transition-all">
              <Plus size={14} /> Bewerber
            </button>
            <button onClick={() => { setShowJobModal(true); setError('') }}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
              <Plus size={14} /> Stelle ausschreiben
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#2A2A2A]">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
                tab === t
                  ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#FF6B00]'
                  : 'text-[#555] hover:text-[#888]'
              }`}>
              {t}
              {t === 'Bewerbungen' && candidates.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#FF6B0033] text-[#FF6B00] px-1.5 py-0.5 rounded-full">{candidates.length}</span>
              )}
              {t === 'Stellen' && jobs.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#2A2A2A] text-[#666] px-1.5 py-0.5 rounded-full">{jobs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6">

        {/* ══════════════════ STARTSEITE ══════════════════ */}
        {tab === 'Startseite' && (
          <div className="grid grid-cols-3 gap-6">

            {/* Left: Recent updates */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
                <h3 className="text-white font-semibold text-sm">Updates zu Bewerbungen</h3>
                <span className="text-xs text-[#555]">{candidates.length} gesamt</span>
              </div>

              {/* Pipeline pills */}
              <div className="flex gap-2 px-5 py-3 border-b border-[#2A2A2A] flex-wrap">
                {['APPLIED','SCREENING','INTERVIEW','OFFER','HIRED'].map(s => {
                  const n = candidates.filter(c => c.status === s).length
                  return n > 0 ? (
                    <button key={s} onClick={() => { setTab('Bewerbungen'); setCandStatus(s) }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${candColor[s]}`}>
                      {candLabel[s]} {n}
                    </button>
                  ) : null
                })}
              </div>

              <div className="flex-1 overflow-auto divide-y divide-[#1E1E1E]">
                {recent.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[#555] text-sm">Noch keine Bewerbungen.</p>
                ) : recent.map(c => (
                  <div key={c.id} onClick={() => navigate(`/recruiting/candidates/${c.id}`)}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#2A2A2A] cursor-pointer transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-[#F5C40022] text-[#F5C400] flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-[#F5C400] group-hover:text-black transition-all mt-0.5">
                      {c.firstName[0]}{c.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium group-hover:text-[#FF6B00] transition-colors">
                          {c.firstName} {c.lastName}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${candColor[c.status]}`}>
                          {candLabel[c.status]}
                        </span>
                      </div>
                      <p className="text-[#555] text-xs truncate">{c.jobPosting?.title ?? '—'}</p>
                      <p className="text-[#444] text-xs mt-0.5">
                        {new Date(c.appliedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle: Inbox / Tasks */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <ClipboardList size={15} className="text-[#FF6B00]" />
                  Recruiting Inbox
                </h3>
                {tasks.length > 0 && (
                  <span className="text-xs bg-[#FF6B0033] text-[#FF6B00] px-2 py-0.5 rounded-full font-semibold">
                    {tasks.length} Aufgaben
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto divide-y divide-[#1E1E1E]">
                {tasks.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CheckSquare size={28} className="text-[#22c55e] mx-auto mb-2" />
                    <p className="text-[#555] text-sm">Keine offenen Aufgaben.</p>
                  </div>
                ) : tasks.map((task, i) => (
                  <div key={i} onClick={() => navigate(`/recruiting/candidates/${task.id}`)}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#2A2A2A] cursor-pointer transition-colors group">
                    <div className="w-6 h-6 rounded border border-[#2A2A2A] bg-[#111] flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#FF6B00] transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full" style={{
                        backgroundColor: task.status === 'APPLIED' ? '#FF6B00' : task.status === 'SCREENING' ? '#F5C400' : task.status === 'INTERVIEW' ? '#a855f7' : '#22c55e'
                      }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm group-hover:text-[#FF6B00] transition-colors">{task.label}</p>
                      <p className="text-[#555] text-xs truncate">{task.sub}</p>
                    </div>
                    <ArrowRight size={12} className="text-[#333] group-hover:text-[#FF6B00] transition-colors mt-1 shrink-0" />
                  </div>
                ))}
              </div>

              {tasks.length > 0 && (
                <div className="px-5 py-3 border-t border-[#2A2A2A]">
                  <button onClick={() => setTab('Bewerbungen')} className="text-xs text-[#FF6B00] hover:underline w-full text-center">
                    Alle Bewerbungen anzeigen →
                  </button>
                </div>
              )}
            </div>

            {/* Right: Next 7 days + stats */}
            <div className="flex flex-col gap-4">
              {/* Interview pipeline */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex-1">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Clock size={14} className="text-[#a855f7]" /> Aktive Interviews
                  </h3>
                  <span className="text-xs text-[#a855f7] font-semibold">{interviews.length}</span>
                </div>

                <div className="divide-y divide-[#1E1E1E]">
                  {interviews.length === 0 ? (
                    <p className="px-5 py-6 text-center text-[#555] text-sm">Keine Interviews in Bearbeitung.</p>
                  ) : interviews.slice(0, 5).map(c => (
                    <div key={c.id} onClick={() => navigate(`/recruiting/candidates/${c.id}`)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[#2A2A2A] cursor-pointer group transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[#a855f722] text-[#a855f7] flex items-center justify-center text-xs font-bold shrink-0">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm group-hover:text-[#FF6B00] transition-colors">{c.firstName} {c.lastName}</p>
                        <p className="text-[#555] text-xs truncate">{c.jobPosting?.title ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-3">
                <h3 className="text-white font-semibold text-sm">Für Ihre Stellen</h3>
                {[
                  { label: 'Offene Stellen', value: jobs.filter(j => j.status === 'OPEN').length, color: '#FF6B00' },
                  { label: 'Neue Bewerbungen', value: candidates.filter(c => c.status === 'APPLIED').length, color: '#F5C400' },
                  { label: 'In Vorauswahl', value: candidates.filter(c => c.status === 'SCREENING').length, color: '#a855f7' },
                  { label: 'Angebote laufend', value: candidates.filter(c => c.status === 'OFFER').length, color: '#22c55e' },
                  { label: 'Eingestellt (gesamt)', value: candidates.filter(c => c.status === 'HIRED').length, color: '#22c55e' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[#666] text-xs">{label}</span>
                    <span className="text-sm font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ STELLEN ══════════════════ */}
        {tab === 'Stellen' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#555] text-sm">{filteredJobs.length} von {jobs.length} Stellen</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input value={jobSearch} onChange={e => setJobSearch(e.target.value)}
                    placeholder="Suchen…"
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors w-36" />
                </div>
                <FilterSelect value={jobStatus} onChange={setJobStatus} active={!!jobStatus}>
                  <option value="">Alle Status</option>
                  {Object.entries(jobStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </FilterSelect>
                <FilterSelect value={jobDept} onChange={setJobDept} active={!!jobDept}>
                  <option value="">Alle Abteilungen</option>
                  {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </FilterSelect>
                {(jobStatus || jobDept || jobSearch) && (
                  <button onClick={() => { setJobStatus(''); setJobDept(''); setJobSearch('') }}
                    className="text-[#FF6B00] hover:text-white transition-colors"><X size={14} /></button>
                )}
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center">
                <p className="text-[#555] text-sm mb-3">{jobs.length === 0 ? 'Noch keine Stellen ausgeschrieben.' : 'Keine Stellen gefunden.'}</p>
                {jobs.length === 0 && <button onClick={() => setShowJobModal(true)} className="text-[#FF6B00] text-sm hover:underline">+ Erste Stelle anlegen</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredJobs.map(j => (
                  <div key={j.id} onClick={() => navigate(`/recruiting/jobs/${j.id}`)}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 cursor-pointer hover:border-[#FF6B00] transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center">
                        <Briefcase size={18} />
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${j.status === 'OPEN' ? 'bg-[#FF6B0022] text-[#FF6B00]' : 'bg-[#ffffff11] text-[#666]'}`}>
                        {jobStatusLabel[j.status] ?? j.status}
                      </span>
                    </div>
                    <p className="text-white font-semibold group-hover:text-[#FF6B00] transition-colors">{j.title}</p>
                    <p className="text-[#555] text-sm mt-1">{j.department?.name ?? '—'}</p>
                    <div className="flex items-center gap-1 mt-3 text-[#555] text-xs">
                      <Users size={11} />
                      {candidates.filter(c => c.jobPostingId === j.id).length} Bewerbungen
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ BEWERBUNGEN ══════════════════ */}
        {tab === 'Bewerbungen' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#555] text-sm">{filteredCands.length} von {candidates.length} Bewerbern</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input value={candSearch} onChange={e => setCandSearch(e.target.value)}
                    placeholder="Suchen…"
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors w-36" />
                </div>
                <FilterSelect value={candStatus} onChange={setCandStatus} active={!!candStatus}>
                  <option value="">Alle Status</option>
                  {Object.entries(candLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </FilterSelect>
                <FilterSelect value={candJob} onChange={setCandJob} active={!!candJob}>
                  <option value="">Alle Stellen</option>
                  {jobs.map(j => <option key={j.id} value={String(j.id)}>{j.title}</option>)}
                </FilterSelect>
                {(candStatus || candJob || candSearch) && (
                  <button onClick={() => { setCandStatus(''); setCandJob(''); setCandSearch('') }}
                    className="text-[#FF6B00] hover:text-white transition-colors"><X size={14} /></button>
                )}
              </div>
            </div>

            {filteredCands.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center text-[#555] text-sm">
                {candidates.length === 0 ? 'Noch keine Bewerbungen eingegangen.' : 'Keine Bewerber gefunden.'}
              </div>
            ) : (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      {['Name', 'Stelle', 'Beworben am', 'Status'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-[#555] font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {filteredCands.map(c => (
                      <tr key={c.id} onClick={() => navigate(`/recruiting/candidates/${c.id}`)}
                        className="hover:bg-[#2A2A2A] cursor-pointer transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F5C40022] text-[#F5C400] flex items-center justify-center text-xs font-bold group-hover:bg-[#F5C400] group-hover:text-black transition-all">
                              {c.firstName[0]}{c.lastName[0]}
                            </div>
                            <span className="text-white font-medium">{c.firstName} {c.lastName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#888]">{c.jobPosting?.title ?? '—'}</td>
                        <td className="px-6 py-4 text-[#888]">{new Date(c.appliedAt).toLocaleDateString('de-DE')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${candColor[c.status] ?? ''}`}>
                            {candLabel[c.status] ?? c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showJobModal && (
        <Modal title="Stelle ausschreiben" onClose={() => setShowJobModal(false)} size="lg">
          <form onSubmit={createJob} className="space-y-6">

            {/* ── Grunddaten ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Grunddaten</p>
              <div className="space-y-3">
                <Field label="Stellentitel *">
                  <input required value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="z.B. Lagermitarbeiter (m/w/d), Senior Developer…" />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Abteilung">
                    <select value={jobForm.departmentId} onChange={e => setJobForm(f => ({ ...f, departmentId: e.target.value }))} className={inp}>
                      <option value="">— keine —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Beschäftigungsart">
                    <select value={jobForm.employmentType} onChange={e => setJobForm(f => ({ ...f, employmentType: e.target.value }))} className={inp}>
                      <option value="">— wählen —</option>
                      <option value="FULL_TIME">Vollzeit</option>
                      <option value="PART_TIME">Teilzeit</option>
                      <option value="BOTH">Vollzeit & Teilzeit</option>
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                      <option value="OPEN">Offen</option>
                      <option value="DRAFT">Entwurf</option>
                      <option value="CLOSED">Geschlossen</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Standort ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Standort</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Arbeitsort (Stadt)">
                  <input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} className={inp} placeholder="z.B. Kaiserslautern" />
                </Field>
                <Field label="Adresse">
                  <input value={jobForm.address} onChange={e => setJobForm(f => ({ ...f, address: e.target.value }))} className={inp} placeholder="z.B. Von-Miller-Str. 24, 67661 Kaiserslautern" />
                </Field>
              </div>
            </div>

            {/* ── Vergütung ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Vergütung</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Gehaltstyp">
                  <select value={jobForm.salaryType} onChange={e => setJobForm(f => ({ ...f, salaryType: e.target.value }))} className={inp}>
                    <option value="HOURLY">Stundenlohn (€/Std.)</option>
                    <option value="MONTHLY">Monatlich (€/Monat)</option>
                    <option value="ANNUAL">Jährlich (€/Jahr)</option>
                  </select>
                </Field>
                <Field label="Von (€)">
                  <input type="number" step="0.01" value={jobForm.salaryMin} onChange={e => setJobForm(f => ({ ...f, salaryMin: e.target.value }))} className={inp} placeholder="z.B. 16.03" />
                </Field>
                <Field label="Bis (€)">
                  <input type="number" step="0.01" value={jobForm.salaryMax} onChange={e => setJobForm(f => ({ ...f, salaryMax: e.target.value }))} className={inp} placeholder="z.B. 20.00" />
                </Field>
              </div>
            </div>

            {/* ── Benefits ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Leistungen & Benefits</p>
              <div className="grid grid-cols-2 gap-2">
                {BENEFIT_OPTIONS.map(b => {
                  const checked = jobForm.benefits.includes(b.key)
                  return (
                    <label key={b.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      checked ? 'bg-[#FF6B0011] border-[#FF6B0044] text-[#FF6B00]' : 'bg-[#111] border-[#2A2A2A] text-[#555] hover:border-[#FF6B0033] hover:text-[#888]'
                    }`}>
                      <input type="checkbox" className="sr-only" checked={checked}
                        onChange={() => setJobForm(f => ({
                          ...f,
                          benefits: checked ? f.benefits.filter(x => x !== b.key) : [...f.benefits, b.key],
                        }))} />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-[#333]'}`}>
                        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </div>
                      {b.label}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* ── Schichtmodell ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Schichtmodell (optional)</p>
              <Field label="Schichten / Arbeitszeiten">
                <textarea value={jobForm.shiftModel} onChange={e => setJobForm(f => ({ ...f, shiftModel: e.target.value }))} className={inp + ' h-20 resize-none'}
                  placeholder={`z.B.\nFrüh: Mo. 05:00–14:45, Di.–Fr. 06:00–14:45\nSpät: Mo.–Fr. 14:45–23:30`} />
              </Field>
            </div>

            {/* ── Aufgaben ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Aufgaben</p>
              <Field label="Tätigkeiten (eine pro Zeile)">
                <textarea value={jobForm.tasks} onChange={e => setJobForm(f => ({ ...f, tasks: e.target.value }))} className={inp + ' h-24 resize-none'}
                  placeholder="Bestellungen vorbereiten und verpacken&#10;Waren annehmen und einlagern&#10;..." />
              </Field>
            </div>

            {/* ── Anforderungen ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Anforderungen</p>
              <Field label="Voraussetzungen (eine pro Zeile)">
                <textarea value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} className={inp + ' h-24 resize-none'}
                  placeholder="Mindestalter 18 Jahre&#10;Gute Deutschkenntnisse&#10;Körperliche Belastbarkeit&#10;..." />
              </Field>
            </div>

            {/* ── Beschreibung ── */}
            <div>
              <p className="text-[#FF6B00] text-xs font-semibold uppercase tracking-widest mb-3">Allgemeine Beschreibung</p>
              <Field label="Einleitungstext / weitere Infos">
                <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} className={inp + ' h-24 resize-none'}
                  placeholder="Kein Lebenslauf? Keine Vorerfahrung? Kein Problem! Quereinsteiger herzlich willkommen…" />
              </Field>
            </div>

            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2 border-t border-[#2A2A2A]">
              <button type="button" onClick={() => setShowJobModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">{saving ? 'Speichern…' : 'Stelle anlegen'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showCandModal && (
        <Modal title="Bewerber anlegen" onClose={() => setShowCandModal(false)}>
          <form onSubmit={createCandidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vorname *"><input required value={candForm.firstName} onChange={e => setCandForm(f => ({ ...f, firstName: e.target.value }))} className={inp} placeholder="Max" /></Field>
              <Field label="Nachname *"><input required value={candForm.lastName} onChange={e => setCandForm(f => ({ ...f, lastName: e.target.value }))} className={inp} placeholder="Mustermann" /></Field>
            </div>
            <Field label="E-Mail *"><input required type="email" value={candForm.email} onChange={e => setCandForm(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="max@email.de" /></Field>
            <Field label="Stelle *">
              <select required value={candForm.jobPostingId} onChange={e => setCandForm(f => ({ ...f, jobPostingId: e.target.value }))} className={inp}>
                <option value="">Stelle wählen…</option>
                {jobs.filter(j => j.status === 'OPEN').map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </Field>
            <Field label="Notizen"><textarea value={candForm.notes} onChange={e => setCandForm(f => ({ ...f, notes: e.target.value }))} className={inp + ' h-20 resize-none'} placeholder="Erster Eindruck, Quelle…" /></Field>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCandModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#F5C400] text-black text-sm font-medium rounded-lg hover:bg-[#e0b300] disabled:opacity-50 transition-colors">{saving ? 'Speichern…' : 'Anlegen'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
