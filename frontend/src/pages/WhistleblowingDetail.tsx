import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Send, Trash2, AlertTriangle, User } from 'lucide-react'
import { apiFetch } from '../lib/api'

const CATEGORIES = [
  { value: 'DISCRIMINATION', label: 'Diskriminierung' },
  { value: 'FRAUD',          label: 'Betrug' },
  { value: 'HARASSMENT',     label: 'Belästigung' },
  { value: 'LEAK',           label: 'Datenleck' },
  { value: 'CORRUPTION',     label: 'Korruption' },
  { value: 'SAFETY',         label: 'Sicherheit' },
  { value: 'OTHER',          label: 'Sonstiges' },
]
const PRIORITIES = [
  { value: 'LOW',      label: 'Niedrig' },
  { value: 'MEDIUM',   label: 'Mittel' },
  { value: 'HIGH',     label: 'Hoch' },
  { value: 'CRITICAL', label: 'Kritisch' },
]
const STATUSES = [
  { value: 'TODO',        label: 'To do' },
  { value: 'IN_PROGRESS', label: 'Wird bearbeitet' },
  { value: 'WAITING',     label: 'Wartend' },
  { value: 'CLOSED',      label: 'Geschlossen' },
]
const statusColor: Record<string, string> = {
  TODO:        'bg-[#3b82f622] text-[#3b82f6]',
  IN_PROGRESS: 'bg-[#F5C40022] text-[#F5C400]',
  WAITING:     'bg-[#ff666622] text-[#ff6666]',
  CLOSED:      'bg-[#ffffff11] text-[#555]',
}

const sel = 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer [color-scheme:dark]'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins  = Math.floor(diff / 60000)
  if (days > 1)  return `Vor ${days} Tagen`
  if (days === 1) return 'Gestern'
  if (hours > 0) return `Vor ${hours} Stunden`
  if (mins > 0)  return `Vor ${mins} Minuten`
  return 'Gerade eben'
}

export default function WhistleblowingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [c, setC]           = useState<any>(null)
  const [users, setUsers]   = useState<any[]>([])
  const [msg, setMsg]       = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef           = useRef<HTMLDivElement>(null)

  const load = () => apiFetch(`/api/whistleblowing/${id}`).then(setC)

  useEffect(() => {
    load()
    apiFetch('/auth/users').then(setUsers)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [c?.messages?.length])

  const update = async (patch: Record<string, any>) => {
    const updated = await apiFetch(`/api/whistleblowing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    setC(updated)
  }

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    try {
      await apiFetch(`/api/whistleblowing/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: msg, fromReporter: false }),
      })
      setMsg('')
      load()
    } finally { setSending(false) }
  }

  const archive = async () => {
    await update({ archived: !c.archived })
    navigate('/whistleblowing')
  }

  const deleteCase = async () => {
    if (!confirm('Fall endgültig löschen?')) return
    await apiFetch(`/api/whistleblowing/${id}`, { method: 'DELETE' })
    navigate('/whistleblowing')
  }

  if (!c) return <div className="p-8 text-[#555]">Laden…</div>

  return (
    <div className="flex h-full bg-[#0D0D0D]">
      {/* Main: description + chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] shrink-0">
          <Link to="/whistleblowing" className="inline-flex items-center gap-1 text-xs text-[#555] hover:text-[#FF6B00] transition-colors mb-3">
            <ArrowLeft size={12} /> Zurück zu Fällen
          </Link>
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-[#FF6B00] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[#555] text-xs">{timeAgo(c.createdAt)} anonym gemeldet</span>
                {c.slaBreached && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#ff6666] bg-[#ff666622] px-2 py-0.5 rounded-full">
                    <AlertTriangle size={9} /> Überschrittenes SLA
                  </span>
                )}
              </div>
              <h1 className="text-white font-bold text-lg">{c.title}</h1>
              {c.description && <p className="text-[#888] text-sm mt-1 leading-relaxed">{c.description}</p>}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
          {c.messages?.length === 0 && (
            <p className="text-center text-[#444] text-sm py-10">Noch keine Nachrichten.</p>
          )}
          {c.messages?.map((m: any) => (
            <div key={m.id} className={`flex gap-3 ${m.fromReporter ? '' : 'flex-row-reverse'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.fromReporter ? 'bg-[#2A2A2A]' : 'bg-[#FF6B0033] text-[#FF6B00]'}`}>
                {m.fromReporter ? <User size={12} className="text-[#555]" /> : 'HR'}
              </div>
              <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${m.fromReporter ? 'bg-[#1A1A1A] text-white' : 'bg-[#FF6B0022] text-white'}`}>
                <p>{m.body}</p>
                <p className="text-[#555] text-[10px] mt-1">{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Message input */}
        <form onSubmit={sendMsg} className="px-6 py-4 border-t border-[#2A2A2A] flex gap-3 shrink-0">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Nachricht an anonymen Melder…"
            className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
          />
          <button type="submit" disabled={sending || !msg.trim()}
            className="px-4 py-2.5 bg-[#FF6B00] text-white rounded-lg hover:bg-[#e55e00] disabled:opacity-40 transition-colors">
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* Right sidebar: metadata */}
      <div className="w-64 shrink-0 border-l border-[#2A2A2A] p-5 space-y-5 overflow-auto">
        <div>
          <p className="text-[#555] text-[10px] uppercase tracking-widest mb-2">Status</p>
          <select value={c.status} onChange={e => update({ status: e.target.value })} className={sel + ' w-full ' + (statusColor[c.status] ?? '')}>
            {STATUSES.map(s => <option key={s.value} value={s.value} style={{ background: '#1A1A1A', color: '#fff' }}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-[#555] text-[10px] uppercase tracking-widest mb-2">Priorität</p>
          <select value={c.priority} onChange={e => update({ priority: e.target.value })} className={sel + ' w-full'}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value} style={{ background: '#1A1A1A', color: '#fff' }}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-[#555] text-[10px] uppercase tracking-widest mb-2">Kategorie</p>
          <select value={c.category} onChange={e => update({ category: e.target.value })} className={sel + ' w-full'}>
            {CATEGORIES.map(cat => <option key={cat.value} value={cat.value} style={{ background: '#1A1A1A', color: '#fff' }}>{cat.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-[#555] text-[10px] uppercase tracking-widest mb-2">Zugewiesen an</p>
          <select
            value={c.assigneeId ?? ''}
            onChange={e => update({ assigneeId: e.target.value || null })}
            className={sel + ' w-full'}
          >
            <option value="" style={{ background: '#1A1A1A', color: '#666' }}>— Nicht zugewiesen —</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id} style={{ background: '#1A1A1A', color: '#fff' }}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[#555] text-[10px] uppercase tracking-widest mb-2">Eingegangen</p>
          <p className="text-white text-sm">{new Date(c.createdAt).toLocaleDateString('de-DE')}</p>
          <p className="text-[#555] text-xs">{new Date(c.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
        </div>

        <div className="border-t border-[#2A2A2A] pt-4 space-y-2">
          <button onClick={archive}
            className="w-full px-3 py-2 text-sm text-[#888] border border-[#2A2A2A] rounded-lg hover:border-[#F5C400] hover:text-[#F5C400] transition-colors">
            {c.archived ? 'Aus Archiv holen' : 'Archivieren'}
          </button>
          <button onClick={deleteCase}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-[#555] hover:text-[#ff6666] transition-colors">
            <Trash2 size={13} /> Fall löschen
          </button>
        </div>
      </div>
    </div>
  )
}
