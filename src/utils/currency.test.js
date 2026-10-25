import { describe, it, expect, beforeEach, vi } from 'vitest'

async function loadCurrency() {
  vi.resetModules()
  return import('./currency.js')
}

describe('currency', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exposes the supported currencies with INR first', async () => {
    const { CURRENCIES } = await loadCurrency()
    expect(CURRENCIES.map(c => c.code)).toEqual(['INR', 'USD', 'EUR', 'GBP'])
    expect(CURRENCIES[0].rate).toBe(1)
  })

  it('defaults to INR when storage is empty or unknown', async () => {
    const currency = await loadCurrency()
    expect(currency.getCurrencyCode()).toBe('INR')

    localStorage.setItem('penny-currency', 'XYZ')
    const fallback = await loadCurrency()
    expect(fallback.getCurrencyCode()).toBe('INR')
  })

  it('initializes from the persisted currency code', async () => {
    localStorage.setItem('penny-currency', 'USD')
    const currency = await loadCurrency()
    expect(currency.getCurrencyCode()).toBe('USD')
  })

  it('setCurrencyCode updates state and persists; unknown falls back to INR', async () => {
    const currency = await loadCurrency()
    currency.setCurrencyCode('EUR')
    expect(currency.getCurrencyCode()).toBe('EUR')
    expect(localStorage.getItem('penny-currency')).toBe('EUR')

    currency.setCurrencyCode('NOPE')
    expect(currency.getCurrencyCode()).toBe('INR')
    expect(localStorage.getItem('penny-currency')).toBe('INR')
  })

  it('fromINR converts using the active rate and coerces non-numbers to 0', async () => {
    const currency = await loadCurrency()
    expect(currency.fromINR(1000)).toBe(1000)

    currency.setCurrencyCode('USD')
    expect(currency.fromINR(1000)).toBeCloseTo(12, 5)
    expect(currency.fromINR('abc')).toBe(0)
    expect(currency.fromINR(null)).toBe(0)
  })

  it('toINR converts back and rounds to 2 decimals', async () => {
    const currency = await loadCurrency()
    currency.setCurrencyCode('USD')
    expect(currency.toINR(12)).toBeCloseTo(1000, 5)
    expect(currency.toINR(1)).toBeCloseTo(83.33, 2)
    expect(currency.toINR(0)).toBe(0)
  })

  it('round-trips INR through the active currency within rounding error', async () => {
    const currency = await loadCurrency()
    currency.setCurrencyCode('GBP')
    const inr = 2500
    expect(currency.toINR(currency.fromINR(inr))).toBeCloseTo(inr, 0)
  })

  it('fromINRInput keeps empty values empty and rounds otherwise', async () => {
    const currency = await loadCurrency()
    expect(currency.fromINRInput('')).toBe('')
    expect(currency.fromINRInput(null)).toBe('')
    expect(currency.fromINRInput(undefined)).toBe('')
    expect(currency.fromINRInput(1234.567)).toBe(1234.57)
  })

  it('toINR keeps empty values empty', async () => {
    const currency = await loadCurrency()
    expect(currency.toINR('')).toBe('')
    expect(currency.toINR(null)).toBe('')
    expect(currency.toINR(undefined)).toBe('')
  })

  it('currencySymbol returns the active currency glyph', async () => {
    const currency = await loadCurrency()
    expect(currency.currencySymbol()).toBe('₹')
    currency.setCurrencyCode('USD')
    expect(currency.currencySymbol()).toBe('$')
  })

  it('formatMoney formats an INR amount in the display currency', async () => {
    const currency = await loadCurrency()
    expect(currency.formatMoney(1000)).toContain('1,000.00')

    currency.setCurrencyCode('USD')
    expect(currency.formatMoney(1000)).toContain('12.00')
  })
})
