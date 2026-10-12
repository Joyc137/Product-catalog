import { BoxIcon, WarningIcon } from './icons'

export function Spinner({ className = 'size-6' }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  )
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-slate-500" role="status">
      <Spinner className="size-8" />
      {label}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center" role="alert">
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <WarningIcon className="size-6" />
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {message && <p className="max-w-md text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <BoxIcon className="size-6" />
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {message && <p className="max-w-md text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  )
}

export function Alert({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
      <WarningIcon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
