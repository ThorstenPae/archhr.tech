import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, Users, MapPin, Euro, Clock, CheckCircle, Star } from 'lucide-react'
import { apiFetch } from '../lib/api'

const candidateStatusLabel: Record<string, string> = {
  APPLIED: 'Beworben', SCREENING: 'Vorauswahl', INTERVIEW: 'Interview',
  OFFER: 'Angebot', HIRED: 'Eingestellt', REJECTED: 'Abgelehnt',
}
const candidateStatusColor: Record<string, string> = {
  APPLIED:   'bg-[#FF6B0022] text-[#FF6B00]',
  SCREENING: 'bg-[#F5C40022] text-[#F5C400]',
  INTERVIEW: 'bg-[#a855f722] text-[#a855f7]',
  OFFER:     'bg-[#22c55e22] text-[#22c55e]',
  HIRED:     'bg-[#22c55e33] text-[#22c55e]',
  REJECTED:  'bg-[#ff000022] text-[#ff6666]',
}
const empTypeLabel: Record<string, string> = {
  FULL_TIME: 'Vollzeit', PART_TIME: 'Teilzeit', BOTH: 'Vollzeit & Teilzeit',
}
const salaryTypeLabel: Record<string, string> = {
  HOURLY: '€/Std.', MONTHLY: '€/Monat', ANNUAL: '€/Jahr',
}
const benefitLabel: Record<string, string> = {
  TRAINING:             'Betriebliche Weiterbildung',
  DISCOUNT:             'Mitarbeiter-Rabatt',
  LIFE_INSURANCE:       'Lebensversicherung',
  EAP:                  'Employee Assistance Program',
  DEUTSCHLAND_TICKET:   'Deutschland-Ticket',
  DISABILITY_INSURANCE: 'Berufsunfähigkeitsversicherung',
  CAREER_CHOICE:        'Weiterbildungsprogramm',
  HOME_OFFICE:          'Home Office',
  FLEXIBLE_HOURS:       'Flexible Arbeitszeiten',
  COMPANY_CAR:          'Firmenwagen',
  SHUTTLE:              'Shuttle-Service',
  CANTEEN:              'Kantine',
  BONUS:                'Bonus / Prämien',
  PENSION:              'Betriebliche Altersvorsorge',
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#2A2A2A]">
        {Icon && <Icon size={14} className="text-[#FF6B00]" />}
        <h2 className="text-[#555] text-xs uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState<any>(null)

  useEffect(() => { apiFetch(`/api/recruiting/jobs/${id}`).then(setJob) }, [id])

  if (!job) return <div className="p-8 text-[#555] bg-[#0D0D0D] min-h-screen">Laden…</div>

  const candidates = job.candidates ?? []
  const benefits   = job.benefits ? job.benefits.split(',').map((b: string) => b.trim()).filter(Boolean) : []
  const tasks      = job.tasks ? job.tasks.split('\n').filter(Boolean) : []
  const reqs       = job.requirements ? job.requirements.split('\n').filter(Boolean) : []

  return (
    <div className="p-8 max-w-3xl bg-[#0D0D0D] min-h-screen space-y-5">
      <Link to="/recruiting" className="inline-flex items-center gap-1 text-sm text-[#555] hover:text-[#FF6B00] transition-colors">
        <ArrowLeft size={14} /> Zurück zum Recruiting
      </Link>

      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex items-start gap-5">
        <div className="w-14 h-14 rounded-xl bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center shrink-0">
          <Briefcase size={24} />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {job.department && <span className="text-[#666] text-sm">{job.department.name}</span>}
            {job.employmentType && (
              <span className="text-xs px-2 py-0.5 bg-[#F5C40022] text-[#F5C400] rounded-full font-medium">
                {empTypeLabel[job.employmentType] ?? job.employmentType}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1 text-xs text-[#555]">
                <MapPin size={11} /> {job.location}
              </span>
            )}
          </div>
          {/* Salary */}
          {(job.salaryMin || job.salaryMax) && (
            <div className="flex items-center gap-1 text-sm font-semibold text-[#FF6B00]">
              <Euro size={13} />
              {job.salaryMin && job.salaryMax
                ? `${job.salaryMin.toLocaleString('de-DE')} – ${job.salaryMax.toLocaleString('de-DE')}`
                : (job.salaryMin ?? job.salaryMax)?.toLocaleString('de-DE')}
              {' '}{salaryTypeLabel[job.salaryType] ?? ''}
            </div>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${
          job.status === 'OPEN' ? 'bg-[#FF6B0022] text-[#FF6B00]' : 'bg-[#ffffff11] text-[#555]'
        }`}>
          {job.status === 'OPEN' ? 'Offen' : job.status === 'FILLED' ? 'Besetzt' : job.status === 'DRAFT' ? 'Entwurf' : 'Geschlossen'}
        </span>
      </div>

      {/* Location */}
      {job.address && (
        <Section title="Standort" icon={MapPin}>
          <p className="text-sm text-[#888] whitespace-pre-line">{job.address}</p>
        </Section>
      )}

      {/* Benefits */}
      {benefits.length > 0 && (
        <Section title="Leistungen & Benefits" icon={Star}>
          <div className="flex flex-wrap gap-2">
            {benefits.map((b: string) => (
              <div key={b} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B0011] border border-[#FF6B0033] rounded-lg">
                <CheckCircle size={12} className="text-[#FF6B00]" />
                <span className="text-xs text-[#FF6B00] font-medium">{benefitLabel[b] ?? b}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Shift model */}
      {job.shiftModel && (
        <Section title="Schichtmodell" icon={Clock}>
          <p className="text-sm text-[#888] whitespace-pre-line">{job.shiftModel}</p>
        </Section>
      )}

      {/* Description */}
      {job.description && (
        <Section title="Stellenbeschreibung" icon={Briefcase}>
          <p className="text-sm text-[#888] whitespace-pre-line">{job.description}</p>
        </Section>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <Section title="Deine Aufgaben">
          <ul className="space-y-2">
            {tasks.map((t: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                <span className="text-[#FF6B00] mt-0.5 shrink-0">›</span>{t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Requirements */}
      {reqs.length > 0 && (
        <Section title="Anforderungen">
          <ul className="space-y-2">
            {reqs.map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                <CheckCircle size={12} className="text-[#22c55e] mt-0.5 shrink-0" />{r}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Candidates */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-[#555]" />
          <h2 className="text-white font-semibold">Bewerber ({candidates.length})</h2>
        </div>
        {candidates.length === 0 ? (
          <p className="text-sm text-[#555]">Noch keine Bewerbungen.</p>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {candidates.map((c: any) => (
              <li key={c.id}>
                <Link to={`/recruiting/candidates/${c.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-[#2A2A2A] -mx-6 px-6 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-[#F5C40022] text-[#F5C400] flex items-center justify-center text-xs font-semibold group-hover:bg-[#F5C400] group-hover:text-black transition-all">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-[#555]">{c.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${candidateStatusColor[c.status] ?? ''}`}>
                    {candidateStatusLabel[c.status] ?? c.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
