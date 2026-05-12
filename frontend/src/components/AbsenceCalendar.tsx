import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const TYPE_COLOR: Record<string, { bg: string; label: string }> = {
  VACATION:       { bg: '#22c55e', label: 'Urlaub' },
  SICK_LEAVE:     { bg: '#ef4444', label: 'Krank' },
  PARENTAL_LEAVE: { bg: '#a855f7', label: 'Elternzeit' },
  UNPAID_LEAVE:   { bg: '#f97316', label: 'Unbezahlt' },
  OTHER:          { bg: '#6b7280', label: 'Sonstiges' },
}

const DAY_W = 36
const NAME_W = 190

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

interface Props {
  employees: any[]
  absences: any[]
}

export default function AbsenceCalendar({ employees, absences }: Props) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const today = new Date()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const goToday = () => { const d = new Date(); d.setDate(1); setViewDate(d) }

  const monthLabel = viewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6

  function getBarProps(a: any) {
    const aStart = new Date(a.startDate)
    const aEnd = new Date(a.endDate)
    const visStart = aStart < monthStart ? monthStart : aStart
    const visEnd = aEnd > monthEnd ? monthEnd : aEnd
    const startIdx = visStart.getDate() - 1
    const endIdx = visEnd.getDate() - 1
    const duration = endIdx - startIdx + 1
    return { left: startIdx * DAY_W + 2, width: duration * DAY_W - 4 }
  }

  function getEmpAbsences(empId: number) {
    return absences.filter(a => {
      if (a.employeeId !== empId) return false
      if (a.status === 'REJECTED' || a.status === 'CANCELLED') return false
      const s = new Date(a.startDate), e = new Date(a.endDate)
      return s <= monthEnd && e >= monthStart
    })
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A] flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-[#2A2A2A] text-[#888] hover:text-white flex items-center justify-center transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-[#2A2A2A] text-[#888] hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={16} />
          </button>
          <span className="text-white font-semibold ml-1 capitalize">{monthLabel}</span>
          <button onClick={goToday}
            className="ml-2 px-3 py-1.5 bg-[#2A2A2A] text-[#888] text-xs rounded-lg hover:text-white transition-colors">
            Heute
          </button>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(TYPE_COLOR).map(([type, { bg, label }]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: bg }} />
              <span className="text-[#555] text-xs">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-dashed border-[#888] opacity-60" style={{ backgroundColor: '#6b7280' }} />
            <span className="text-[#555] text-xs">Ausstehend</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: NAME_W + daysInMonth * DAY_W }}>

          {/* Day header */}
          <div className="flex sticky top-0 z-10 bg-[#111] border-b border-[#2A2A2A]">
            <div style={{ width: NAME_W, minWidth: NAME_W }}
              className="px-4 py-2 text-xs text-[#444] font-medium border-r border-[#2A2A2A] shrink-0">
              {employees.length} Mitarbeiter
            </div>
            <div className="flex">
              {days.map((day, i) => (
                <div key={i} style={{ width: DAY_W, minWidth: DAY_W }}
                  className={`py-1.5 text-center border-l border-[#222] ${isWeekend(day) ? 'bg-[#0D0D0D]' : ''}`}>
                  <div className={`text-[10px] ${isToday(day) ? 'text-[#FF6B00]' : 'text-[#444]'}`}>
                    {DAYS_DE[day.getDay()]}
                  </div>
                  <div className={`text-xs mx-auto flex items-center justify-center rounded-full w-5 h-5 ${
                    isToday(day) ? 'bg-[#FF6B00] text-white font-bold' : isWeekend(day) ? 'text-[#333]' : 'text-[#666]'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee rows */}
          {employees.length === 0 && (
            <div className="px-6 py-10 text-center text-[#555] text-sm">Keine Mitarbeiter vorhanden.</div>
          )}
          {employees.map(emp => {
            const empAbsences = getEmpAbsences(emp.id)
            return (
              <div key={emp.id} className="flex border-b border-[#1E1E1E] hover:bg-[#1D1D1D] transition-colors" style={{ height: 48 }}>
                {/* Name */}
                <div style={{ width: NAME_W, minWidth: NAME_W }}
                  className="flex items-center px-4 gap-2 shrink-0 border-r border-[#222]">
                  <div className="w-6 h-6 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[#444] text-[10px] truncate">{emp.position}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative" style={{ width: daysInMonth * DAY_W, minWidth: daysInMonth * DAY_W }}>
                  {/* Grid lines + weekend shading */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map((day, i) => (
                      <div key={i} style={{ width: DAY_W }}
                        className={`h-full border-l border-[#1E1E1E] ${isWeekend(day) ? 'bg-[#0D0D0D]' : ''} ${isToday(day) ? 'bg-[#FF6B0008]' : ''}`} />
                    ))}
                  </div>

                  {/* Absence bars */}
                  {empAbsences.map(a => {
                    const color = TYPE_COLOR[a.type] ?? TYPE_COLOR.OTHER
                    const { left, width } = getBarProps(a)
                    const isPending = a.status === 'PENDING'
                    return (
                      <div key={a.id}
                        title={`${color.label}${a.reason ? ` · ${a.reason}` : ''}${isPending ? ' (ausstehend)' : ''}`}
                        style={{
                          position: 'absolute',
                          top: 9,
                          height: 30,
                          left,
                          width,
                          backgroundColor: color.bg,
                          opacity: isPending ? 0.45 : 0.82,
                          borderRadius: 5,
                          border: isPending ? `1.5px dashed ${color.bg}` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 7,
                          overflow: 'hidden',
                          zIndex: 1,
                        }}>
                        <span style={{ color: '#fff', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {width > 50 ? color.label : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
