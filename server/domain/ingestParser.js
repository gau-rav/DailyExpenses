export const INGEST_CATEGORIES = ['Food', 'Grocery', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Rent', 'Education', 'Other']

export const INGEST_PAYMENTS = ['Card', 'Cash', 'Bank transfer', 'UPI']

export const AUTO_ADD_CONFIDENCE = 0.75

const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

const OTP_PATTERN = /\b(?:otp|one[\s-]?time password|verification code|do not share|never share)\b/i

const OTP_CODE_PATTERN = /\b(?:otp|one[\s-]?time password|verification code)\b[^.\n]{0,80}\b\d{4,8}\b|\b\d{4,8}\b[^.\n]{0,40}\b(?:otp|one[\s-]?time password|verification code)\b/i

const FAILED_PATTERN = /\b(?:failed|declined|unsuccessful|cancelled|canceled|reversed|reversal|chargeback)\b/i

const REFUND_PATTERN = /\b(?:refund|refunded|chargeback)\b/i

const CREDIT_PATTERN = /\b(?:credited|credit received|payment received|received from)\b/i

const DEBIT_PATTERN = /\b(?:debited|debit|spent|withdrawn|withdrawal|purchase|charged|paid to|paid via|payment to|transaction of|transferred to|sent)\b/i

const DEBIT_WORDS = /\b(?:debited|spent|withdrawn|purchase|charged|paid to|paid via|payment to|transaction of|transferred to|sent)\b/gi

const BALANCE_CONTEXT = /(?:available|avl|closing|current|updated)\s*(?:balance|bal)|(?:balance|bal)\s*(?:is|:)?\s*$/i

const BANK_RULES = [
  [/hdfc/i, 'HDFC Bank'],
  [/icici/i, 'ICICI Bank'],
  [/state bank|\bsbi\b/i, 'SBI'],
  [/axis/i, 'Axis Bank'],
  [/kotak/i, 'Kotak Mahindra Bank'],
  [/idfc/i, 'IDFC FIRST Bank'],
  [/indusind/i, 'IndusInd Bank'],
  [/yes bank/i, 'Yes Bank'],
  [/federal/i, 'Federal Bank'],
  [/punjab national|\bpnb\b/i, 'PNB'],
  [/bank of baroda|\bbob\b/i, 'Bank of Baroda'],
  [/canara/i, 'Canara Bank'],
  [/union bank/i, 'Union Bank'],
  [/hsbc/i, 'HSBC'],
  [/american express|\bamex\b/i, 'American Express'],
  [/sbi card/i, 'SBI Card'],
  [/paytm/i, 'Paytm'],
  [/phonepe/i, 'PhonePe'],
  [/\bcred\b/i, 'CRED'],
  [/airtel/i, 'Airtel'],
  [/jio/i, 'Jio'],
  [/vodafone|\bvi\b/i, 'Vi'],
]

const CATEGORY_RULES = [
  [/grocery|bigbasket|blinkit|zepto|instamart|dmart|supermarket|reliance fresh|jiomart|more supermarket/i, 'Grocery'],
  [/swiggy|zomato|restaurant|cafe|coffee|pizza|dominos|food|eatfit|faasos|behrouz|chai/i, 'Food'],
  [/uber|ola|rapido|metro|irctc|petrol|fuel|indian oil|hpcl|bpcl|shell|parking|fastag|cab|auto|flight|indigo|air india|vistara/i, 'Transport'],
  [/rent|landlord|housing|nobroker/i, 'Rent'],
  [/electricity|water bill|gas bill|broadband|internet|airtel|jio|vodafone|\bvi\b|recharge|mobile bill|utility|insurance/i, 'Bills'],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|decathlon|croma|reliance digital|shopping|store/i, 'Shopping'],
  [/netflix|prime video|hotstar|spotify|bookmyshow|pvr|inox|gaming|steam|youtube premium/i, 'Entertainment'],
  [/pharmacy|apollo|1mg|pharmeasy|hospital|clinic|doctor|gym|fitness|health/i, 'Health'],
  [/school|college|university|tuition|course|udemy|coursera|education|exam/i, 'Education'],
]

const FOREIGN_CURRENCY = /\b(?:usd|eur|gbp|aed|sgd|aud|cad|jpy)\b/i

