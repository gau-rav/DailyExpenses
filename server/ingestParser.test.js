import { describe, it, expect } from 'vitest'
import { AUTO_ADD_CONFIDENCE, INGEST_CATEGORIES, INGEST_PAYMENTS, parseTransactionEmail } from './ingestParser.js'

const receivedAt = '2026-01-12T10:00:00+05:30'

function parse(overrides) {
  return parseTransactionEmail({ from: '', subject: '', text: '', receivedAt, ...overrides })
}

describe('parseTransactionEmail categories and payments', () => {
  it('exposes the supported categories and payment methods', () => {
    expect(INGEST_CATEGORIES).toContain('Food')
    expect(INGEST_CATEGORIES).toContain('Other')
    expect(INGEST_PAYMENTS).toEqual(['Card', 'Cash', 'Bank transfer', 'UPI'])
  })
})

describe('parseTransactionEmail debit emails', () => {
  it('parses an HDFC UPI debit with a comma amount and VPA merchant', () => {
    const result = parse({
      from: 'HDFC Bank <alerts@hdfcbank.net>',
      subject: 'Transaction alert',
      text: 'Dear Customer, Rs.1,250.00 has been debited from your account ending 1234 on 12-01-26 to VPA swiggy@ybl. Available balance is Rs 8,432.10.',
    })

    expect(result.ignored).toBe(false)
    expect(result.bank).toBe('HDFC Bank')
    expect(result.parsed).toEqual({
      title: 'Swiggy',
      amount: 1250,
      category: 'Food',
      payment: 'UPI',
      date: '2026-01-12',
    })
    expect(result.confidence).toBeGreaterThanOrEqual(AUTO_ADD_CONFIDENCE)
    expect(result.warnings).toEqual([])
  })

  it('parses an ICICI credit card transaction with a named merchant', () => {
    const result = parse({
      from: 'ICICI Bank',
      subject: 'Debit card transaction',
      text: 'Your ICICI Bank Credit Card XX1234 has been charged INR 2,499 on 12 Jan 2026 at Amazon. Avl bal: INR 50,000.',
    })

    expect(result.ignored).toBe(false)
    expect(result.bank).toBe('ICICI Bank')
    expect(result.parsed.amount).toBe(2499)
    expect(result.parsed.payment).toBe('Card')
    expect(result.parsed.title).toBe('Amazon')
    expect(result.parsed.category).toBe('Shopping')
  })

  it('parses a NEFT transfer as a bank transfer', () => {
    const result = parse({
      from: 'Axis Bank',
      subject: 'Transaction alert',
      text: 'INR 10,000.00 debited from your Axis Bank account via NEFT on 12/01/2026 towards VPA rent@okhdfcbank.',
    })

    expect(result.ignored).toBe(false)
    expect(result.parsed.amount).toBe(10000)
    expect(result.parsed.payment).toBe('UPI')
    expect(result.parsed.title).toBe('Rent')
  })

  it('treats ATM withdrawals as cash and keeps the generic title', () => {
    const result = parse({
      from: 'State Bank of India',
      subject: 'ATM withdrawal',
      text: 'Rs 2,000 withdrawn from ATM on 12-01-2026 using your debit card.',
    })

    expect(result.ignored).toBe(false)
    expect(result.bank).toBe('SBI')
    expect(result.parsed.payment).toBe('Cash')
    expect(result.parsed.title).toBe('SBI transaction')
  })

  it('prefers the debit amount over the available balance', () => {
    const result = parse({
      from: 'Kotak Bank',
      subject: 'Transaction alert',
      text: 'Rs 500.00 debited from your account. Available balance is Rs 9,000.00.',
    })

    expect(result.parsed.amount).toBe(500)
  })

  it('does not keep the raw body in the parsed output', () => {
    const result = parse({ from: 'HDFC Bank', text: 'Rs 100 debited at Cafe Coffee Day on 12 Jan 2026' })
    expect(Object.keys(result.parsed).sort()).toEqual(['amount', 'category', 'date', 'payment', 'title'].sort())
  })
})

describe('parseTransactionEmail reviews and skips', () => {
  it('flags foreign currency and lowers confidence below auto-add', () => {
    const result = parse({
      from: 'HDFC Bank',
      subject: 'International transaction',
      text: 'USD 12.50 has been spent on your card ending 1234 at Netflix on 12 Jan 2026.',
    })

    expect(result.ignored).toBe(false)
    expect(result.parsed.amount).toBe(12.5)
    expect(result.warnings).toContain('foreign_currency')
    expect(result.confidence).toBeLessThan(AUTO_ADD_CONFIDENCE)
  })

  it('falls back to the received date and warns when the body has no date', () => {
    const result = parse({ from: 'HDFC Bank', text: 'Rs 250 debited at Swiggy' })
    expect(result.parsed.date).toBe('2026-01-12')
    expect(result.warnings).toContain('date_from_email')
  })

  it('ignores OTP emails that contain a code', () => {
    const result = parse({ from: 'SBI', subject: 'OTP', text: 'OTP 123456 for transaction of Rs 500 at Amazon. Do not share.' })
    expect(result).toEqual({ ignored: true, reason: 'otp_message' })
  })

  it('does not ignore a real debit alert that only has an OTP footer', () => {
    const result = parse({ from: 'HDFC Bank', text: 'Rs 1,250.00 debited from your account to VPA swiggy@ybl. Never share your OTP with anyone.' })
    expect(result.ignored).toBe(false)
    expect(result.parsed.amount).toBe(1250)
  })

  it('ignores credited and refunded transactions', () => {
    expect(parse({ from: 'HDFC Bank', text: 'Rs 5,000 credited to your account on 12-01-26.' })).toEqual({ ignored: true, reason: 'credit_or_refund' })
    expect(parse({ from: 'Amazon', text: 'Refund of Rs 500 has been credited to your account.' })).toEqual({ ignored: true, reason: 'refund_or_reversal' })
  })

  it('ignores failed, declined, and reversed transactions', () => {
    expect(parse({ from: 'ICICI', text: 'Transaction of Rs 500 at Amazon failed on 12-01-26.' })).toEqual({ ignored: true, reason: 'failed_or_reversed' })
    expect(parse({ from: 'HDFC', text: 'Rs 500 debited but the transaction was declined.' })).toEqual({ ignored: true, reason: 'failed_or_reversed' })
  })

  it('ignores messages without a debit signal or an amount', () => {
    expect(parse({ from: 'HDFC Bank', subject: 'Monthly statement is ready' })).toEqual({ ignored: true, reason: 'no_debit_signal' })
    expect(parse({ from: 'HDFC Bank', text: 'Your account has been debited.' })).toEqual({ ignored: true, reason: 'amount_not_found' })
  })

  it('ignores empty messages', () => {
    expect(parse({})).toEqual({ ignored: true, reason: 'empty_message' })
  })
})
