import { vnToday, shiftDay } from '@/lib/date-utils'
import type { DateRange, RangeKey } from '../types'

const fmtDay = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`

/** Monday of the VN week containing `day` */
function mondayOf(day: string): string {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay() // 0=Sun
  return shiftDay(day, dow === 0 ? -6 : 1 - dow)
}

/** Convert a relative key into concrete VN dates (Asia/Ho_Chi_Minh). */
export function resolveRange(key: RangeKey, custom?: { from: string; to: string }): DateRange {
  const today = vnToday()
  switch (key) {
    case 'yesterday': {
      const y = shiftDay(today, -1)
      return { key, from: y, to: y, label: 'Hôm qua' }
    }
    case 'day_before_yesterday': {
      const d = shiftDay(today, -2)
      return { key, from: d, to: d, label: 'Hôm kia' }
    }
    case 'this_week':
      return { key, from: mondayOf(today), to: today, label: 'Tuần này' }
    case 'last_week': {
      const mon = shiftDay(mondayOf(today), -7)
      return { key, from: mon, to: shiftDay(mon, 6), label: 'Tuần trước' }
    }
    case 'last_7_days':
      return { key, from: shiftDay(today, -6), to: today, label: '7 ngày qua' }
    case 'this_month':
      return { key, from: `${today.slice(0, 7)}-01`, to: today, label: 'Tháng này' }
    case 'last_month': {
      const firstThis = `${today.slice(0, 7)}-01`
      const lastPrev = shiftDay(firstThis, -1)
      return { key, from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev, label: 'Tháng trước' }
    }
    case 'this_year':
      return { key, from: `${today.slice(0, 4)}-01-01`, to: today, label: 'Năm nay' }
    case 'custom': {
      if (custom && isDay(custom.from) && isDay(custom.to)) {
        const label = custom.from === custom.to
          ? `Ngày ${fmtDay(custom.from)}`
          : `Từ ${fmtDay(custom.from)} đến ${fmtDay(custom.to)}`
        return { key, from: custom.from, to: custom.to, label }
      }
      return resolveRange('today')
    }
    case 'today':
    default:
      return { key: 'today', from: today, to: today, label: 'Hôm nay' }
  }
}

export function isDay(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

/** Same-length period immediately before `r` (for comparisons). */
export function previousRange(r: DateRange): DateRange {
  if (r.key === 'today') return resolveRange('yesterday')
  if (r.key === 'this_week') {
    const days = (Date.parse(r.to) - Date.parse(r.from)) / 86400000
    const from = shiftDay(r.from, -7)
    return { key: 'custom', from, to: shiftDay(from, days), label: 'cùng kỳ tuần trước' }
  }
  if (r.key === 'this_month') {
    const days = (Date.parse(r.to) - Date.parse(r.from)) / 86400000
    const prev = resolveRange('last_month')
    return { key: 'custom', from: prev.from, to: shiftDay(prev.from, days), label: 'cùng kỳ tháng trước' }
  }
  const len = (Date.parse(r.to) - Date.parse(r.from)) / 86400000 + 1
  const to = shiftDay(r.from, -1)
  const from = shiftDay(to, -(len - 1))
  return resolveRange('custom', { from, to })
}
