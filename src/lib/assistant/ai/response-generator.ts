/**
 * Template responses — no LLM call needed to phrase answers.
 * Numbers come ONLY from the database result passed in; nothing is guessed.
 */
import { fmtNum } from '@/lib/constants'
import type { StructuredQuery } from '../types'
import type { Summary, GroupRow, Comparison } from '../query/statistics-queries'

const n = (v: number) => fmtNum(v)
const lower = (s?: string) => (s ? s.toLocaleLowerCase('vi-VN') : '')
const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase('vi-VN') + s.slice(1)

function when(q: StructuredQuery) {
  let w = q.range.label
  if (q.hourFrom !== undefined || q.hourTo !== undefined) {
    w += ` từ ${q.hourFrom ?? 0} giờ đến ${q.hourTo ?? 24} giờ`
  }
  return w
}

const mat = (q: StructuredQuery) => (q.materialName ? ` chở ${lower(q.materialName)}` : '')
const dest = (q: StructuredQuery) => (q.destName ? ` đổ ở ${q.destName}` : '')
const vol = (v: number) => `${n(v)} m³`

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} và ${items[items.length - 1]}`
}

export function tripCountText(q: StructuredQuery, r: Summary) {
  const W = when(q)
  if (r.trips === 0) {
    return q.plate
      ? { found: false, answer: `${W} xe ${q.plate} chưa chạy chuyến nào${mat(q)}${dest(q)}.` }
      : { found: false, answer: `${W} chưa có chuyến xe nào${mat(q)}${dest(q)}.` }
  }
  const who = q.plate ? `xe ${q.plate} chạy` : 'có'
  const tail = r.volume > 0 ? `, tổng cộng ${n(r.volume)} khối` : ''
  return {
    found: true,
    answer: `${W} ${who} ${n(r.trips)} chuyến${mat(q)}${dest(q)}${tail}.`,
    headline: r.volume > 0 ? `${n(r.trips)} chuyến — ${vol(r.volume)}` : `${n(r.trips)} chuyến`,
  }
}

export function totalVolumeText(q: StructuredQuery, r: Summary) {
  const W = when(q)
  const what = q.materialName ? ` ${lower(q.materialName)}` : ''
  const who = q.plate ? ` xe ${q.plate}` : ''
  if (r.trips === 0) return { found: false, answer: `${W}${who} chưa có chuyến nào${mat(q)}${dest(q)}.` }
  if (r.volume <= 0) return { found: true, answer: `${W}${who} có ${n(r.trips)} chuyến${mat(q)} nhưng chưa nhập khối lượng.`, headline: `${n(r.trips)} chuyến` }
  return {
    found: true,
    answer: `${W}${who} tổng cộng ${n(r.volume)} khối${what}${dest(q)}, từ ${n(r.trips)} chuyến.`,
    headline: `${vol(r.volume)} — ${n(r.trips)} chuyến`,
  }
}

export function vehicleCountText(q: StructuredQuery, r: Summary) {
  const W = when(q)
  if (r.vehicles === 0) return { found: false, answer: `${W} chưa có xe nào${mat(q)}${dest(q)}.` }
  return {
    found: true,
    answer: `${W} có ${n(r.vehicles)} xe${mat(q)}${dest(q)}, tổng ${n(r.trips)} chuyến.`,
    headline: `${n(r.vehicles)} xe — ${n(r.trips)} chuyến`,
  }
}

export function vehicleListText(q: StructuredQuery, rows: GroupRow[]) {
  const W = when(q)
  if (!rows.length) return { found: false, answer: `${W} chưa có xe nào${mat(q)}${dest(q)}.` }
  const shown = rows.slice(0, 8).map(r => r.name)
  const more = rows.length > 8 ? ` và ${rows.length - 8} xe khác` : ''
  return {
    found: true,
    answer: `${W} có ${rows.length} xe${mat(q)}: ${listJoin(shown)}${more}.`,
    headline: `${rows.length} xe`,
  }
}

export function topVehicleText(q: StructuredQuery, rows: GroupRow[]) {
  const W = when(q)
  if (!rows.length) return { found: false, answer: `${W} chưa có chuyến xe nào${mat(q)}.` }
  const top = rows[0]
  const ties = rows.filter(r => r.trips === top.trips)
  if (ties.length > 1) {
    return {
      found: true,
      answer: `${W} các xe ${listJoin(ties.slice(0, 4).map(t => t.name))} chạy nhiều nhất, mỗi xe ${n(top.trips)} chuyến.`,
      headline: `${n(top.trips)} chuyến / xe`,
    }
  }
  return {
    found: true,
    answer: `${W} xe ${top.name} chạy nhiều nhất: ${n(top.trips)} chuyến${top.volume > 0 ? `, ${n(top.volume)} khối` : ''}.`,
    headline: `${top.name} — ${n(top.trips)} chuyến`,
  }
}

export function destinationText(q: StructuredQuery, rows: GroupRow[]) {
  const W = when(q)
  const what = q.materialName ? `${lower(q.materialName)} ` : ''
  if (!rows.length) return { found: false, answer: `${W} chưa có chuyến xe nào${mat(q)}.` }
  const known = rows.filter(r => r.name !== 'Chưa ghi điểm đổ')
  if (!known.length) return { found: true, answer: `${W} có ${n(rows[0].trips)} chuyến${mat(q)} nhưng chưa ghi điểm đổ.`, headline: 'Chưa ghi điểm đổ' }
  const top = known[0]
  const second = known[1] ? ` Tiếp theo là ${known[1].name}, ${n(known[1].trips)} chuyến.` : ''
  return {
    found: true,
    answer: `${W} ${what}đổ nhiều nhất ở ${top.name}: ${n(top.trips)} chuyến${top.volume > 0 ? `, ${n(top.volume)} khối` : ''}.${second}`,
    headline: `${top.name} — ${n(top.trips)} chuyến`,
  }
}

export function materialText(q: StructuredQuery, rows: GroupRow[]) {
  const W = when(q)
  if (!rows.length) return { found: false, answer: `${W} chưa có chuyến xe nào.` }
  const parts = rows.map(r => `${lower(r.name)} ${n(r.trips)} chuyến`)
  return { found: true, answer: `${W} đã chở: ${listJoin(parts)}.`, headline: rows.map(r => `${r.name} ${r.trips}`).join(' · ') }
}

export function hourlyText(q: StructuredQuery, rows: { hour: number; trips: number }[]) {
  const W = when(q)
  if (!rows.length) return { found: false, answer: `${W} chưa có chuyến xe nào${mat(q)}.` }
  const top = rows[0]
  return {
    found: true,
    answer: `${W} khung ${top.hour} giờ đến ${top.hour + 1} giờ đông xe nhất, ${n(top.trips)} chuyến${mat(q)}.`,
    headline: `${top.hour}h–${top.hour + 1}h — ${n(top.trips)} chuyến`,
  }
}

export function compareText(q: StructuredQuery, prevLabel: string, c: Comparison) {
  const W = when(q)
  const P = lowerFirst(prevLabel)
  const a = c.current; const b = c.previous
  if (a.trips === 0 && b.trips === 0) return { found: false, answer: `${W} và ${P} đều chưa có chuyến xe nào${mat(q)}.` }
  if (a.trips === 0) {
    return {
      found: true,
      answer: `${W} chưa có chuyến nào${mat(q)}, ${P} có ${n(b.trips)} chuyến${b.volume > 0 ? `, ${n(b.volume)} khối` : ''}.`,
      headline: `0 vs ${n(b.trips)} chuyến`,
    }
  }
  let t: string
  if (c.diffTrips > 0) t = `nhiều hơn ${P} ${n(c.diffTrips)} chuyến`
  else if (c.diffTrips < 0) t = `ít hơn ${P} ${n(-c.diffTrips)} chuyến`
  else t = `bằng ${P}`
  let v = ''
  if (a.volume > 0 || b.volume > 0) {
    if (c.diffVolume > 0) v = ` Khối lượng tăng ${n(c.diffVolume)} khối.`
    else if (c.diffVolume < 0) v = ` Khối lượng giảm ${n(-c.diffVolume)} khối.`
    else v = ' Khối lượng bằng nhau.'
  }
  return {
    found: true,
    answer: `${W} có ${n(a.trips)} chuyến${mat(q)}, ${t} (${n(b.trips)} chuyến).${v}`,
    headline: `${n(a.trips)} vs ${n(b.trips)} chuyến (${c.diffTrips >= 0 ? '+' : ''}${n(c.diffTrips)})`,
  }
}

export function onsiteText(q: StructuredQuery, r: { count: number; plates: string[] }) {
  if (r.count === 0) return { found: false, answer: `Hiện không có xe nào${mat(q)} còn trong công trình.` }
  const shown = r.plates.slice(0, 6)
  const more = r.count > 6 ? ` và ${r.count - 6} xe khác` : ''
  return {
    found: true,
    answer: `Hiện có ${n(r.count)} xe${mat(q)} chưa ra khỏi công trình: ${listJoin(shown)}${more}.`,
    headline: `${n(r.count)} xe đang ở công trình`,
  }
}

export const FIXED = {
  error: 'Không thể lấy dữ liệu lúc này. Vui lòng thử lại.',
  denied: 'Bạn không có quyền xem dữ liệu chuyến xe.',
  notUnderstood: 'Tôi chưa hiểu câu hỏi. Bạn thử hỏi như: "Hôm nay bao nhiêu chuyến chở đất?"',
  rateLimited: 'Bạn hỏi hơi nhanh, vui lòng đợi một chút rồi hỏi lại.',
}
