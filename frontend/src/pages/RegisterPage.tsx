import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2, Check } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ companyName: '', firstName: '', lastName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const perks = ['Unbegrenzte Mitarbeiter', 'Recruiting-Pipeline', 'Abwesenheitsverwaltung', '14 Tage kostenlos']

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Promo */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#FF6B00] flex items-center justify-center glow-orange">
              <span className="text-white font-black text-lg">Ar</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Archr<span className="text-[#FF6B00]">.tech</span></span>
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            HR-Management<br />
            <span style={{ color: '#FF6B00' }}>neu gedacht.</span>
          </h2>
          <p className="text-[#666] mb-8">Verwalte dein Team, Recruiting und Abwesenheiten — alles in einem Tool.</p>
          <ul className="space-y-3">
            {perks.map(p => (
              <li key={p} className="flex items-center gap-3 text-[#888]">
                <div className="w-5 h-5 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Konto erstellen</h1>
          <p className="text-[#666] text-sm mb-6">14 Tage kostenlos, keine Kreditkarte nötig</p>

          {error && (
            <div className="bg-[#ff000022] border border-[#ff000044] text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">Unternehmensname</label>
              <input required value={form.companyName} onChange={f('companyName')}
                className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                placeholder="Meine GmbH" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">Vorname</label>
                <input required value={form.firstName} onChange={f('firstName')}
                  className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                  placeholder="Max" />
              </div>
              <div>
                <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">Nachname</label>
                <input required value={form.lastName} onChange={f('lastName')}
                  className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                  placeholder="Mustermann" />
              </div>
            </div>
            <div>
              <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">E-Mail</label>
              <input type="email" required value={form.email} onChange={f('email')}
                className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                placeholder="max@firma.de" />
            </div>
            <div>
              <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">Passwort</label>
              <input type="password" required minLength={8} value={form.password} onChange={f('password')}
                className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                placeholder="Mind. 8 Zeichen" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#FF6B00] hover:bg-[#e05f00] text-white font-semibold py-3 rounded-lg transition-all glow-orange-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Kostenlos starten
            </button>
          </form>

          <p className="text-center text-[#555] text-sm mt-6">
            Bereits registriert?{' '}
            <Link to="/login" className="text-[#FF6B00] hover:underline">Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
