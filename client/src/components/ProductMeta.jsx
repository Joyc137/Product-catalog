import { StarIcon } from './icons'

export function StockBadge({ stock }) {
  if (stock === 0)
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Out of stock</span>
  if (stock < 10)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Only {stock} left</span>
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">In stock</span>
}

export function Rating({ value = 0 }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600" title={`Rated ${value} out of 5`}>
      <StarIcon className="size-3.5 text-amber-400" />
      {value.toFixed(1)}
    </span>
  )
}

export function CategoryBadge({ category }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{category}</span>
  )
}
