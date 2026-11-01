import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  acceptIngestMessage,
  fetchIngestMessages,
  fetchIngestStatus,
  ignoreIngestMessage,
  saveIngestSettings,
} from './ingestApi.js'

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
})

afterEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.restoreAllMocks()
})

describe('ingestApi', () => {
  describe('fetchIngestStatus', () => {
    it('fetches ingest integration status', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, enabled: true, pendingCount: 2 }))
      vi.stubGlobal('fetch', fetchMock)

      const res = await fetchIngestStatus()
      expect(res).toEqual({ ok: true, enabled: true, pendingCount: 2 })
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/status', expect.objectContaining({ credentials: 'include' }))
    })
  })

  describe('fetchIngestMessages', () => {
    it('fetches pending messages by default with encoded query', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, messages: [{ id: 'm1' }] }))
      vi.stubGlobal('fetch', fetchMock)

      const res = await fetchIngestMessages('pending')
      expect(res.messages).toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/messages?status=pending', expect.anything())
    })

    it('defaults to pending and URL-encodes custom statuses', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, messages: [] }))
      vi.stubGlobal('fetch', fetchMock)

      await fetchIngestMessages()
      expect(fetchMock).toHaveBeenLastCalledWith('/api/integrations/messages?status=pending', expect.anything())

      await fetchIngestMessages('needs review')
      expect(fetchMock).toHaveBeenLastCalledWith('/api/integrations/messages?status=needs%20review', expect.anything())
    })

    it('throws when the request fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'Inbox unavailable' }, false, 500)))
      await expect(fetchIngestMessages()).rejects.toThrow('Inbox unavailable')
    })
  })

  describe('acceptIngestMessage', () => {
    it('sends POST to accept message with expense payload', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, expense: { id: 'e1' } }))
      vi.stubGlobal('fetch', fetchMock)

      const expense = { title: 'Coffee', amount: 120 }
      const res = await acceptIngestMessage('msg-123', expense)
      expect(res.expense).toEqual({ id: 'e1' })
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/messages/msg-123', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', expense }),
      })
    })

    it('encodes message IDs in the URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      await acceptIngestMessage('id/with space', { title: 'Coffee' })
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/messages/id%2Fwith%20space', expect.anything())
    })

    it('throws when the message was already actioned', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'Already added' }, false, 409)))
      await expect(acceptIngestMessage('msg-123', {})).rejects.toThrow('Already added')
    })
  })

  describe('ignoreIngestMessage', () => {
    it('sends POST to ignore message', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      await ignoreIngestMessage('msg-456')
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/messages/msg-456', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'ignore' }),
      }))
    })

    it('falls back to a status message when the error body is empty', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 404)))
      await expect(ignoreIngestMessage('missing')).rejects.toThrow('Request failed (404)')
    })
  })

  describe('saveIngestSettings', () => {
    it('sends PUT to update settings', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, enabled: true }))
      vi.stubGlobal('fetch', fetchMock)

      await saveIngestSettings({ enabled: true, autoAdd: true })
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true, autoAdd: true }),
      })
    })

    it('throws when saving settings fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'Forbidden' }, false, 403)))
      await expect(saveIngestSettings({ enabled: true })).rejects.toThrow('Forbidden')
    })
  })
})
