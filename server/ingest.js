import { AUTO_ADD_CONFIDENCE, parseTransactionEmail } from './ingestParser.js'
import {
  claimIngestMessage,
  countIngestMessages,
  createExpense,
  finishIngestMessage,
  getIngestMessage,
  getIngestSettings,
  insertIngestMessage,
  releaseIngestMessage,
} from './db.js'

export class IngestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function getIngestStatus(userId) {
  const [settings, pendingCount] = await Promise.all([
    getIngestSettings(userId),
    countIngestMessages(userId, 'pending'),
  ])
  return { ...settings, pendingCount }
}

export async function ingestEmail(userId, input) {
  const settings = await getIngestSettings(userId)
  if (!settings.enabled) throw new IngestError(403, 'Email auto-capture is turned off')

  const messageId = String(input?.messageId || '').trim()
  if (!messageId) throw new IngestError(400, 'messageId is required')
  if (messageId.length > 300) throw new IngestError(400, 'messageId is too long')

  const sender = String(input?.from || '').trim().slice(0, 320)
  const subject = String(input?.subject || '').trim().slice(0, 500)
  const text = String(input?.text || '').trim().slice(0, 30000)
  if (!subject && !text) throw new IngestError(400, 'Email subject or body is required')

  const receivedAt = input?.receivedAt ? new Date(input.receivedAt) : new Date()
  if (Number.isNaN(receivedAt.getTime())) throw new IngestError(400, 'receivedAt must be a valid date')

  const result = parseTransactionEmail({ from: sender, subject, text, receivedAt: receivedAt.toISOString() })

  if (result.ignored) {
    const saved = await insertIngestMessage(userId, {
      externalId: messageId,
      sender,
      subject,
      receivedAt,
      status: 'ignored',
      reason: result.reason,
    })
    return { ...saved, autoAdded: false }
  }

  const saved = await insertIngestMessage(userId, {
    externalId: messageId,
    sender,
    subject,
    receivedAt,
    parsed: result.parsed,
    confidence: result.confidence,
    warnings: result.warnings,
    bank: result.bank,
    status: 'pending',
  })

  if (saved.duplicate) return { ...saved, autoAdded: false }

  const shouldAutoAdd = settings.autoAdd
    && result.confidence >= AUTO_ADD_CONFIDENCE
    && !result.warnings.includes('foreign_currency')

  if (!shouldAutoAdd) return { ...saved, autoAdded: false }

  try {
    const expense = await autoAddExpense(userId, result)
    const message = await finishIngestMessage(userId, saved.message.id, 'added', expense.id)
    return { message, duplicate: false, autoAdded: true }
  } catch (error) {
    console.error('Email auto-add failed', error)
    return { ...saved, autoAdded: false }
  }
}

async function autoAddExpense(userId, result) {
  return createExpense(userId, {
    title: result.parsed.title,
    amount: result.parsed.amount,
    category: result.parsed.category,
    payment: result.parsed.payment,
    date: result.parsed.date,
    dueDate: result.parsed.date,
    notes: `Auto-captured from ${result.bank} email`,
    status: 'Paid',
    recurring: false,
    splitExpense: { enabled: false, payments: [] },
  })
}

export async function acceptIngestMessage(userId, messageId, expenseInput) {
  const message = await claimIngestMessage(userId, messageId)
  if (!message) {
    const existing = await getIngestMessage(userId, messageId)
    if (!existing) throw new IngestError(404, 'Email message not found')
    throw new IngestError(409, `This email is already marked ${existing.status}`)
  }

  try {
    const parsed = message.parsed || {}
    const input = expenseInput && typeof expenseInput === 'object' ? expenseInput : {}
    const date = input.date || parsed.date
    const expense = await createExpense(userId, {
      title: String(input.title || parsed.title || 'Email transaction').trim(),
      amount: input.amount ?? parsed.amount,
      category: input.category || parsed.category || 'Other',
      payment: input.payment || parsed.payment || 'Bank transfer',
      date,
      dueDate: input.dueDate || date,
      notes: String(input.notes ?? `Imported from ${message.bank || 'email'} email`).trim(),
      status: input.status || 'Paid',
      recurring: false,
      splitExpense: { enabled: false, payments: [] },
    })
    return { message: await finishIngestMessage(userId, messageId, 'added', expense.id), expense }
  } catch (error) {
    await releaseIngestMessage(userId, messageId)
    throw error
  }
}

export async function ignoreIngestMessage(userId, messageId) {
  const message = await getIngestMessage(userId, messageId)
  if (!message) throw new IngestError(404, 'Email message not found')
  if (message.status === 'added') throw new IngestError(409, 'This email was already added as an expense')
  return { message: await finishIngestMessage(userId, messageId, 'ignored') }
}
