import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Zap, Trash2, Edit2 } from 'lucide-react'
import { apiFetch } from '../lib/api'

export default function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const navigate = useNavigate()

  const load = () => apiFetch('/api/workflows').then(setWorkflows).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    const wf = await apiFetch('/api/workflows', { method: 'POST', body: JSON.stringify({ name: 'Neuer Workflow' }) })
    navigate(`/workflows/${wf.id}`)
  }

  const remove = async (id: number) => {
    if (!confirm('Workflow löschen?')) return
    await apiFetch(`/api/workflows/${id}`, { method: 'DELETE' })
    setWorkflows(ws => ws.filter(w => w.id !== id))
  }

  const toggle = async (wf: any) => {
    await apiFetch(`/api/workflows/${wf.id}`, { method: 'PUT', body: JSON.stringify({ active: !wf.active }) })
    load()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-[#666] text-sm mt-0.5">Eigene Automatisierungen mit Trigger & Aktionen</p>
        </div>
        <button onClick={create}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#e55e00] transition-colors">
          <Plus size={14} /> Workflow erstellen
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-16 text-center">
          <Zap size={40} className="mx-auto mb-3 text-[#2A2A2A]" />
          <p className="text-[#555] text-sm mb-1">Noch keine Workflows.</p>
          <p className="text-[#333] text-xs mb-5">Erstelle deinen ersten Workflow mit eigenem Trigger & Aktionen.</p>
          <button onClick={create}
            className="px-4 py-2 bg-[#FF6B00] text-white text-sm rounded-lg hover:bg-[#e55e00] transition-colors">
            Ersten Workflow erstellen
          </button>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {workflows.map((wf, i) => (
            <div key={wf.id} className={`flex items-center gap-4 px-5 py-4 group ${i > 0 ? 'border-t border-[#2A2A2A]' : ''}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? 'bg-[#22c55e]' : 'bg-[#333]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{wf.name}</p>
                <p className="text-[#444] text-xs">
                  {wf.active ? 'Aktiv' : 'Inaktiv'} · {new Date(wf.updatedAt).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(wf)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${wf.active ? 'bg-[#22c55e22] text-[#22c55e] hover:bg-[#22c55e33]' : 'bg-[#2A2A2A] text-[#555] hover:text-white'}`}>
                  {wf.active ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                <button onClick={() => navigate(`/workflows/${wf.id}`)}
                  title="Bearbeiten"
                  className="p-2 text-[#444] hover:text-white transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => remove(wf.id)}
                  title="Löschen"
                  className="p-2 text-[#333] hover:text-[#ff6666] transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
