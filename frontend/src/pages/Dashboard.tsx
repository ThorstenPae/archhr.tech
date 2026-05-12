import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, Briefcase, CalendarOff, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

const COLORS = ['#FF6B00', '#F5C400', '#FF6B00', '#F5C400', '#FF6B00']

export default function Dashboard() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [deptData, setDeptData] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      apiFetch('/api/employees'),
      apiFetch('/api/recruiting/jobs'),
      apiFetch('/api/absences'),
      apiFetch('/api/recruiting/candidates'),
      apiFetch('/api/departments'),
    ]).then(([emp, j, abs, cands, depts]) => {
      const empList = emp.data ?? emp
      const absList = abs.data ?? abs
      const candList = cands.data ?? cands
      const deptList = depts.data ?? depts
      const jobList = j.data ?? j

      setEmployees(empList)
      setJobs(jobList)
      setAbsences(absList)
      setCandidates(candList)

      // Headcount by department
      const byDept = deptList.map((d: any) => ({
        name: d.name,
        count: empList.filter((e: any) => e.departmentId === d.id).length,
      })).filter((d: any) => d.count > 0)
      setDeptData(byDept)
    })
  }, [])

  const pendingAbsences = absences.filter(a => a.status === 'PENDING')
  const openJobs = jobs.filter(j => j.status === 'OPEN')
  const recentCandidates = candidates.slice(0, 4)

  return (
    <div className="p-8 space-y-6 bg-[#0D0D0D] min-h-screen">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          {greeting}, <span style={{ color: '#FF6B00' }}>{user?.firstName ?? 'Team'}</span>
        </h1>
        <p className="text-[#666] mt-1">Hier ist dein Überblick für heute.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Mitarbeiter', value: employees.length, icon: Users, accent: '#FF6B00', to: '/employees' },
          { label: 'Offene Stellen', value: openJobs.length, icon: Briefcase, accent: '#F5C400', to: '/recruiting' },
          { label: 'Ausstehende Anträge', value: pendingAbsences.length, icon: CalendarOff, accent: '#FF6B00', to: '/absences' },
          { label: 'Bewerber', value: candidates.length, icon: TrendingUp, accent: '#F5C400', to: '/recruiting' },
        ].map(({ label, value, icon: Icon, accent, to }) => (
          <Link key={label} to={to}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 flex items-center gap-4 hover:border-[#FF6B00] transition-all group"
            style={{ '--accent': accent } as any}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accent}22` }}>
              <Icon size={20} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-[#666] text-xs">{label}</p>
              <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
            </div>
            <ArrowRight size={14} className="ml-auto text-[#333] group-hover:text-[#FF6B00] transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Chart */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[#666] text-xs uppercase tracking-widest mb-1">Headcount</p>
              <p className="text-3xl font-bold" style={{ color: '#FF6B00' }}>{employees.length}</p>
            </div>
            <span className="text-xs text-[#F5C400] bg-[#F5C40022] px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp size={10} /> nach Abteilung
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deptData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff' }}
                cursor={{ fill: '#2A2A2A' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {deptData.map((_: any, i: number) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#FF6B00' : '#F5C400'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inbox / Aktuelle Aktivität */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Ausstehend</h2>
            <Clock size={14} className="text-[#555]" />
          </div>
          <ul className="space-y-3">
            {pendingAbsences.length === 0 && recentCandidates.length === 0 && (
              <li className="text-[#555] text-sm">Alles erledigt ✓</li>
            )}
            {pendingAbsences.map(a => (
              <li key={a.id}>
                <Link to="/absences" className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg hover:border hover:border-[#FF6B00] transition-all group">
                  <div className="w-2 h-2 rounded-full bg-[#F5C400] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      Urlaubsantrag — {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : `MA #${a.employeeId}`}
                    </p>
                    <p className="text-[#555] text-xs">{new Date(a.startDate).toLocaleDateString('de-DE')} – {new Date(a.endDate).toLocaleDateString('de-DE')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5C40022] text-[#F5C400] shrink-0">ausstehend</span>
                </Link>
              </li>
            ))}
            {recentCandidates.map(c => (
              <li key={c.id}>
                <Link to={`/recruiting/candidates/${c.id}`} className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg hover:border hover:border-[#FF6B00] transition-all">
                  <div className="w-7 h-7 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-xs font-bold shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{c.firstName} {c.lastName}</p>
                    <p className="text-[#555] text-xs truncate">{c.jobPosting?.title}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B0022] text-[#FF6B00] shrink-0">{c.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mitarbeiter Vorschau */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Mitarbeiter</h2>
          <Link to="/employees" className="text-xs text-[#FF6B00] hover:underline">Alle anzeigen →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {employees.slice(0, 5).map(e => (
            <Link key={e.id} to={`/employees/${e.id}`}
              className="flex flex-col items-center gap-2 p-4 bg-[#2A2A2A] rounded-xl hover:border hover:border-[#FF6B00] hover:glow-orange-sm transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-lg font-bold group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
                {e.firstName[0]}{e.lastName[0]}
              </div>
              <div className="text-center">
                <p className="text-white text-xs font-medium truncate max-w-full">{e.firstName}</p>
                <p className="text-[#555] text-[10px] truncate max-w-full">{e.position}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
