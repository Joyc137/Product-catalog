import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api/products'
import ConfirmDialog from '../components/ConfirmDialog'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard'
import ProductFilters from '../components/ProductFilters'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, Spinner } from '../components/StateViews'
import { PlusIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'
import { formatNumber } from '../utils/format'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 400

/** Reads list state from the URL — the URL is the single source of truth. */
function readParams(searchParams) {
  const page = Number.parseInt(searchParams.get('page'), 10)
  const q = searchParams.get('q') ?? ''
  return {
    q,
    category: searchParams.get('category') ?? '',
    sort: searchParams.get('sort') ?? (q ? 'relevance' : 'newest'),
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    inStock: searchParams.get('inStock') === 'true',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** Builds the API query: only send what is set. */
function toApiQuery(p) {
  const query = { page: p.page, limit: PAGE_SIZE, sort: p.sort }
  if (p.q) query.q = p.q
  if (p.category) query.category = p.category
  if (p.minPrice !== '') query.minPrice = p.minPrice
  if (p.maxPrice !== '') query.maxPrice = p.maxPrice
  if (p.inStock) query.inStock = true
  return query
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => readParams(searchParams), [searchParams])
  const { isAdmin } = useAuth()
  const toast = useToast()

  /**
   * Applies a patch to the URL. null/''/false removes a key. Any change other
   * than the page itself resets to page 1.
   */
  const updateParams = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([key, value]) => {
          if (value === null || value === '' || value === false || value === undefined) next.delete(key)
          else next.set(key, String(value))
        })
        if (!('page' in patch)) next.delete('page')
        if (next.get('page') === '1') next.delete('page')
        // "Best match" is meaningless without a search term.
        if (!next.get('q') && next.get('sort') === 'relevance') next.delete('sort')
        return next
      })
    },
    [setSearchParams],
  )

  // --- debounced search box -------------------------------------------------
  const [search, setSearch] = useState(params.q)
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    const term = debouncedSearch.trim()
    if (term !== params.q) updateParams({ q: term || null })
    // Only react to the debounced value, not to URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // URL changed from outside the input (back button, "clear"): reflect it.
  useEffect(() => {
    setSearch((current) => (current.trim() === params.q ? current : params.q))
  }, [params.q])

  // --- data -----------------------------------------------------------------
  const apiQuery = useMemo(() => toApiQuery(params), [params])
  const { data, error, loading, reload } = useApi(
    (signal) => productsApi.list(apiQuery, signal),
    [JSON.stringify(apiQuery)],
  )
  const { data: categories } = useApi((signal) => productsApi.categories(signal), [])

  // --- delete (admin) -------------------------------------------------------
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await productsApi.remove(toDelete._id)
      toast.success(`"${toDelete.name}" was deleted.`)
      setToDelete(null)
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }
  const cancelDelete = useCallback(() => setToDelete(null), [])

  const goToPage = (page) => {
    updateParams({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeFilterCount = [params.category, params.minPrice, params.maxPrice, params.inStock].filter(Boolean).length
  const hasAnyFilter = activeFilterCount > 0 || params.q
  const resetFilters = () => {
    setSearch('')
    setSearchParams({})
  }

  const items = data?.items ?? []
  const pagination = data?.pagination
  const firstLoad = loading && !data
  const listSearch = `?${searchParams.toString()}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {pagination ? `${formatNumber(pagination.total)} products` : 'Browse the catalog'}
            {loading && data && <Spinner className="size-3.5" />}
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/products/new" className="btn-primary self-start sm:self-auto">
            <PlusIcon className="size-4" /> Add product
          </Link>
        )}
      </div>

      <ProductFilters
        search={search}
        onSearchChange={setSearch}
        filters={params}
        categories={categories ?? []}
        onChange={updateParams}
        activeCount={activeFilterCount}
        onReset={resetFilters}
      />

      {error ? (
        <ErrorState
          title={error.status === 400 ? 'Invalid filters' : "Couldn't load products"}
          message={error.message}
          onRetry={error.status === 400 ? resetFilters : reload}
        />
      ) : firstLoad ? (
        <ProductGrid>
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </ProductGrid>
      ) : items.length === 0 ? (
        params.page > 1 && pagination?.total > 0 ? (
          <EmptyState
            title="This page is empty"
            message={`There are only ${pagination.totalPages} pages of results.`}
            action={<button className="btn-secondary mt-2" onClick={() => goToPage(1)}>Go to first page</button>}
          />
        ) : (
          <EmptyState
            title="No products found"
            message={hasAnyFilter ? 'Try a different search term or remove some filters.' : 'The catalog is empty.'}
            action={hasAnyFilter && <button className="btn-secondary mt-2" onClick={resetFilters}>Clear all filters</button>}
          />
        )
      ) : (
        <>
          <ProductGrid dimmed={loading}>
            {items.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                listSearch={listSearch}
                isAdmin={isAdmin}
                onDelete={setToDelete}
              />
            ))}
          </ProductGrid>

          {pagination && (
            <div className="flex flex-col items-center gap-3">
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={goToPage} disabled={loading} />
              <p className="text-xs text-slate-500">
                Showing {formatNumber((pagination.page - 1) * pagination.limit + 1)}–
                {formatNumber((pagination.page - 1) * pagination.limit + items.length)} of {formatNumber(pagination.total)}
              </p>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete product?"
        message={toDelete ? `"${toDelete.name}" will be permanently removed from the catalog.` : ''}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

function ProductGrid({ children, dimmed }) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 transition-opacity min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${dimmed ? 'opacity-60' : ''}`}
      aria-busy={dimmed}
    >
      {children}
    </div>
  )
}
