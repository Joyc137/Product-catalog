import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FormField from '../components/FormField'
import { Alert, Spinner } from '../components/StateViews'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { validateLogin } from '../utils/validation'
import AuthCard from '../components/AuthCard'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
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
    const clientErrors = validateLogin(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      await login({ email: values.email.trim(), password: values.password })
      toast.success('Welcome back!')
      // <GuestOnly> redirects to the page that sent us here.
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Log in to your account"
      subtitle="Browse and manage the product catalog"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" state={location.state} className="font-medium text-brand-600 hover:text-brand-700">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <FormField label="Email" error={errors.email}>
          {(props) => (
            <input {...props} type="email" autoComplete="email" value={values.email} onChange={set('email')} autoFocus />
          )}
        </FormField>
        <FormField label="Password" error={errors.password}>
          {(props) => (
            <input {...props} type="password" autoComplete="current-password" value={values.password} onChange={set('password')} />
          )}
        </FormField>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="size-4 text-white" />}
          Log in
        </button>
      </form>
    </AuthCard>
  )
}
