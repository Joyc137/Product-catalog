// Client-side rules mirror the server's Joi schemas for fast feedback.
// They are a UX convenience only — the server validates everything again.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLogin({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address'
  if (!password) errors.password = 'Password is required'
  return errors
}

export function validateRegister({ name, email, password, confirmPassword }) {
  const errors = validateLogin({ email, password })
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  else if (name.trim().length > 60) errors.name = 'Name must be at most 60 characters'
  if (password) {
    if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    else if (password.length > 72) errors.password = 'Password must be at most 72 characters'
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      errors.password = 'Password must contain at least one letter and one number'
  }
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'
  return errors
}

export function validateProduct(values) {
  const errors = {}
  const name = values.name.trim()
  if (name.length < 2) errors.name = 'Name must be at least 2 characters'
  else if (name.length > 120) errors.name = 'Name must be at most 120 characters'

  if (values.description.length > 2000) errors.description = 'Description must be at most 2000 characters'
  if (!values.category) errors.category = 'Choose a category'

  const price = Number(values.price)
  if (values.price === '' || Number.isNaN(price)) errors.price = 'Price is required'
  else if (price < 0 || price > 1_000_000) errors.price = 'Price must be between 0 and 1,000,000'
  else if (Math.round(price * 100) !== price * 100) errors.price = 'Use at most 2 decimal places'

  const stock = Number(values.stock)
  if (values.stock === '' || !Number.isInteger(stock)) errors.stock = 'Stock must be a whole number'
  else if (stock < 0) errors.stock = 'Stock cannot be negative'

  if (values.sku && !/^[A-Za-z0-9-]{3,32}$/.test(values.sku.trim()))
    errors.sku = 'Letters, numbers and dashes only (3–32 characters)'

  if (values.imageUrl.trim()) {
    try {
      const url = new URL(values.imageUrl.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      errors.imageUrl = 'Enter a valid http(s) URL'
    }
  }
  return errors
}

/** Maps server validation details ({ field, message }) onto form field errors. */
export function fieldErrorsFromApi(error) {
  return Object.fromEntries((error?.details || []).map((d) => [d.field, d.message]))
}
