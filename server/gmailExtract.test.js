import { describe, expect, it } from 'vitest'
import { decodeGmailBody, extractGmailMessage, htmlToText } from './gmailExtract.js'

function encode(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function message(payload, internalDate = Date.UTC(2026, 9, 20, 10, 0, 0)) {
  return { id: 'message-1', internalDate: String(internalDate), payload }
}

describe('gmailExtract', () => {
  it('reads plain text from multipart messages', () => {
    const extracted = extractGmailMessage(message({
      headers: [
        { name: 'From', value: 'Alerts <alerts@bank.example>' },
        { name: 'Subject', value: 'Transaction alert' },
      ],
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: encode('Rs 1,250 debited from your account') } },
        { mimeType: 'text/html', body: { data: encode('<p>Rs 1,250 debited</p>') } },
      ],
    }))

    expect(extracted.messageId).toBe('message-1')
    expect(extracted.from).toBe('Alerts <alerts@bank.example>')
    expect(extracted.subject).toBe('Transaction alert')
    expect(extracted.text).toBe('Rs 1,250 debited from your account')
    expect(extracted.receivedAt).toBe(new Date(Date.UTC(2026, 9, 20, 10, 0, 0)).toISOString())
  })

  it('falls back to HTML content when plain text is missing', () => {
    const extracted = extractGmailMessage(message({
      headers: [{ name: 'subject', value: 'Card alert' }],
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/html', body: { data: encode('<div>Rs&nbsp;500 spent</div><div>at Coffee Shop</div>') } },
      ],
    }))

    expect(extracted.text).toContain('Rs 500 spent')
    expect(extracted.text).toContain('at Coffee Shop')
    expect(extracted.subject).toBe('Card alert')
  })

  it('handles nested parts and empty bodies', () => {
    const extracted = extractGmailMessage(message({
      mimeType: 'multipart/mixed',
      parts: [{
        mimeType: 'multipart/alternative',
        parts: [{ mimeType: 'text/plain', body: { data: encode('Nested body') } }],
      }],
    }))

    expect(extracted.text).toBe('Nested body')
    expect(extractGmailMessage(message({ mimeType: 'text/plain', body: {} })).text).toBe('')
  })

  it('decodes entities and strips markup', () => {
    expect(htmlToText('<p>Tom &amp; Jerry</p><script>bad()</script><br>Next')).toBe('Tom & Jerry\n\nNext')
    expect(decodeGmailBody(encode('hello'))).toBe('hello')
  })
})
