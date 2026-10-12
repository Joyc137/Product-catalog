import { BoxIcon } from './icons'

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 sm:py-12">
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <BoxIcon className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="card mt-8 w-full p-6 sm:p-8">{children}</div>
      <p className="mt-6 text-sm text-slate-500">{footer}</p>
    </div>
  )
}
