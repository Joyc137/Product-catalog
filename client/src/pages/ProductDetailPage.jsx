import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { productsApi } from '../api/products'
import ConfirmDialog from '../components/ConfirmDialog'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '../components/icons'
import ProductImage from '../components/ProductImage'
import { CategoryBadge, Rating, StockBadge } from '../components/ProductMeta'
import { EmptyState, ErrorState, PageLoader } from '../components/StateViews'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../hooks/useApi'
import { formatDate, formatNumber, formatPrice } from '../utils/format'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const { data: product, error, loading, reload } = useApi((signal) => productsApi.get(id, signal), [id])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const closeConfirm = useCallback(() => setConfirmOpen(false), [])

  // Return to the exact list view (search, filters, page) the user came from.
  const backTo = `/${state?.listSearch ?? ''}`

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await productsApi.remove(product._id)
      toast.success(`"${product.name}" was deleted.`)
      navigate(backTo, { replace: true })
    } catch (err) {
      toast.error(err.message)
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  const backLink = (
    <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
      <ArrowLeftIcon className="size-4" /> Back to products
    </Link>
  )

  if (loading && !product) return <PageLoader label="Loading product…" />

  if (error) {
    return (
      <div className="space-y-6">
        {backLink}
        {error.status === 404 || error.status === 400 ? (
          <EmptyState
            title="Product not found"
            message="It may have been removed, or the link is incorrect."
            action={<Link to="/" className="btn-primary mt-2">Browse products</Link>}
          />
        ) : (
          <ErrorState title="Couldn't load this product" message={error.message} onRetry={reload} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {backLink}

      <article className="card grid overflow-hidden md:grid-cols-2">
        <ProductImage product={product} className="aspect-square w-full md:aspect-auto md:h-full md:min-h-96" />

        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={product.category} />
            <Rating value={product.rating} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
            <p className="mt-1 text-xs text-slate-500">SKU {product.sku}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold text-slate-900">{formatPrice(product.price)}</span>
            <StockBadge stock={product.stock} />
          </div>

          {product.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">{product.description}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No description provided.</p>
          )}

          <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm">
            <div>
              <dt className="text-slate-500">Units in stock</dt>
              <dd className="font-medium text-slate-900">{formatNumber(product.stock)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium text-slate-900">{product.category}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Added</dt>
              <dd className="font-medium text-slate-900">{formatDate(product.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last updated</dt>
              <dd className="font-medium text-slate-900">{formatDate(product.updatedAt)}</dd>
            </div>
          </dl>

          {isAdmin && (
            <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row">
              <Link to={`/admin/products/${product._id}/edit`} state={state} className="btn-secondary">
                <PencilIcon className="size-4" /> Edit product
              </Link>
              <button onClick={() => setConfirmOpen(true)} className="btn-danger">
                <TrashIcon className="size-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete product?"
        message={`"${product.name}" will be permanently removed from the catalog.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={closeConfirm}
      />
    </div>
  )
}
