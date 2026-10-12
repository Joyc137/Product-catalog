import { Link } from 'react-router-dom'
import { productsApi } from '../api/products'
import { ErrorState, PageLoader } from '../components/StateViews'
import { useApi } from '../hooks/useApi'
import { formatNumber, formatPrice } from '../utils/format'

export default function AdminDashboardPage() {
  const { data: stats, error, loading, reload } = useApi((signal) => productsApi.categoryStats(signal), [])

  if (loading) return <PageLoader label="Crunching numbers…" />
  if (error) return <ErrorState title="Couldn't load analytics" message={error.message} onRetry={reload} />

  const totals = stats.reduce(
    (acc, s) => ({
      products: acc.products + s.count,
      stock: acc.stock + s.totalStock,
      outOfStock: acc.outOfStock + s.outOfStock,
    }),
    { products: 0, stock: 0, outOfStock: 0 },
  )
  const max = Math.max(1, ...stats.map((s) => s.count))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Catalog overview by category</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total products" value={formatNumber(totals.products)} />
        <Stat label="Units in stock" value={formatNumber(totals.stock)} />
        <Stat label="Out of stock" value={formatNumber(totals.outOfStock)} />
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">Products by category</h2>
        {stats.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">No products yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.map((s) => (
              <li key={s.category} className="grid gap-2 px-6 py-4 sm:grid-cols-[12rem_1fr_auto] sm:items-center sm:gap-6">
                <Link
                  to={`/?category=${encodeURIComponent(s.category)}`}
                  className="text-sm font-medium text-slate-900 hover:text-brand-700"
                >
                  {s.category}
                </Link>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-slate-500 sm:justify-end">
                  <span>
                    <strong className="font-semibold text-slate-900">{formatNumber(s.count)}</strong> products
                  </span>
                  <span>avg {formatPrice(s.avgPrice)}</span>
                  <span className={s.outOfStock ? 'text-red-600' : ''}>{formatNumber(s.outOfStock)} out</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}
