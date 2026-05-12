import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { Users, Briefcase, CalendarOff, TrendingUp, UserCheck } from 'lucide-react'
import { apiFetch } from '../lib/api'

const ORANGE = '#FF6B00'
const GOLD   = '#F5C400'
const COLORS = ['#FF6B00', '#F5C400', '#a855f7', '#22c55e', '#ef4444', '#6b7280']

const deptLabel: Record<string, string> = {}

const statusLabel: Record<string, string> = {
  ACTIVE: 'Aktiv', INACTIVE: 'Inaktiv', ON_LEAVE: 'Abwesend', TERMINATED: 'Ausgeschieden',
}
const employmentLabel: Record<string, string> = {
  FULL_TIME: 'Vollzeit', PART_TIME: 'Teilzeit', FREELANCE: 'Freiberufl.',
  INTERN: 'Praktikum', WORKING_STUDENT: 'Werkstudent',
}
const absenceTypeLabel: Record<string, string> = {
  VACATION: 'Urlaub', SICK_LEAVE: 'Krank', PARENTAL_LEAVE: 'Elternzeit',
  UNPAID_LEAVE: 'Unbezahlt', OTHER: 'Sonstiges',
}
const candLabel: Record<string, string> = {
  APPLIED: 'Beworben', SCREENING: 'Vorauswahl', INTERVIEW: 'Interview',
  OFFER: 'Angebot', HIRED: 'Eingestellt', REJECTED: 'Abgelehnt',
}
const candColor: Record<string, string> = {
  APPLIED: '#FF6B00', SCREENING: '#F5C400', INTERVIEW: '#a855f7',
  OFFER: '#22c55e', HIRED: '#16a34a', REJECTED: '#ef4444',
}

function kv(obj: Record<string, number>, labelMap: Record<string, string>) {
  return Object.entries(obj).map(([k, v]) => ({ name: labelMap[k] ?? k, value: v }))
}

function count<T extends string>(arr: any[], key: string): Record<T, number> {
  return arr.reduce((acc, item) => {
    const val = item[key] ?? 'UNKNOWN'
    acc[val] = (acc[val] ?? 0) + 1
    return acc
  }, {} as Record<T, number>)
}

