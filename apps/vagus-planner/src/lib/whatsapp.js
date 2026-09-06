/**
 * WhatsApp connect helpers for Vagus Planner.
 * Base44 SDK's getWhatsAppConnectURL pointed at their hosted agent bridge;
 * we mirror the contract with a standard wa.me deep link to the configured bot.
 */

const FALLBACK_BOT_DIGITS = '447700900000' // same placeholder CaptureHub used

export function getWhatsAppBotDigits() {
  const raw =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_WHATSAPP_BOT_NUMBER || import.meta.env?.VITE_WHATSAPP_NUMBER)) ||
    FALLBACK_BOT_DIGITS
  return String(raw).replace(/\D/g, '')
}

export function formatWhatsAppBotDisplay(digits = getWhatsAppBotDigits()) {
  const d = String(digits || '').replace(/\D/g, '')
  if (!d) return ''
  return d.startsWith('0') ? d : `+${d}`
}

/**
 * @param {string} [agentName]
 * @param {{ email?: string | null, userId?: string | null }} [opts]
 * @returns {string} https://wa.me/… deep link
 */
export function buildWhatsAppConnectURL(agentName = 'whatsapp_planner', opts = {}) {
  const digits = getWhatsAppBotDigits()
  if (!digits) {
    throw new Error('WhatsApp bot number is not configured (set VITE_WHATSAPP_BOT_NUMBER)')
  }
  const agent = String(agentName || 'whatsapp_planner').trim() || 'whatsapp_planner'
  const lines = [
    'Hi Vagus Planner — please connect my account.',
    `Agent: ${agent}`,
  ]
  if (opts.email) lines.push(`Email: ${String(opts.email).trim()}`)
  if (opts.userId) lines.push(`User: ${String(opts.userId).trim()}`)
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`
}
