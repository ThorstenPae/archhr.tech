import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Users, Trash2, Calendar } from 'lucide-react'
import { apiFetch } from '../lib/api'
import Modal from '../components/Modal'

const statusColor: Record<string, string> = {
  DRAFT:     'bg-[#ffffff11] text-[#666]',
  ACTIVE:    'bg-[#FF6B0022] text-[#FF6B00]',
  COMPLETED: 'bg-[#22c55e22] text-[#22c55e]',
}
const statusLabel: Record<string, string> = {
  DRAFT: 'Entwurf', ACTIVE: 'Aktiv', COMPLETED: 'Beendet',
}

const inp = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-[#888] mb-1.5">{label}</label>{children}</div>
}

const QUESTION_TYPES = [
  { key: 'RATING', label: 'Bewertung (1–5)' },
  { key: 'TEXT',   label: 'Freitext' },
]

export default function Surveys() {
  const [surveys, setSurveys]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({
    title: '', description: '', status: 'DRAFT', privacy: 'PRIVATE', startDate: '', endDate: '',
  })
  const [questions, setQuestions] = useState([{ text: '', type: 'RATING' }])
  const navigate = useNavigate()

  const load = () => apiFetch('/api/surveys').then(d => { setSurveys(d); setLoading(false) })
  useEffect(() => { load() }, [])

  const addQuestion = () => setQuestions(q => [...q, { text: '', type: 'RATING' }])
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i))
  const updateQuestion = (i: number, field: string, val: string) =>
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await apiFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({ ...form, questions: questions.filter(q => q.text.trim()) }),
      })
      setShowModal(false)
      setForm({ title: '', description: '', status: 'DRAFT', privacy: 'PRIVATE', startDate: '', endDate: '' })
      setQuestions([{ text: '', type: 'RATING' }])
      load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const remove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Umfrage löschen?')) return
    await apiFetch(`/api/surveys/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="p-8 bg-[#0D0D0D] min-h-screen text-[#555]">Laden…</div>

  return (
    <div className="p-8 min-h-screen bg-[#0D0D0D] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Umfragen</h1>
          <p className="text-[#666] text-sm mt-0.5">{surveys.length} Umfragen</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
          <Plus size={14} /> Umfrage erstellen
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-16 text-center space-y-3">
          <MessageSquare size={40} className="text-[#333] mx-auto" />
          <p className="text-white font-semibold">Noch keine Umfragen</p>
          <p className="text-[#555] text-sm">Erstelle Mitarbeiterbefragungen und werte die Ergebnisse aus.</p>
          <button onClick={() => setShowModal(true)} className="text-[#FF6B00] text-sm hover:underline">
            + Erste Umfrage erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {surveys.map(s => (
            <div key={s.id} onClick={() => navigate(`/surveys/${s.id}`)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 cursor-pointer hover:border-[#FF6B00] transition-all group relative">
              <button onClick={e => remove(e, s.id)}
                className="absolute top-4 right-4 text-[#333] hover:text-[#ff6666] transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
              </button>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-white font-semibold group-hover:text-[#FF6B00] transition-colors truncate">{s.title}</p>
                  {s.description && <p className="text-[#555] text-xs mt-0.5 truncate">{s.description}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s.status] ?? ''}`}>
                  {statusLabel[s.status] ?? s.status}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#555]">
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> {s._count?.questions ?? 0} Fragen</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {s._count?.responses ?? 0} Antworten</span>
                </div>
              </div>

              {(s.startDate || s.endDate) && (
                <p className="text-xs text-[#444] mt-3 flex items-center gap-1">
                  <Calendar size={10} />
                  {s.startDate ? new Date(s.startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                  {' – '}
                  {s.endDate ? new Date(s.endDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Umfrage erstellen" onClose={() => setShowModal(false)} size="lg">
          <form onSubmit={create} className="space-y-4">
            <Field label="Titel *">
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inp} placeholder="z.B. Mitarbeiterzufriedenheit Q2 2025" />
            </Field>
            <Field label="Beschreibung">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={inp + ' h-16 resize-none'} placeholder="Ziel und Kontext der Umfrage…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum">
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className={inp + ' [color-scheme:dark]'} />
              </Field>
              <Field label="Enddatum">
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inp + ' [color-scheme:dark]'} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                  <option value="DRAFT">Entwurf</option>
                  <option value="ACTIVE">Aktiv</option>
                  <option value="COMPLETED">Beendet</option>
                </select>
              </Field>
              <Field label="Sichtbarkeit">
                <select value={form.privacy} onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))} className={inp}>
                  <option value="PRIVATE">Privat</option>
                  <option value="PUBLIC">Sichtbar</option>
                </select>
              </Field>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[#888]">Fragen</label>
                <button type="button" onClick={addQuestion}
                  className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1">
                  <Plus size={11} /> Frage hinzufügen
                </button>
              </div>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input
                      value={q.text}
                      onChange={e => updateQuestion(i, 'text', e.target.value)}
                      placeholder={`Frage ${i + 1}…`}
                      className={inp + ' flex-1'}
                    />
                    <select value={q.type} onChange={e => updateQuestion(i, 'type', e.target.value)}
                      className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#FF6B00]">
                      {QUESTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(i)}
                        className="p-2 text-[#444] hover:text-[#ff6666] transition-colors mt-0.5">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-[#ff6666] text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
                {saving ? 'Erstellen…' : 'Erstellen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