function Card({ title, value, sub, icon: Icon, accent }: { title: string; value: string | number; sub?: string; icon: any; accent: string }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}22` }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[#666] text-xs">{title}</p>
        <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[#555] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <h3 className="text-white font-semibold mb-5">{title}</h3>
      {children}
    </div>
  )
}

const tooltipStyle = {
  contentStyle: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff', fontSize: 12 },
  cursor: { fill: '#2A2A2A' },
}

export default function Analytics() {
  const [employees, setEmployees] = useState<any[]>([])
  const [absences, setAbsences]   = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [jobs, setJobs]           = useState<any[]>([])
  const [departments, setDepts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/employees').then(d => setEmployees(d.data ?? d)),
      apiFetch('/api/absences').then(d => setAbsences(d.data ?? d)),
      apiFetch('/api/recruiting/candidates').then(d => setCandidates(d.data ?? d)),
      apiFetch('/api/recruiting/jobs').then(d => setJobs(d.data ?? d)),
      apiFetch('/api/departments').then(d => setDepts(d.data ?? d)),
    ]).then(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 bg-[#0D0D0D] min-h-screen text-[#555]">Laden…</div>

  const active = employees.filter(e => e.status === 'ACTIVE')
  const openJobs = jobs.filter(j => j.status === 'OPEN')
  const pendingAbs = absences.filter(a => a.status === 'PENDING')
  const hired = candidates.filter(c => c.status === 'HIRED')

  // Headcount by department
  const byDept = departments.map(d => ({
    name: d.name,
    count: employees.filter(e => e.departmentId === d.id).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  // Status distribution
  const byStatus = kv(count(employees, 'status'), statusLabel)

  // Employment type
  const byType = kv(count(active, 'employmentType'), employmentLabel)
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  // Absences by type
  const byAbsType = kv(count(absences, 'type'), absenceTypeLabel)
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  // Recruiting pipeline
  const pipeline = Object.entries(candLabel).map(([status, name]) => ({
    name,
    value: candidates.filter(c => c.status === status).length,
    color: candColor[status],
  })).filter(d => d.value > 0)

  // Gender
  const byGender = employees.reduce((acc: any[], e) => {
    const g = e.gender ?? 'Keine Angabe'
    const existing = acc.find(a => a.name === g)
    if (existing) existing.value++
    else acc.push({ name: g, value: 1 })
    return acc
  }, [])

  return (
    <div className="p-8 min-h-screen bg-[#0D0D0D] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analysen</h1>
        <p className="text-[#666] text-sm mt-0.5">Überblick über dein Unternehmen</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Mitarbeiter (aktiv)" value={active.length} sub={`${employees.length} gesamt`} icon={Users} accent={ORANGE} />
        <Card title="Offene Stellen" value={openJobs.length} sub={`${jobs.length} gesamt`} icon={Briefcase} accent={GOLD} />
        <Card title="Ausstehende Anträge" value={pendingAbs.length} sub={`${absences.length} Abwesenheiten`} icon={CalendarOff} accent={ORANGE} />
        <Card title="Eingestellt" value={hired.length} sub={`${candidates.length} Bewerber gesamt`} icon={UserCheck} accent={GOLD} />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartBox title="Headcount nach Abteilung">
          {byDept.length === 0
            ? <p className="text-[#555] text-sm">Keine Daten vorhanden.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDept} barSize={28} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [v, 'Mitarbeiter']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {byDept.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? ORANGE : GOLD} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartBox>

        <ChartBox title="Mitarbeiter nach Status">
          {byStatus.filter(d => d.value > 0).length === 0
            ? <p className="text-[#555] text-sm">Keine Daten vorhanden.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                    {byStatus.filter(d => d.value > 0).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#888' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </ChartBox>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartBox title="Vertragsarten">
          {byType.length === 0
            ? <p className="text-[#555] text-sm">Keine Daten vorhanden.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byType} barSize={32}>
                  <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byType.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? ORANGE : GOLD} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartBox>

        <ChartBox title="Abwesenheiten nach Typ">
          {byAbsType.length === 0
            ? <p className="text-[#555] text-sm">Keine Abwesenheiten vorhanden.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byAbsType} barSize={32}>
                  <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byAbsType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartBox>

        <ChartBox title="Recruiting Pipeline">
          {pipeline.length === 0
            ? <p className="text-[#555] text-sm">Keine Bewerber vorhanden.</p>
            : (
              <div className="space-y-2.5 mt-1">
                {pipeline.map(({ name, value, color }) => {
                  const max = Math.max(...pipeline.map(p => p.value))
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs text-[#666] mb-1">
                        <span>{name}</span><span style={{ color }}>{value}</span>
                      </div>
                      <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </ChartBox>
      </div>

      {/* Row 3 — Gender + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartBox title="Geschlechterverteilung">
          {byGender.every(g => g.name === 'Keine Angabe')
            ? <p className="text-[#555] text-sm">Keine Angaben hinterlegt.</p>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byGender} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                    {byGender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </ChartBox>

        <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-5">Zusammenfassung</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Aktive Mitarbeiter', value: active.length, of: employees.length },
              { label: 'Vollzeit-Quote', value: `${employees.length ? Math.round(employees.filter(e => e.employmentType === 'FULL_TIME').length / employees.length * 100) : 0} %` },
              { label: 'Abwesenheitsquote', value: `${employees.length ? Math.round(employees.filter(e => e.status === 'ON_LEAVE').length / employees.length * 100) : 0} %` },
              { label: 'Genehmigte Abwesenheiten', value: absences.filter(a => a.status === 'APPROVED').length, of: absences.length },
              { label: 'Conversion (Hired)', value: `${candidates.length ? Math.round(hired.length / candidates.length * 100) : 0} %`, sub: 'Bewerber → Eingestellt' },
              { label: 'Abteilungen', value: departments.length },
            ].map(({ label, value, of: ofVal }) => (
              <div key={label} className="bg-[#0D0D0D] rounded-xl p-4">
                <p className="text-[#555] text-xs mb-1">{label}</p>
                <p className="text-xl font-bold text-white">{value}
                  {ofVal !== undefined && <span className="text-[#444] text-sm font-normal"> / {ofVal}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
