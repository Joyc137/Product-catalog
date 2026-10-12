import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FormField from '../components/FormField'
import { Alert, Spinner } from '../components/StateViews'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fieldErrorsFromApi, validateRegister } from '../utils/validation'
import AuthCard from '../components/AuthCard'

export default function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
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
    const clientErrors = validateRegister(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      toast.success('Account created. Welcome!')
    } catch (err) {
      setErrors(fieldErrorsFromApi(err))
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Sign up to browse the catalog"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-medium text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <FormField label="Name" error={errors.name}>
          {(props) => <input {...props} autoComplete="name" value={values.name} onChange={set('name')} autoFocus maxLength={60} />}
        </FormField>
        <FormField label="Email" error={errors.email}>
          {(props) => <input {...props} type="email" autoComplete="email" value={values.email} onChange={set('email')} />}
        </FormField>
        <FormField label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number">
          {(props) => (
            <input {...props} type="password" autoComplete="new-password" value={values.password} onChange={set('password')} />
          )}
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
            />
          )}
        </FormField>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="size-4 text-white" />}
          Create account
        </button>
      </form>
    </AuthCard>
  )
}
