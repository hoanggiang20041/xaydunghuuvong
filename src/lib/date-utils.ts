const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh'

/**
 * Get current server time as Date
 */
export function serverNow(): Date {
  return new Date()
}

/**
 * Format date to Vietnamese format DD/MM/YYYY HH:mm:ss
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('vi-VN', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format date only DD/MM/YYYY
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('vi-VN', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format time only HH:mm
 */
export function formatTime(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('vi-VN', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Get start of day in UTC for database queries
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date.toLocaleString('en-US', { timeZone: APP_TIMEZONE }))
  d.setHours(0, 0, 0, 0)
  // Convert back to UTC
  const offset = getTimezoneOffset()
  return new Date(d.getTime() - offset)
}

/**
 * Get end of day in UTC for database queries
 */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date.toLocaleString('en-US', { timeZone: APP_TIMEZONE }))
  d.setHours(23, 59, 59, 999)
  const offset = getTimezoneOffset()
  return new Date(d.getTime() - offset)
}

function getTimezoneOffset(): number {
  // Vietnam is UTC+7
  return 7 * 60 * 60 * 1000
}

/**
 * Generate trip code: TRIP-YYYYMMDD-XXX
 */
export function generateTripCode(sequenceNumber: number): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE }).replace(/-/g, '')
  const seq = String(sequenceNumber).padStart(3, '0')
  return `TRIP-${dateStr}-${seq}`
}

/**
 * Parse date range from query params
 */
export function parseDateRange(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : startOfDay()
  const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : endOfDay()
  return { start, end }
}
