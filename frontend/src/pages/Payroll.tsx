import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Users, UserPlus, UserMinus, Euro, CheckCircle, Clock, AlertCircle, Upload, Download, Trash2, FileText } from 'lucide-react'
import { apiFetch } from '../lib/api'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const DOC_CATEGORIES = [
  { key: 'GEHALTSABRECHNUNG',     label: 'Gehaltsabrechnung' },
  { key: 'BRUTTO_NETTO',          label: 'Brutto-/Netto-Bericht' },
  { key: 'SOZIALVERSICHERUNG',    label: 'Sozialversicherungsnachweis' },
  { key: 'STEUER',                label: 'Steuerinformation' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function DocTile({ category, docs, month, onUpload, onDelete }: {
  category: { key: string; label: string }
  docs: any[]
  month: string
  onUpload: (file: File, cat: string, mon: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const matching = docs.filter(d => d.category === category.key && d.month === month)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onUpload(file, category.key, month)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3 hover:border-[#FF6B0033] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#FF6B00] shrink-0" />
          <p className="text-white text-sm font-medium">{category.label}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Dokument hochladen"
          className="p-1.5 rounded-lg text-[#555] hover:text-[#FF6B00] hover:bg-[#FF6B0011] transition-all disabled:opacity-40"
        >
          <Upload size={14} />
        </button>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          onChange={handleFile} />
      </div>

      {/* Uploaded files */}
      {matching.length === 0 ? (
        <button onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 text-xs text-[#444] hover:text-[#FF6B00] transition-colors py-1">
          <Upload size={12} /> Datei hochladen…
        </button>
      ) : (
        <div className="space-y-1.5">
          {matching.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-2 group">
              <span className="flex-1 text-xs text-[#888] truncate" title={doc.originalName}>
                {doc.originalName}
              </span>
              <span className="text-[10px] text-[#444] shrink-0">{fmtBytes(doc.size)}</span>
              <a
                href={`${BASE}/api/payroll/documents/${doc.id}/download`}
                target="_blank" rel="noreferrer"
                className="p-1 text-[#444] hover:text-[#22c55e] transition-colors"
                title="Herunterladen"
                onClick={async (e) => {
                  e.preventDefault()
                  const token = localStorage.getItem('token')
                  const resp = await fetch(`${BASE}/api/payroll/documents/${doc.id}/download`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  const blob = await resp.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = doc.originalName; a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download size={12} />
              </a>
              <button onClick={() => onDelete(doc.id)}
                className="p-1 text-[#444] hover:text-[#ef4444] transition-colors"
                title="Löschen">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && <p className="text-xs text-[#FF6B00] animate-pulse">Hochladen…</p>}
    </div>
  )
}

const ORANGE = '#FF6B00'
const GOLD   = '#F5C400'

const DUE_DATES = [
  { day: 10, label: 'Lohnsteuer-Anmeldung',       sub: 'Finanzamt',                color: ORANGE },
  { day: 15, label: 'Meldung Arbeitsagentur',      sub: 'Bundesagentur für Arbeit', color: GOLD   },
  { day: 25, label: 'Sozialversicherungsbeiträge', sub: 'Krankenkassen / DRV',      color: ORANGE },
  { day: 28, label: 'Gehaltsauszahlung',           sub: 'Alle Mitarbeitenden',      color: '#22c55e' },
]

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-[#555] text-xs">{label}</p>
        <p className="text-xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-[#444] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Payroll() {
  const [data, setData]     = useState<any>(null)
  const [docs, setDocs]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const now = new Date()

  const loadDocs = () => apiFetch('/api/payroll/documents').then(setDocs)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/payroll/summary').then(setData),
      loadDocs(),
    ]).then(() => setLoading(false))
  }, [])

  const uploadDoc = async (file: File, category: string, month: string) => {
    const token = localStorage.getItem('token')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    fd.append('category', category)
    fd.append('month', month)
    await fetch(`${BASE}/api/payroll/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    await loadDocs()
  }

  const deleteDoc = async (id: number) => {
    await apiFetch(`/api/payroll/documents/${id}`, { method: 'DELETE' })
    await loadDocs()
  }

  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const cycleStart = data ? new Date(data.cycle.start).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''
  const cycleEnd   = data ? new Date(data.cycle.end).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''

  // Days left in month
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth   = now.getDate()
  const progress     = Math.round((dayOfMonth / daysInMonth) * 100)

  // Due dates: mark which have passed
  const dueDates = DUE_DATES.map(d => ({
    ...d,
    date: new Date(now.getFullYear(), now.getMonth(), d.day),
    passed: dayOfMonth > d.day,
    upcoming: Math.abs(d.day - dayOfMonth) <= 5 && dayOfMonth <= d.day,
  }))

  if (loading) return <div className="p-8 bg-[#0D0D0D] min-h-screen text-[#555]">Laden…</div>

  const maxMonthly = data.byDept.length ? data.byDept[0].monthly : 1

  return (
    <div className="min-h-screen bg-[#0D0D0D] p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#555] text-sm">Payroll</p>
          <h1 className="text-2xl font-bold text-white">{monthName}</h1>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#22c55e22] text-[#22c55e] border border-[#22c55e33]">
          Bereit zur Freigabe
        </span>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-6">

        {/* ── Cycle banner (col-span-2) ── */}
        <div className="col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-5">
          {/* Cycle bar */}
          <div>
            <div className="flex justify-between text-xs text-[#555] mb-2">
              <span>Abrechnungszyklus · {cycleStart} – {cycleEnd}</span>
              <span>{dayOfMonth}. / {daysInMonth}. Tag</span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#F5C400] rounded-full transition-all"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Gross sum row */}
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-[#555] text-xs mb-1">Bruttolohnsumme (monatlich)</p>
              <p className="text-3xl font-black text-white">{fmt(data.totalMonthlyGross)}</p>
              {data.avgMonthlySalary > 0 && (
                <p className="text-xs text-[#555] mt-1">Ø {fmt(data.avgMonthlySalary)} / Mitarbeiter</p>
              )}
            </div>
            <button className="px-6 py-2.5 bg-[#FF6B00] text-white text-sm font-semibold rounded-lg hover:bg-[#e55e00] transition-colors shadow-[0_0_20px_#FF6B0040]">
              Freigeben
            </button>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4 pt-2 border-t border-[#2A2A2A]">
            <KpiCard label="Mitarbeitende" value={data.headcount} icon={Users} color={ORANGE} />
            <KpiCard label="Zugänge" value={`+${data.newHires}`} sub="diesen Monat" icon={UserPlus} color="#22c55e" />
            <KpiCard label="Abgänge" value={data.departures > 0 ? `−${data.departures}` : '—'} sub="diesen Monat" icon={UserMinus} color="#ef4444" />
            <KpiCard label="Ø Gehalt / Monat" value={fmt(data.avgMonthlySalary)} icon={Euro} color={GOLD} />
          </div>
        </div>

        {/* ── Fälligkeitstermine sidebar (row-span-2) ── */}
        <div className="row-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-5">Fälligkeitstermine</h3>
          <div className="space-y-3">
            {dueDates.map(d => (
              <div key={d.day} className={`flex gap-4 p-3 rounded-lg transition-all ${d.upcoming ? 'bg-[#FF6B0011] border border-[#FF6B0033]' : d.passed ? 'opacity-50' : 'bg-[#111]'}`}>
                <div className="text-center shrink-0 w-10">
                  <p className="text-xl font-black" style={{ color: d.passed ? '#555' : d.color }}>{d.day}</p>
                  <p className="text-[10px] text-[#444]">{now.toLocaleDateString('de-DE', { month: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {d.passed
                      ? <CheckCircle size={12} className="text-[#22c55e] shrink-0" />
                      : d.upcoming
                      ? <AlertCircle size={12} className="shrink-0" style={{ color: d.color }} />
                      : <Clock size={12} className="text-[#444] shrink-0" />}
                    <p className="text-white text-sm font-medium truncate">{d.label}</p>
                  </div>
                  <p className="text-[#555] text-xs mt-0.5 truncate">{d.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Last cycle summary */}
          <div className="mt-6 pt-5 border-t border-[#2A2A2A]">
            <p className="text-[#555] text-xs uppercase tracking-widest mb-3">Letzter Zyklus</p>
            {[
              { label: 'Gehaltsabrechnungen', done: true },
              { label: 'Beitragsnachweis Sozialversicherung', done: true },
              { label: 'Steuerinformationen', done: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 py-1.5">
                <CheckCircle size={14} className="text-[#22c55e] shrink-0" />
                <span className="text-[#888] text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom left: Top Earners (col-span-1) ── */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Höchste Gehaltsabweichung</h3>
          {data.topEarners.length === 0 ? (
            <p className="text-[#555] text-sm">Keine Gehaltsdaten hinterlegt.</p>
          ) : (
            <div className="space-y-3">
              {data.topEarners.map((e: any) => (
                <div key={e.id}
                  onClick={() => navigate(`/employees/${e.id}`)}
                  className="flex items-center gap-3 cursor-pointer group hover:bg-[#2A2A2A] -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
                    {e.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate group-hover:text-[#FF6B00] transition-colors">{e.name}</p>
                    <p className="text-[#555] text-xs truncate">{fmt(e.monthly)} / Monat</p>
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    e.deviation > 0 ? 'bg-[#22c55e22] text-[#22c55e]' : e.deviation < 0 ? 'bg-[#ef444422] text-[#ef4444]' : 'bg-[#2A2A2A] text-[#555]'
                  }`}>
                    {e.deviation > 0 ? <TrendingUp size={11} /> : e.deviation < 0 ? <TrendingDown size={11} /> : null}
                    {e.deviation > 0 ? '+' : ''}{e.deviation}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom middle: By Department ── */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Lohnkosten nach Abteilung</h3>
          {data.byDept.length === 0 ? (
            <p className="text-[#555] text-sm">Keine Abteilungen vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {data.byDept.map((d: any, i: number) => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#888]">{d.name}</span>
                    <span className="text-white font-medium">{fmt(d.monthly)}</span>
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(d.monthly / maxMonthly) * 100}%`, backgroundColor: i % 2 === 0 ? ORANGE : GOLD }} />
                  </div>
                  <p className="text-[#444] text-[10px] mt-0.5">{d.count} Mitarbeitende</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documents row */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Dokumente – {now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h3>
          <p className="text-xs text-[#444]">PDF, PNG, JPEG, Excel, CSV · max. 20 MB</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DOC_CATEGORIES.map(cat => (
            <DocTile
              key={cat.key}
              category={cat}
              docs={docs}
              month={currentMonthKey()}
              onUpload={uploadDoc}
              onDelete={deleteDoc}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
