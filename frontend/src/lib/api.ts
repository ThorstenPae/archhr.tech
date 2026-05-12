const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('hr_token')
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Netzwerkfehler' }))
    throw new Error(err.error ?? `Fehler ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}
