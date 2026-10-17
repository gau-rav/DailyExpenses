import { useCallback, useSyncExternalStore } from 'react'

export default function useIsMobile(query = '(max-width: 720px)') {
  const subscribe = useCallback(callback => {
    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener('change', callback)
    return () => mediaQuery.removeEventListener('change', callback)
  }, [query])

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
