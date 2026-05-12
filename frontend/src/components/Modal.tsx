import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const sizeClass = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ title, onClose, children, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full ${sizeClass[size]} shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2A2A2A] shrink-0">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
