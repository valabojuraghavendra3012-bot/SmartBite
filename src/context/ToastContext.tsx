import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Check, CircleAlert, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastRecord { id: number; message: string; kind: ToastKind }
interface ToastContextValue { toast: (message: string, kind?: ToastKind) => void }
const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, message, kind }])
    window.setTimeout(() => setToasts((current) => current.filter((entry) => entry.id !== id)), 3600)
  }, [])
  const value = useMemo(() => ({ toast }), [toast])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-24 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 md:bottom-6" aria-live="polite">
        {toasts.map((entry) => (
          <div key={entry.id} className="animate-in flex items-start gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3.5 shadow-[0_12px_36px_rgba(26,49,34,.18)]">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${entry.kind === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-[#eaf3e9] text-[#39795c]'}`}>
              {entry.kind === 'error' ? <CircleAlert size={15} /> : <Check size={15} />}
            </span>
            <p className="flex-1 pt-1 text-sm font-medium leading-5 text-[#36473d]">{entry.message}</p>
            <button className="mt-0.5 text-[#9aa49e] hover:text-[#526158]" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((toastEntry) => toastEntry.id !== entry.id))}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
