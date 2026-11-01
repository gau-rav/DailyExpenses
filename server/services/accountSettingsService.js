import { getBudgetLimits, getMonthlyCycle, getUserCurrency, saveBudgetLimits, saveMonthlyCycle, saveUserCurrency } from '../repositories/settingsRepository.js'

export const readBudgetLimits = userId => getBudgetLimits(userId)
export const writeBudgetLimits = (userId, limits) => saveBudgetLimits(userId, limits)
export const readMonthlyCycle = userId => getMonthlyCycle(userId)
export const writeMonthlyCycle = (userId, startDate) => saveMonthlyCycle(userId, startDate)
export const readCurrencySettings = userId => getUserCurrency(userId)
export const writeCurrencySettings = (userId, currency) => saveUserCurrency(userId, currency)
