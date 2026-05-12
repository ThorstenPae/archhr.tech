import { NavLink, useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import {
  LayoutDashboard, Users, Briefcase, UserCheck,
  CalendarOff, FolderOpen, Settings, BarChart2, Banknote, Target, MessageSquare, User, LogOut, Shield, Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ALL_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',      roles: ['ADMIN', 'MANAGEMENT', 'EMPLOYEE'] },
  { to: '/employees',   icon: Users,            label: 'Mitarbeiter',    roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/recruiting',  icon: Briefcase,        label: 'Recruiting',     roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/onboarding',  icon: UserCheck,        label: 'Onboarding',     roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/absences',    icon: CalendarOff,      label: 'Abwesenheiten',  roles: ['ADMIN', 'MANAGEMENT', 'EMPLOYEE'] },
  { to: '/payroll',     icon: Banknote,         label: 'Payroll',        roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/performance', icon: Target,           label: 'Performance',    roles: ['ADMIN', 'MANAGEMENT', 'EMPLOYEE'] },
  { to: '/surveys',     icon: MessageSquare,    label: 'Umfragen',       roles: ['ADMIN', 'MANAGEMENT', 'EMPLOYEE'] },
  { to: '/analytics',   icon: BarChart2,        label: 'Analysen',       roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/documents',      icon: FolderOpen,    label: 'Dokumente',      roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/whistleblowing', icon: Shield,         label: 'Whistleblowing', roles: ['ADMIN', 'MANAGEMENT'] },
  { to: '/workflows',      icon: Zap,            label: 'Workflows',      roles: ['ADMIN', 'MANAGEMENT'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  const role = user?.role ?? 'EMPLOYEE'

  const nav = ALL_NAV.filter(n => n.roles.includes(role))

  // For EMPLOYEE, "Mein Profil" link goes to their own employee detail
  const profileLink = user?.employeeId ? `/employees/${user.employeeId}` : null

  return (
    <aside className="w-14 bg-[#111111] border-r border-[#2A2A2A] flex flex-col items-center py-4 shrink-0">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-[#FF6B00] flex items-center justify-center mb-6 glow-orange-sm">
        <span className="text-white font-black text-xs">Ar</span>
      </div>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${
                isActive
                  ? 'bg-[#FF6B00] text-white glow-orange-sm'
                  : 'text-[#555] hover:text-[#FF6B00] hover:bg-[#1A1A1A]'
              }`
            }
          >
            {() => (
              <>
                <Icon size={18} />
                <span className="absolute left-14 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Employee: own profile link */}
        {role === 'EMPLOYEE' && profileLink && (
          <button
            onClick={() => navigate(profileLink)}
            title="Mein Profil"
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative text-[#555] hover:text-[#FF6B00] hover:bg-[#1A1A1A]"
          >
            <User size={18} />
            <span className="absolute left-14 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Mein Profil
            </span>
          </button>
        )}
      </nav>

      {/* Settings (Admin only) */}
      {role === 'ADMIN' && (
        <NavLink
          to="/settings"
          title="Einstellungen"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#555] hover:text-[#FF6B00] hover:bg-[#1A1A1A] transition-all group relative"
        >
          <Settings size={18} />
          <span className="absolute left-14 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Einstellungen
          </span>
        </NavLink>
      )}

      {/* Notifications */}
      <NotificationBell />

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Abmelden"
        className="w-10 h-10 rounded-lg flex items-center justify-center text-[#555] hover:text-[#ff6666] hover:bg-[#1A1A1A] transition-all group relative mt-1"
      >
        <LogOut size={18} />
        <span className="absolute left-14 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Abmelden
        </span>
      </button>
    </aside>
  )
}
