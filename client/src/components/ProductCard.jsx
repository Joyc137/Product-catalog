import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/format'
import { PencilIcon, TrashIcon } from './icons'
import ProductImage from './ProductImage'
import { CategoryBadge, Rating, StockBadge } from './ProductMeta'

export default function ProductCard({ product, listSearch, isAdmin, onDelete }) {
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/products/${product._id}`} state={{ listSearch }} className="flex flex-1 flex-col">
        <ProductImage product={product} className="aspect-[16/9] w-full min-[420px]:aspect-[4/3]" />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category={product.category} />
            <Rating value={product.rating} />
          </div>
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-brand-700">{product.name}</h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="text-base font-semibold text-slate-900">{formatPrice(product.price)}</span>
            <StockBadge stock={product.stock} />
          </div>
        </div>
      </Link>
      {isAdmin && (
        <div className="flex border-t border-slate-100">
          <Link
            to={`/admin/products/${product._id}/edit`}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <PencilIcon className="size-3.5" /> Edit
          </Link>
          <button
            onClick={() => onDelete(product)}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-slate-100 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <TrashIcon className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="aspect-[16/9] w-full animate-pulse bg-slate-200 min-[420px]:aspect-[4/3]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-1/4 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}
