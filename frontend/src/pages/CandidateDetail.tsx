import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Briefcase, Calendar } from 'lucide-react'
import { apiFetch } from '../lib/api'

const steps = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED']
const stepLabel: Record<string, string> = {
  APPLIED: 'Beworben', SCREENING: 'Vorauswahl', INTERVIEW: 'Interview', OFFER: 'Angebot', HIRED: 'Eingestellt',
}

export default function CandidateDetail() {
  const { id } = useParams()
  const [candidate, setCandidate] = useState<any>(null)

  useEffect(() => {
    apiFetch(`/api/recruiting/candidates/${id}`).then(setCandidate)
  }, [id])

  if (!candidate) return <div className="p-8 text-[#555] bg-[#0D0D0D] min-h-screen">Laden…</div>

  const currentStep = steps.indexOf(candidate.status)
  const isRejected = candidate.status === 'REJECTED'

  return (
    <div className="p-8 max-w-3xl bg-[#0D0D0D] min-h-screen space-y-5">
      <Link to="/recruiting" className="inline-flex items-center gap-1 text-sm text-[#555] hover:text-[#FF6B00] transition-colors">
        <ArrowLeft size={14} /> Zurück zum Recruiting
      </Link>

      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-[#F5C40022] text-[#F5C400] flex items-center justify-center text-2xl font-bold">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{candidate.firstName} {candidate.lastName}</h1>
          <p className="text-[#555]">{candidate.jobPosting?.title}</p>
        </div>
        {isRejected && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#ff000022] text-[#ff6666]">Abgelehnt</span>
        )}
      </div>

      {/* Recruiting Pipeline */}
      {!isRejected && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-[#555] text-xs uppercase tracking-widest mb-5">Bewerbungsstatus</h2>
          <div className="flex items-center">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < currentStep ? 'bg-[#FF6B00] border-[#FF6B00] text-white' :
                    i === currentStep ? 'bg-transparent border-[#FF6B00] text-[#FF6B00]' :
                    'bg-[#2A2A2A] border-[#333] text-[#555]'
                  }`}>{i + 1}</div>
                  <p className={`text-xs mt-1 text-center ${i <= currentStep ? 'text-[#FF6B00] font-medium' : 'text-[#555]'}`}>
                    {stepLabel[step]}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-4 ${i < currentStep ? 'bg-[#FF6B00]' : 'bg-[#2A2A2A]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 grid grid-cols-2 gap-6">
        <div className="flex items-center gap-3 text-sm">
          <Mail size={16} className="text-[#555]" />
          <div>
            <p className="text-[#555] text-xs">E-Mail</p>
            <p className="text-white font-medium">{candidate.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Briefcase size={16} className="text-[#555]" />
          <div>
            <p className="text-[#555] text-xs">Bewerbung für</p>
            <p className="text-white font-medium">{candidate.jobPosting?.title ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar size={16} className="text-[#555]" />
          <div>
            <p className="text-[#555] text-xs">Beworben am</p>
            <p className="text-white font-medium">{new Date(candidate.appliedAt).toLocaleDateString('de-DE')}</p>
          </div>
        </div>
        {candidate.notes && (
          <div className="col-span-2">
            <p className="text-[#555] text-xs mb-1">Notizen</p>
            <p className="text-[#888] text-sm">{candidate.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
