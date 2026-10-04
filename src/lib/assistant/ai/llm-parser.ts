/**
 * Optional LLM fallback for questions the rule parser can't understand.
 *
 * - Only runs when GEMINI_API_KEY is set; otherwise the assistant stays 100% rule-based.
 * - Sends ONLY the user's sentence + small name lists (materials / dump sites).
 *   No trip data is ever sent to the model.
 * - The model must call a single function `query_stats` whose params are validated
 *   by the backend before any database access. It never writes SQL.
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

export function llmEnabled() {
  return !!process.env.GEMINI_API_KEY
}

export async function parseWithLlm(question: string, catalog: Catalog, previous?: unknown): Promise<LlmSlots | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  const system = [
    'Bạn chuyển câu hỏi tiếng Việt về xe vận chuyển công trình thành tham số cho hàm query_stats.',
    `Hôm nay là ${vnToday()} (Asia/Ho_Chi_Minh).`,
    `Vật liệu hợp lệ: ${catalog.materials.map(m => m.name).join(', ')}.`,
    `Điểm đổ hợp lệ: ${catalog.dumps.map(d => d.name).join(', ') || '(chưa có)'}.`,
    'Nếu câu hỏi không liên quan tới chuyến xe/khối lượng/xe/điểm đổ thì KHÔNG gọi hàm.',
    previous ? `Câu hỏi trước (để hiểu câu hỏi nối tiếp): ${JSON.stringify(previous)}` : '',
  ].filter(Boolean).join('\n')

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: question.slice(0, 300) }] }],
    tools: [{
      functionDeclarations: [{
        name: 'query_stats',
        description: 'Truy vấn thống kê chuyến xe đã được định nghĩa sẵn',
        parameters: {
          type: 'OBJECT',
          properties: {
            intent: { type: 'STRING', enum: [...INTENTS] },
            rangeKey: { type: 'STRING', enum: [...RANGE_KEYS] },
            dateFrom: { type: 'STRING', description: 'YYYY-MM-DD, chỉ khi rangeKey=custom' },
            dateTo: { type: 'STRING', description: 'YYYY-MM-DD, chỉ khi rangeKey=custom' },
            material: { type: 'STRING' },
            plate: { type: 'STRING', description: 'Biển số xe, ví dụ 51H12345' },
            destination: { type: 'STRING' },
            hourFrom: { type: 'INTEGER' },
            hourTo: { type: 'INTEGER' },
          },
          required: ['intent'],
        },
      }],
    }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    generationConfig: { temperature: 0, maxOutputTokens: 200 },
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: ctrl.signal },
    )
    clearTimeout(timer)
    if (!res.ok) { console.error('LLM parse failed', res.status, await res.text().catch(() => '')); return null }
    const json = await res.json()
    const call = json?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall
    if (!call || call.name !== 'query_stats') return null
    const a = call.args || {}
    // Validate everything coming back from the model
    return {
      intent: (INTENTS as readonly string[]).includes(a.intent) ? a.intent : undefined,
      rangeKey: (RANGE_KEYS as readonly string[]).includes(a.rangeKey) ? a.rangeKey : undefined,
      dateFrom: typeof a.dateFrom === 'string' ? a.dateFrom : undefined,
      dateTo: typeof a.dateTo === 'string' ? a.dateTo : undefined,
      material: typeof a.material === 'string' ? a.material.slice(0, 50) : undefined,
      plate: typeof a.plate === 'string' ? a.plate.slice(0, 20) : undefined,
      destination: typeof a.destination === 'string' ? a.destination.slice(0, 100) : undefined,
      hourFrom: Number.isInteger(a.hourFrom) && a.hourFrom >= 0 && a.hourFrom <= 23 ? a.hourFrom : undefined,
      hourTo: Number.isInteger(a.hourTo) && a.hourTo >= 1 && a.hourTo <= 24 ? a.hourTo : undefined,
    }
  } catch (e) {
    console.error('LLM parse error', e)
    return null
  }
}
