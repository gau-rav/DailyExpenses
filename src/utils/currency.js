// Display-only currency conversion.
//
// Amounts are ALWAYS stored and synced in INR (rupees). This module only
// converts values at render time in the browser, so switching the currency in
// Settings changes how numbers look — never what we persist.

export const CURRENCIES = [
  { code: 'INR', label: 'INR — Indian Rupee', locale: 'en-IN', rate: 1 },
  { code: 'USD', label: 'USD — US Dollar', locale: 'en-US', rate: 0.012 },
  { code: 'EUR', label: 'EUR — Euro', locale: 'en-IE', rate: 0.011 },
  { code: 'GBP', label: 'GBP — Pound Sterling', locale: 'en-GB', rate: 0.0094 },
]

const STORAGE_KEY = 'penny-currency'

const findCurrency = code => CURRENCIES.find(item => item.code === code) || CURRENCIES[0]

let current = (() => {
  try {
    return findCurrency(localStorage.getItem(STORAGE_KEY)).code
  } catch {
    return 'INR'
  }
})()

export const getCurrencyCode = () => current

export const setCurrencyCode = code => {
  current = findCurrency(code).code
  try {
    localStorage.setItem(STORAGE_KEY, current)
  } catch {
    /* storage unavailable — keep in-memory selection */
  }
}

// INR -> selected currency
export const fromINR = amount => (Number(amount) || 0) * findCurrency(current).rate

// INR -> selected currency, rounded for text/number inputs ('' stays empty)
export const fromINRInput = amount => {
  if (amount === '' || amount === null || amount === undefined) return ''
  return Math.round(fromINR(amount) * 100) / 100
}

// selected currency -> INR (used when saving user input)
export const toINR = amount => {
  if (amount === '' || amount === null || amount === undefined) return ''
  const { rate } = findCurrency(current)
  return Math.round(((Number(amount) || 0) / rate) * 100) / 100
}

export const currencySymbol = () => {
  const { locale, code } = findCurrency(current)
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).formatToParts(0)
    const found = parts.find(part => part.type === 'currency')
    if (found) return found.value
  } catch {
    /* fall through to default */
  }
  return '₹'
}

export const formatMoney = amountInINR => {
  const { locale, code } = findCurrency(current)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fromINR(amountInINR))
}
