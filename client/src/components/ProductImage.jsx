import { useState } from 'react'

// Seeded products have no photos, so we render a category-coloured placeholder.
const GRADIENTS = {
  Electronics: 'from-sky-400 to-indigo-500',
  Books: 'from-amber-300 to-orange-500',
  Clothing: 'from-pink-400 to-rose-500',
  'Home & Kitchen': 'from-emerald-300 to-teal-500',
  'Sports & Outdoors': 'from-lime-400 to-green-600',
  'Toys & Games': 'from-fuchsia-400 to-purple-500',
  Beauty: 'from-rose-300 to-pink-500',
  Grocery: 'from-yellow-300 to-lime-500',
  Automotive: 'from-slate-400 to-slate-700',
  Health: 'from-cyan-300 to-blue-500',
}

export default function ProductImage({ product, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (product.imageUrl && !failed) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  const initials = product.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${GRADIENTS[product.category] || 'from-slate-300 to-slate-500'} ${className}`}
      aria-hidden="true"
    >
      <span className="text-3xl font-bold tracking-tight text-white/90 drop-shadow-sm">{initials}</span>
    </div>
  )
}
