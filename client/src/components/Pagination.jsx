import { ChevronLeftIcon, ChevronRightIcon } from './icons'

/** Returns e.g. [1, '…', 4, 5, 6, '…', 2500] */
function pageWindow(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(`gap-${p}`)
    result.push(p)
  })
  return result
}

export default function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null

  const button =
    'inline-flex min-w-9 items-center justify-center rounded-lg px-2.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        className={`${button} text-slate-600 hover:bg-slate-100`}
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="size-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {pageWindow(page, totalPages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={disabled}
            aria-current={p === page ? 'page' : undefined}
            className={`${button} ${p === page ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {p.toLocaleString()}
          </button>
        ),
      )}

      <button
        className={`${button} text-slate-600 hover:bg-slate-100`}
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  )
}
