/**
 * Assistant query engine — shared by voice and text input.
 *
 *   question ─► Groq function call (primary, cached 10 min) ──(error/quota)──► rule parser (backup)
 *            ─► validate + merge short context ─► whitelisted SQL aggregate (cached)
 *            ─► template answer ─► audit log
 */
import type { AuthUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { plateSearchKey } from '@/lib/plate-utils'
import { INTENTS, type AssistantResponse, type StructuredQuery, type DateRange, type Intent } from './types'
import { resolveRange, previousRange, isDay } from './ai/dates'
import { parseRules, type ParsedSlots } from './ai/intent-parser'
import { llmEnabled, parseWithLlmCached, type LlmSlots } from './ai/llm-parser'
import * as T from './ai/response-generator'
import { getCatalog, findMaterial, findDump, findVehicle, extractPlate, type Catalog } from './query/catalog'
import * as Q from './query/statistics-queries'
import { cached, TTL } from './cache/statistics-cache'
import { vnToday } from '@/lib/date-utils'

export async function answerQuestion(
  user: AuthUser,
  rawQuestion: string,
  rawContext: unknown,
): Promise<AssistantResponse> {
  const started = Date.now()
  const question = String(rawQuestion || '').slice(0, 300).trim()

  if (!hasPermission(user, 'trips.view')) {
    return finish(user, question, { status: 'PERMISSION_DENIED', answer: T.FIXED.denied }, started)
  }
  if (!question) return { status: 'NOT_UNDERSTOOD', answer: T.FIXED.notUnderstood }

  let catalog: Catalog
  try {
    catalog = await getCatalog()
  } catch (e) {
    console.error('assistant catalog', e)
    return finish(user, question, { status: 'DATABASE_ERROR', answer: T.FIXED.error }, started)
  }

  const context = sanitizeContext(rawContext, catalog)

  // 1) cheap local parse (always: entities + backup)
  const rules = parseRules(question, catalog)
  const rulesOk = isUnderstood(rules, question, !!context)
  let slots: ParsedSlots = rules
  let source: AssistantResponse['source'] = 'rules'
  let understood = rulesOk

  // 2) Groq is the primary parser; rules are the backup when Groq fails / hits quota
  if (llmEnabled()) {
    const prev = context ? { intent: context.intent, range: context.range.label, material: context.materialName, plate: context.plate } : undefined
    const { slots: l, failed } = await parseWithLlmCached(question, catalog, prev)
    if (l?.intent) {
      slots = fromLlm(l, catalog, rules.followUp || !rules.intent)
      // fill entities the model missed but rules found
      if (!slots.materialId && rules.materialId) { slots.materialId = rules.materialId; slots.materialName = rules.materialName }
      if (!slots.vehicleId && !slots.unknownPlate && (rules.vehicleId || rules.unknownPlate)) { slots.vehicleId = rules.vehicleId; slots.plate = rules.plate; slots.unknownPlate = rules.unknownPlate }
      if (!slots.destId && !slots.unknownDest && rules.destId) { slots.destId = rules.destId; slots.destName = rules.destName }
      if (!slots.rangeKey && rules.rangeKey && !rules.uncertainTime) { slots.rangeKey = rules.rangeKey; slots.custom = rules.custom }
      source = 'llm'
      understood = true
    } else if (!failed) {
      // model declined → only trust rules when they found an explicit stats intent
      understood = rulesOk && (!!rules.intent || (!!context && !!rules.followUp))
    }
  }

  if (!understood) {
    return finish(user, question, { status: 'NOT_UNDERSTOOD', answer: T.FIXED.notUnderstood }, started)
  }
  if (slots.unknownPlate) {
    return finish(user, question, { status: 'NO_DATA', answer: `Không tìm thấy xe biển số ${slots.unknownPlate} trong hệ thống.` }, started)
  }
  if (slots.unknownDest) {
    return finish(user, question, { status: 'NO_DATA', answer: `Không tìm thấy điểm đổ "${slots.unknownDest}".` }, started)
  }

  // 3) build validated query (merge short context for follow-ups like "Thế hôm qua?")
  const q = buildQuery(slots, context)

  // 4) execute (scoped + cached)
  const scope = getAccessibleProjectIds(user)
  try {
    const result = await execute(q, scope)
    const res: AssistantResponse = {
      status: result.found ? 'DATA_FOUND' : 'NO_DATA',
      answer: result.answer,
      headline: result.headline,
      query: q,
      source: result.hit ? 'cache' : source,
    }
    return finish(user, question, res, started)
  } catch (e) {
    console.error('assistant query', e)
    return finish(user, question, { status: 'DATABASE_ERROR', answer: T.FIXED.error, query: q }, started)
  }
}

// ---------------------------------------------------------------------------

/**
 * A question is understood if it has a stats intent or names a material / plate / dump site.
 * A date or time alone ("Thế hôm qua?") only counts as a short follow-up to a previous question,
 * so off-topic sentences like "Thời tiết hôm nay thế nào?" are not answered with trip data.
 */
function isUnderstood(s: ParsedSlots, question: string, hasContext: boolean) {
  if (s.intent || s.materialId || s.vehicleId || s.destId || s.unknownPlate || s.unknownDest) return true
  const short = question.trim().split(/\s+/).length <= 4
  return hasContext && (s.followUp || short) && !!(s.rangeKey || s.hourFrom !== undefined)
}

function buildQuery(s: ParsedSlots, ctx?: StructuredQuery): StructuredQuery {
  const followUp = !!ctx && (s.followUp || !s.intent)
  const range: DateRange | undefined = s.rangeKey ? resolveRange(s.rangeKey, s.custom) : undefined
  if (followUp && ctx) {
    return {
      intent: s.intent ?? ctx.intent,
      range: range ?? refreshRange(ctx.range),
      materialId: s.materialId ?? ctx.materialId,
      materialName: s.materialId ? s.materialName : ctx.materialName,
      vehicleId: s.vehicleId ?? ctx.vehicleId,
      plate: s.vehicleId ? s.plate : ctx.plate,
      destId: s.destId ?? ctx.destId,
      destName: s.destId ? s.destName : ctx.destName,
      hourFrom: s.hourFrom ?? (range ? undefined : ctx.hourFrom),
      hourTo: s.hourTo ?? (range ? undefined : ctx.hourTo),
    }
  }
  return {
    intent: s.intent ?? 'trip_count',
    range: range ?? resolveRange('today'),
    materialId: s.materialId, materialName: s.materialName,
    vehicleId: s.vehicleId, plate: s.plate,
    destId: s.destId, destName: s.destName,
    hourFrom: s.hourFrom, hourTo: s.hourTo,
  }
}

/** Relative ranges from context are recomputed (e.g. "today" after midnight). */
function refreshRange(r: DateRange): DateRange {
  return r.key === 'custom' ? resolveRange('custom', { from: r.from, to: r.to }) : resolveRange(r.key)
}

/** Client-sent context is untrusted: keep only fields we can re-validate. */
function sanitizeContext(raw: unknown, catalog: Catalog): StructuredQuery | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const c = raw as Record<string, any>
  if (!(INTENTS as readonly string[]).includes(c.intent)) return undefined
  const r = c.range || {}
  const range = r.key === 'custom' && isDay(r.from) && isDay(r.to)
    ? resolveRange('custom', { from: r.from, to: r.to })
    : resolveRange(typeof r.key === 'string' ? r.key : 'today')
  const m = catalog.materials.find(x => x.id === c.materialId)
  const v = catalog.vehicles.find(x => x.id === c.vehicleId)
  const d = catalog.dumps.find(x => x.id === c.destId)
  const hour = (h: unknown, min: number, max: number) => (Number.isInteger(h) && (h as number) >= min && (h as number) <= max ? (h as number) : undefined)
  return {
    intent: c.intent as Intent,
    range,
    materialId: m?.id, materialName: m?.name,
    vehicleId: v?.id, plate: v?.plate,
    destId: d?.id, destName: d?.name,
    hourFrom: hour(c.hourFrom, 0, 23),
    hourTo: hour(c.hourTo, 1, 24),
  }
}

