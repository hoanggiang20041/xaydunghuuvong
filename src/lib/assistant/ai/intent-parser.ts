/**
 * Cheap, local, rule-based intent parser for Vietnamese questions.
 * Handles the common COUNT / SUM / GROUP BY questions with zero LLM calls.
 */
import { strip, clean, hasAny } from './text'
import type { Intent, RangeKey } from '../types'
import { vnToday } from '@/lib/date-utils'
import { isDay } from './dates'
import {
  type Catalog, findMaterial, findDump, extractPlate, findVehicle,
} from '../query/catalog'

export interface ParsedSlots {
  intent?: Intent
  rangeKey?: RangeKey
  custom?: { from: string; to: string }
  materialId?: string
  materialName?: string
  vehicleId?: string
  plate?: string
  unknownPlate?: string
  destId?: string
  destName?: string
  unknownDest?: string
  hourFrom?: number
  hourTo?: number
  followUp: boolean
  uncertainTime?: boolean
}

const PLATE_RE = /\b\d{2}\s*-?\s*[a-z]{1,2}\d?\s*-?\s*(?:\d[\s.\-]?){4,5}/

export function parseRules(text: string, catalog: Catalog): ParsedSlots {
  let s = strip(text)
  const out: ParsedSlots = { followUp: /^(the|con|vay|the con|con thi|vay con|neu|con neu)\b/.test(s) }

  // ---- plate (extract first, then remove so its digits don't look like dates/hours)
  const plateKey = extractPlate(text)
  if (plateKey) {
    const v = findVehicle(plateKey, catalog.vehicles)
    if (v) { out.vehicleId = v.id; out.plate = v.plate } else out.unknownPlate = plateKey
    s = s.replace(PLATE_RE, ' ')
  }

  // ---- material & dump site (diacritic-aware on the original text)
  const mat = findMaterial(text, catalog.materials)
  if (mat) { out.materialId = mat.id; out.materialName = mat.name }
  const dump = findDump(text, catalog.dumps)
  if (dump) { out.destId = dump.id; out.destName = dump.name }
  else {
    const m = clean(text).match(/(?:điểm đổ|bãi đổ)\s+(\S+(?:\s\S+)?)\s+(?:có|bao|được|nhận)/u)
    if (m) out.unknownDest = m[1]
  }

  // ---- intent (order matters)
  out.intent = detectIntent(s, !!out.destId)

  // ---- date range (ignore the baseline in "so với hôm qua")
  const rangeText = out.intent === 'compare'
    ? s.replace(/so (sanh )?voi (ngay )?(hom qua|hom kia|tuan truoc|thang truoc)/, ' ')
    : s
  Object.assign(out, detectRange(rangeText))

  // ---- time of day
  Object.assign(out, detectHours(s))

  // time-ish words present but no range resolved → rules may be wrong, let the LLM try
  out.uncertainTime = !out.rangeKey && out.hourFrom === undefined &&
    hasAny(s, ['qua', 'roi', 'truoc', 'bua', 'tuan', 'thang', 'nam', 'ngay', 'sang', 'chieu', 'toi', 'trua', 'dem', 'gio', 'dau thang', 'dau tuan', 'cuoi', 'sau', 'kia', 'mai'])

  return out
}

function detectIntent(s: string, hasDest: boolean): Intent | undefined {
  if (hasAny(s, ['so voi', 'so sanh', 'nhieu hon hay it hon', 'tang hay giam', 'chenh lech', 'hon hom qua', 'hon tuan truoc', 'hon thang truoc'])) return 'compare'
  if (hasAny(s, ['chua ra', 'dang o cong trinh', 'con trong cong trinh', 'con o cong trinh', 'dang o trong', 'dang o ct', 'chua roi', 'con o trong', 'dang trong cong trinh'])) return 'onsite'
  if (hasAny(s, ['khung gio', 'gio nao', 'gio cao diem', 'luc nao nhieu', 'luc nao dong'])) return 'hourly_peak'
  if (!hasDest && hasAny(s, ['do o dau', 'do dau', 'bai do nao', 'diem do nao', 'bai nao', 'o dau', 'noi do', 'diem do', 'bai do'])) return 'destination_summary'
  if (hasAny(s, ['nhieu nhat', 'chay nhieu', 'nhieu chuyen nhat', 'cham nhat']) && hasAny(s, ['xe', 'bien so', 'tai xe'])) return 'top_vehicle'
  if (hasAny(s, ['nhung xe nao', 'nhung bien so', 'bien so nao', 'xe nao', 'danh sach xe', 'cac xe', 'nhung xe', 'cac bien so', 'liet ke'])) return 'vehicle_list'
  if (hasAny(s, ['vat lieu nao', 'vat lieu gi', 'loai vat lieu', 'cho gi', 'cho nhung gi', 'cho cai gi'])) return 'material_summary'
  if (hasAny(s, ['bao nhieu xe', 'may xe', 'xe khac nhau', 'bao nhieu chiec', 'may chiec', 'bao nhieu bien so', 'so xe'])) return 'vehicle_count'
  if (hasAny(s, ['khoi', 'm3', 'met khoi', 'khoi luong', 'the tich'])) return 'total_volume'
  if (hasAny(s, ['chuyen', 'luot', 'cuoc', 'so chuyen', 'bao nhieu', 'tong cong', 'thong ke', 'tinh hinh', 'tong ket', 'bao cao'])) return 'trip_count'
  return undefined
}

