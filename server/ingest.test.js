import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IngestError, acceptIngestMessage, getIngestStatus, ignoreIngestMessage, ingestEmail } from './ingest.js'
import * as db from './db.js'

vi.mock('./db.js', () => ({
  getIngestSettings: vi.fn(),
  countIngestMessages: vi.fn(),
  insertIngestMessage: vi.fn(),
  claimIngestMessage: vi.fn(),
  releaseIngestMessage: vi.fn(),
  finishIngestMessage: vi.fn(),
  getIngestMessage: vi.fn(),
  createExpense: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ingest service', () => {
  describe('IngestError', () => {
    it('sets status and message correctly', () => {
      const err = new IngestError(403, 'Forbidden test')
      expect(err.status).toBe(403)
      expect(err.message).toBe('Forbidden test')
      expect(err).toBeInstanceOf(Error)
    })
  })

  describe('getIngestStatus', () => {
    it('combines settings and pending count', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: false })
      db.countIngestMessages.mockResolvedValue(4)

      const status = await getIngestStatus('user-1')
      expect(status).toEqual({ enabled: true, autoAdd: false, pendingCount: 4 })
    })
  })

  describe('ingestEmail validations and processing', () => {
    it('throws 403 when auto-capture is disabled', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: false })
      await expect(ingestEmail('user-1', { messageId: 'm1', subject: 'Alert' })).rejects.toMatchObject({ status: 403 })
    })

    it('throws 400 when messageId is missing', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true })
      await expect(ingestEmail('user-1', { subject: 'Alert' })).rejects.toMatchObject({ status: 400, message: /messageId is required/ })
    })

    it('throws 400 when subject and text are both missing', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true })
      await expect(ingestEmail('user-1', { messageId: 'm1' })).rejects.toMatchObject({ status: 400, message: /subject or body is required/ })
    })

    it('handles ignored transaction emails (e.g. OTP)', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true })
      db.insertIngestMessage.mockResolvedValue({ id: 'msg-rec-1', status: 'ignored', reason: 'otp_message' })

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'OTP verification',
        text: 'Your OTP is 123456. Do not share.',
      })

      expect(result.autoAdded).toBe(false)
      expect(db.insertIngestMessage).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'ignored', reason: 'otp_message' }))
    })

    it('detects duplicates and returns without auto-adding', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: true })
      db.insertIngestMessage.mockResolvedValue({ duplicate: true, message: { id: 'dup' } })

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'Rs 500 debited from HDFC',
        text: 'Rs 500 debited at Amazon',
      })

      expect(result.duplicate).toBe(true)
      expect(result.autoAdded).toBe(false)
    })

    it('throws 400 when messageId is too long', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true })
      await expect(ingestEmail('user-1', { messageId: 'm'.repeat(301), subject: 'Alert' })).rejects.toMatchObject({ status: 400, message: /too long/ })
    })

    it('throws 400 when receivedAt is not a valid date', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true })
      await expect(ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'Rs 500 debited',
        receivedAt: 'not-a-date',
      })).rejects.toMatchObject({ status: 400, message: /valid date/ })
    })

    it('stores a pending message and skips auto-add when autoAdd is disabled', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: false })
      db.insertIngestMessage.mockResolvedValue({ duplicate: false, message: { id: 'msg-1' } })

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'Rs 500 debited at Amazon',
        text: 'Rs 500 debited at Amazon',
      })

      expect(result.autoAdded).toBe(false)
      expect(db.createExpense).not.toHaveBeenCalled()
      expect(db.insertIngestMessage).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'pending' }))
    })

    it('skips auto-add when parser confidence is below the threshold', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: true })
      db.insertIngestMessage.mockResolvedValue({ duplicate: false, message: { id: 'msg-1' } })

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'Rs 500 debited',
        text: 'Rs 500 debited',
      })

      expect(result.autoAdded).toBe(false)
      expect(db.createExpense).not.toHaveBeenCalled()
    })

    it('skips auto-add for foreign currency warnings', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: true })
      db.insertIngestMessage.mockResolvedValue({ duplicate: false, message: { id: 'msg-1' } })

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'USD 20 spent at Amazon',
        text: 'USD 20 spent at Amazon',
      })

      expect(result.autoAdded).toBe(false)
      expect(db.createExpense).not.toHaveBeenCalled()
      expect(db.insertIngestMessage).toHaveBeenCalledWith('user-1', expect.objectContaining({
        warnings: expect.arrayContaining(['foreign_currency']),
      }))
    })

    it('auto-adds high confidence transaction when autoAdd is enabled', async () => {
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: true })
      db.insertIngestMessage.mockResolvedValue({ duplicate: false, message: { id: 'msg-1' } })
      db.createExpense.mockResolvedValue({ id: 'exp-1' })
      db.finishIngestMessage.mockResolvedValue({ id: 'msg-1', status: 'added' })

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'Rs 1,250 debited',
        text: 'Rs 1,250 debited from account X for Groceries via UPI on 15 Oct 2026',
      })

      expect(result.autoAdded).toBe(true)
      expect(db.createExpense).toHaveBeenCalledWith('user-1', expect.objectContaining({
        amount: 1250,
        category: 'Other',
        status: 'Paid',
      }))
      expect(db.finishIngestMessage).toHaveBeenCalledWith('user-1', 'msg-1', 'added', 'exp-1')
    })

    it('keeps the message pending if auto-add throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: true })
      db.insertIngestMessage.mockResolvedValue({ duplicate: false, message: { id: 'msg-1' } })
      db.createExpense.mockRejectedValue(new Error('database offline'))

      const result = await ingestEmail('user-1', {
        messageId: 'm1',
        subject: 'Rs 1,250 debited',
        text: 'Rs 1,250 debited from account X for Groceries via UPI on 15 Oct 2026',
      })

      expect(result.autoAdded).toBe(false)
      expect(result.message).toEqual({ id: 'msg-1' })
      expect(db.finishIngestMessage).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  describe('acceptIngestMessage and ignoreIngestMessage', () => {
    it('accepts a pending message and creates an expense', async () => {
      db.claimIngestMessage.mockResolvedValue({
        id: 'msg-pending',
        bank: 'HDFC',
        parsed: { title: 'Coffee', amount: 250, category: 'Food', payment: 'Card', date: '2026-10-20' },
      })
      db.createExpense.mockResolvedValue({ id: 'exp-2' })
      db.finishIngestMessage.mockResolvedValue({ id: 'msg-pending', status: 'added' })

      const res = await acceptIngestMessage('user-1', 'msg-pending', { title: 'Special Coffee' })
      expect(res.expense).toEqual({ id: 'exp-2' })
      expect(db.createExpense).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: 'Special Coffee', amount: 250 }))
    })

    it('falls back to parsed values and safe defaults when the message has no details', async () => {
      db.claimIngestMessage.mockResolvedValue({ id: 'msg-pending', bank: 'HDFC', parsed: null })
      db.createExpense.mockResolvedValue({ id: 'exp-3' })
      db.finishIngestMessage.mockResolvedValue({ id: 'msg-pending', status: 'added' })

      await acceptIngestMessage('user-1', 'msg-pending', 'not-an-object')

      expect(db.createExpense).toHaveBeenCalledWith('user-1', expect.objectContaining({
        title: 'Email transaction',
        amount: undefined,
        category: 'Other',
        payment: 'Bank transfer',
        notes: 'Imported from HDFC email',
        status: 'Paid',
        recurring: false,
        splitExpense: { enabled: false, payments: [] },
      }))
    })

    it('throws 404 when accepting missing message', async () => {
      db.claimIngestMessage.mockResolvedValue(null)
      db.getIngestMessage.mockResolvedValue(null)

      await expect(acceptIngestMessage('user-1', 'missing')).rejects.toMatchObject({ status: 404 })
    })

    it('throws 409 when accepting already processed message', async () => {
      db.claimIngestMessage.mockResolvedValue(null)
      db.getIngestMessage.mockResolvedValue({ id: 'm1', status: 'added' })

      await expect(acceptIngestMessage('user-1', 'm1')).rejects.toMatchObject({ status: 409 })
    })

    it('releases the claim and rethrows when expense creation fails', async () => {
      db.claimIngestMessage.mockResolvedValue({ id: 'msg-pending', bank: 'HDFC', parsed: { title: 'Coffee' } })
      db.createExpense.mockRejectedValue(new Error('write failed'))
      db.releaseIngestMessage.mockResolvedValue(undefined)

      await expect(acceptIngestMessage('user-1', 'msg-pending')).rejects.toThrow('write failed')
      expect(db.releaseIngestMessage).toHaveBeenCalledWith('user-1', 'msg-pending')
      expect(db.finishIngestMessage).not.toHaveBeenCalled()
    })

    it('ignores a pending message successfully', async () => {
      db.getIngestMessage.mockResolvedValue({ id: 'm1', status: 'pending' })
      db.finishIngestMessage.mockResolvedValue({ id: 'm1', status: 'ignored' })

      const res = await ignoreIngestMessage('user-1', 'm1')
      expect(res.message.status).toBe('ignored')
    })

    it('throws 404 when ignoring a missing message', async () => {
      db.getIngestMessage.mockResolvedValue(null)
      await expect(ignoreIngestMessage('user-1', 'm1')).rejects.toMatchObject({ status: 404 })
    })

    it('throws 409 when ignoring already added message', async () => {
      db.getIngestMessage.mockResolvedValue({ id: 'm1', status: 'added' })
      await expect(ignoreIngestMessage('user-1', 'm1')).rejects.toMatchObject({ status: 409 })
    })
  })
})
