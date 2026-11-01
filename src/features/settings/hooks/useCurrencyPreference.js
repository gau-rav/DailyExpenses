import { useCallback, useEffect, useState } from 'react'
import { getCurrencyCode, setCurrencyCode } from '../../../utils/currency.js'
import { loadCurrencyPreference, saveCurrencyPreference } from '../services/settingsService.js'

/** @param {string | undefined} userId @param {{setToast: (message: string) => void}} callbacks */
export function useCurrencyPreference(userId, { setToast }) {
  const [currency, setCurrency] = useState(getCurrencyCode)

  useEffect(() => {
    if (!userId) return undefined
    let active = true
    loadCurrencyPreference()
      .then(code => {
        if (!active || !code) return
        setCurrencyCode(code)
        setCurrency(getCurrencyCode())
      })
      .catch(() => { /* Keep the device-local currency when the account preference is unavailable. */ })
    return () => { active = false }
  }, [userId])

  /** @param {string} code */
  const changeCurrency = useCallback(async code => {
    const previous = getCurrencyCode()
    setCurrencyCode(code)
    setCurrency(getCurrencyCode())
    try {
      const savedCurrency = await saveCurrencyPreference(code)
      setCurrencyCode(savedCurrency)
      setCurrency(getCurrencyCode())
      setToast('Currency preference saved')
    } catch (error) {
      setCurrencyCode(previous)
      setCurrency(getCurrencyCode())
      setToast(error.message || 'Unable to save currency preference')
    }
  }, [setToast])

  return { currency, changeCurrency }
}