function fromLlm(l: LlmSlots, catalog: Catalog, followUp: boolean): ParsedSlots {
  const s: ParsedSlots = { intent: l.intent, followUp }
  if (l.rangeKey === 'custom' && isDay(l.dateFrom) && isDay(l.dateTo || l.dateFrom)) {
    s.rangeKey = 'custom'; s.custom = { from: l.dateFrom!, to: (l.dateTo || l.dateFrom)! }
  } else if (l.rangeKey && l.rangeKey !== 'custom') s.rangeKey = l.rangeKey
  if (l.material) { const m = findMaterial(l.material, catalog.materials); if (m) { s.materialId = m.id; s.materialName = m.name } }
  if (l.destination) {
    const d = findDump(l.destination, catalog.dumps)
    if (d) { s.destId = d.id; s.destName = d.name } else s.unknownDest = l.destination
  }
  if (l.plate) {
    const key = extractPlate(l.plate) || plateSearchKey(l.plate)
    const v = findVehicle(key, catalog.vehicles)
    if (v) { s.vehicleId = v.id; s.plate = v.plate } else s.unknownPlate = key
  }
  s.hourFrom = l.hourFrom; s.hourTo = l.hourTo
  return s
}

interface ExecResult { found: boolean; answer: string; headline?: string; hit: boolean }

