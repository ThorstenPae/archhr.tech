import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'

interface Props {
  value: string | null | undefined
  onSave: (val: string) => Promise<void>
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  prefix?: string
  suffix?: string
  emptyText?: string
}

export default function InlineEdit({ value, onSave, placeholder, type = 'text', options, prefix, suffix, emptyText = 'Hinzufügen…' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const start = () => { setDraft(value ?? ''); setEditing(true) }

  const save = async () => {
    if (draft === (value ?? '')) { setEditing(false); return }
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  const cancel = () => { setDraft(value ?? ''); setEditing(false) }

  const displayValue = () => {
    if (type === 'select' && options) return options.find(o => o.value === value)?.label ?? value
    if (type === 'date' && value) return new Date(value).toLocaleDateString('de-DE')
    return value
  }

  if (!editing) {
    return (
      <div onClick={start} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && start()}
        className="group flex items-center gap-1.5 text-left w-full cursor-pointer hover:bg-[#2A2A2A] rounded px-1 -mx-1 py-0.5 transition-colors">
        <span className={value ? 'text-white font-medium' : 'text-[#777] italic text-sm'}>
          {value ? `${prefix ?? ''}${displayValue()}${suffix ?? ''}` : emptyText}
        </span>
        <Pencil size={12} className="text-[#444] group-hover:text-[#FF6B00] shrink-0 transition-colors" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {type === 'select' && options ? (
        <select
          ref={inputRef as any}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          className="border border-[#FF6B00] rounded px-2 py-0.5 text-sm text-white bg-[#0D0D0D] focus:outline-none focus:ring-1 focus:ring-[#FF6B0066]"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          ref={inputRef as any}
          type={type}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          onBlur={save}
          className="border border-[#FF6B00] rounded px-2 py-0.5 text-sm text-white bg-[#0D0D0D] focus:outline-none focus:ring-1 focus:ring-[#FF6B0066] min-w-0 w-full max-w-xs [color-scheme:dark]"
        />
      )}
      <button onClick={save} disabled={saving} className="bg-transparent text-[#22c55e] hover:text-[#16a34a] shrink-0">
        <Check size={14} />
      </button>
      <button onClick={cancel} className="bg-transparent text-[#555] hover:text-[#ff6666] shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
