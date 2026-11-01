import { describe, it, expect, afterEach, vi } from 'vitest'

const QUEUE_KEY = 'penny-expense-sync-queue'
const CACHE_KEY = 'penny-expenses'

async function loadApi() {
  vi.resetModules()
  return import('./expensesApi.js')
}

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('expensesApi', () => {
  it('readExpenseCache tolerates missing or corrupt data', async () => {
    const api = await loadApi()
    expect(api.readExpenseCache()).toEqual([])

    localStorage.setItem(CACHE_KEY, '{not json')
    expect(api.readExpenseCache()).toEqual([])
  })

  it('round-trips the cache through writeExpenseCache', async () => {
    const api = await loadApi()
    api.writeExpenseCache([{ id: 7 }])
    expect(api.readExpenseCache()).toEqual([{ id: 7 }])
  })

  it('fetchExpenses normalizes remote rows and caches them', async () => {
    const expenses = [
      {
        id: 1,
        title: 'A',
        amount: '12.5',
        date: '2026-01-15T10:00:00Z',
        dueDate: '2026-01-20',
        recurring: 'true',
        splitPayments: [{ name: ' x ', amount: '5' }, { name: '', amount: 0 }],
        deletedAt: '',
      },
      { id: 2, title: 'Gone', amount: 5, date: '2026-01-10', dueDate: '2026-01-10', deletedAt: '2026-01-11T00:00:00Z' },
    ]
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, expenses }))
    vi.stubGlobal('fetch', fetchMock)

    const api = await loadApi()
    const result = await api.fetchExpenses()

    expect(fetchMock).toHaveBeenCalledWith('/api/expenses', { credentials: 'include' })
    expect(result).toHaveLength(1)

    const [only] = result
    expect(only.amount).toBe(12.5)
    expect(only.date).toBe('2026-01-15')
    expect(only.dueDate).toBe('2026-01-20')
    expect(only.recurring).toBe(true)
    expect(only.splitPayments).toEqual([{ name: 'x', amount: 5 }])
    expect(only.splitExpense).toEqual({ enabled: true, payments: [{ name: 'x', amount: 5 }] })
    expect(api.getLastExpensesSource()).toBe('remote')
    expect(JSON.parse(localStorage.getItem(CACHE_KEY))).toHaveLength(1)
  })

  it('fetchExpenses falls back to the cache when the network fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(CACHE_KEY, JSON.stringify([{ id: 9, title: 'cached' }]))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const api = await loadApi()
    await expect(api.fetchExpenses()).resolves.toEqual([{ id: 9, title: 'cached' }])
    expect(api.getLastExpensesSource()).toBe('cache')
  })

  it('fetchExpenses falls back to the cache on a non-ok response', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'nope' }, false, 500)))

    const api = await loadApi()
    await expect(api.fetchExpenses()).resolves.toEqual([])
    expect(api.getLastExpensesSource()).toBe('cache')
  })

  it('fetchDeletedExpenses returns normalized soft-deleted rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        deleted: [{ id: 1, title: 'D', amount: 3, date: '2026-01-01', dueDate: '2026-01-01', deletedAt: '2026-01-02T00:00:00Z' }],
        expenses: [],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const api = await loadApi()
    const result = await api.fetchDeletedExpenses()

    expect(fetchMock).toHaveBeenCalledWith('/api/expenses?includeDeleted=true', { credentials: 'include' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('fetchDeletedExpenses returns null when the request fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const api = await loadApi()
    await expect(api.fetchDeletedExpenses()).resolves.toBeNull()
  })

  it('addExpense posts an add action and returns the server result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: { id: 123, title: 'New' } }))
    vi.stubGlobal('fetch', fetchMock)

    const api = await loadApi()
    const result = await api.addExpense({ id: 123, title: 'New', amount: 10, date: '2026-01-01', dueDate: '2026-01-01' })

    expect(result).toEqual({ id: 123, title: 'New' })
    const [, options] = fetchMock.mock.calls[0]
    expect(fetchMock.mock.calls[0][0]).toBe('/api/expenses')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    const body = JSON.parse(options.body)
    expect(body.action).toBe('add')
    expect(body.expense.id).toBe(123)
    expect(body.expense.amount).toBe(10)
  })

  it('addExpense queues the payload and rethrows when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const api = await loadApi()
    await expect(
      api.addExpense({ id: 5, title: 'Q', amount: 5, date: '2026-01-01', dueDate: '2026-01-01' }),
    ).rejects.toThrow('offline')

    const queued = JSON.parse(localStorage.getItem(QUEUE_KEY))
    expect(queued).toHaveLength(1)
    expect(queued[0].action).toBe('add')
    expect(queued[0].expense.id).toBe(5)
    expect(queued[0].queuedAt).toBeTruthy()
  })

  it.each([
    ['updateExpense', { id: 1 }, 'update'],
    ['deleteExpense', 1, 'delete'],
    ['restoreExpense', 1, 'restore'],
    ['purgeExpense', 1, 'purge'],
  ])('%s sends the %s action', async (method, arg, action) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: {} }))
    vi.stubGlobal('fetch', fetchMock)

    const api = await loadApi()
    await api[method](arg)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.action).toBe(action)
  })

  it('syncQueuedActions replays and clears the queue on success', async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([{ action: 'add', expense: { id: 1 } }, { action: 'delete', id: 2 }]),
    )
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: {} }))
    vi.stubGlobal('fetch', fetchMock)

    const api = await loadApi()
    await expect(api.syncQueuedActions()).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(localStorage.getItem(QUEUE_KEY))).toEqual([])
  })

  it('syncQueuedActions retains payloads that still fail', async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([{ action: 'add', expense: { id: 1 } }, { action: 'delete', id: 2 }]),
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: {} }))
      .mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)

    const api = await loadApi()
    await expect(api.syncQueuedActions()).resolves.toBe(false)

    const remaining = JSON.parse(localStorage.getItem(QUEUE_KEY))
    expect(remaining).toHaveLength(1)
    expect(remaining[0].action).toBe('delete')
  })

  it('syncQueuedActions resolves true immediately for an empty queue', async () => {
    const api = await loadApi()
    await expect(api.syncQueuedActions()).resolves.toBe(true)
  })
})
