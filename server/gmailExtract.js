const MAX_TEXT_LENGTH = 30000

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x'
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })
}

export function decodeGmailBody(data) {
  if (!data) return ''
  try {
    return Buffer.from(String(data), 'base64url').toString('utf8')
  } catch {
    return ''
  }
}

export function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function headerValue(headers, name) {
  const header = (headers || []).find(item => String(item?.name || '').toLowerCase() === name.toLowerCase())
  return String(header?.value || '').trim()
}

function collectBodies(part, output) {
  if (!part) return
  const mimeType = String(part.mimeType || '').toLowerCase()
  const data = part.body?.data
  if (data && mimeType === 'text/plain') output.plain.push(decodeGmailBody(data))
  if (data && mimeType === 'text/html') output.html.push(decodeGmailBody(data))
  if (Array.isArray(part.parts)) part.parts.forEach(child => collectBodies(child, output))
}

export function extractGmailMessage(message) {
  const payload = message?.payload || {}
  const headers = payload.headers || []
  const output = { plain: [], html: [] }
  collectBodies(payload, output)
  const plainText = output.plain.map(value => value.trim()).filter(Boolean).join('\n')
  const htmlText = htmlToText(output.html.join('\n'))
  const text = (plainText || htmlText).slice(0, MAX_TEXT_LENGTH)
  const internalDate = Number(message?.internalDate || 0)

  return {
    messageId: String(message?.id || '').trim(),
    from: headerValue(headers, 'from').slice(0, 320),
    subject: headerValue(headers, 'subject').slice(0, 500),
    text,
    receivedAt: internalDate > 0 ? new Date(internalDate).toISOString() : new Date().toISOString(),
  }
}
