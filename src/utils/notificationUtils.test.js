import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { showToast, showError, showSuccess, showInfo } from './notificationUtils.js'

describe('notificationUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('appends a toast element with the message', () => {
    const toast = showToast('Saved')

    expect(toast).not.toBeNull()
    expect(toast.classList.contains('toast')).toBe(true)
    expect(toast.textContent).toContain('Saved')
    expect(document.querySelectorAll('.toast')).toHaveLength(1)
  })

  it('returns null and renders nothing for an empty message', () => {
    expect(showToast('')).toBeNull()
    expect(showToast('   ')).toBeNull()
    expect(document.querySelectorAll('.toast')).toHaveLength(0)
  })

  it('replaces any existing toast', () => {
    showToast('First')
    showToast('Second')

    const toasts = document.querySelectorAll('.toast')
    expect(toasts).toHaveLength(1)
    expect(toasts[0].textContent).toContain('Second')
  })

  it('auto-removes the toast after the duration', () => {
    showToast('Temporary', 3000)
    expect(document.querySelectorAll('.toast')).toHaveLength(1)

    vi.advanceTimersByTime(3000)
    expect(document.querySelectorAll('.toast')).toHaveLength(0)
  })

  it('does not schedule removal when duration is falsy', () => {
    showToast('Sticky', 0)
    vi.advanceTimersByTime(60000)
    expect(document.querySelectorAll('.toast')).toHaveLength(1)
  })

  it('wraps variants around showToast', () => {
    showError('Boom')
    expect(document.querySelector('.toast').textContent).toContain('Boom')

    showSuccess('Nice')
    expect(document.querySelector('.toast').textContent).toContain('Nice')

    showInfo('FYI')
    expect(document.querySelector('.toast').textContent).toContain('FYI')
  })
})
