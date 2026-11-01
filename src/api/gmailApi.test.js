import { afterEach, describe, expect, it, vi } from 'vitest'
import { disconnectGmail, syncGmail } from './gmailApi.js'

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
})

afterEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.restoreAllMocks()
})

describe('gmailApi', () => {
  describe('syncGmail', () => {
    it('dispatches POST to sync endpoint and returns data', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, imported: 3 }))
      vi.stubGlobal('fetch', fetchMock)

      const res = await syncGmail()
      expect(res).toEqual({ ok: true, imported: 3 })
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/gmail/sync', {
        method: 'POST',
        credentials: 'include',
        headers: undefined,
      })
    })

    it('throws error when sync fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'Token expired' }, false, 401)))
      await expect(syncGmail()).rejects.toThrow('Token expired')
    })

    it('throws a generic error when the body has no error message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 500)))
      await expect(syncGmail()).rejects.toThrow('Request failed (500)')
    })

    it('throws a generic error when the response is not JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => { throw new Error('not json') },
      }))
      await expect(syncGmail()).rejects.toThrow('Request failed (502)')
    })

    it('propagates network failures', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
      await expect(syncGmail()).rejects.toThrow('network down')
    })
  })

  describe('disconnectGmail', () => {
    it('dispatches DELETE to disconnect endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      const res = await disconnectGmail()
      expect(res).toEqual({ ok: true })
      expect(fetchMock).toHaveBeenCalledWith('/api/integrations/gmail', {
        method: 'DELETE',
        credentials: 'include',
        headers: undefined,
      })
    })

    it('throws when disconnecting fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'Not connected' }, false, 404)))
      await expect(disconnectGmail()).rejects.toThrow('Not connected')
    })
  })
})
