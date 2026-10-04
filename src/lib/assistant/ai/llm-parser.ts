/**
 * Primary intent parser (Groq — free tier). The rule parser is used as backup
 * when Groq errors / hits quota, and to fill entities the model missed.
 *
 * - Only runs when GROQ_API_KEY is set; otherwise the assistant stays 100% rule-based.
 * - Sends ONLY the user's sentence + small name lists (materials / dump sites).
 *   No trip data is ever sent to the model.
 * - The model must call a single tool `query_stats` whose arguments are validated
 *   by the backend before any database access. It never writes SQL.
 * - Model is configurable via GROQ_MODEL (must support tool use).
 */
import { INTENTS, RANGE_KEYS, type Intent, type RangeKey } from '../types'
import type { Catalog } from '../query/catalog'
import { vnToday } from '@/lib/date-utils'

export interface LlmSlots {
  intent?: Intent
  rangeKey?: RangeKey
  dateFrom?: string
  dateTo?: string
  material?: string
  plate?: string
  destination?: string
  hourFrom?: number
  hourTo?: number
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'qwen/qwen3.8-27b'

export function llmEnabled() {
  return !!process.env.GROQ_API_KEY?.trim()
}

/**
 * Parse results are cached (relative date keys like "yesterday" stay correct over time),
 * so repeated questions don't spend Groq quota. `null` = model said "not related".
 */
const parseCache = new Map<string, { value: LlmSlots | null; expires: number }>()
const PARSE_TTL = 10 * 60_000

export async function parseWithLlmCached(question: string, catalog: Catalog, previous?: unknown): Promise<{ slots: LlmSlots | null; failed: boolean }> {
  const k = `${question.toLowerCase().replace(/\s+/g, ' ').trim()}|${JSON.stringify(previous ?? null)}|${vnToday()}`
  const hit = parseCache.get(k)
  if (hit && hit.expires > Date.now()) return { slots: hit.value, failed: false }
  const res = await parseWithLlm(question, catalog, previous)
  if (res !== undefined) {
    if (parseCache.size > 1000) parseCache.clear()
    parseCache.set(k, { value: res, expires: Date.now() + PARSE_TTL })
  }
  return { slots: res ?? null, failed: res === undefined }
}

let blockedUntil = 0

/** Returns slots, `null` if the model declined (off-topic), or `undefined` on error/timeout. */
export async function parseWithLlm(question: string, catalog: Catalog, previous?: unknown): Promise<LlmSlots | null | undefined> {
  const key = process.env.GROQ_API_KEY?.trim()
  if (!key || Date.now() < blockedUntil) return undefined
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL

  const system = [
    'Bạn chuyển câu hỏi tiếng Việt về xe vận chuyển công trình thành tham số cho tool query_stats.',
    `Hôm nay là ${vnToday()} (Asia/Ho_Chi_Minh). Dùng rangeKey tương đối (today, yesterday, this_week...) khi có thể; chỉ dùng custom + dateFrom/dateTo cho ngày cụ thể.`,
    `Vật liệu hợp lệ: ${catalog.materials.map(m => m.name).join(', ')}.`,
    `Điểm đổ hợp lệ: ${catalog.dumps.map(d => d.name).join(', ') || '(chưa có)'}.`,
    'Nếu câu hỏi không liên quan tới chuyến xe / khối lượng / xe / điểm đổ thì KHÔNG gọi tool, chỉ trả lời "khong_lien_quan".',
    previous ? `Câu hỏi trước (để hiểu câu hỏi nối tiếp): ${JSON.stringify(previous)}` : '',
  ].filter(Boolean).join('\n')

  const body = {
    model,
    temperature: 0,
    max_tokens: 600,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: question.slice(0, 300) },
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'query_stats',
        description: 'Truy vấn thống kê chuyến xe đã được định nghĩa sẵn',
        parameters: {
          type: 'object',
          properties: {
            intent: { type: 'string', enum: [...INTENTS] },
            rangeKey: { type: 'string', enum: [...RANGE_KEYS] },
            dateFrom: { type: 'string', description: 'YYYY-MM-DD, chỉ khi rangeKey=custom' },
            dateTo: { type: 'string', description: 'YYYY-MM-DD, chỉ khi rangeKey=custom' },
            material: { type: 'string' },
            plate: { type: 'string', description: 'Biển số xe, ví dụ 51H12345' },
            destination: { type: 'string' },
            hourFrom: { type: 'integer', minimum: 0, maximum: 23 },
            hourTo: { type: 'integer', minimum: 1, maximum: 24 },
          },
          required: ['intent'],
        },
      },
    }],
    tool_choice: 'auto',
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      if (res.status === 429) {
        const wait = Number(res.headers.get('retry-after')) || 10
        blockedUntil = Date.now() + Math.min(wait, 120) * 1000
      }
      console.error('Groq parse failed', res.status, (await res.text().catch(() => '')).slice(0, 300))
      return undefined
    }
    const json = await res.json()
    const call = json?.choices?.[0]?.message?.tool_calls?.find((t: any) => t?.function?.name === 'query_stats')
    if (!call) return null
    let a: any = {}
    try { a = JSON.parse(call.function.arguments || '{}') } catch { return undefined }

    // Validate everything coming back from the model
    const int = (v: unknown, min: number, max: number) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= min && n <= max ? n : undefined
    }
    return {
      intent: (INTENTS as readonly string[]).includes(a.intent) ? a.intent : undefined,
      rangeKey: (RANGE_KEYS as readonly string[]).includes(a.rangeKey) ? a.rangeKey : undefined,
      dateFrom: typeof a.dateFrom === 'string' ? a.dateFrom : undefined,
      dateTo: typeof a.dateTo === 'string' ? a.dateTo : undefined,
      material: typeof a.material === 'string' ? a.material.slice(0, 50) : undefined,
      plate: typeof a.plate === 'string' ? a.plate.slice(0, 20) : undefined,
      destination: typeof a.destination === 'string' ? a.destination.slice(0, 100) : undefined,
      hourFrom: int(a.hourFrom, 0, 23),
      hourTo: int(a.hourTo, 1, 24),
    }
  } catch (e) {
    console.error('Groq parse error', e)
    return undefined
  }
}
