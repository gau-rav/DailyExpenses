import { useCallback, useEffect, useState } from 'react'
import { loadMonthlyCycle, saveMonthlyCycle as persistMonthlyCycle } from '../services/settingsService.js'

/** @param {string | undefined} userId @param {{setApiStatus: (status: string) => void, setToast: (message: string) => void}} callbacks */
export function useMonthlyCycle(userId, { setApiStatus, setToast }) {
  const [startDate, setStartDate] = useState(null)
  const [loadedUserId, setLoadedUserId] = useState('')

  useEffect(() => {
    if (!userId) return undefined
    let active = true
    loadMonthlyCycle()
      .then(value => { if (active) setStartDate(value) })
      .catch(error => {
        if (!active) return
        setApiStatus('offline')
        setToast(error.message || 'Unable to load monthly cycle settings')
      })
      .finally(() => { if (active) setLoadedUserId(userId) })
    return () => { active = false }
  }, [userId, setApiStatus, setToast])

  /** @param {string | null} value */
  const save = useCallback(async value => {
    try {
      const savedStartDate = await persistMonthlyCycle(value)
      setStartDate(savedStartDate)
      setApiStatus('connected')
      setToast(value ? 'Spending cycle saved' : 'Calendar month cycle restored')
      return true
    } catch (error) {
      setApiStatus('offline')
      setToast(error.message || 'Unable to save monthly cycle settings')
      return false
    }
  }, [setApiStatus, setToast])

  return { monthlyCycleStartDate: startDate, monthlyCycleLoaded: Boolean(userId && loadedUserId === userId), saveMonthlyCycle: save }
}
