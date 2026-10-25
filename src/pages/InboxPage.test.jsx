import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InboxPage from './InboxPage.jsx'
import * as ingestApi from '../api/ingestApi.js'

vi.mock('../api/ingestApi.js', () => ({
  fetchIngestMessages: vi.fn(),
  acceptIngestMessage: vi.fn(),
  ignoreIngestMessage: vi.fn(),
}))

describe('InboxPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    ingestApi.fetchIngestMessages.mockReset()
    ingestApi.acceptIngestMessage.mockReset()
    ingestApi.ignoreIngestMessage.mockReset()
  })

  it('renders loading state and fetches pending messages', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValueOnce({ messages: [] })
    render(<InboxPage notify={vi.fn()} onChanged={vi.fn()} />)

    expect(screen.getByText('Loading captured emails…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Nothing to review')).toBeInTheDocument()
    })
  })

  it('renders pending messages as transaction cards with confidence and warnings', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValueOnce({
      messages: [{
        id: 'msg-1',
        bank: 'HDFC',
        sender: 'alerts@hdfc.com',
        subject: 'Rs 1,500 debited for dining',
        confidence: 0.9,
        warnings: ['missing_merchant', 'foreign_currency'],
        parsed: {
          title: 'Dining at Restaurant',
          amount: 1500,
          category: 'Food',
          payment: 'Card',
          date: '2026-10-20',
        },
      }],
    })

    const notify = vi.fn()
    const onChanged = vi.fn()
    const onExpenseAdded = vi.fn()

    render(<InboxPage notify={notify} onChanged={onChanged} onExpenseAdded={onExpenseAdded} />)

    await waitFor(() => {
      expect(screen.getByText('Dining at Restaurant')).toBeInTheDocument()
    })

    expect(screen.getByText('90% confident')).toBeInTheDocument()
    expect(screen.getByText('No merchant name found — add a title before saving')).toBeInTheDocument()
    expect(screen.getByText('Foreign currency — confirm the rupee amount')).toBeInTheDocument()

    const addButton = screen.getByRole('button', { name: /Add/i })
    const ignoreButton = screen.getByRole('button', { name: /Ignore/i })
    expect(addButton).toBeInTheDocument()
    expect(ignoreButton).toBeInTheDocument()

    // Test accept flow
    ingestApi.acceptIngestMessage.mockResolvedValueOnce({ expense: { id: 'exp-new' } })
    await userEvent.click(addButton)

    expect(ingestApi.acceptIngestMessage).toHaveBeenCalledWith('msg-1', undefined)
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Added to expenses')
    })
    expect(onExpenseAdded).toHaveBeenCalledWith({ id: 'exp-new' })
    expect(onChanged).toHaveBeenCalled()
  })

  it('allows ignoring a pending message', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValueOnce({
      messages: [{
        id: 'msg-2',
        bank: 'SBI',
        subject: 'Promotional offer',
        parsed: { title: 'Promo', amount: 0 },
      }],
    })

    const notify = vi.fn()
    const onChanged = vi.fn()
    ingestApi.ignoreIngestMessage.mockResolvedValueOnce({})

    render(<InboxPage notify={notify} onChanged={onChanged} />)

    await waitFor(() => {
      expect(screen.getByText('Promo')).toBeInTheDocument()
    })

    const ignoreButton = screen.getByRole('button', { name: /Ignore/i })
    await userEvent.click(ignoreButton)

    expect(ingestApi.ignoreIngestMessage).toHaveBeenCalledWith('msg-2')
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Email ignored')
    })
    expect(onChanged).toHaveBeenCalled()
  })

  it('switches tabs, refetches, and hides review actions outside pending', async () => {
    const pending = [{
      id: 'msg-pending',
      bank: 'HDFC',
      subject: 'Debited',
      parsed: { title: 'Pending coffee', amount: 200, category: 'Food', payment: 'Card', date: '2026-10-20' },
    }]
    const added = [{
      id: 'msg-added',
      bank: 'ICICI',
      status: 'added',
      parsed: { title: 'Added lunch', amount: 300, category: 'Food', payment: 'UPI', date: '2026-10-19' },
    }]

    ingestApi.fetchIngestMessages.mockImplementation(status => Promise.resolve({
      messages: status === 'pending' ? pending : added,
    }))

    render(<InboxPage notify={vi.fn()} onChanged={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Pending coffee')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Needs review' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /^Add$/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Added' }))

    await waitFor(() => expect(screen.getByText('Added lunch')).toBeInTheDocument())
    expect(ingestApi.fetchIngestMessages).toHaveBeenLastCalledWith('added')
    expect(screen.getByRole('tab', { name: 'Added' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: /^Add$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Ignore$/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('Added').length).toBeGreaterThan(1)
  })

  it('shows the empty state copy for each tab', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValue({ messages: [] })

    render(<InboxPage notify={vi.fn()} onChanged={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Nothing to review')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('tab', { name: 'Added' }))
    await waitFor(() => expect(screen.getByText('No added emails yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('tab', { name: 'Ignored' }))
    await waitFor(() => expect(screen.getByText('No ignored emails yet')).toBeInTheDocument())
  })

  it('shows an error state when the inbox cannot be loaded', async () => {
    ingestApi.fetchIngestMessages.mockRejectedValue(new Error('Inbox service unavailable'))

    render(<InboxPage notify={vi.fn()} onChanged={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Could not load captured emails')).toBeInTheDocument())
    expect(screen.getByText('Inbox service unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Nothing to review')).not.toBeInTheDocument()
  })

  it('surfaces accept failures without removing the card', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValue({
      messages: [{
        id: 'msg-fail',
        bank: 'HDFC',
        parsed: { title: 'Rejected coffee', amount: 200 },
      }],
    })
    ingestApi.acceptIngestMessage.mockRejectedValue(new Error('Expense rejected'))

    const notify = vi.fn()
    render(<InboxPage notify={notify} onChanged={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Rejected coffee')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^Add$/ }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Expense rejected'))
    expect(screen.getByText('Rejected coffee')).toBeInTheDocument()
  })

  it('surfaces ignore failures without removing the card', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValue({
      messages: [{
        id: 'msg-fail',
        bank: 'HDFC',
        parsed: { title: 'Stay pending', amount: 200 },
      }],
    })
    ingestApi.ignoreIngestMessage.mockRejectedValue(new Error('Could not ignore'))

    const notify = vi.fn()
    render(<InboxPage notify={notify} onChanged={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Stay pending')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^Ignore$/ }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Could not ignore'))
    expect(screen.getByText('Stay pending')).toBeInTheDocument()
  })

  it('opens the edit modal prefilled and saves the edited expense', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValue({
      messages: [{
        id: 'msg-edit',
        bank: 'Axis Bank',
        subject: 'Rs 750 debited',
        parsed: { title: 'Original merchant', amount: 750, category: 'Shopping', payment: 'Card', date: '2026-10-21' },
      }],
    })
    ingestApi.acceptIngestMessage.mockResolvedValue({ expense: { id: 'exp-edited' } })

    const notify = vi.fn()
    const onExpenseAdded = vi.fn()
    const onChanged = vi.fn()

    render(<InboxPage notify={notify} onChanged={onChanged} onExpenseAdded={onExpenseAdded} />)

    await waitFor(() => expect(screen.getByText('Original merchant')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^Edit$/ }))

    expect(screen.getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument()
    const titleInput = screen.getByPlaceholderText('e.g. Weekly groceries')
    expect(titleInput).toHaveValue('Original merchant')

    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Edited merchant')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(ingestApi.acceptIngestMessage).toHaveBeenCalledWith('msg-edit', expect.objectContaining({
      title: 'Edited merchant',
      amount: 750,
      notes: 'Imported from Axis Bank email',
    }))
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Added to expenses'))
    expect(onExpenseAdded).toHaveBeenCalledWith({ id: 'exp-edited' })
    expect(onChanged).toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Edit expense' })).not.toBeInTheDocument()
  })

  it('closes the edit modal without accepting', async () => {
    ingestApi.fetchIngestMessages.mockResolvedValue({
      messages: [{ id: 'msg-edit', bank: 'HDFC', parsed: { title: 'Cancel me', amount: 100 } }],
    })

    render(<InboxPage notify={vi.fn()} onChanged={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Cancel me')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^Edit$/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('heading', { name: 'Edit expense' })).not.toBeInTheDocument()
    expect(ingestApi.acceptIngestMessage).not.toHaveBeenCalled()
  })
})