export function parseTransactionEmail({ from = '', subject = '', text = '', receivedAt = '' } = {}) {
  const sender = normalizeText(from)
  const emailSubject = normalizeText(subject)
  const rawBody = normalizeText(text)
  const body = `${emailSubject}\n${rawBody}`.trim()
  const receivedDate = parseReceivedDate(receivedAt)

  if (!body) return ignored('empty_message')

  const hasDebit = DEBIT_PATTERN.test(body)
  if (OTP_CODE_PATTERN.test(body) || (OTP_PATTERN.test(body) && !hasDebit)) return ignored('otp_message')
  if (FAILED_PATTERN.test(body)) return ignored('failed_or_reversed')
  if (REFUND_PATTERN.test(body)) return ignored('refund_or_reversal')

  if (!hasDebit && CREDIT_PATTERN.test(body)) return ignored('credit_or_refund')
  if (!hasDebit) return ignored('no_debit_signal')

  const amount = findDebitAmount(body)
  if (!amount) return ignored('amount_not_found')

  const bank = detectBank(`${sender}\n${body}`)
  const merchant = findMerchant(body)
  const dateInfo = findTransactionDate(body, receivedDate)
  const payment = detectPayment(body)
  const category = detectCategory(`${merchant} ${body}`)
  const foreign = Boolean(amount.foreign) || (FOREIGN_CURRENCY.test(body) && !/(?:rs\.?|inr|₹)/i.test(body))
  const title = merchant || (bank !== 'Bank' ? `${bank} transaction` : 'Bank transaction')

  const warnings = []
  if (!merchant) warnings.push('missing_merchant')
  if (foreign) warnings.push('foreign_currency')
  if (!dateInfo.fromBody) warnings.push('date_from_email')

  let confidence = 0.45
  if (merchant) confidence += 0.25
  if (dateInfo.fromBody) confidence += 0.1
  if (bank !== 'Bank') confidence += 0.05
  if (foreign) confidence -= 0.2
  confidence = Math.max(0.2, Math.min(0.99, Number(confidence.toFixed(2))))

  return {
    ignored: false,
    parsed: {
      title,
      amount: amount.value,
      category,
      payment,
      date: dateInfo.date,
    },
    confidence,
    warnings,
    bank,
  }
}

function ignored(reason) {
  return { ignored: true, reason }
}

function normalizeText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function findDebitAmount(body) {
  const candidates = []
  const amountPattern = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi
  let match

  while ((match = amountPattern.exec(body))) {
    const value = Number(String(match[1]).replace(/,/g, ''))
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) continue
    const before = body.slice(Math.max(0, match.index - 45), match.index)
    candidates.push({ value, index: match.index, balance: BALANCE_CONTEXT.test(before) })
  }

  if (!candidates.length) {
    const fallback = /\b(?:amount|amt|transaction amount)\s*[:-]?\s*(?:rs\.?|inr|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i.exec(body)
    if (fallback) {
      const value = Number(String(fallback[1]).replace(/,/g, ''))
      if (Number.isFinite(value) && value > 0 && value <= 1_000_000_000) {
        return { value, index: fallback.index, balance: false, foreign: false }
      }
    }

    const foreignAmount = /\b(?:usd|eur|gbp|aed|sgd|aud|cad|jpy)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i.exec(body)
    if (foreignAmount) {
      const value = Number(String(foreignAmount[1]).replace(/,/g, ''))
      if (Number.isFinite(value) && value > 0 && value <= 1_000_000_000) {
        return { value, index: foreignAmount.index, balance: false, foreign: true }
      }
    }
    return null
  }

  const debitIndices = [...body.matchAll(DEBIT_WORDS)].map(item => item.index)
  const ranked = candidates
    .map(candidate => {
      const distance = debitIndices.length
        ? Math.min(...debitIndices.map(index => Math.abs(index - candidate.index)))
        : candidate.index
      return { ...candidate, score: (candidate.balance ? 1_000_000 : 0) + distance }
    })
    .sort((a, b) => a.score - b.score)

  return ranked[0].balance ? null : ranked[0]
}