function detectRange(s: string): Pick<ParsedSlots, 'rangeKey' | 'custom'> {
  if (hasAny(s, ['hom kia', 'bua kia'])) return { rangeKey: 'day_before_yesterday' }
  if (hasAny(s, ['hom qua', 'bua qua', 'hom bua', 'qua hom qua'])) return { rangeKey: 'yesterday' }
  if (hasAny(s, ['tuan truoc', 'tuan roi', 'tuan vua roi', 'tuan qua'])) return { rangeKey: 'last_week' }
  if (hasAny(s, ['tuan nay'])) return { rangeKey: 'this_week' }
  if (hasAny(s, ['thang truoc', 'thang roi', 'thang vua roi', 'thang qua'])) return { rangeKey: 'last_month' }
  if (hasAny(s, ['thang nay'])) return { rangeKey: 'this_month' }
  if (hasAny(s, ['nam nay'])) return { rangeKey: 'this_year' }

  const nDays = s.match(/\b(\d{1,3}) ngay (qua|gan day|gan nhat|vua qua|truoc)\b/)
  if (nDays) {
    const n = Math.min(Math.max(Number(nDays[1]), 1), 366)
    if (n === 7) return { rangeKey: 'last_7_days' }
    const today = vnToday()
    const from = new Date(Date.parse(`${today}T00:00:00Z`) - (n - 1) * 86400000).toISOString().slice(0, 10)
    return { rangeKey: 'custom', custom: { from, to: today } }
  }

  // "ngày 3 tháng 10", "ngày 3/10", "3/10"
  const d = s.match(/(?:ngay\s+)?\b(\d{1,2})\s*(?:\/|-|thang)\s*(\d{1,2})\b/) || s.match(/\bngay\s+(\d{1,2})\b/)
  if (d) {
    const today = vnToday()
    const year = Number(today.slice(0, 4))
    const day = Number(d[1])
    const month = d[2] ? Number(d[2]) : Number(today.slice(5, 7))
    let iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (iso > today) iso = `${year - 1}${iso.slice(4)}`
    if (isDay(iso) && day >= 1 && day <= 31 && month >= 1 && month <= 12) return { rangeKey: 'custom', custom: { from: iso, to: iso } }
  }

  // "tháng 9"
  const mo = s.match(/\bthang\s+(\d{1,2})\b/)
  if (mo) {
    const month = Number(mo[1])
    if (month >= 1 && month <= 12) {
      const today = vnToday()
      let year = Number(today.slice(0, 4))
      if (month > Number(today.slice(5, 7))) year--
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
      return { rangeKey: 'custom', custom: { from, to: last > today ? today : last } }
    }
  }

  if (hasAny(s, ['hom nay', 'bay gio', 'hien tai', 'ngay hom nay'])) return { rangeKey: 'today' }
  return {}
}

function detectHours(s: string): Pick<ParsedSlots, 'hourFrom' | 'hourTo'> {
  const m = s.match(/\btu\s+(\d{1,2})\s*(?:gio|h)?\s*(sang|chieu|toi)?\s*(?:den|toi|-)\s*(\d{1,2})\s*(?:gio|h)?\s*(sang|trua|chieu|toi)?/)
  if (m) {
    let a = Number(m[1]); let b = Number(m[3])
    const pmA = m[2] === 'chieu' || m[2] === 'toi'
    const pmB = m[4] === 'chieu' || m[4] === 'toi' || pmA
    if (pmA && a < 12) a += 12
    if (pmB && b < 12) b += 12
    if (b <= a && b < 12) b += 12
    if (a >= 0 && b <= 24 && a < b) return { hourFrom: a, hourTo: b }
  }
  if (hasAny(s, ['buoi sang', 'sang nay'])) return { hourFrom: 5, hourTo: 12 }
  if (hasAny(s, ['buoi trua', 'trua nay'])) return { hourFrom: 11, hourTo: 14 }
  if (hasAny(s, ['buoi chieu', 'chieu nay'])) return { hourFrom: 12, hourTo: 18 }
  if (hasAny(s, ['buoi toi', 'toi nay'])) return { hourFrom: 18, hourTo: 24 }
  return {}
}
