import { useState } from 'react'
import { FilterIcon, SearchIcon, XIcon } from './icons'

const SORT_LABELS = {
  relevance: 'Best match',
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  name_asc: 'Name: A–Z',
  name_desc: 'Name: Z–A',
}

/**
 * Presentational filter bar. All state lives in the URL (owned by the page);
 * this component only holds in-progress input values.
 */
export default function ProductFilters({ search, onSearchChange, filters, categories, onChange, activeCount, onReset }) {
  const [showMore, setShowMore] = useState(false)
  const sortOptions = Object.entries(SORT_LABELS).filter(([key]) => key !== 'relevance' || search.trim())

  return (
    <div className="card flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            maxLength={100}
            className="input pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="btn-secondary px-3 md:hidden"
          aria-expanded={showMore}
          aria-controls="product-filters"
        >
          <FilterIcon className="size-4" />
          <span className="sr-only sm:not-sr-only">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeCount}</span>
          )}
        </button>
      </div>

      <div id="product-filters" className={`${showMore ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-[1fr_1fr_auto_auto] md:items-end`}>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Category</span>
          <select
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value || null })}
            className="input"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Sort by</span>
          <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })} className="input">
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {/* Keyed on the URL values so the inputs reset on back/forward or "Clear". */}
        <PriceFilter
          key={`${filters.minPrice}|${filters.maxPrice}`}
          initialMin={filters.minPrice}
          initialMax={filters.maxPrice}
          onApply={onChange}
        />

        <div className="flex items-center gap-3 md:pb-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => onChange({ inStock: e.target.checked || null })}
              className="size-4 rounded border-slate-300 accent-brand-600"
            />
            In stock only
          </label>
          {activeCount > 0 && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <XIcon className="size-3.5" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceFilter({ initialMin, initialMax, onApply }) {
  const [price, setPrice] = useState({ min: initialMin, max: initialMax })
  const [priceError, setPriceError] = useState('')

  const applyPrice = (e) => {
    e.preventDefault()
    const min = price.min === '' ? null : Number(price.min)
    const max = price.max === '' ? null : Number(price.max)
    if ((min != null && (Number.isNaN(min) || min < 0)) || (max != null && (Number.isNaN(max) || max < 0))) {
      setPriceError('Prices must be positive numbers')
      return
    }
    if (min != null && max != null && min > max) {
      setPriceError('Min price must be less than max price')
      return
    }
    setPriceError('')
    onApply({ minPrice: min, maxPrice: max })
  }

  return (
    <form onSubmit={applyPrice} className="space-y-1">
      <span className="text-xs font-medium text-slate-500">Price range ($)</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Min"
          aria-label="Minimum price"
          value={price.min}
          onChange={(e) => setPrice((p) => ({ ...p, min: e.target.value }))}
          className="input w-full md:w-24"
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Max"
          aria-label="Maximum price"
          value={price.max}
          onChange={(e) => setPrice((p) => ({ ...p, max: e.target.value }))}
          className="input w-full md:w-24"
        />
        <button type="submit" className="btn-secondary px-3">
          Apply
        </button>
      </div>
      {priceError && <p className="text-xs text-red-600">{priceError}</p>}
    </form>
  )
}
