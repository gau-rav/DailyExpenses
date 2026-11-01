import { useCallback, useEffect, useState } from 'react'
import { defaultBudgets } from '../../../utils/appData.js'
import { loadBudgets, readBudgetCache, saveBudgets as persistBudgets } from '../services/budgetService.js'

/** @param {string | undefined} userId @param {{setApiStatus: (status: string) => void, setToast: (message: string) => void}} callbacks */
export function useBudgets(userId, { setApiStatus, setToast }) {
  const [budgets, setBudgets] = useState(defaultBudgets)
  const [loadedUserId, setLoadedUserId] = useState('')

  useEffect(() => {
    if (!userId) return undefined
    let active = true
    loadBudgets(userId)
      .then(savedBudgets => {
        if (!active) return
        setBudgets(savedBudgets)
        setLoadedUserId(userId)
      })
      .catch(error => {
        if (!active) return
        const cached = readBudgetCache(userId)
        setBudgets(cached || defaultBudgets)
        setApiStatus('offline')
        setToast(cached ? 'Could not load account budgets. Showing this account’s saved device copy.' : error.message)
        setLoadedUserId(userId)
      })
    return () => { active = false }
  }, [userId, setApiStatus, setToast])

  /** @param {Record<string, number>} nextBudgets */
  const save = useCallback(async nextBudgets => {
    try {
      const savedBudgets = await persistBudgets(userId, nextBudgets)
      setBudgets(savedBudgets)
      setApiStatus('connected')
      setToast('Budget limits saved to your account')
      return true
    } catch (error) {
      setApiStatus('offline')
      setToast(error.message || 'Unable to save budget limits')
      return false
    }
  }, [userId, setApiStatus, setToast])

  return { budgets, budgetsLoaded: Boolean(userId && loadedUserId === userId), saveBudgets: save }
}
