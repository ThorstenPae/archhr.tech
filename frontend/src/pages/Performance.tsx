import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Target, Users, Calendar, Trash2 } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'

const statusColor: Record<string, string> = {
  DRAFT:       'bg-[#ffffff11] text-[#666]',
  ACTIVE:      'bg-[#FF6B0022] text-[#FF6B00]',
  COMPLETED:   'bg-[#22c55e22] text-[#22c55e]',
  CANCELLED:   'bg-[#ff000022] text-[#ff6666]',
}
const statusLabel: Record<string, string> = {
  DRAFT: 'Entwurf', ACTIVE: 'Aktiv', COMPLETED: 'Abgeschlossen', CANCELLED: 'Abgebrochen',
}

const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-[#555] mb-1.5">{label}</label>{children}</div>
}

export default function Performance() {
  const [cycles, setCycles]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm]           = useState({ name: '', description: '', status: 'DRAFT', startDate: '', endDate: '' })
  const navigate = useNavigate()

  const load = () => apiFetch('/api/performance/cycles').then(d => { setCycles(d); setLoading(false) })
  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/performance/cycles', { method: 'POST', body: JSON.stringify(form) })
      setShowModal(false); setForm({ name: '', description: '', status: 'DRAFT', startDate: '', endDate: '' }); load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const remove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Zyklus löschen?')) return
    await apiFetch(`/api/performance/cycles/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="p-8 bg-[#0D0D0D] min-h-screen text-[#555]">Laden…</div>

  return (
    <div className="p-8 min-h-screen bg-[#0D0D0D] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance</h1>
          <p className="text-[#666] text-sm mt-0.5">{cycles.length} Beurteilungszyklen</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
          <Plus size={14} /> Zyklus erstellen
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-16 text-center space-y-3">
          <Target size={40} className="text-[#333] mx-auto" />
          <p className="text-white font-semibold">Noch keine Performance-Zyklen</p>
          <p className="text-[#555] text-sm">Erstelle deinen ersten Zyklus für Selbstbeurteilungen und Führungskräfte-Reviews.</p>
          <button onClick={() => setShowModal(true)} className="text-[#FF6B00] text-sm hover:underline">
            + Ersten Zyklus erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cycles.map(c => (
            <div key={c.id} onClick={() => navigate(`/performance/${c.id}`)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 cursor-pointer hover:border-[#FF6B00] transition-all group relative">
              <button onClick={e => remove(e, c.id)}
                className="absolute top-4 right-4 text-[#333] hover:text-[#ff6666] transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
              </button>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center shrink-0">
                  <Target size={18} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-white font-semibold group-hover:text-[#FF6B00] transition-colors truncate">{c.name}</p>
                  {c.description && <p className="text-[#555] text-xs mt-0.5 truncate">{c.description}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status] ?? ''}`}>
                  {statusLabel[c.status] ?? c.status}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#555]">
                  <span className="flex items-center gap-1"><Calendar size={11} /> {c._count?.activities ?? 0} Aktivitäten</span>
                </div>
              </div>

              {(c.startDate || c.endDate) && (
                <p className="text-xs text-[#444] mt-3">
                  {c.startDate ? new Date(c.startDate).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '?'}
                  {' – '}
                  {c.endDate ? new Date(c.endDate).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '?'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Performance-Zyklus erstellen" onClose={() => setShowModal(false)}>
          <form onSubmit={create} className="space-y-4">
            <Field label="Name *">
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inp} placeholder="z.B. Performance-Zeitraum 2025" />
            </Field>
            <Field label="Beschreibung">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={inp + ' h-20 resize-none'} placeholder="Ziele und Fokus dieses Zyklus…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum">
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inp} />
              </Field>
              <Field label="Enddatum">
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inp} />
              </Field>
            </div>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                <option value="DRAFT">Entwurf</option>
                <option value="ACTIVE">Aktiv</option>
                <option value="COMPLETED">Abgeschlossen</option>
              </select>
            </Field>
            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">{saving ? 'Speichern…' : 'Erstellen'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
