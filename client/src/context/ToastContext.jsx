import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckIcon, InfoIcon, WarningIcon, XIcon } from '../components/icons'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckIcon, className: 'text-emerald-600' },
  error: { icon: WarningIcon, className: 'text-red-600' },
  info: { icon: InfoIcon, className: 'text-brand-600' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (type, message) => {
      const id = ++nextId.current
      setToasts((list) => [...list.slice(-2), { id, type, message }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (m) => show('success', m),
      error: (m) => show('error', m),
      info: (m) => show('info', m),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map(({ id, type, message }) => {
          const { icon: Icon, className } = STYLES[type]
          return (
            <div
              key={id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${className}`} />
              <p className="flex-1 text-sm text-slate-700">{message}</p>
              <button onClick={() => dismiss(id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
                <XIcon className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
