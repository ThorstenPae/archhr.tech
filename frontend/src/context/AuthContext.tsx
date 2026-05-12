import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API = 'https://archhrtech-production.up.railway.app'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  companyId: number
  employeeId?: number | null
}

interface Company {
  id: number
  name: string
}

interface AuthState {
  user: User | null
  company: Company | null
  token: string | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

interface RegisterData {
  companyName: string
  email: string
  password: string
  firstName: string
  lastName: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, company: null, token: null, loading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('hr_token')
    if (!token) { setState(s => ({ ...s, loading: false })); return }

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setState({ user: data, company: data.company, token, loading: false })
        else { localStorage.removeItem('hr_token'); setState(s => ({ ...s, loading: false })) }
      })
      .catch(() => setState(s => ({ ...s, loading: false })))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Login fehlgeschlagen.') }
    const data = await res.json()
    localStorage.setItem('hr_token', data.token)
    setState({ user: data.user, company: data.company, token: data.token, loading: false })
  }

  const register = async (form: RegisterData) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Registrierung fehlgeschlagen.') }
    const data = await res.json()
    localStorage.setItem('hr_token', data.token)
    setState({ user: data.user, company: data.company, token: data.token, loading: false })
  }

  const logout = () => {
    localStorage.removeItem('hr_token')
    setState({ user: null, company: null, token: null, loading: false })
  }

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
