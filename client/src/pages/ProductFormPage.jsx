import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productsApi } from '../api/products'
import FormField from '../components/FormField'
import { ArrowLeftIcon } from '../components/icons'
import { Alert, EmptyState, ErrorState, PageLoader, Spinner } from '../components/StateViews'
import { useToast } from '../context/ToastContext'
import { useApi } from '../hooks/useApi'
import { fieldErrorsFromApi, validateProduct } from '../utils/validation'

const EMPTY = { name: '', description: '', category: '', price: '', stock: '', sku: '', imageUrl: '' }

const toFormValues = (p) => ({
  name: p.name ?? '',
  description: p.description ?? '',
  category: p.category ?? '',
  price: String(p.price ?? ''),
  stock: String(p.stock ?? ''),
  sku: p.sku ?? '',
  imageUrl: p.imageUrl ?? '',
})

function toPayload(values) {
  const payload = {
    name: values.name.trim(),
    description: values.description.trim(),
    category: values.category,
    price: Number(values.price),
    stock: Number(values.stock),
    imageUrl: values.imageUrl.trim(),
  }
  // SKU is optional on create (server generates one).
  if (values.sku.trim()) payload.sku = values.sku.trim().toUpperCase()
  return payload
}

/** Loads the product (edit mode) and categories, then renders the form. */
export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { data: categories } = useApi((signal) => productsApi.categories(signal), [])
  const existing = useApi((signal) => (isEdit ? productsApi.get(id, signal) : Promise.resolve(null)), [id])

  if (isEdit && existing.loading) return <PageLoader label="Loading product…" />
  if (isEdit && existing.error) {
    return existing.error.status === 404 || existing.error.status === 400 ? (
      <EmptyState title="Product not found" action={<Link to="/" className="btn-primary mt-2">Back to products</Link>} />
    ) : (
      <ErrorState message={existing.error.message} onRetry={existing.reload} />
    )
  }

  return (
    <ProductForm
      key={id ?? 'new'}
      id={id}
      initialValues={existing.data ? toFormValues(existing.data) : EMPTY}
      categories={categories ?? []}
    />
  )
}

function ProductForm({ id, initialValues, categories }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const clientErrors = validateProduct(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      const saved = isEdit
        ? await productsApi.update(id, toPayload(values))
        : await productsApi.create(toPayload(values))
      toast.success(isEdit ? 'Product updated.' : 'Product created.')
      navigate(`/products/${saved._id}`)
    } catch (err) {
      setErrors(fieldErrorsFromApi(err))
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to={isEdit ? `/products/${id}` : '/'}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeftIcon className="size-4" /> {isEdit ? 'Back to product' : 'Back to products'}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isEdit ? 'Edit product' : 'Add product'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit ? 'Update the details below and save your changes.' : 'Fill in the details to add a product to the catalog.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card space-y-5 p-6">
        {formError && <Alert>{formError}</Alert>}

        <FormField label="Name" error={errors.name}>
          {(props) => <input {...props} value={values.name} onChange={set('name')} maxLength={120} />}
        </FormField>

        <FormField label="Description" error={errors.description} optional hint={`${values.description.length}/2000`}>
          {(props) => (
            <textarea {...props} rows={4} value={values.description} onChange={set('description')} maxLength={2000} />
          )}
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Category" error={errors.category}>
            {(props) => (
              <select {...props} value={values.category} onChange={set('category')}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label="SKU" error={errors.sku} optional hint={isEdit ? undefined : 'Generated automatically if left blank'}>
            {(props) => <input {...props} value={values.sku} onChange={set('sku')} maxLength={32} placeholder="e.g. LAMP-001" />}
          </FormField>

          <FormField label="Price ($)" error={errors.price}>
            {(props) => (
              <input {...props} type="number" min="0" step="0.01" inputMode="decimal" value={values.price} onChange={set('price')} />
            )}
          </FormField>

          <FormField label="Stock" error={errors.stock}>
            {(props) => (
              <input {...props} type="number" min="0" step="1" inputMode="numeric" value={values.stock} onChange={set('stock')} />
            )}
          </FormField>
        </div>

        <FormField label="Image URL" error={errors.imageUrl} optional>
          {(props) => (
            <input {...props} type="url" value={values.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
          )}
        </FormField>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Link to={isEdit ? `/products/${id}` : '/'} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner className="size-4 text-white" />}
            {isEdit ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  )
}
