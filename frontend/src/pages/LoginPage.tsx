import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FF6B00] flex items-center justify-center glow-orange">
            <span className="text-white font-black text-lg">Ar</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Archr<span className="text-[#FF6B00]">.tech</span></span>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Willkommen zurück</h1>
          <p className="text-[#666] text-sm mb-6">Melde dich bei deinem Konto an</p>

          {error && (
            <div className="bg-[#ff000022] border border-[#ff000044] text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">E-Mail</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                placeholder="name@firma.de"
              />
            </div>
            <div>
              <label className="block text-[#888] text-xs mb-1.5 uppercase tracking-wide">Passwort</label>
              <input
                type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-[#2A2A2A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B00] transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#FF6B00] hover:bg-[#e05f00] text-white font-semibold py-3 rounded-lg transition-all glow-orange-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Anmelden
            </button>
          </form>

          <p className="text-center text-[#555] text-sm mt-6">
            Noch kein Konto?{' '}
            <Link to="/register" className="text-[#FF6B00] hover:underline">Kostenlos registrieren</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
