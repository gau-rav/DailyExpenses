import { requestJson } from '../../../services/api/requestJson.js'

const CURRENCY_URL = '/api/user-settings'
const CYCLE_URL = '/api/current-monthly-cycle'

export async function loadCurrencyPreference() {
  const data = await requestJson(CURRENCY_URL, { cache: 'no-store' }, status => `Unable to load user settings (${status})`)
  return data.currency
}

export async function saveCurrencyPreference(currency) {
  const data = await requestJson(CURRENCY_URL, {
    method: 'PUT',
    body: JSON.stringify({ currency }),
  }, status => `Unable to save currency preference (${status})`)
  return data.currency
}

export async function loadMonthlyCycle() {
  const data = await requestJson(CYCLE_URL, { cache: 'no-store' }, status => `Unable to load monthly cycle settings (${status})`)
  return data.monthlyCycle?.startDate || null
}

export async function saveMonthlyCycle(startDate) {
  const data = await requestJson(CYCLE_URL, {
    method: 'POST',
    body: JSON.stringify({ startDate }),
  }, status => `Unable to save monthly cycle settings (${status})`)
  return data.monthlyCycle.startDate
}
