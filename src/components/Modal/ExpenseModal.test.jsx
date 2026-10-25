import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseModal from './ExpenseModal.jsx'

describe('ExpenseModal', () => {
  afterEach(cleanup)

  it('renders add transaction mode by default', () => {
    const onClose = vi.fn()
    const onSave = vi.fn()

    render(<ExpenseModal onClose={onClose} onSave={onSave} />)

    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('validates required fields on submit', async () => {
    const onSave = vi.fn()
    render(<ExpenseModal onClose={vi.fn()} onSave={onSave} />)

    const titleInput = screen.getByPlaceholderText('e.g. Weekly groceries')
    const amountInput = screen.getByPlaceholderText('0.00')

    fireEvent.change(titleInput, { target: { value: '' } })
    fireEvent.change(amountInput, { target: { value: '-100' } })

    const saveButton = screen.getAllByRole('button', { name: /save/i })[0]
    fireEvent.click(saveButton)

    expect(screen.getByText('Enter a title')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount greater than zero')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('submits valid standard expense', async () => {
    const onSave = vi.fn()

    render(<ExpenseModal onClose={vi.fn()} onSave={onSave} />)

    await userEvent.type(screen.getByPlaceholderText('e.g. Weekly groceries'), 'Electricity bill')
    await userEvent.type(screen.getAllByPlaceholderText('0.00')[0], '1500')

    const saveButton = screen.getAllByRole('button', { name: /save/i })[0]
    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Electricity bill',
      amount: 1500,
      category: 'Grocery',
      payment: 'Card',
      status: 'Paid',
    }))
  })

  it('handles split expenses with payers', async () => {
    const onSave = vi.fn()
    render(<ExpenseModal onClose={vi.fn()} onSave={onSave} />)

    await userEvent.type(screen.getByPlaceholderText('e.g. Weekly groceries'), 'Dinner Party')
    await userEvent.type(screen.getAllByPlaceholderText('0.00')[0], '3000')

    const splitCheckbox = screen.getByLabelText(/Split this expense among multiple payers/i)
    await userEvent.click(splitCheckbox)

    // Add first payer
    const payerInputs = screen.getAllByPlaceholderText('Payer name')
    await userEvent.type(payerInputs[0], 'Alice')

    // Add amount for first payer
    const amountInput = screen.getAllByPlaceholderText('Amount')[0]
    await userEvent.type(amountInput, '1500')

    const saveButton = screen.getAllByRole('button', { name: /save/i })[0]
    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Dinner Party',
      amount: 3000,
      splitExpense: expect.objectContaining({
        enabled: true,
        payments: [{ name: 'Alice', amount: 1500 }],
      }),
    }))
  })

  it('renders edit mode with prefilled values and preserves split payers', async () => {
    const onSave = vi.fn()
    const expense = {
      id: 'exp-1',
      title: 'Rent',
      amount: 12000,
      category: 'Rent',
      payment: 'Bank transfer',
      status: 'Pending',
      date: '2026-10-01',
      dueDate: '2026-10-05',
      notes: 'Monthly rent',
      recurring: true,
      splitExpense: {
        enabled: true,
        payments: [{ name: 'Alice', amount: 6000 }, { name: 'Bob', amount: 6000 }],
      },
    }

    render(<ExpenseModal expense={expense} onClose={vi.fn()} onSave={onSave} />)

    expect(screen.getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Weekly groceries')).toHaveValue('Rent')
    expect(screen.getByPlaceholderText('Add a note (optional)')).toHaveValue('Monthly rent')
    expect(screen.getByLabelText(/This is a recurring expense/i)).toBeChecked()
    expect(screen.getAllByPlaceholderText('Payer name')).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      id: 'exp-1',
      title: 'Rent',
      amount: 12000,
      recurring: true,
      splitExpense: {
        enabled: true,
        payments: [{ name: 'Alice', amount: 6000 }, { name: 'Bob', amount: 6000 }],
      },
      splitPayments: [{ name: 'Alice', amount: 6000 }, { name: 'Bob', amount: 6000 }],
    }))
  })

  it('restores split payers from the legacy splitPayments field', async () => {
    const onSave = vi.fn()
    render(<ExpenseModal
      expense={{ title: 'Trip', amount: 2000, splitPayments: [{ name: 'Cara', amount: 1000 }] }}
      onClose={vi.fn()}
      onSave={onSave}
    />)

    expect(screen.getAllByPlaceholderText('Payer name')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      splitExpense: {
        enabled: true,
        payments: [{ name: 'Cara', amount: 1000 }],
      },
    }))
  })

  it('closes via the header button and the cancel button', async () => {
    const onClose = vi.fn()
    render(<ExpenseModal onClose={onClose} onSave={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('requires a due date', async () => {
    const onSave = vi.fn()
    render(<ExpenseModal onClose={vi.fn()} onSave={onSave} />)

    await userEvent.type(screen.getByPlaceholderText('e.g. Weekly groceries'), 'Internet')
    await userEvent.type(screen.getAllByPlaceholderText('0.00')[0], '999')
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByText('Choose a due date')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('adds and removes payer rows', async () => {
    render(<ExpenseModal onClose={vi.fn()} onSave={vi.fn()} />)

    await userEvent.click(screen.getByLabelText(/Split this expense among multiple payers/i))
    expect(screen.getAllByPlaceholderText('Payer name')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: /Add payer/i }))
    expect(screen.getAllByPlaceholderText('Payer name')).toHaveLength(2)

    await userEvent.type(screen.getAllByPlaceholderText('Payer name')[0], 'Alice')
    await userEvent.type(screen.getAllByPlaceholderText('Payer name')[1], 'Bob')
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove payer' })[1])

    expect(screen.getAllByPlaceholderText('Payer name')).toHaveLength(1)
    expect(screen.getByPlaceholderText('Payer name')).toHaveValue('Alice')
  })

  it('filters out empty payer rows on submit', async () => {
    const onSave = vi.fn()
    render(<ExpenseModal onClose={vi.fn()} onSave={onSave} />)

    await userEvent.type(screen.getByPlaceholderText('e.g. Weekly groceries'), 'Group dinner')
    await userEvent.type(screen.getAllByPlaceholderText('0.00')[0], '1000')
    await userEvent.click(screen.getByLabelText(/Split this expense among multiple payers/i))

    await userEvent.type(screen.getAllByPlaceholderText('Payer name')[0], 'Alice')
    await userEvent.type(screen.getAllByPlaceholderText('Amount')[0], '400')
    await userEvent.click(screen.getByRole('button', { name: /Add payer/i }))

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      splitExpense: {
        enabled: true,
        payments: [{ name: 'Alice', amount: 400 }],
      },
    }))
  })

  it('submits selected category, payment method, status, and dates', async () => {
    const onSave = vi.fn()
    render(<ExpenseModal onClose={vi.fn()} onSave={onSave} />)

    await userEvent.type(screen.getByPlaceholderText('e.g. Weekly groceries'), 'Doctor visit')
    await userEvent.type(screen.getAllByPlaceholderText('0.00')[0], '850')
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Health')
    await userEvent.selectOptions(screen.getByLabelText('Payment method'), 'UPI')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Pending')
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-10' } })
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-12' } })

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Doctor visit',
      amount: 850,
      category: 'Health',
      payment: 'UPI',
      status: 'Pending',
      date: '2026-10-10',
      dueDate: '2026-10-12',
    }))
  })
})