async function execute(q: StructuredQuery, scope: Q.Scope): Promise<ExecResult> {
  const scopeKey = scope === null ? 'all' : [...scope].sort().join(',')
  const key = `stats:${scopeKey}:${q.intent}:${q.range.from}:${q.range.to}:${q.range.label}:${q.materialId || ''}:${q.vehicleId || ''}:${q.destId || ''}:${q.hourFrom ?? ''}-${q.hourTo ?? ''}`
  const ttl = q.intent === 'onsite' || q.range.to >= vnToday() ? TTL.TODAY : TTL.PAST

  const { value, hit } = await cached(key, ttl, async () => {
    switch (q.intent) {
      case 'total_volume': return T.totalVolumeText(q, await Q.getSummary(q, scope))
      case 'vehicle_count': return T.vehicleCountText(q, await Q.getSummary(q, scope))
      case 'vehicle_list': return T.vehicleListText(q, await Q.getVehicleSummary(q, scope, 50))
      case 'top_vehicle': return T.topVehicleText(q, await Q.getVehicleSummary(q, scope, 5))
      case 'destination_summary': return T.destinationText(q, await Q.getDestinationSummary(q, scope))
      case 'material_summary': return T.materialText(q, await Q.getMaterialSummary(q, scope))
      case 'hourly_peak': return T.hourlyText(q, await Q.getHourlySummary(q, scope))
      case 'onsite': return T.onsiteText(q, await Q.getOnsite(q, scope))
      case 'compare': {
        const prev = previousRange(q.range)
        return T.compareText(q, prev.label, await Q.getComparison(q, scope, q.range, prev))
      }
      case 'trip_count':
      default:
        return T.tripCountText(q, await Q.getSummary(q, scope))
    }
  })
  return { ...value, hit }
}

async function finish(user: AuthUser, question: string, res: AssistantResponse, started: number): Promise<AssistantResponse> {
  res.ms = Date.now() - started
  if (process.env.ASSISTANT_AUDIT_LOG !== 'off') {
    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'QUERY',
      module: 'assistant',
      newValues: {
        question,
        intent: res.query?.intent ?? null,
        params: res.query ? { from: res.query.range.from, to: res.query.range.to, material: res.query.materialName, plate: res.query.plate, destination: res.query.destName, hourFrom: res.query.hourFrom, hourTo: res.query.hourTo } : null,
        response: res.answer,
        status: res.status,
        source: res.source ?? null,
        executionMs: res.ms,
      },
      result: res.status === 'DATABASE_ERROR' || res.status === 'PERMISSION_DENIED' ? 'FAILURE' : 'SUCCESS',
    })
  }
  return res
}
