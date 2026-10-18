import { describe, it, expect, beforeEach } from 'vitest'
import {
  readExpenseCache,
  writeExpenseCache,
  readTrashCache,
  writeTrashCache,
  readBudgetCache,
  writeBudgetCache,
  clearBudgetCache,
  readThemeCache,
  writeThemeCache,
  readSessionTimeoutCache,
  writeSessionTimeoutCache,
  clearAuthCache,
  clearAllCache,
  getCacheStats,
} from './cacheUtils.js'

describe('expense cache', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to an empty array and survives corrupt JSON', () => {
    expect(readExpenseCache()).toEqual([])
    localStorage.setItem('penny-expenses', '{not json')
    expect(readExpenseCache()).toEqual([])
  })

  it('round-trips expenses', () => {
    const expenses = [{ id: 1, title: 'Rent' }]
    writeExpenseCache(expenses)
    expect(readExpenseCache()).toEqual(expenses)
  })
})

describe('trash cache', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to an empty array and round-trips', () => {
    expect(readTrashCache()).toEqual([])
    writeTrashCache([{ id: 9 }])
    expect(readTrashCache()).toEqual([{ id: 9 }])
  })
})

describe('budget cache', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to null per user and round-trips', () => {
    expect(readBudgetCache('u1')).toBeNull()
    writeBudgetCache('u1', { daily: 100 })
    expect(readBudgetCache('u1')).toEqual({ daily: 100 })
    expect(readBudgetCache('u2')).toBeNull()
  })

  it('clears only the requested user budget', () => {
    writeBudgetCache('u1', { daily: 1 })
    writeBudgetCache('u2', { daily: 2 })
    clearBudgetCache('u1')
    expect(readBudgetCache('u1')).toBeNull()
    expect(readBudgetCache('u2')).toEqual({ daily: 2 })
  })
})

describe('theme and session cache', () => {
  beforeEach(() => localStorage.clear())

  it('stores and reads the theme', () => {
    expect(readThemeCache()).toBeNull()
    writeThemeCache('dark')
    expect(readThemeCache()).toBe('dark')
  })

  it('treats the session flag as a boolean', () => {
    expect(readSessionTimeoutCache()).toBe(false)
    writeSessionTimeoutCache(true)
    expect(readSessionTimeoutCache()).toBe(true)
    writeSessionTimeoutCache(false)
    expect(readSessionTimeoutCache()).toBe(false)
  })
})

describe('clearAuthCache', () => {
  beforeEach(() => localStorage.clear())

  it('removes the exact tracked keys', () => {
    writeExpenseCache([{ id: 1 }])
    writeTrashCache([{ id: 2 }])
    writeThemeCache('light')
    writeSessionTimeoutCache(true)

    clearAuthCache()

    expect(readExpenseCache()).toEqual([])
    expect(readTrashCache()).toEqual([])
    expect(readThemeCache()).toBeNull()
    expect(readSessionTimeoutCache()).toBe(false)
  })

  it('does not remove per-user budget keys (prefix has a suffix)', () => {
    writeBudgetCache('u1', { daily: 1 })
    clearAuthCache()
    expect(readBudgetCache('u1')).toEqual({ daily: 1 })
  })
})

describe('clearAllCache', () => {
  beforeEach(() => localStorage.clear())

  it('removes every penny-prefixed key', () => {
    writeExpenseCache([{ id: 1 }])
    writeBudgetCache('u1', { daily: 1 })
    localStorage.setItem('unrelated', 'keep')

    clearAllCache()

    expect(readExpenseCache()).toEqual([])
    expect(readBudgetCache('u1')).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })
})

describe('getCacheStats', () => {
  beforeEach(() => localStorage.clear())

  it('reports a size for each penny-prefixed key', () => {
    writeExpenseCache([{ id: 1 }])
    localStorage.setItem('unrelated', 'x')
    const stats = getCacheStats()
    expect(Object.keys(stats)).toContain('penny-expenses')
    expect(Object.keys(stats)).not.toContain('unrelated')
    expect(stats['penny-expenses']).toBeGreaterThan(0)
  })
})