function findMerchant(body) {
  const patterns = [
    /\b(?:paid to|payment to|transferred to|sent to|to)\s+(?:vpa\s+|upi\s+id\s+)?([a-z0-9][a-z0-9 ._&'@/-]{1,70}?)(?=\s+(?:on|using|via|from|for|ref|txn|transaction|dated)\b|[.,;\n]|$)/i,
    /\b(?:at|towards|for)\s+([a-z0-9][a-z0-9 ._&'@/-]{1,70}?)(?=\s+(?:on|using|via|from|ref|txn|transaction|dated)\b|[.,;\n]|$)/i,
    /\b(?:merchant|payee|beneficiary)\s*[:-]\s*([a-z0-9][a-z0-9 ._&'@/-]{1,70})/i,
    /\b(?:vpa|upi id)\s*[:-]?\s*([a-z0-9._-]+@[a-z0-9.-]+)/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(body)
    if (!match) continue
    const cleaned = cleanMerchant(match[1])
    if (cleaned) return cleaned
  }
  return ''
}

function cleanMerchant(value) {
  let text = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:-]+|[\s,.;:-]+$/g, '')
    .trim()

  text = text.replace(/\b(?:using|via|through|ref|reference|txn|transaction)\b.*$/i, '').trim()
  text = text.replace(/\b(?:on|dated)\s+\d.*$/i, '').trim()
  text = text.replace(/[.,;:-]+$/g, '').trim()
  text = text.replace(/^(?:vpa|upi\s+id)\s*[:-]?\s*/i, '').trim()

  if (!text || text.length < 2) return ''
  if (/^\d+(?::\d+)?$/.test(text)) return ''
  if (/^(?:your|the|a\/c|account|bank|vpa|upi|neft|imps|rtgs|card|credit|debit|transaction|payment|merchant|rs|inr|amount)\b/i.test(text)) return ''

  if (/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(text)) {
    const local = text.split('@')[0].replace(/[._-]+/g, ' ').trim()
    if (local.length < 3 || /^\d+$/.test(local)) return ''
    return titleCase(local)
  }

  if (text.length > 80) text = text.slice(0, 80).trim()
  return titleCase(text)
}

function titleCase(value) {
  const normalized = value === value.toUpperCase() ? value.toLowerCase() : value
  const cased = normalized.replace(/\b[a-z]/g, letter => letter.toUpperCase())
  return cased.replace(/\bhdfc\b/gi, 'HDFC').replace(/\bicici\b/gi, 'ICICI').replace(/\bsbi\b/gi, 'SBI').replace(/\bupi\b/gi, 'UPI')
}

function detectBank(value) {
  for (const [pattern, name] of BANK_RULES) {
    if (pattern.test(value)) return name
  }
  return 'Bank'
}

function detectPayment(body) {
  if (/\bupi\b|\bvpa\b|@(?:ok|ybl|paytm|ibl|axl|upi|apl)\b/i.test(body)) return 'UPI'
  if (/\batm\b|\bcash withdrawal\b/i.test(body)) return 'Cash'
  if (/\bcredit card\b|\bdebit card\b|\bcard ending\b|\bcard no\b|\bvisa\b|\bmastercard\b|\brupay\b|\bamex\b/i.test(body)) return 'Card'
  if (/\bneft\b|\bimps\b|\brtgs\b|\bbank transfer\b|\bnet banking\b/i.test(body)) return 'Bank transfer'
  return 'Bank transfer'
}

function detectCategory(value) {
  const haystack = String(value || '').toLowerCase()
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(haystack)) return category
  }
  return 'Other'
}

function parseReceivedDate(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return indiaDate(new Date())
  return indiaDate(date)
}

function indiaDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function findTransactionDate(body, receivedDate) {
  const receivedTime = new Date(`${receivedDate}T12:00:00.000Z`).getTime()
  const minimum = receivedTime - 45 * 86400000
  const maximum = receivedTime + 86400000
  const candidates = []

  const numeric = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g
  let match
  while ((match = numeric.exec(body))) {
    let day = Number(match[1])
    let month = Number(match[2])
    if (day > 12 && month <= 12) {
      const swap = day
      day = month
      month = swap
    } else if (month > 12 && day <= 12) {
      const swap = day
      day = month
      month = swap
    }
    candidates.push(buildDate(match[3], month, day))
  }

  const dayFirst = /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]([a-z]{3,9})[\s,-]+(\d{2,4})\b/gi
  while ((match = dayFirst.exec(body))) {
    candidates.push(buildDate(match[3], MONTHS[match[2].toLowerCase()], Number(match[1])))
  }

  const monthFirst = /\b([a-z]{3,9})[\s-]+(\d{1,2}),?[\s,-]+(\d{4})\b/gi
  while ((match = monthFirst.exec(body))) {
    candidates.push(buildDate(match[3], MONTHS[match[1].toLowerCase()], Number(match[2])))
  }

  const scored = candidates
    .filter(Boolean)
    .map(date => ({ date, time: new Date(`${date}T12:00:00.000Z`).getTime() }))
    .filter(item => item.time >= minimum && item.time <= maximum)
    .sort((a, b) => Math.abs(a.time - receivedTime) - Math.abs(b.time - receivedTime))

  if (!scored.length) return { date: receivedDate, fromBody: false }
  return { date: scored[0].date, fromBody: true }
}

function buildDate(yearValue, month, day) {
  let year = Number(yearValue)
  if (!Number.isInteger(year) || !month || !day) return ''
  if (year < 100) year += 2000
  if (year < 2000 || year > 2100) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
