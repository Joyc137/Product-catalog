const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const number = new Intl.NumberFormat('en-US')
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export const formatPrice = (value) => currency.format(value ?? 0)
export const formatNumber = (value) => number.format(value ?? 0)
export const formatDate = (value) => (value ? date.format(new Date(value)) : '—')
