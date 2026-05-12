import { useEffect, useRef, useState } from 'react'
import { Bell, ExternalLink, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const load = () => apiFetch('/api/notifications').then(setNotifications).catch(() => {})

  useEffect(() => {
    load()
    const iv = setInterval(load, 15000)
    const handler = () => load()
    window.addEventListener('notification:refresh', handler)
    return () => { clearInterval(iv); window.removeEventListener('notification:refresh', handler) }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !n.read).length

  const markRead = async (n: any) => {
    if (!n.read) {
      await apiFetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' })
      setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    if (n.link) { navigate(n.link); setOpen(false) }
  }

  const markAll = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `Vor ${days}d`
    if (h > 0)   return `Vor ${h}h`
    if (m > 0)   return `Vor ${m}m`
    return 'Jetzt'
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} title="Mitteilungen"
        className="w-10 h-10 rounded-lg flex items-center justify-center text-[#555] hover:text-[#FF6B00] hover:bg-[#1A1A1A] transition-all relative">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF6B00] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-12 bottom-0 w-80 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
            <span className="text-white text-sm font-semibold">Mitteilungen</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[10px] text-[#FF6B00] hover:underline flex items-center gap-1">
                <Check size={10} /> Alle gelesen
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-auto divide-y divide-[#2A2A2A]">
            {notifications.length === 0 && (
              <p className="text-[#444] text-sm text-center py-8">Keine Mitteilungen.</p>
            )}
            {notifications.map(n => (
              <button key={n.id} onClick={() => markRead(n)}
                className={`w-full text-left px-4 py-3 hover:bg-[#2A2A2A] transition-colors flex items-start gap-3 ${!n.read ? 'bg-[#FF6B0008]' : ''}`}>
                {!n.read && <span className="w-2 h-2 rounded-full bg-[#FF6B00] shrink-0 mt-1.5" />}
                {n.read && <span className="w-2 h-2 shrink-0 mt-1.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-[#888]' : 'text-white font-medium'}`}>{n.title}</p>
                  {n.body && <p className="text-[#555] text-xs mt-0.5 truncate">{n.body}</p>}
                  <p className="text-[#444] text-[10px] mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {n.link && <ExternalLink size={12} className="text-[#444] shrink-0 mt-1" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
