/**
 * Shared types for the assistant query engine.
 * The parser (rules or LLM) produces a StructuredQuery; the backend validates and executes it.
 */

export const INTENTS = [
  'trip_count',          // bao nhiêu chuyến
  'total_volume',        // bao nhiêu khối
  'vehicle_count',       // bao nhiêu xe khác nhau
  'vehicle_list',        // những biển số nào
  'top_vehicle',         // xe nào chạy nhiều nhất
  'destination_summary', // đổ ở đâu nhiều nhất
  'material_summary',    // chở vật liệu gì
  'hourly_peak',         // khung giờ nào nhiều xe nhất
  'compare',             // so với hôm qua
  'onsite',              // xe nào chưa ra
] as const

export type Intent = (typeof INTENTS)[number]

/** Relative date keys the parser may emit; backend converts to real VN dates. */
export const RANGE_KEYS = [
  'today', 'yesterday', 'day_before_yesterday',
  'this_week', 'last_week', 'last_7_days',
  'this_month', 'last_month', 'this_year', 'custom',
] as const

export type RangeKey = (typeof RANGE_KEYS)[number]

export interface DateRange {
  key: RangeKey
  from: string // YYYY-MM-DD (VN)
  to: string   // YYYY-MM-DD (VN)
  label: string // "Hôm nay", "Tuần này", "Ngày 3/10"...
}

export interface StructuredQuery {
  intent: Intent
  range: DateRange
  materialId?: string
  materialName?: string
  vehicleId?: string
  plate?: string
  destId?: string
  destName?: string
  hourFrom?: number
  hourTo?: number
}

export type ResultStatus =
  | 'DATA_FOUND'
  | 'NO_DATA'
  | 'DATABASE_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_UNDERSTOOD'
  | 'RATE_LIMITED'

export interface AssistantResponse {
  status: ResultStatus
  answer: string          // text shown + spoken
  headline?: string       // short "37 chuyến — 412 m³"
  query?: StructuredQuery // returned so the client can send it back as context
  data?: unknown          // minimal aggregated result (for display/debug)
  source?: 'rules' | 'llm' | 'cache'
  ms?: number
}
