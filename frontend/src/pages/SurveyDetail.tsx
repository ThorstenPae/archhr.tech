import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Users, Calendar, BarChart2, Eye, EyeOff } from 'lucide-react'
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

const RATING_COLORS = ['#ef4444', '#f97316', '#F5C400', '#84cc16', '#22c55e']
const RATING_LABELS = ['Sehr schlecht', 'Schlecht', 'Neutral', 'Gut', 'Sehr gut']

function DistributionBar({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-xs text-[#555]">Keine Antworten</p>

  const ratings = [1, 2, 3, 4, 5]
  return (
    <div className="space-y-1.5">
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
        {ratings.map((r, i) => {
          const count = distribution[String(r)] ?? 0
          const pct = total > 0 ? (count / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div key={r} className="h-full rounded-sm transition-all"
              style={{ width: `${pct}%`, backgroundColor: RATING_COLORS[i] }}
              title={`${RATING_LABELS[i]}: ${count} (${Math.round(pct)}%)`} />
          )
        })}
      </div>
      <div className="flex gap-3 flex-wrap">
        {ratings.map((r, i) => {
          const count = distribution[String(r)] ?? 0
          if (count === 0) return null
          const pct = Math.round((count / total) * 100)
          return (
            <span key={r} className="flex items-center gap-1 text-[10px] text-[#666]">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: RATING_COLORS[i] }} />
              {RATING_LABELS[i]}: {count} ({pct}%)
            </span>
          )
        })}
      </div>
    </div>
  )
}

function TextAnswers({ distribution }: { distribution: Record<string, number> }) {
  const entries = Object.entries(distribution)
  if (entries.length === 0) return <p className="text-xs text-[#555]">Keine Antworten</p>
  return (
    <div className="space-y-1">
      {entries.slice(0, 5).map(([text]) => (
        <p key={text} className="text-sm text-[#aaa] bg-[#111] rounded-lg px-3 py-2">"{text}"</p>
      ))}
      {entries.length > 5 && <p className="text-xs text-[#555]">+ {entries.length - 5} weitere Antworten</p>}
    </div>
  )
}

// ── Respond modal ──────────────────────────────────────────────────────────
function RespondModal({ survey, onClose, onSaved }: { survey: any; onClose: () => void; onSaved: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setAnswer = (questionId: number, value: string) =>
    setAnswers(a => ({ ...a, [questionId]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload = survey.questionStats.map((q: any) => ({ questionId: q.id, value: answers[q.id] ?? '' }))
      await apiFetch(`/api/surveys/${survey.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ answers: payload }),
      })
      onSaved()
      onClose()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal title={survey.title} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-5">
        {survey.questionStats.map((q: any, i: number) => (
          <div key={q.id} className="space-y-2">
            <p className="text-white text-sm font-medium">{i + 1}. {q.text}</p>
            {q.type === 'RATING' ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAnswer(q.id, String(r))}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border
                      ${answers[q.id] === String(r)
                        ? 'border-[#FF6B00] bg-[#FF6B0022] text-[#FF6B00]'
                        : 'border-[#2A2A2A] text-[#555] hover:border-[#FF6B00] hover:text-[#FF6B00]'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[q.id] ?? ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00] h-20 resize-none"
                placeholder="Deine Antwort…"
              />
            )}
          </div>
        ))}
        {error && <p className="text-[#ff6666] text-sm">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors">Abbrechen</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] disabled:opacity-50 transition-colors">
            {saving ? 'Absenden…' : 'Absenden'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function SurveyDetail() {
  const { id } = useParams()
  const [survey, setSurvey]       = useState<any>(null)
  const [showRespond, setShowRespond] = useState(false)

  const load = () => apiFetch(`/api/surveys/${id}`).then(setSurvey)
  useEffect(() => { load() }, [id])

  if (!survey) return <div className="p-8 text-[#555] bg-[#0D0D0D] min-h-screen">Laden…</div>

  const privacyIcon = survey.privacy === 'PUBLIC' ? <Eye size={13} /> : <EyeOff size={13} />

  return (
    <div className="p-8 max-w-4xl bg-[#0D0D0D] min-h-screen space-y-6">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-sm text-[#555] hover:text-[#FF6B00] transition-colors">
        <ArrowLeft size={14} /> Alle Umfragen
      </Link>

      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center shrink-0">
              <MessageSquare size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{survey.title}</h1>
              {survey.description && <p className="text-[#555] text-sm mt-0.5">{survey.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowRespond(true)}
              className="px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
              Antworten
            </button>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[survey.status] ?? ''}`}>
              {statusLabel[survey.status] ?? survey.status}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#2A2A2A] pt-4">
          {[
            { icon: <span className="flex items-center gap-1 text-[#888] text-xs">{privacyIcon} {survey.privacy === 'PUBLIC' ? 'Sichtbar' : 'Privat'}</span>, label: 'Privatsphäre' },
            { value: survey.startDate ? new Date(survey.startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', label: 'Startdatum' },
            { value: survey.endDate   ? new Date(survey.endDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })   : '—', label: 'Beendet am' },
            { value: survey.totalResponses, label: 'Antworten' },
          ].map((kpi, i) => (
            <div key={i}>
              <p className="text-xs text-[#555] mb-0.5">{kpi.label}</p>
              {kpi.icon ?? <p className="text-white font-semibold">{kpi.value}</p>}
            </div>
          ))}
        </div>

        {/* Response rate bar */}
        {survey.employeeCount > 0 && (
          <div className="mt-4 border-t border-[#2A2A2A] pt-4">
            <div className="flex items-center justify-between text-xs text-[#555] mb-1.5">
              <span className="flex items-center gap-1"><Users size={11} /> Antwortrate</span>
              <span className="text-white font-medium">{survey.responseRate}%</span>
            </div>
            <div className="h-2 bg-[#111] rounded-full overflow-hidden">
              <div className="h-full bg-[#FF6B00] rounded-full transition-all"
                style={{ width: `${survey.responseRate}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Questions & Results */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <BarChart2 size={16} className="text-[#FF6B00]" />
          Ergebnisse ({survey.questionStats.length} Fragen)
        </h2>

        {survey.questionStats.length === 0 ? (
          <p className="text-[#555] text-sm">Keine Fragen vorhanden.</p>
        ) : (
          <div className="space-y-0 divide-y divide-[#2A2A2A]">
            {survey.questionStats.map((q: any, i: number) => (
              <div key={q.id} className="py-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-white text-sm font-medium flex-1">
                    <span className="text-[#FF6B00] mr-2">{i + 1}.</span>
                    {q.text}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    {q.agreement !== null && (
                      <span className="text-[#22c55e] text-sm font-bold">{q.agreement}%</span>
                    )}
                    <span className="text-xs text-[#555]">{q.totalAnswers} Antworten</span>
                  </div>
                </div>
                {q.type === 'RATING'
                  ? <DistributionBar distribution={q.distribution} total={q.totalAnswers} />
                  : <TextAnswers distribution={q.distribution} />
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {showRespond && (
        <RespondModal survey={survey} onClose={() => setShowRespond(false)} onSaved={load} />
      )}
    </div>
  )
}
