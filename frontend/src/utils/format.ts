const dt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const d = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })

export const formatDateTime = (iso?: string) => (iso ? dt.format(new Date(iso)) : '—')
export const formatDate = (iso?: string) => (iso ? d.format(new Date(iso)) : '—')

export const formatCurrency = (amount: number, currency = 'INR'): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}
